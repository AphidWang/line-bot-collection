const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  // 設置環境變數
  process.env.POSTGRES_CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://root:3w04HbJrmGjeT9yshzY1u5N7X2UF68SO@hkg1.clusters.zeabur.com:31127/zeabur';
  
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // 檢查 user_channels 表是否存在
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_channels'
    `;
    
    console.log('📊 Tables found:', result);
    
    // 檢查 UserChannel 模型是否可用
    try {
      const channels = await prisma.userChannel.findMany();
      console.log('✅ UserChannel model works, found', channels.length, 'channels');
    } catch (error) {
      console.error('❌ UserChannel model error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
