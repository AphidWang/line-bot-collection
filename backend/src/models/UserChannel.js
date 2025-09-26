// 用戶頻道管理模型
const { prisma } = require('../config/database');
const crypto = require('crypto');

class UserChannel {
  // 獲取主密鑰（支援多版本）
  static getMasterKey(version = '1') {
    const masterKey = process.env[`ENCRYPTION_MASTER_KEY_V${version}`] || process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) {
      throw new Error(`ENCRYPTION_MASTER_KEY_V${version} or ENCRYPTION_MASTER_KEY environment variable is required`);
    }
    
    // 加上應用特定的 salt，增加安全性
    const appSalt = process.env.APP_SALT || 'default-salt-change-in-production';
    const combinedKey = masterKey + appSalt;
    
    // 使用 PBKDF2 衍生最終密鑰
    return crypto.pbkdf2Sync(combinedKey, 'line-assistant-salt', 100000, 32, 'sha256');
  }

  // 獲取所有可用的密鑰版本
  static getAllMasterKeys() {
    const keys = {};
    const versions = ['1', '2', '3', '4', '5']; // 支援最多 5 個版本
    
    for (const version of versions) {
      try {
        keys[version] = this.getMasterKey(version);
      } catch (error) {
        // 忽略不存在的版本
      }
    }
    
    return keys;
  }

  // 加密函數（加上版本標記）
  static encrypt(text, version = '1') {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const masterKey = this.getMasterKey(version);
    const cipher = crypto.createCipheriv(algorithm, masterKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      version // 加上版本標記
    };
  }

  // 解密函數（支援多版本 + 向後相容）
  static decrypt(encryptedData, userKey = null) {
    const algorithm = 'aes-256-cbc';
    const iv = Buffer.from(encryptedData.iv, 'hex');
    
    // 如果有 userKey，先嘗試舊方法（向後相容）
    if (userKey) {
      try {
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(userKey, 'hex'), iv);
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (error) {
        console.log('Old encryption method failed, trying new method...');
      }
    }
    
    // 嘗試新方法（環境變數密鑰）
    const version = encryptedData.version || '1';
    
    try {
      const masterKey = this.getMasterKey(version);
      const decipher = crypto.createDecipheriv(algorithm, masterKey, iv);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      // 如果指定版本失敗，嘗試所有可用版本
      const allKeys = this.getAllMasterKeys();
      
      for (const [keyVersion, key] of Object.entries(allKeys)) {
        try {
          const decipher = crypto.createDecipheriv(algorithm, key, iv);
          let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return decrypted;
        } catch (e) {
          // 繼續嘗試下一個版本
        }
      }
      
      throw new Error(`Failed to decrypt with any available key version. Original error: ${error.message}`);
    }
  }

  // 為用戶創建頻道
  static async createChannel(userId, channelData) {
    const { channelId, accessToken, channelSecret, alias } = channelData;
    
    // 加密敏感資料（使用最新版本）
    const currentVersion = process.env.ENCRYPTION_KEY_VERSION || '1';
    const encryptedAccessToken = this.encrypt(accessToken, currentVersion);
    const encryptedChannelSecret = this.encrypt(channelSecret, currentVersion);
    
    return await prisma.userChannel.create({
      data: {
        userId,
        channelId,
        alias,
        accessToken: JSON.stringify(encryptedAccessToken),
        channelSecret: JSON.stringify(encryptedChannelSecret),
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
        alias: true,
        isTracked: true,
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
    const channel = await prisma.userChannel.findFirst({
      where: { channelId }
    });

    if (!channel) return null;
    
    return {
      channelId: channel.channelId,
      accessToken: this.decrypt(JSON.parse(channel.accessToken), channel.userKey),
      channelSecret: this.decrypt(JSON.parse(channel.channelSecret), channel.userKey)
    };
  }

  // 更新頻道狀態
  static async updateChannelStatus(userId, channelId, status) {
    return await prisma.userChannel.update({
      where: {
        userId_channelId: {
          userId,
          channelId
        }
      },
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

  // 更新別名
  static async updateAlias(userId, channelId, alias) {
    return await prisma.userChannel.update({
      where: {
        userId_channelId: {
          userId,
          channelId
        }
      },
      data: { alias }
    });
  }

  // 更新 Access Token
  static async updateAccessToken(userId, channelId, accessToken) {
    // 加密新的 accessToken（使用最新版本）
    const currentVersion = process.env.ENCRYPTION_KEY_VERSION || '1';
    const encryptedAccessToken = this.encrypt(accessToken, currentVersion);

    return await prisma.userChannel.update({
      where: {
        userId_channelId: {
          userId,
          channelId
        }
      },
      data: { 
        accessToken: JSON.stringify(encryptedAccessToken)
      }
    });
  }
}

module.exports = UserChannel;
