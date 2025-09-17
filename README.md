# Line Assistant

一個整合 Line 官方帳號訊息管理的現代化平台，提供訊息儲存、搜尋、AI 總結等功能。

## ✨ 功能特色

- 🔐 **JWT 認證** + Firebase 第三方登入
- 📱 **Line 訊息管理** - 自動接收和儲存群組/私訊
- 🔍 **智能搜尋** - 跨 Channel 關鍵字搜尋
- 📊 **Channel 管理** - 追蹤狀態和統計分析
- 🤖 **AI 總結** - OpenAI 整合的智能總結
- 📈 **完整統計** - 用戶活躍度和訊息分析
- 👥 **群組/私訊支援** - 自動識別並分類訊息類型

## 🏗️ 核心架構

### 訊息流程
1. **LINE Webhook** → 接收 LINE Bot 訊息事件
2. **類型識別** → 根據 `source.type` 判斷群組/私訊/多人對話
3. **自動建群** → 群組用 LINE `groupId`，私訊用 `{channelLineId}:{userId}`
4. **訊息儲存** → 關聯到對應群組，支援 emoji/Unicode
5. **用戶補強** → 即時從 LINE API 取得顯示名稱/頭像

### 資料模型
- **Channel**: LINE Bot 帳號 (以 `lineId` 為外鍵)
- **Group**: 群組/私訊容器 (群組用 LINE `groupId`，私訊用合成 ID)
- **Message**: 訊息內容 (關聯 Channel + Group + User)
- **UserChannel**: 用戶頻道關聯 (追蹤狀態、憑證加密儲存)

## 🚀 快速開始

### 前置需求

- Node.js 18+
- PostgreSQL 12+
- Docker (可選)

### 1. 克隆專案

```bash
git clone <repository-url>
cd LineAssistant
```

### 2. 安裝依賴

```bash
make install
```

### 3. 環境配置

```bash
cp backend/.env.example backend/.env
# 編輯 backend/.env 檔案，設定必要的環境變數
```

### 4. 啟動服務

```bash
# 啟動完整開發環境
make dev

# 或分別啟動
make backend    # 後端服務
make frontend   # 前端服務
```

### 5. 驗證部署

```bash
# 健康檢查
curl http://localhost:3001/health

# 執行測試
make test
```

## 📁 專案結構

```
LineAssistant/
├── frontend/                    # Next.js 前端應用
│   ├── app/components/dashboard/ # 主要 UI 組件
│   │   ├── Dashboard.tsx        # 主控台
│   │   ├── GroupList.tsx        # 群組列表
│   │   ├── ChatInterface.tsx    # 聊天介面
│   │   └── ChannelManager.tsx   # 頻道管理
│   └── app/lib/api.ts          # API 客戶端
├── backend/                     # Node.js 後端 API
│   ├── src/routes/             # API 路由
│   │   ├── lineWebhook.js      # LINE Webhook 處理
│   │   ├── messages.js         # 訊息管理
│   │   ├── groups.js           # 群組管理
│   │   └── userChannels.js     # 用戶頻道
│   ├── src/models/             # 資料模型
│   ├── src/scripts/            # 維護腳本
│   │   └── backfill_orphans.js # 回填孤立訊息
│   └── prisma/                 # 資料庫 Schema
├── deploy.sh                   # 統一部署腳本
├── Makefile                    # 建置管理
└── docs/                       # 專案文檔
```

## 🔧 關鍵技術實現

### LINE Webhook 處理
- **Raw Body 簽名驗證**: 使用 `express.raw()` 避免 emoji/Unicode 破壞簽名
- **類型識別**: 嚴格按 `source.type` (`user`/`group`/`room`) 分類
- **自動建群**: 群組用 LINE ID，私訊用合成 ID `{channel}:{user}`
- **詳細日誌**: 完整記錄原始事件與解析結果

