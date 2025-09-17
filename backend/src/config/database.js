const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Readonly guard: when DB_READONLY=true, block all mutations at Prisma layer
if (process.env.DB_READONLY === 'true') {
  prisma.$use(async (params, next) => {
    const action = params.action.toLowerCase();
    const isMutation = action.startsWith('create') || action.startsWith('update') || action.startsWith('delete') || action === 'execute' || action === '$executeRaw' || action === '$queryRawUnsafe' || action === '$executeRawUnsafe';
    if (isMutation) {
      const model = params.model || 'raw';
      throw new Error(`[DB_READONLY] Blocked ${action} on model ${model}`);
    }
    return next(params);
  });
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = { prisma };
