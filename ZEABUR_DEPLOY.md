# 🚀 Zeabur 快速部署指南

## 為什麼選擇 Zeabur 原生部署？

✅ **優點**：
- 🚀 **部署速度快**：通常 2-5 分鐘內上線
- 💰 **免費額度**：每月有免費使用額度
- 🔧 **自動化**：自動處理依賴安裝和構建
- 🌐 **全球 CDN**：自動分發到全球節點
- 📊 **監控完整**：內建日誌、性能監控

❌ **缺點**：
- 🔒 **安全性**：相比自建服務器安全性稍低
- 📈 **擴展性**：免費計劃有資源限制
- 🎯 **控制權**：對底層基礎設施控制較少

## 🚀 快速部署步驟

### 1. 安裝 Zeabur CLI
```bash
npm install -g @zeabur/cli
```

### 2. 登入 Zeabur
```bash
zeabur login
```

### 3. 一鍵部署
```bash
# 使用部署腳本
chmod +x deploy-zeabur.sh
./deploy-zeabur.sh

# 或手動部署
zeabur deploy
```

## 📁 部署檔案說明

- `zeabur.toml` - Zeabur 配置文件
- `.zeaburignore` - 忽略不需要部署的檔案
- `deploy-zeabur.sh` - 自動化部署腳本

## 🔧 部署後配置

### 1. 查看部署狀態
```bash
zeabur status
```

### 2. 查看日誌
```bash
zeabur logs
```

### 3. 打開管理面板
```bash
zeabur dashboard
```

### 4. 設定環境變數
在 Zeabur 管理面板中設定：
- `DATABASE_URL` - 連接到 Zeabur PostgreSQL
- `SECRET_KEY` - 安全金鑰
- 其他必要的 API 金鑰

## 🌐 服務架構

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   (Next.js)     │◄──►│   (FastAPI)     │
│   Static Files  │    │   API Server    │
└─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         └───────────────────────┼───► Zeabur PostgreSQL
                                 │
                                 └───► External APIs
                                      (Google Drive, LINE, OpenAI)
```

## 🚨 注意事項

1. **環境變數**：確保在 Zeabur 中正確設定所有環境變數
2. **資料庫連接**：使用 Zeabur 提供的 PostgreSQL 服務
3. **API 金鑰**：不要在代碼中硬編碼敏感資訊
4. **免費額度**：注意免費計劃的使用限制

## 🔄 更新部署

當你修改代碼後，只需要：
```bash
git add .
git commit -m "Update code"
zeabur deploy
```

Zeabur 會自動檢測變更並重新部署！

## 📞 支援

- 📖 [Zeabur 文檔](https://docs.zeabur.com/)
- 💬 [Zeabur Discord](https://discord.gg/zeabur)
- 🐛 [問題回報](https://github.com/zeabur/zeabur/issues)