### API 設計
- **統一查詢**: `/api/messages` 與 `/api/groups` 支援 `lineId` 查詢
- **用戶補強**: 即時從 LINE API 取得 `displayName`/`pictureUrl`
- **分頁支援**: 標準化分頁參數與回應格式

### 前端整合
- **頻道選擇**: 下拉選單使用 `lineId`，自動對應到內部資料
- **即時更新**: WebSocket 或輪詢機制顯示新訊息
- **響應式 UI**: 群組列表 + 聊天介面的現代化設計

## 🛠️ 開發命令

```bash
make help              # 顯示所有可用命令
make install           # 安裝依賴
make dev               # 啟動開發環境
make docker            # Docker 部署
make build             # 建置 Docker 映像
make test              # 執行測試
make clean             # 清理建置檔案
```

## 🔧 維護工具

### 回填孤立訊息
```bash
# 回填所有頻道的孤立訊息 (groupId=null)
node backend/src/scripts/backfill_orphans.js

# 回填特定頻道
CHANNEL_LINE_ID=2008019986 node backend/src/scripts/backfill_orphans.js
```

### 資料庫操作
```bash
# 同步 Schema
cd backend && npx prisma db push

# 產生 Migration
cd backend && npx prisma migrate dev

# 部署 Migration
cd backend && npx prisma migrate deploy
```

## 🐳 Docker 部署

```bash
# 啟動 Docker 服務
make docker

# 查看服務狀態
docker-compose ps

# 查看日誌
make logs
```

## 🌐 服務端點

- **前端**: http://localhost:3000
- **後端**: http://localhost:3001
- **健康檢查**: http://localhost:3001/health
- **LINE Webhook**: https://your-domain.com/api/line/webhook/{channelLineId}

## 🔐 環境變數

### 必要變數
```bash
# 資料庫
POSTGRES_CONNECTION_STRING=postgresql://...

# JWT
JWT_SECRET=your-secret-key

# LINE Bot (每個 Channel)
LINE_CHANNEL_SECRET=your-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-access-token

# OpenAI (AI 總結)
OPENAI_API_KEY=your-openai-key
```

### 可選變數
```bash
# 開發模式
NODE_ENV=development
DB_READONLY=false

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📚 詳細文檔

- [專案架構與設計指南](PROJECT_ARCHITECTURE.md)
- [部署指南](DEPLOYMENT_GUIDE.md)
- [環境變數說明](ENVIRONMENT_VARIABLES.md)
- [後端 API 文檔](backend/README.md)

## 🔧 技術架構

- **前端**: Next.js 14 + Tailwind CSS + TypeScript
- **後端**: Node.js + Express.js + Prisma ORM
- **資料庫**: PostgreSQL
- **認證**: JWT + Firebase Auth
- **AI**: OpenAI GPT API
- **容器化**: Docker + Docker Compose
- **部署**: Zeabur / Docker

## 🐛 故障排除

### 常見問題

1. **Emoji 訊息收不到**
   - 確認 webhook 使用 raw body 簽名驗證
   - 檢查 LINE Bot 設定是否正確

2. **群組訊息被誤判為私訊**
   - 確認 `source.type` 解析邏輯
   - 檢查 LINE payload 格式

3. **前端顯示 0 則訊息**
   - 確認 `lineId` 查詢支援
   - 檢查頻道選擇與 API 參數對應

4. **用戶名稱顯示為亂碼**
   - 確認 LINE API token 權限
   - 檢查即時補強邏輯

### 除錯工具
```bash
# 查看 webhook 日誌
tail -f backend/logs/webhook.log

# 檢查資料庫狀態
node backend/test-db.js

# 測試 API 端點
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/channels
```

## 🤝 貢獻

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權

此專案採用 MIT 授權 - 查看 [LICENSE](LICENSE) 檔案了解詳情。

## 📞 支援

如有問題或建議，請：
- 開啟 [Issue](../../issues)
- 聯絡開發團隊
- 查看 [文檔](docs/)

---

**Line Assistant** - 讓 Line 訊息管理更智能、更高效 🚀