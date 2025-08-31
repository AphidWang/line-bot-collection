const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generateSummary } = require('../services/openaiService');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all summaries for the current user
router.get('/', [
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

    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      channelId,
      startDate,
      endDate
    } = req.query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = { userId };
    if (channelId) where.channelId = channelId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Get summaries
    const [summaries, total] = await Promise.all([
      prisma.summary.findMany({
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
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.summary.count({ where })
    ]);

    res.json({
      summaries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get summaries error:', error);
    res.status(500).json({
      error: 'Failed to get summaries',
      message: 'Internal server error'
    });
  }
});

// Generate new summary
router.post('/generate', [
  body('channelIds').isArray({ min: 1 }),
  body('channelIds.*').isString(),
  body('date').isISO8601(),
  body('type').isIn(['daily', 'weekly', 'monthly', 'custom'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { channelIds, date, type } = req.body;
    const userId = req.user.id;
    const summaryDate = new Date(date);

    // Check if summary already exists for the specified channels and date
    const existingSummaries = await prisma.summary.findMany({
      where: {
        userId,
        date: summaryDate,
        channelId: { in: channelIds }
      }
    });

    if (existingSummaries.length > 0) {
      return res.status(400).json({
        error: 'Summary already exists',
        message: 'Summaries already exist for some channels on this date',
        existingSummaries: existingSummaries.map(s => ({
          channelId: s.channelId,
          channelName: s.channel?.name || 'Unknown'
        }))
      });
    }

    // Get messages for the specified channels and date
    const startOfDay = new Date(summaryDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(summaryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const messages = await prisma.message.findMany({
      where: {
        channelId: { in: channelIds },
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        channel: {
          select: { name: true }
        },
        user: {
          select: { name: true }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (messages.length === 0) {
      return res.status(400).json({
        error: 'No messages found',
        message: 'No messages found for the specified channels and date'
      });
    }

    // Generate summaries for each channel
    const summaries = [];
    for (const channelId of channelIds) {
      const channelMessages = messages.filter(m => m.channelId === channelId);
      
      if (channelMessages.length === 0) continue;

      // Format messages for AI
      const formattedMessages = channelMessages.map(msg => 
        `[${msg.timestamp.toLocaleTimeString()}] ${msg.user?.name || 'Unknown'}: ${msg.content}`
      ).join('\n');

      // Generate summary using OpenAI
      const summary = await generateSummary(formattedMessages, type);
      
      // Save summary to database
      const savedSummary = await prisma.summary.create({
        data: {
          userId,
          channelId,
          date: summaryDate,
          content: summary.content,
          tokens: summary.tokens
        },
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              pictureUrl: true
            }
          }
        }
      });

      summaries.push(savedSummary);
    }

    // Generate overall summary if multiple channels
    if (channelIds.length > 1) {
      const allMessages = messages.map(msg => 
        `[${msg.channel.name}] [${msg.timestamp.toLocaleTimeString()}] ${msg.user?.name || 'Unknown'}: ${msg.content}`
      ).join('\n');

      const overallSummary = await generateSummary(allMessages, type);
      
      const overallSummaryRecord = await prisma.summary.create({
        data: {
          userId,
          channelId: null, // null means overall summary
          date: summaryDate,
          content: overallSummary.content,
          tokens: overallSummary.tokens
        }
      });

      summaries.push(overallSummaryRecord);
    }

    res.status(201).json({
      message: 'Summaries generated successfully',
      summaries,
      totalMessages: messages.length,
      channels: channelIds.length
    });

  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      message: 'Internal server error'
    });
  }
});

// Get summary by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const summary = await prisma.summary.findFirst({
      where: {
        id,
        userId
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            pictureUrl: true
          }
        }
      }
    });

    if (!summary) {
      return res.status(404).json({
        error: 'Summary not found',
        message: 'The specified summary does not exist'
      });
    }

    res.json({ summary });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      error: 'Failed to get summary',
      message: 'Internal server error'
    });
  }
});

// Delete summary
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const summary = await prisma.summary.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!summary) {
      return res.status(404).json({
        error: 'Summary not found',
        message: 'The specified summary does not exist'
      });
    }

    await prisma.summary.delete({
      where: { id }
    });

    res.json({
      message: 'Summary deleted successfully',
      summaryId: id
    });
  } catch (error) {
    console.error('Delete summary error:', error);
    res.status(500).json({
      error: 'Failed to delete summary',
      message: 'Internal server error'
    });
  }
});

// Get summary statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Get summary statistics
    const [totalSummaries, recentSummaries, channelSummaries] = await Promise.all([
      prisma.summary.count({ where: { userId } }),
      prisma.summary.count({
        where: {
          userId,
          date: { gte: cutoffDate }
        }
      }),
      prisma.summary.groupBy({
        by: ['channelId'],
        where: { userId },
        _count: { channelId: true }
      })
    ]);

    // Get channel names
    const channelIds = channelSummaries.map(c => c.channelId).filter(id => id !== null);
    const channelNames = await prisma.channel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, name: true }
    });

    const channelStats = channelSummaries.map(channel => {
      if (channel.channelId === null) {
        return {
          channelId: null,
          channelName: 'Overall Summary',
          summaryCount: channel._count.channelId
        };
      }
      
      const channelName = channelNames.find(c => c.id === channel.channelId);
      return {
        channelId: channel.channelId,
        channelName: channelName?.name || 'Unknown',
        summaryCount: channel._count.channelId
      };
    });

    const stats = {
      userId,
      period: `${days} days`,
      totalSummaries,
      recentSummaries,
      channels: channelStats.length,
      topChannels: channelStats
        .sort((a, b) => b.summaryCount - a.summaryCount)
        .slice(0, 5)
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get summary stats error:', error);
    res.status(500).json({
      error: 'Failed to get summary statistics',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
