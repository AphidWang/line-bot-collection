const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all channels with tracking status and message counts
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get owned channels
    const ownedChannels = await prisma.channel.findMany({
      include: {
        userChannels: {
          where: { userId },
          select: { isTracked: true }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: [
        {
          messages: {
            _count: 'desc'
          }
        },
        { updatedAt: 'desc' }
      ]
    });

    // Get shared channels
    const sharedChannels = await prisma.channelShare.findMany({
      where: { sharedWithId: userId },
      include: {
        channel: {
          include: {
            _count: {
              select: { messages: true }
            }
          }
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format owned channels
    const formattedOwnedChannels = ownedChannels.map(channel => ({
      id: channel.id,
      lineId: channel.lineId,
      name: channel.name,
      pictureUrl: channel.pictureUrl,
      status: channel.status,
      isTracked: channel.userChannels[0]?.isTracked ?? true,
      isOwner: true,
      messageCount: channel._count.messages,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt
    }));

    // Format shared channels
    const formattedSharedChannels = sharedChannels.map(share => ({
      id: share.channel.id,
      lineId: share.channel.lineId,
      name: share.channel.name,
      pictureUrl: share.channel.pictureUrl,
      status: share.channel.status,
      isTracked: true, // 被分享的頻道預設為追蹤狀態
      isOwner: false,
      isShared: true,
      sharedBy: share.owner,
      messageCount: share.channel._count.messages,
      createdAt: share.channel.createdAt,
      updatedAt: share.channel.updatedAt,
      sharedAt: share.createdAt
    }));

    // Combine and sort all channels
    const allChannels = [...formattedOwnedChannels, ...formattedSharedChannels]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ channels: allChannels });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      error: 'Failed to get channels',
      message: 'Internal server error'
    });
  }
});

