require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const UserChannel = require('./backend/src/models/UserChannel');

async function testUserChannel() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing UserChannel.createChannel...');
    
    const testData = {
      channelId: '2008019986',
      accessToken: '9vTWVEtCxu/MLRrAm6fBAol9vM/6hUnc6Hx9OoQR0XS/9V3+3xgrndK05a421vYThpAm9mO+GGry9DXTawiPVr8w/tvaKYZ/Qajrnt//ZlvAqYZXX45uxeCMff5Ne1FrgCVC8R+qX6SSwkqjGJw8dgdB04t89/1O/w1cDnyilFU=',
      channelSecret: '13adcc0df62c107fb3a72d0a03cb2666'
    };
    
    const userId = 'cmf42ca3v000014kg596xjjbz';
    
    // 先清理現有資料
    await prisma.userChannel.deleteMany({
      where: { userId, channelId: testData.channelId }
    });
    console.log('🧹 Cleaned existing data');
    
    // 先創建 Channel
    await prisma.channel.upsert({
      where: { lineId: testData.channelId },
      update: {},
      create: {
        lineId: testData.channelId,
        name: `Channel ${testData.channelId}`,
        status: 'active'
      }
    });
    
    console.log('✅ Channel created/updated');
    
    // 測試 UserChannel.createChannel
    const channel = await UserChannel.createChannel(userId, testData);
    
    console.log('✅ UserChannel created successfully:', {
      id: channel.id,
      channelId: channel.channelId,
      status: channel.status,
      webhookUrl: channel.webhookUrl
    });
    
    // 測試解密
    const credentials = await UserChannel.getChannelCredentials(testData.channelId);
    console.log('✅ Credentials decrypted:', {
      channelId: credentials.channelId,
      accessToken: credentials.accessToken.substring(0, 20) + '...',
      channelSecret: credentials.channelSecret
    });
    
    // 驗證資料庫中的資料
    const dbChannel = await prisma.userChannel.findFirst({
      where: { userId, channelId: testData.channelId }
    });
    console.log('✅ Database verification:', {
      id: dbChannel.id,
      hasAccessToken: !!dbChannel.accessToken,
      hasChannelSecret: !!dbChannel.channelSecret,
      hasUserKey: !!dbChannel.userKey
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserChannel();
