# Line Assistant Backend

Node.js 後端 API 服務，提供 Line 訊息管理、AI 總結等功能。

## 功能特色

- 🔐 JWT 認證 + Firebase 第三方登入
- 📱 Line Official Account 訊息接收與儲存
- 🔍 訊息搜尋與用戶搜尋
- 📊 Channel 管理與追蹤
- 🤖 OpenAI 整合的 AI 總結功能
- 📈 完整的統計分析

## 技術架構

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **資料庫**: PostgreSQL + Prisma ORM
- **認證**: JWT + Firebase Admin SDK
- **AI**: OpenAI GPT API
- **驗證**: express-validator
- **安全性**: Helmet, CORS, Rate Limiting

## 快速開始

### 前置需求

- Node.js 18+
- PostgreSQL 12+
- Line Official Account
- OpenAI API Key (可選)
- Firebase 專案 (可選)

### 安裝

1. 安裝依賴
```bash
npm install
```

2. 複製環境變數
```bash
cp .env.example .env
```

3. 設定環境變數
```bash
# 必要設定
POSTGRES_CONNECTION_STRING="postgresql://username:password@localhost:5432/line_assistant"
JWT_SECRET="your-super-secret-jwt-key-here"

# 可選設定
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"
OPENAI_API_KEY="your-openai-api-key"
LINE_CHANNEL_SECRET="your-line-channel-secret"
LINE_CHANNEL_ACCESS_TOKEN="your-line-channel-access-token"
```

4. 設定資料庫
```bash
# 建立資料庫
npx prisma db push

# 或使用 migration
npx prisma migrate dev
```

5. 啟動服務
```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

## API 端點

### 認證
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/firebase` - Firebase 認證
- `GET /api/auth/profile` - 取得用戶資料

### 訊息
- `GET /api/messages` - 取得訊息列表
- `GET /api/messages/search` - 搜尋訊息
- `GET /api/messages/channel/:id` - 取得 Channel 訊息
- `GET /api/messages/:id` - 取得單一訊息

### Channel
- `GET /api/channels` - 取得 Channel 列表
- `GET /api/channels/with-new-messages` - 取得有新訊息的 Channel
- `GET /api/channels/:id` - 取得 Channel 詳情
- `POST /api/channels/:id/track` - 切換 Channel 追蹤
- `GET /api/channels/:id/stats` - 取得 Channel 統計

### 用戶
- `GET /api/users/search` - 搜尋用戶
- `GET /api/users/:id` - 取得用戶詳情
- `GET /api/users/:id/messages` - 取得用戶訊息
- `GET /api/users/:id/stats` - 取得用戶統計

### AI 總結
- `GET /api/summaries` - 取得總結列表
- `POST /api/summaries/generate` - 生成新總結
- `GET /api/summaries/:id` - 取得總結詳情
- `DELETE /api/summaries/:id` - 刪除總結
- `GET /api/summaries/stats/overview` - 取得總結統計

### Line Webhook
- `POST /api/line/webhook` - Line 訊息接收
- `GET /api/line/status` - Webhook 狀態

## 資料庫結構

### Users
- 用戶基本資訊
- 支援傳統帳密和 Firebase 認證

### Channels
- Line Channel 資訊
- 狀態管理和追蹤設定

### Messages
- 訊息內容和元資料
- 支援多種訊息類型

### UserChannels
- 用戶與 Channel 的追蹤關係
- 可控制是否追蹤特定 Channel

### Summaries
- AI 生成的總結記錄
- 支援按日期和 Channel 分類

## 開發

### 腳本

```bash
# 開發模式
npm run dev

# 資料庫操作
npm run db:migrate    # 執行 migration
npm run db:deploy     # 部署 migration
npm run db:studio     # 開啟 Prisma Studio
npm run db:seed       # 執行 seed 腳本

# 程式碼品質
npm run lint          # 檢查程式碼
npm run lint:fix      # 自動修正
npm run test          # 執行測試
```

### 環境變數

| 變數 | 說明 | 必要 |
|------|------|------|
| `PORT` | 服務埠號 | ❌ (預設: 3001) |
| `POSTGRES_CONNECTION_STRING` | PostgreSQL 連線字串 | ✅ |
| `JWT_SECRET` | JWT 簽名金鑰 | ✅ |
| `JWT_EXPIRES_IN` | JWT 過期時間 | ❌ (預設: 7d) |
| `FIREBASE_PROJECT_ID` | Firebase 專案 ID | ❌ |
| `FIREBASE_PRIVATE_KEY` | Firebase 私鑰 | ❌ |
| `FIREBASE_CLIENT_EMAIL` | Firebase 客戶端郵件 | ❌ |
| `OPENAI_API_KEY` | OpenAI API 金鑰 | ❌ |
| `OPENAI_MODEL` | OpenAI 模型 | ❌ (預設: gpt-3.5-turbo) |
| `LINE_CHANNEL_SECRET` | Line Channel Secret | ❌ |
| `LINE_CHANNEL_ACCESS_TOKEN` | Line Channel Access Token | ❌ |

## 部署

### Docker

```bash
# 建立映像
docker build -t line-assistant-backend .

# 執行容器
docker run -p 3001:3001 --env-file .env line-assistant-backend
```

### 生產環境

1. 設定 `NODE_ENV=production`
2. 使用 PM2 或類似工具管理程序
3. 設定反向代理 (Nginx/Apache)
4. 啟用 HTTPS
5. 設定資料庫連線池

## 監控與日誌

- 使用 Morgan 記錄 HTTP 請求
- 結構化錯誤處理和日誌
- 健康檢查端點 `/health`
- 效能監控和限流

## 安全性

- Helmet 安全標頭
- CORS 跨域控制
- Rate Limiting 限流
- JWT 認證
- 輸入驗證和清理
- SQL 注入防護 (Prisma)

## 貢獻

1. Fork 專案
2. 建立功能分支
3. 提交變更
4. 發起 Pull Request

## 授權

MIT License
