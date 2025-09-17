/*
  Backfill orphan messages (groupId = null) into DM groups per channel lineId.
  Usage:
    node src/scripts/backfill_orphans.js                # all channels
    CHANNEL_LINE_ID=2008019986 node src/scripts/backfill_orphans.js
*/

const { PrismaClient } = require('@prisma/client');

async function backfillForChannel(prisma, channelLineId) {
  const channel = await prisma.channel.findUnique({ where: { lineId: channelLineId } });
  if (!channel) {
    console.log(`- Channel not found for lineId=${channelLineId}`);
    return;
  }

  const orphans = await prisma.message.findMany({
    where: { channelId: channel.id, groupId: null },
    select: { id: true, userId: true }
  });

  if (orphans.length === 0) {
    console.log(`- No orphan messages for lineId=${channelLineId}`);
    return;
  }

  // Group by userId to create/join one DM group per user
  const userToMessages = new Map();
  for (const msg of orphans) {
    if (!userToMessages.has(msg.userId)) userToMessages.set(msg.userId, []);
    userToMessages.get(msg.userId).push(msg);
  }

  let total = 0;
  for (const [userId, msgs] of userToMessages.entries()) {
    const dmLineId = `${channelLineId}:${userId}`;
    let group = await prisma.group.findUnique({ where: { lineId: dmLineId } });
    if (!group) {
      group = await prisma.group.create({
        data: {
          lineId: dmLineId,
          name: `DM ${userId.slice(-8)}`,
          channelId: channel.id,
          status: 'active'
        }
      });
    }

    for (const m of msgs) {
      await prisma.message.update({ where: { id: m.id }, data: { groupId: group.id } });
      total += 1;
    }
  }

  console.log(`- Backfilled ${total} messages for lineId=${channelLineId}`);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const onlyLineId = process.env.CHANNEL_LINE_ID;
    if (onlyLineId) {
      console.log(`Backfilling for channel lineId=${onlyLineId}...`);
      await backfillForChannel(prisma, onlyLineId);
    } else {
      console.log('Backfilling for all channels...');
      const channels = await prisma.channel.findMany({ select: { lineId: true } });
      for (const c of channels) {
        await backfillForChannel(prisma, c.lineId);
      }
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();


