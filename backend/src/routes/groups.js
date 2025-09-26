const express = require('express');
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const UserChannel = require('../models/UserChannel');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get groups for a user
router.get('/', async (req, res) => {
  try {
    const { channelId } = req.query;
    
    const where = {};
    if (channelId) {
      // 支援傳入 Line 的 channel lineId，並轉換為內部 channel.id
      let internalChannelId = channelId;
      try {
        const channel = await prisma.channel.findFirst({
          where: {
            OR: [
              { id: channelId },
              { lineId: channelId }
            ]
          },
          select: { id: true }
        });
        if (channel) internalChannelId = channel.id;
      } catch (e) {
        // 忽略查詢錯誤，使用原值
      }
      where.channelId = internalChannelId;
    }

    let groups = await prisma.group.findMany({
      where,
      include: {
        _count: {
          select: {
            messages: true
          }
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            timestamp: true,
            type: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // 補強最後訊息的使用者名稱（placeholder 或缺失時）
    const credentialsByLineId = {};
    const enrichmentCache = new Map(); // 快取已查詢過的使用者
    async function getCredentials(lineId) {
      if (!lineId) return null;
      if (credentialsByLineId[lineId]) return credentialsByLineId[lineId];
      const creds = await UserChannel.getChannelCredentials(lineId);
      credentialsByLineId[lineId] = creds;
      return creds;
    }
    async function fetchUserProfileFromLine(userId, accessToken) {
      if (!accessToken) return null;
      try {
        const resp = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return { name: data.displayName, avatar: data.pictureUrl };
      } catch { return null; }
    }

    groups = await Promise.all(groups.map(async (g) => {
      const last = g.messages?.[0];
      if (!last || !/^User\s/.test(last.user?.name || '')) return g;
      
      // 檢查快取，避免重複查詢
      const userId = (await prisma.message.findUnique({ where: { id: last.id }, select: { userId: true } }))?.userId;
      if (!userId) return g;
      
      const cacheKey = `${userId}_${g.channelId}`;
      if (enrichmentCache.has(cacheKey)) {
        const cached = enrichmentCache.get(cacheKey);
        if (cached === 'failed') return g; // 之前查詢失敗，跳過
        return { ...g, messages: [{ ...last, user: { name: cached } }] };
      }
      
      // 取該群所屬 channel 的 lineId 找 token
      const channel = await prisma.channel.findUnique({ where: { id: g.channelId }, select: { lineId: true } });
      const creds = await getCredentials(channel?.lineId);
      console.log('🔎 Enriching last message user name from LINE for group:', { groupId: g.id, messageId: last.id, lineChannelId: channel?.lineId, hasToken: !!creds?.accessToken });
      const profile = await fetchUserProfileFromLine(userId, creds?.accessToken);
      if (!profile) {
        console.warn('LINE profile fetch for group enrichment failed or empty', { groupId: g.id, messageId: last.id, hasToken: !!creds?.accessToken });
        enrichmentCache.set(cacheKey, 'failed'); // 快取失敗結果
        return g;
      }
      if (profile?.name) {
        // 更新 DB 使用者名稱，之後查詢就不會是 placeholder
        const uid = await prisma.message.findUnique({ where: { id: last.id }, select: { userId: true } });
        if (uid?.userId) {
          try {
            console.log('📝 Updating DB user profile from group enrichment:', { userId: uid.userId, nextName: profile.name });
            await prisma.user.update({ where: { id: uid.userId }, data: { name: profile.name, avatar: profile.avatar || undefined } });
          } catch {}
        }
        enrichmentCache.set(cacheKey, profile.name); // 快取成功結果
        return {
          ...g,
          messages: [{ ...last, user: { name: profile.name } }]
        };
      }
      enrichmentCache.set(cacheKey, 'failed'); // 快取失敗結果
      return g;
    }));

    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      error: 'Failed to fetch groups',
      message: 'Internal server error'
    });
  }
});

// Get messages for a specific group
router.get('/:groupId/messages', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { groupId } = req.params;
    // Ensure numeric pagination
    const pageRaw = req.query.page ?? 1;
    const limitRaw = req.query.limit ?? 50;
    const page = typeof pageRaw === 'string' ? parseInt(pageRaw, 10) : pageRaw;
    const limit = typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : limitRaw;
    const skip = (page - 1) * limit;

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            lineId: true
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
        message: 'The specified group does not exist'
      });
    }

    // Get messages
    const [messagesRaw, total] = await Promise.all([
      prisma.message.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { timestamp: 'asc' },
        skip,
        take: limit
      }),
      prisma.message.count({ where: { groupId } })
    ]);

    // Enrich user names/avatars on-the-fly from LINE if missing or placeholder
    const credentials = group.channel?.lineId
      ? await UserChannel.getChannelCredentials(group.channel.lineId)
      : null;

    async function fetchUserProfileFromLine(userId) {
      if (!credentials?.accessToken) return null;
      try {
        const resp = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
          headers: { Authorization: `Bearer ${credentials.accessToken}` }
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return { name: data.displayName, avatar: data.pictureUrl };
      } catch {
        return null;
      }
    }

    const messages = await Promise.all(
      messagesRaw.map(async (m) => {
        const needsLookup = !m.user?.name || /^User\s/.test(m.user.name);
        if (needsLookup) {
          const profile = await fetchUserProfileFromLine(m.userId);
          if (profile) {
            return {
              ...m,
              user: {
                id: m.userId,
                name: profile.name,
                avatar: profile.avatar
              }
            };
          }
        }
        return m;
      })
    );

    res.json({
      group,
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({
      error: 'Failed to fetch group messages',
      message: 'Internal server error'
    });
  }
});

