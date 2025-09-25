const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { prisma } = require('../config/database');
const { uploadBufferToR2, createSignedGetUrl } = require('../services/r2Service');

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
    } else {
      // TTL refresh for group info (name/pictureUrl)
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const lastUpdatedAt = group.updatedAt ? new Date(group.updatedAt).getTime() : 0;
      if (Date.now() - lastUpdatedAt > ONE_DAY_MS) {
        try {
          if (isGroup) {
            const groupInfo = await getGroupInfo(lineGroupId, webhookChannelId);
            if (groupInfo) {
              group = await prisma.group.update({
                where: { id: group.id },
                data: {
                  name: groupInfo.name || group.name,
                  pictureUrl: groupInfo.pictureUrl || group.pictureUrl
                }
              });
            }
          } else {
            const userInfo = await getUserInfo(userId, webhookChannelId);
            if (userInfo) {
              group = await prisma.group.update({
                where: { id: group.id },
                data: {
                  name: userInfo.name ? `DM - ${userInfo.name}` : group.name,
                  pictureUrl: userInfo.avatar || group.pictureUrl
                }
              });
            }
          }
        } catch (e) {
          console.warn('⚠️ Failed to refresh group info (TTL). Proceeding without update.', e);
        }
      }
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
    } else {
      // TTL refresh for user profile (name/avatar) — tighten to 5 minutes for fresher names
      const PROFILE_REFRESH_MS = 5 * 60 * 1000;
      const lastUpdatedAt = user.updatedAt ? new Date(user.updatedAt).getTime() : 0;
      if (Date.now() - lastUpdatedAt > PROFILE_REFRESH_MS) {
        try {
          const userInfo = await getUserInfo(userId, webhookChannelId);
          if (userInfo) {
            const nextName = userInfo.name || user.name;
            const nextAvatar = userInfo.avatar || user.avatar;
            if (nextName !== user.name || nextAvatar !== user.avatar) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  name: nextName,
                  avatar: nextAvatar
                }
              });
            }
          }
        } catch (e) {
          console.warn('⚠️ Failed to refresh user profile (TTL). Proceeding without update.', e);
        }
      }
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

    // If attachment types, fetch binary from LINE and upload to R2
    if (['image', 'video', 'audio', 'file'].includes(message.type)) {
      try {
        const content = await fetchLineContent(message.id, webhookChannelId);
        if (content?.data) {
          const ext = guessExtFromContentType(content.contentType, message.fileName);
          const key = `${webhookChannelId}/${lineGroupId}/${message.id}${ext ? '.' + ext : ''}`;
          const uploaded = await uploadBufferToR2(content.data, key, content.contentType);
          if (uploaded) {
            // 統一存 key，讀取時再簽名；若有公共 URL 也一併存
            const signed = await createSignedGetUrl(uploaded.key, 900);
            messageData.metadata = { ...messageData.metadata, r2: { url: uploaded.url, key: uploaded.key, signedUrl: signed, contentType: content.contentType, size: content.data.length } };
            const label = message.type === 'image' ? '圖片' : message.type === 'video' ? '影片' : message.type === 'audio' ? '語音' : '檔案';
            messageData.content = `[${label}] ${signed || uploaded.url || uploaded.key}`;
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to fetch/upload attachment to R2:', e?.message || e);
      }
    }

    await prisma.message.create({
      data: messageData
    });

    console.log(`✅ Message stored: ${message.id} in channel ${channel.name}${group ? `, group ${group.name}` : ''}`);

  } catch (error) {
    console.error('Error processing Line event:', error);
  }
};

// Fetch binary content for a message from LINE content API
const fetchLineContent = async (messageId, channelId) => {
  try {
    const UserChannel = require('../models/UserChannel');
    const credentials = await UserChannel.getChannelCredentials(channelId);
    if (!credentials?.accessToken) {
      console.warn('No access token available for content fetch');
      return null;
    }
    // LINE content API must use api-data domain
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const resp = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
      validateStatus: () => true,
    });
    if (resp.status >= 200 && resp.status < 300) {
      return { data: Buffer.from(resp.data), contentType: resp.headers['content-type'] };
    }
    console.warn('LINE content fetch failed', resp.status);
  } catch (e) {
    console.error('Error fetching LINE content:', e?.message || e);
  }
  return null;
};

const guessExtFromContentType = (contentType, fileName) => {
  if (fileName && fileName.includes('.')) return fileName.split('.').pop();
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'video/mp4':
      return 'mp4';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/aac':
      return 'aac';
    case 'application/pdf':
      return 'pdf';
    default:
      return '';
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
