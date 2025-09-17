const express = require('express');
const { query, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get messages with pagination and filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('channelId').optional().isString(),
  query('userId').optional().isString(),
  query('type').optional().isString(),
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

    const {
      page = 1,
      limit = 20,
      channelId,
      userId,
      type,
      startDate,
      endDate
    } = req.query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    // Support passing Channel.id or Channel.lineId as channelId query param
    if (channelId) {
      let resolvedChannelId = channelId;
      // Try resolve if it's a lineId
      const channelById = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channelById) {
        const channelByLineId = await prisma.channel.findUnique({ where: { lineId: channelId } });
        if (channelByLineId) {
          resolvedChannelId = channelByLineId.id;
        }
      }
      where.channelId = resolvedChannelId;
    }
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // Get messages with channel and user info
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
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
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
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to get messages',
      message: 'Internal server error'
    });
  }
});

// Search messages by keyword
router.get('/search', [
  query('q').notEmpty().trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('channelId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { q, page = 1, limit = 20, channelId } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    const where = {
      OR: [
        { content: { contains: q, mode: 'insensitive' } },
        { userName: { contains: q, mode: 'insensitive' } }
      ]
    };

    if (channelId) {
      // Support Channel.id or Channel.lineId
      let resolvedChannelId = channelId;
      const channelById = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channelById) {
        const channelByLineId = await prisma.channel.findUnique({ where: { lineId: channelId } });
        if (channelByLineId) {
          resolvedChannelId = channelByLineId.id;
        }
      }
      where.channelId = resolvedChannelId;
    }

    // Search messages
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
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
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
      messages,
      searchQuery: q,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      error: 'Failed to search messages',
      message: 'Internal server error'
    });
  }
});

// Get messages by channel
router.get('/channel/:channelId', [
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

    const { channelId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Check if channel exists
    let channel = await prisma.channel.findUnique({
      where: { id: channelId }
    });
    if (!channel) {
      channel = await prisma.channel.findUnique({ where: { lineId: channelId } });
    }

    if (!channel) {
      return res.status(404).json({
        error: 'Channel not found',
        message: 'The specified channel does not exist'
      });
    }

    // Get messages for the channel
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { channelId: channel.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prisma.message.count({ where: { channelId: channel.id } })
    ]);

    res.json({
      channel: {
        id: channel.id,
        name: channel.name,
        pictureUrl: channel.pictureUrl
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
    console.error('Get channel messages error:', error);
    res.status(500).json({
      error: 'Failed to get channel messages',
      message: 'Internal server error'
    });
  }
});

// Get message by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            pictureUrl: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        message: 'The specified message does not exist'
      });
    }

    res.json({ message });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      error: 'Failed to get message',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
