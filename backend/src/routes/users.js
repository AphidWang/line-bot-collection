const express = require('express');
const { query, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Search users by name or ID
router.get('/search', [
  query('q').notEmpty().trim(),
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

    const { q, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Search users
    const where = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } }
      ]
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          avatar: true,
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    // Format response
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      messageCount: user._count.messages
    }));

    res.json({
      users: formattedUsers,
      searchQuery: q,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      error: 'Failed to search users',
      message: 'Internal server error'
    });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: { messages: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    const formattedUser = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
      messageCount: user._count.messages
    };

    res.json({ user: formattedUser });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'Internal server error'
    });
  }
});

// Get messages by user
router.get('/:id/messages', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('channelId').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      channelId,
      startDate,
      endDate
    } = req.query;

    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, avatar: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Build where clause
    const where = { userId: id };
    if (channelId) where.channelId = channelId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // Get messages
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              pictureUrl: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prisma.message.count({ where })
    ]);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar
      },
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user messages error:', error);
    res.status(500).json({
      error: 'Failed to get user messages',
      message: 'Internal server error'
    });
  }
});

// Get user statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, avatar: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Get message statistics
    const [totalMessages, recentMessages, messageTypes, channels] = await Promise.all([
      prisma.message.count({ where: { userId: id } }),
      prisma.message.count({
        where: {
          userId: id,
          timestamp: { gte: cutoffDate }
        }
      }),
      prisma.message.groupBy({
        by: ['type'],
        where: { userId: id },
        _count: { type: true }
      }),
      prisma.message.groupBy({
        by: ['channelId'],
        where: { userId: id },
        _count: { channelId: true }
      })
    ]);

    // Get channel names
    const channelIds = channels.map(c => c.channelId);
    const channelNames = await prisma.channel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, name: true }
    });

    const channelStats = channels.map(channel => {
      const channelName = channelNames.find(c => c.id === channel.channelId);
      return {
        channelId: channel.channelId,
        channelName: channelName?.name || 'Unknown',
        messageCount: channel._count.channelId
      };
    });

    const stats = {
      userId: id,
      userName: user.name,
      period: `${days} days`,
      totalMessages,
      recentMessages,
      channels: channelStats.length,
      messageTypes: messageTypes.map(type => ({
        type: type.type,
        count: type._count.type
      })),
      topChannels: channelStats
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 5)
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to get user statistics',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
