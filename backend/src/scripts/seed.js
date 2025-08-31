const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create test users
    const users = [
      {
        email: 'test1@example.com',
        password: 'password123',
        name: 'Test User 1'
      },
      {
        email: 'test2@example.com',
        password: 'password123',
        name: 'Test User 2'
      }
    ];

    for (const userData of users) {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            name: userData.name
          }
        });

        console.log('✅ Test user created:', user.email);
      } else {
        console.log('ℹ️ Test user already exists:', userData.email);
      }
    }

    // Create test channels
    const channels = [
      {
        lineId: 'test-channel-1',
        name: 'Test Channel 1',
        status: 'active'
      },
      {
        lineId: 'test-channel-2',
        name: 'Test Channel 2',
        status: 'active'
      },
      {
        lineId: 'test-channel-3',
        name: 'Test Channel 3',
        status: 'inactive'
      }
    ];

    for (const channelData of channels) {
      const existingChannel = await prisma.channel.findUnique({
        where: { lineId: channelData.lineId }
      });

      if (!existingChannel) {
        const channel = await prisma.channel.create({
          data: channelData
        });

        console.log('✅ Test channel created:', channel.name);
      } else {
        console.log('ℹ️ Test channel already exists:', channelData.name);
      }
    }

    // Create test messages
    const testChannel = await prisma.channel.findFirst({
      where: { lineId: 'test-channel-1' }
    });

    if (testChannel) {
      const testMessages = [
        {
          lineId: 'msg-001',
          channelId: testChannel.id,
          userId: 'test-user-001',
          userName: 'Test User',
          type: 'text',
          content: 'Hello, this is a test message!',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          lineId: 'msg-002',
          channelId: testChannel.id,
          userId: 'test-user-002',
          userName: 'Another User',
          type: 'text',
          content: 'This is another test message for testing purposes.',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
        },
        {
          lineId: 'msg-003',
          channelId: testChannel.id,
          userId: 'test-user-001',
          userName: 'Test User',
          type: 'text',
          content: 'Testing the message system with multiple messages.',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
        }
      ];

      for (const messageData of testMessages) {
        const existingMessage = await prisma.message.findUnique({
          where: { lineId: messageData.lineId }
        });

        if (!existingMessage) {
          const message = await prisma.message.create({
            data: messageData
          });

          console.log('✅ Test message created:', message.lineId);
        } else {
          console.log('ℹ️ Test message already exists:', messageData.lineId);
        }
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Test data created:');
    console.log('- Test users with password: password123');
    console.log('- Test channels');
    console.log('- Sample messages');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
