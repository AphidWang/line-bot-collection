const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// 分享頻道給其他用戶
router.post('/channels/:lineId/share', [
  body('email').isEmail().withMessage('請提供有效的 email')
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
    const { email } = req.body;
    const ownerId = req.user.id;

    // 檢查頻道是否存在
    const channel = await prisma.channel.findUnique({
      where: { lineId }
    });

    if (!channel) {
      return res.status(404).json({
        error: 'Channel not found',
        message: '指定的頻道不存在'
      });
    }

    // 檢查用戶是否為頻道擁有者（通過 UserChannel 檢查）
    const userChannel = await prisma.userChannel.findFirst({
      where: {
        userId: ownerId,
        channelId: lineId
      }
    });

    if (!userChannel) {
      return res.status(403).json({
        error: 'Permission denied',
        message: '您沒有權限分享此頻道'
      });
    }

    // 查找被分享的用戶
    const sharedWithUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!sharedWithUser) {
      return res.status(404).json({
        error: 'User not found',
        message: '找不到該 email 的用戶'
      });
    }

    // 檢查是否已經分享過
    const existingShare = await prisma.channelShare.findUnique({
      where: {
        channelId_sharedWithId: {
          channelId: lineId,
          sharedWithId: sharedWithUser.id
        }
      }
    });

    if (existingShare) {
      return res.status(409).json({
        error: 'Already shared',
        message: '此頻道已經分享給該用戶'
      });
    }

    // 建立分享記錄
    const share = await prisma.channelShare.create({
      data: {
        channelId: lineId,
        ownerId,
        sharedWithId: sharedWithUser.id
      },
      include: {
        sharedWith: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    res.json({
      message: '頻道分享成功',
      share: {
        id: share.id,
        channelId: share.channelId,
        sharedWith: share.sharedWith,
        createdAt: share.createdAt
      }
    });
  } catch (error) {
    console.error('Share channel error:', error);
    res.status(500).json({
      error: 'Failed to share channel',
      message: 'Internal server error'
    });
  }
});

// 取消分享頻道
router.delete('/channels/:lineId/share/:userId', async (req, res) => {
  try {
    const { lineId, userId } = req.params;
    const ownerId = req.user.id;

    // 檢查分享記錄是否存在且用戶為擁有者
    const share = await prisma.channelShare.findFirst({
      where: {
        channelId: lineId,
        sharedWithId: userId,
        ownerId
      }
    });

    if (!share) {
      return res.status(404).json({
        error: 'Share not found',
        message: '找不到分享記錄或您沒有權限'
      });
    }

    // 刪除分享記錄
    await prisma.channelShare.delete({
      where: { id: share.id }
    });

    res.json({
      message: '已取消分享'
    });
  } catch (error) {
    console.error('Unshare channel error:', error);
    res.status(500).json({
      error: 'Failed to unshare channel',
      message: 'Internal server error'
    });
  }
});

// 獲取頻道的分享列表
router.get('/channels/:lineId/shares', async (req, res) => {
  try {
    const { lineId } = req.params;
    const userId = req.user.id;

    // 檢查用戶是否為頻道擁有者
    const userChannel = await prisma.userChannel.findFirst({
      where: {
        userId,
        channelId: lineId
      }
    });

    if (!userChannel) {
      return res.status(403).json({
        error: 'Permission denied',
        message: '您沒有權限查看此頻道的分享列表'
      });
    }

    // 獲取分享列表
    const shares = await prisma.channelShare.findMany({
      where: { channelId: lineId },
      include: {
        sharedWith: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ shares });
  } catch (error) {
    console.error('Get channel shares error:', error);
    res.status(500).json({
      error: 'Failed to get channel shares',
      message: 'Internal server error'
    });
  }
});

// 獲取用戶被分享的頻道列表
router.get('/shared-channels', async (req, res) => {
  try {
    const userId = req.user.id;

    // 獲取被分享的頻道
    const sharedChannels = await prisma.channelShare.findMany({
      where: { sharedWithId: userId },
      include: {
        channel: {
          include: {
            _count: { select: { messages: true } }
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

    // 格式化回應
    const formattedChannels = sharedChannels.map(share => ({
      id: share.channel.id,
      lineId: share.channel.lineId,
      name: share.channel.name,
      pictureUrl: share.channel.pictureUrl,
      status: share.channel.status,
      isShared: true,
      sharedBy: share.owner,
      messageCount: share.channel._count?.messages ?? 0,
      createdAt: share.channel.createdAt,
      updatedAt: share.channel.updatedAt,
      sharedAt: share.createdAt
    }));

    res.json({ channels: formattedChannels });
  } catch (error) {
    console.error('Get shared channels error:', error);
    res.status(500).json({
      error: 'Failed to get shared channels',
      message: 'Internal server error'
    });
  }
});

// 移除被分享的頻道（從自己的視圖中隱藏）
router.delete('/shared-channels/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    const userId = req.user.id;

    // 檢查分享記錄是否存在且用戶為被分享者
    const share = await prisma.channelShare.findFirst({
      where: {
        channelId: lineId,
        sharedWithId: userId
      }
    });

    if (!share) {
      return res.status(404).json({
        error: 'Share not found',
        message: '找不到分享記錄'
      });
    }

    // 刪除分享記錄（這會從被分享者的視圖中移除）
    await prisma.channelShare.delete({
      where: { id: share.id }
    });

    res.json({
      message: '已移除分享的頻道'
    });
  } catch (error) {
    console.error('Remove shared channel error:', error);
    res.status(500).json({
      error: 'Failed to remove shared channel',
      message: 'Internal server error'
    });
  }
});

module.exports = router;

