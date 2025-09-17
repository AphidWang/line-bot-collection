const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const UserChannel = require('../models/UserChannel');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// 驗證中間件
const validateChannelData = [
  body('channelId').notEmpty().withMessage('Channel ID is required'),
  body('accessToken').notEmpty().withMessage('Access Token is required'),
  body('channelSecret').notEmpty().withMessage('Channel Secret is required')
];

// 獲取用戶的頻道列表
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const channels = await UserChannel.getUserChannels(userId);
    
    res.json({
      success: true,
      channels
    });
  } catch (error) {
    console.error('Get user channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user channels',
      error: error.message
    });
  }
});

// 添加新的頻道
router.post('/', validateChannelData, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { channelId, accessToken, channelSecret, alias } = req.body;

    // 檢查頻道是否已存在
    const existingChannel = await prisma.userChannel.findFirst({
      where: {
        userId,
        channelId
      }
    });

    if (existingChannel) {
      return res.status(400).json({
        success: false,
        message: 'Channel already exists for this user'
      });
    }

    // 先創建或連接 Channel
    await prisma.channel.upsert({
      where: { lineId: channelId },
      update: {},
      create: {
        lineId: channelId,
        name: `Channel ${channelId}`,
        status: 'active'
      }
    });

    // 創建頻道
    const channel = await UserChannel.createChannel(userId, {
      channelId,
      accessToken,
      channelSecret,
      alias
    });

    res.status(201).json({
      success: true,
      message: 'Channel added successfully',
      channel: {
        id: channel.id,
        channelId: channel.channelId,
        alias: channel.alias,
        status: channel.status,
        webhookUrl: channel.webhookUrl,
        createdAt: channel.createdAt
      }
    });
  } catch (error) {
    console.error('Add channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add channel',
      error: error.message
    });
  }
});

// 更新頻道狀態（使用 userId + channel lineId 複合鍵）
router.patch('/:channelId/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const { channelId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'error'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const channel = await UserChannel.updateChannelStatus(userId, channelId, status);

    res.json({
      success: true,
      message: 'Channel status updated',
      channel: {
        id: channel.id,
        channelId: channel.channelId,
        status: channel.status
      }
    });
  } catch (error) {
    console.error('Update channel status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update channel status'
    });
  }
});

// 更新頻道別名
router.patch('/:channelId/alias', [
  body('alias').optional().isString().isLength({ max: 80 }).withMessage('Alias must be a string up to 80 chars')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
    }

    const userId = req.user.id;
    const { channelId } = req.params;
    const { alias } = req.body;

    const updated = await UserChannel.updateAlias(userId, channelId, alias ?? null);

    res.json({
      success: true,
      message: 'Channel alias updated',
      channel: {
        id: updated.id,
        channelId: updated.channelId,
        alias: updated.alias
      }
    });
  } catch (error) {
    console.error('Update channel alias error:', error);
    res.status(500).json({ success: false, message: 'Failed to update channel alias' });
  }
});

// 刪除頻道
router.delete('/:channelId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { channelId } = req.params;

    await UserChannel.deleteChannel(userId, channelId);

    res.json({
      success: true,
      message: 'Channel deleted successfully'
    });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete channel'
    });
  }
});

// 獲取頻道憑證（僅用於內部 API 調用）
router.get('/:channelId/credentials', async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // 這裡應該有額外的權限檢查
    const credentials = await UserChannel.getChannelCredentials(channelId);
    
    if (!credentials) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    res.json({
      success: true,
      credentials
    });
  } catch (error) {
    console.error('Get channel credentials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get channel credentials'
    });
  }
});

module.exports = router;