// Get channels with new messages (for sorting)
router.get('/with-new-messages', async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 1 } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Get owned channels with new message counts
    const ownedChannels = await prisma.channel.findMany({
      include: {
        userChannels: {
          where: { userId },
          select: { isTracked: true }
        },
        _count: {
          select: {
            messages: {
              where: {
                timestamp: { gte: cutoffDate }
              }
            }
          }
        }
      },
      orderBy: [
        {
          messages: {
            _count: 'desc'
          }
        },
        { updatedAt: 'desc' }
      ]
    });

    // Get shared channels with new message counts
    const sharedChannels = await prisma.channelShare.findMany({
      where: { sharedWithId: userId },
      include: {
        channel: {
          include: {
            _count: {
              select: {
                messages: {
                  where: {
                    timestamp: { gte: cutoffDate }
                  }
                }
              }
            }
          }
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format owned channels
    const formattedOwnedChannels = ownedChannels.map(channel => ({
      id: channel.id,
      lineId: channel.lineId,
      name: channel.name,
      pictureUrl: channel.pictureUrl,
      status: channel.status,
      isTracked: channel.userChannels[0]?.isTracked ?? true,
      isOwner: true,
      newMessageCount: channel._count.messages,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt
    }));

    // Format shared channels
    const formattedSharedChannels = sharedChannels.map(share => ({
      id: share.channel.id,
      lineId: share.channel.lineId,
      name: share.channel.name,
      pictureUrl: share.channel.pictureUrl,
      status: share.channel.status,
      isTracked: true,
      isOwner: false,
      isShared: true,
      sharedBy: share.owner,
      newMessageCount: share.channel._count.messages,
      createdAt: share.channel.createdAt,
      updatedAt: share.channel.updatedAt,
      sharedAt: share.createdAt
    }));

    // Combine and sort all channels
    const allChannels = [...formattedOwnedChannels, ...formattedSharedChannels]
      .sort((a, b) => b.newMessageCount - a.newMessageCount);

    res.json({ channels: allChannels });
  } catch (error) {
    console.error('Get channels with new messages error:', error);
    res.status(500).json({
      error: 'Failed to get channels',
      message: 'Internal server error'
    });
  }
});

// Get channel by lineId
router.get('/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    const userId = req.user.id;

    // First check if user owns this channel
    const ownedChannel = await prisma.channel.findUnique({
      where: { lineId },
      include: {
        userChannels: {
          where: { userId },
          select: { isTracked: true }
        },
        _count: {
          select: { messages: true }
        }
      }
    });

    if (ownedChannel) {
      const formattedChannel = {
        id: ownedChannel.id,
        lineId: ownedChannel.lineId,
        name: ownedChannel.name,
        pictureUrl: ownedChannel.pictureUrl,
        status: ownedChannel.status,
        isTracked: ownedChannel.userChannels[0]?.isTracked ?? true,
        isOwner: true,
        messageCount: ownedChannel._count.messages,
        createdAt: ownedChannel.createdAt,
        updatedAt: ownedChannel.updatedAt
      };

      return res.json({ channel: formattedChannel });
    }

    // If not owned, check if it's shared with user
    const sharedChannel = await prisma.channelShare.findFirst({
      where: {
        channelId: lineId,
        sharedWithId: userId
      },
      include: {
        channel: {
          include: {
            _count: {
              select: { messages: true }
            }
          }
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (sharedChannel) {
      const formattedChannel = {
        id: sharedChannel.channel.id,
        lineId: sharedChannel.channel.lineId,
        name: sharedChannel.channel.name,
        pictureUrl: sharedChannel.channel.pictureUrl,
        status: sharedChannel.channel.status,
        isTracked: true,
        isOwner: false,
        isShared: true,
        sharedBy: sharedChannel.owner,
        messageCount: sharedChannel.channel._count.messages,
        createdAt: sharedChannel.channel.createdAt,
        updatedAt: sharedChannel.channel.updatedAt,
        sharedAt: sharedChannel.createdAt
      };

      return res.json({ channel: formattedChannel });
    }

    // Channel not found or not accessible
    return res.status(404).json({
      error: 'Channel not found',
      message: 'The specified channel does not exist or you do not have access to it'
    });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({
      error: 'Failed to get channel',
      message: 'Internal server error'
    });
  }
});

// Toggle channel tracking by lineId
router.post('/:lineId/track', [
  body('isTracked').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { lineId } = req.params;
    const { isTracked } = req.body;
    const userId = req.user.id;

    // Check if channel exists
    const channel = await prisma.channel.findUnique({
      where: { lineId }
    });

    if (!channel) {
      return res.status(404).json({
        error: 'Channel not found',
        message: 'The specified channel does not exist'
      });
    }

    // Update or create user channel relationship
    await prisma.userChannel.upsert({
      where: {
        userId_channelId: {
          userId,
          channelId: lineId
        }
      },
      update: {
        isTracked
      },
      create: {
        userId,
        channelId: lineId,
        isTracked
      }
    });

    res.json({
      message: `Channel ${isTracked ? 'tracking enabled' : 'tracking disabled'}`,
      lineId,
      isTracked
    });
  } catch (error) {
    console.error('Toggle channel tracking error:', error);
    res.status(500).json({
      error: 'Failed to update channel tracking',
      message: 'Internal server error'
    });
  }
});

// Get channel statistics by lineId
router.get('/:lineId/stats', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { days = 30 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Check if channel exists
    const channel = await prisma.channel.findUnique({
      where: { lineId }
    });

    if (!channel) {
      return res.status(404).json({
        error: 'Channel not found',
        message: 'The specified channel does not exist'
      });
    }

    // Get message statistics
    const [totalMessages, recentMessages, messageTypes] = await Promise.all([
      prisma.message.count({ where: { channelId: channel.id } }),
      prisma.message.count({
        where: {
          channelId: channel.id,
          timestamp: { gte: cutoffDate }
        }
      }),
      prisma.message.groupBy({
        by: ['type'],
        where: { channelId: channel.id },
        _count: { type: true }
      })
    ]);

    // Get user statistics
    const uniqueUsers = await prisma.message.groupBy({
      by: ['userId'],
      where: { channelId: channel.id },
      _count: { userId: true }
    });

    const stats = {
      lineId,
      channelName: channel.name,
      period: `${days} days`,
      totalMessages,
      recentMessages,
      uniqueUsers: uniqueUsers.length,
      messageTypes: messageTypes.map(type => ({
        type: type.type,
        count: type._count.type
      }))
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get channel stats error:', error);
    res.status(500).json({
      error: 'Failed to get channel statistics',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
