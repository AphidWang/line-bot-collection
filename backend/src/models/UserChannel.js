// 用戶頻道管理模型
const { prisma } = require('../config/database');
const crypto = require('crypto');

class UserChannel {
  // 加密函數
  static encrypt(text, key) {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  // 解密函數
  static decrypt(encryptedData, key) {
    const algorithm = 'aes-256-cbc';
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // 為用戶創建頻道
  static async createChannel(userId, channelData) {
    const { channelId, accessToken, channelSecret } = channelData;
    
    // 生成用戶專用的加密金鑰
    const userKey = crypto.randomBytes(32).toString('hex');
    
    // 加密敏感資料
    const encryptedAccessToken = this.encrypt(accessToken, userKey);
    const encryptedChannelSecret = this.encrypt(channelSecret, userKey);
    
    return await prisma.userChannel.create({
      data: {
        userId,
        channelId,
        accessToken: JSON.stringify(encryptedAccessToken),
        channelSecret: JSON.stringify(encryptedChannelSecret),
        userKey, // 存儲在 UserChannel 表中
        status: 'active',
        webhookUrl: `https://lucentis.zeabur.app/api/line/webhook/${channelId}`
      }
    });
  }

  // 獲取用戶頻道列表
  static async getUserChannels(userId) {
    return await prisma.userChannel.findMany({
      where: { userId },
      select: {
        id: true,
        channelId: true,
        status: true,
        webhookUrl: true,
        createdAt: true,
        updatedAt: true
        // 不返回敏感資料
      }
    });
  }

  // 獲取頻道憑證（僅在需要時解密）
  static async getChannelCredentials(channelId) {
    const channel = await prisma.userChannel.findUnique({
      where: { channelId }
    });

    if (!channel) return null;

    const userKey = channel.userKey;
    
    return {
      channelId: channel.channelId,
      accessToken: this.decrypt(JSON.parse(channel.accessToken), userKey),
      channelSecret: this.decrypt(JSON.parse(channel.channelSecret), userKey)
    };
  }

  // 更新頻道狀態
  static async updateChannelStatus(channelId, status) {
    return await prisma.userChannel.update({
      where: { channelId },
      data: { status }
    });
  }

  // 刪除頻道
  static async deleteChannel(userId, channelId) {
    return await prisma.userChannel.delete({
      where: {
        userId_channelId: {
          userId,
          channelId
        }
      }
    });
  }
}

module.exports = UserChannel;
