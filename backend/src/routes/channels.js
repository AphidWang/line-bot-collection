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

    // Get channels with tracking status and recent message info
    const channels = await prisma.channel.findMany({
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

    // Format response
    const formattedChannels = channels.map(channel => ({
      id: channel.id,
      lineId: channel.lineId,
      name: channel.name,
      pictureUrl: channel.pictureUrl,
      status: channel.status,
      isTracked: channel.userChannels[0]?.isTracked ?? true,
      messageCount: channel._count.messages,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt
    }));

    res.json({ channels: formattedChannels });
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

    // Get channels with new message counts
    const channels = await prisma.channel.findMany({
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

    // Format response
    const formattedChannels = channels.map(channel => ({
      id: channel.id,
      lineId: channel.lineId,
      name: channel.name,
      pictureUrl: channel.pictureUrl,
      status: channel.status,
      isTracked: channel.userChannels[0]?.isTracked ?? true,
      newMessageCount: channel._count.messages,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt
    }));

    res.json({ channels: formattedChannels });
  } catch (error) {
    console.error('Get channels with new messages error:', error);
    res.status(500).json({
      error: 'Failed to get channels',
      message: 'Internal server error'
    });
  }
});

// Get channel by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const channel = await prisma.channel.findUnique({
      where: { id },
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

    if (!channel) {
      return res.status(404).json({
        error: 'Channel not found',
        message: 'The specified channel does not exist'
      });
    }

    const formattedChannel = {
      id: channel.id,
      lineId: channel.lineId,
      name: channel.name,
      pictureUrl: channel.pictureUrl,
      status: channel.status,
      isTracked: channel.userChannels[0]?.isTracked ?? true,
      messageCount: channel._count.messages,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt
    };

    res.json({ channel: formattedChannel });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({
      error: 'Failed to get channel',
      message: 'Internal server error'
    });
  }
});

// Toggle channel tracking
router.post('/:id/track', [
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

    const { id } = req.params;
    const { isTracked } = req.body;
    const userId = req.user.id;

    // Check if channel exists
    const channel = await prisma.channel.findUnique({
      where: { id }
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
          channelId: id
        }
      },
      update: {
        isTracked
      },
      create: {
        userId,
        channelId: id,
        isTracked
      }
    });

    res.json({
      message: `Channel ${isTracked ? 'tracking enabled' : 'tracking disabled'}`,
      channelId: id,
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

// Get channel statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Check if channel exists
    const channel = await prisma.channel.findUnique({
      where: { id }
    });

    if (!channel) {
      return res.status(404).json({
        error: 'Channel not found',
        message: 'The specified channel does not exist'
      });
    }

    // Get message statistics
    const [totalMessages, recentMessages, messageTypes] = await Promise.all([
      prisma.message.count({ where: { channelId: id } }),
      prisma.message.count({
        where: {
          channelId: id,
          timestamp: { gte: cutoffDate }
        }
      }),
      prisma.message.groupBy({
        by: ['type'],
        where: { channelId: id },
        _count: { type: true }
      })
    ]);

    // Get user statistics
    const uniqueUsers = await prisma.message.groupBy({
      by: ['userId'],
      where: { channelId: id },
      _count: { userId: true }
    });

    const stats = {
      channelId: id,
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
