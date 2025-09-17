const { prisma } = require('../config/database');
const jwt = require('jsonwebtoken');

async function main() {
  const email = 'test+groups@ex.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Test user not found, run auth register first');

  // Upsert a channel
  const channel = await prisma.channel.upsert({
    where: { lineId: 'line-ch-1' },
    update: { name: 'Demo Channel' },
    create: {
      lineId: 'line-ch-1',
      name: 'Demo Channel',
      status: 'active',
    },
  });

  // Upsert a group
  const group = await prisma.group.upsert({
    where: { lineId: 'line-group-1' },
    update: { name: 'Demo Group', channelId: channel.id },
    create: {
      lineId: 'line-group-1',
      name: 'Demo Group',
      channelId: channel.id,
      status: 'active',
    },
  });

  // Create a couple of messages
  const now = new Date();
  const msg1 = await prisma.message.create({
    data: {
      lineId: 'm-line-1',
      channelId: channel.id,
      groupId: group.id,
      userId: user.id,
      userName: user.name || 'Test',
      userAvatar: user.avatar || null,
      type: 'text',
      content: 'hello world',
      timestamp: new Date(now.getTime() - 60 * 60 * 1000),
    },
  });

  const msg2 = await prisma.message.create({
    data: {
      lineId: 'm-line-2',
      channelId: channel.id,
      groupId: group.id,
      userId: user.id,
      userName: user.name || 'Test',
      userAvatar: user.avatar || null,
      type: 'text',
      content: 'new message',
      timestamp: now,
    },
  });

  // Upsert user read at msg1 time -> so msg2 is unread
  await prisma.userRead.upsert({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
    update: { lastReadMessageId: msg1.id, lastReadAt: msg1.timestamp },
    create: {
      userId: user.id,
      groupId: group.id,
      lastReadMessageId: msg1.id,
      lastReadAt: msg1.timestamp,
    },
  });

  console.log('Seeded minimal channel/group/messages/userRead:', {
    channelId: channel.id,
    groupId: group.id,
    msg1: msg1.id,
    msg2: msg2.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