// Mark messages as read
router.post('/:groupId/read', [
  body('messageId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { groupId } = req.params;
    const { messageId } = req.body;
    const userId = req.user.id;

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
        message: 'The specified group does not exist'
      });
    }

    // Update or create user read record
    const userRead = await prisma.userRead.upsert({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      update: {
        lastReadMessageId: messageId,
        lastReadAt: new Date()
      },
      create: {
        userId,
        groupId,
        lastReadMessageId: messageId,
        lastReadAt: new Date()
      }
    });

    res.json({ userRead });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: 'Failed to mark as read',
      message: 'Internal server error'
    });
  }
});

// Get unread count for groups
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.user.id;
    const { channelId } = req.query;

    // Get user's read status for all groups (optionally filtered by channel)
    const userReads = await prisma.userRead.findMany({
      where: { userId },
      select: {
        groupId: true,
        lastReadAt: true,
      }
    });

    if (!userReads || userReads.length === 0) {
      return res.json({ unreadCounts: [] });
    }

    // Optionally fetch group/channel meta only if needed
    const groupIds = userReads.map(r => r.groupId);

    // Load groups (with optional channel filter)
    const groups = await prisma.group.findMany({
      where: {
        id: { in: groupIds },
        ...(channelId
          ? {
              OR: [
                { channelId: channelId },
                // 支援傳入 lineId 當 channelId
                { channel: { lineId: channelId } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        name: true,
        channel: { select: { name: true } }
      }
    });

    const allowedGroupIdSet = new Set(groups.map(g => g.id));

    // Get unread counts
    const unreadCounts = (
      await Promise.all(
        userReads.map(async (userRead) => {
          if (!allowedGroupIdSet.has(userRead.groupId)) return null;
          const where = {
            groupId: userRead.groupId,
            timestamp: { gt: userRead.lastReadAt || new Date(0) }
          };
          const unreadCount = await prisma.message.count({ where });
          const group = groups.find(g => g.id === userRead.groupId);
          return {
            groupId: userRead.groupId,
            groupName: group?.name || '',
            channelName: group?.channel?.name || '',
            unreadCount
          };
        })
      )
    ).filter(Boolean);

    res.json({ unreadCounts });
  } catch (error) {
    console.error('Get unread count error:', error?.message || error);
    if (error?.stack) console.error(error.stack);
    res.status(500).json({
      error: 'Failed to get unread count',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
