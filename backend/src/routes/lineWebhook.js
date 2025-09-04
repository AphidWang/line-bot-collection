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

// Line webhook endpoint (temporarily disabled signature verification for testing)
router.post('/webhook', async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'No events found in request body'
      });
    }

    // Process each event
    for (const event of events) {
      await processLineEvent(event);
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
const processLineEvent = async (event) => {
  try {
    // Only process message events
    if (event.type !== 'message') {
      return;
    }

    const { message, source, replyToken, timestamp } = event;
    const channelId = source.groupId || source.roomId || source.userId;
    const userId = source.userId;

    // Skip if no channel ID (direct message)
    if (!channelId) {
      return;
    }

    // Find or create channel
    let channel = await prisma.channel.findUnique({
      where: { lineId: channelId }
    });

    if (!channel) {
      // Get channel info from Line API (you might want to implement this)
      channel = await prisma.channel.create({
        data: {
          lineId: channelId,
          name: `Channel ${channelId.slice(-8)}`, // Fallback name
          status: 'active'
        }
      });
    }

    // Create or update user
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      // Create placeholder user for Line users
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@line.local`, // Placeholder email
          name: `User ${userId.slice(-8)}`, // Fallback name
          password: null // No password for Line users
        }
      });
    }

    // Create message
    const messageData = {
      lineId: message.id,
      channelId: channel.id,
      userId: user.id,
      type: message.type,
      content: extractMessageContent(message),
      metadata: message,
      timestamp: new Date(timestamp)
    };

    await prisma.message.create({
      data: messageData
    });

    console.log(`✅ Message stored: ${message.id} in channel ${channel.name}`);

  } catch (error) {
    console.error('Error processing Line event:', error);
  }
};

// Extract message content based on type
const extractMessageContent = (message) => {
  switch (message.type) {
    case 'text':
      return message.text;
    case 'image':
      return message.contentProvider?.originalContentUrl || 'Image message';
    case 'video':
      return message.contentProvider?.originalContentUrl || 'Video message';
    case 'audio':
      return message.contentProvider?.originalContentUrl || 'Audio message';
    case 'file':
      return message.fileName || 'File message';
    case 'location':
      return `${message.title}: ${message.address}`;
    case 'sticker':
      return `Sticker: ${message.stickerId}`;
    default:
      return JSON.stringify(message);
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
