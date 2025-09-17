const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../config/database');

const router = express.Router();

// Verify Line webhook signature
const verifySignature = (req, res, next) => {
  const signature = req.headers['x-line-signature'];
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  
  if (!signature || !channelSecret) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing signature or channel secret'
    });
  }

  // Get raw body for signature verification
  const body = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');

  console.log('🔍 Signature verification debug:');
  console.log('Expected signature:', signature);
  console.log('Calculated hash:', hash);
  console.log('Body:', body);

  if (signature !== hash) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid signature'
    });
  }

  next();
};

// Line webhook endpoint with channel ID
router.post('/webhook/:channelId', async (req, res) => {
  const { channelId } = req.params;
  
  try {
    // 從資料庫獲取 channel 憑證
    const UserChannel = require('../models/UserChannel');
    const credentials = await UserChannel.getChannelCredentials(channelId);
    
    if (!credentials) {
      console.error('❌ Channel not found:', channelId);
      return res.status(404).json({
        error: 'Channel not found',
        message: `Channel ${channelId} not found or not configured`
      });
    }

    // 驗證簽名（使用對應 channel 的 secret），以 raw body 計算
    const signature = req.headers['x-line-signature'];
    if (signature && credentials.channelSecret) {
      const rawBodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
      const hash = crypto
        .createHmac('SHA256', credentials.channelSecret)
        .update(rawBodyBuffer)
        .digest('base64');

      if (signature !== hash) {
        console.error('❌ Invalid signature for channel:', channelId);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid signature'
        });
      }
    }

    // Parse events from raw body to avoid unicode/emoji signature issues
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});
    const { events } = JSON.parse(rawBody);

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'No events found in request body'
      });
    }

    console.log(`📨 Received LINE webhook events for channel ${channelId}:`, events.length);

    // Process each event
    for (const event of events) {
      await processLineEvent(event, channelId);
    }

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Line webhook error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: 'Failed to process webhook events'
    });
  }
});

// Process Line event
const processLineEvent = async (event, webhookChannelId) => {
  try {
    // Only process message events
    if (event.type !== 'message') {
      return;
    }

    // Log the full incoming message event for debugging
    try {
      console.log('📝 LINE message event (raw):', JSON.stringify(event));
    } catch (e) {
      console.log('📝 LINE message event (raw, toString):', String(event));
    }

    const { message, source, replyToken, timestamp } = event;
    const sourceType = source?.type; // 'user' | 'group' | 'room'
    const isGroup = sourceType === 'group' || sourceType === 'room';
    const userId = source.userId;
    // For groups/rooms, use Line group/room id strictly by source.type; for DMs, synthesize per-channel id
    const lineGroupId = isGroup
      ? (sourceType === 'group' ? source.groupId : source.roomId)
      : `${webhookChannelId}:${userId}`;

    console.log('🔎 Parsed message meta:', {
      sourceType,
      userId,
      groupId: source?.groupId,
      roomId: source?.roomId,
      resolvedGroupKey: lineGroupId,
      webhookChannelId,
      messageType: message?.type,
    });

    if (isGroup && !lineGroupId) {
      // Safety: if LINE says it's group/room but id missing, log and skip rather than misclassify as DM
      console.warn('⚠️ Received group/room event without groupId/roomId. Skipping.', { source });
      return;
    }

    // Find or create channel
    let channel = await prisma.channel.findUnique({
      where: { lineId: webhookChannelId }
    });

    if (!channel) {
      // Get channel info from Line API (you might want to implement this)
      channel = await prisma.channel.create({
        data: {
          lineId: webhookChannelId,
          name: `Channel ${webhookChannelId.slice(-8)}`, // Fallback name
          status: 'active'
        }
      });
    }

    // Find or create group (supports groups and DMs)
    let group = await prisma.group.findUnique({
      where: { lineId: lineGroupId }
    });

    if (!group) {
      let name = `Group ${lineGroupId.slice(-8)}`;
      let pictureUrl = undefined;
      if (isGroup) {
        const groupInfo = await getGroupInfo(lineGroupId, webhookChannelId);
        name = groupInfo?.name || name;
        pictureUrl = groupInfo?.pictureUrl;
      } else {
        const userInfo = await getUserInfo(userId, webhookChannelId);
        name = userInfo?.name ? `DM - ${userInfo.name}` : `DM ${userId.slice(-8)}`;
        pictureUrl = userInfo?.avatar;
      }
      group = await prisma.group.create({
        data: {
          lineId: lineGroupId,
          name,
          pictureUrl,
          channelId: channel.id,
          status: 'active'
        }
      });
    }

    // Create or update user
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      // Try to get user info from Line API
      const userInfo = await getUserInfo(userId, webhookChannelId);
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@line.local`, // Placeholder email
          name: userInfo?.name || `User ${userId.slice(-8)}`,
          avatar: userInfo?.avatar,
          password: null // No password for Line users
        }
      });
    }

    // Create message
    const messageData = {
      lineId: message.id,
      channelId: channel.id,
      groupId: group?.id || null,
      userId: user.id,
      type: message.type,
      content: extractMessageContent(message),
      metadata: message,
      timestamp: new Date(timestamp)
    };

    await prisma.message.create({
      data: messageData
    });

    console.log(`✅ Message stored: ${message.id} in channel ${channel.name}${group ? `, group ${group.name}` : ''}`);

  } catch (error) {
    console.error('Error processing Line event:', error);
  }
};

// Get group info from Line API
const getGroupInfo = async (groupId, channelId) => {
  try {
    // Get channel credentials
    const UserChannel = require('../models/UserChannel');
    const credentials = await UserChannel.getChannelCredentials(channelId);
    
    if (!credentials?.accessToken) {
      console.warn('No access token available for group info');
      return null;
    }

    const response = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        name: data.groupName,
        pictureUrl: data.pictureUrl
      };
    }
  } catch (error) {
    console.error('Error fetching group info:', error);
  }
  return null;
};

// Get user info from Line API
const getUserInfo = async (userId, channelId) => {
  try {
    // Get channel credentials
    const UserChannel = require('../models/UserChannel');
    const credentials = await UserChannel.getChannelCredentials(channelId);
    
    if (!credentials?.accessToken) {
      console.warn('No access token available for user info');
      return null;
    }

    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        name: data.displayName,
        avatar: data.pictureUrl
      };
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
  }
  return null;
};

// Extract message content based on type
const extractMessageContent = (message) => {
  switch (message.type) {
    case 'text':
      return message.text;
    case 'image':
      return `[圖片] ${message.contentProvider?.originalContentUrl || 'Image message'}`;
    case 'video':
      return `[影片] ${message.contentProvider?.originalContentUrl || 'Video message'}`;
    case 'audio':
      return `[語音] ${message.contentProvider?.originalContentUrl || 'Audio message'}`;
    case 'file':
      return `[檔案] ${message.fileName || 'File message'}`;
    case 'location':
      return `[位置] ${message.title}: ${message.address}`;
    case 'sticker':
      return `[貼圖] Package: ${message.packageId}, Sticker: ${message.stickerId}`;
    case 'emoji':
      return `[表情符號] ${message.text}`;
    default:
      return `[${message.type}] ${JSON.stringify(message)}`;
  }
};

// Get Line webhook status
router.get('/status', (req, res) => {
  const hasChannelSecret = !!process.env.LINE_CHANNEL_SECRET;
  const hasAccessToken = !!process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  res.json({
    status: 'active',
    webhook: {
      channelSecret: hasChannelSecret,
      accessToken: hasAccessToken,
      fullyConfigured: hasChannelSecret && hasAccessToken
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
