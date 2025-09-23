const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.POSTGRES_CONNECTION_STRING
    }
  },
  // 優化連線池設定
  __internal: {
    engine: {
      connection_limit: 20, // 增加連線池大小
      pool_timeout: 20, // 連線超時時間（秒）
      connect_timeout: 60, // 連線建立超時時間（秒）
    }
  }
});

// 連線重試機制
prisma.$use(async (params, next) => {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await next(params);
    } catch (error) {
      lastError = error;
      
      // 檢查是否為連線相關錯誤
      const isConnectionError = error.message.includes('Connection reset by peer') ||
                               error.message.includes('Connection terminated') ||
                               error.message.includes('Connection refused') ||
                               error.code === 'P1001' || // Prisma connection error
                               error.code === 'P1002';   // Prisma connection timeout
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`Database connection error (attempt ${attempt}/${maxRetries}):`, error.message);
        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
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
