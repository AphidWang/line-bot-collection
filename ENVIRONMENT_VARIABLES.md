# 環境變數配置指南

## 📋 概述

Line Assistant 專案需要配置環境變數來支援不同的功能和部署環境。本文檔詳細說明所有需要的環境變數。

## 🏗️ 架構說明

在 Zeabur 部署中，我們使用三個獨立的服務：
1. **後端服務** - Node.js API 服務
2. **前端服務** - Next.js 前端應用
3. **資料庫服務** - PostgreSQL 資料庫

## 🔧 後端環境變數

### 必需變數

| 變數名稱 | 說明 | 範例值 |
|---------|------|--------|
| `PORT` | 服務埠號 | `3001` |
| `NODE_ENV` | 環境模式 | `production` |
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | JWT 簽名密鑰 | `your-super-secret-key` |

### 可選變數

| 變數名稱 | 說明 | 預設值 |
|---------|------|--------|
| `HOST` | 綁定主機 | `0.0.0.0` |
| `JWT_EXPIRES_IN` | JWT 過期時間 | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | 刷新 Token 過期時間 | `30d` |
| `CORS_ORIGIN` | CORS 允許的來源 | `http://localhost:3000` |

### Firebase 配置（可選）

| 變數名稱 | 說明 |
|---------|------|
| `FIREBASE_PROJECT_ID` | Firebase 專案 ID |
| `FIREBASE_PRIVATE_KEY` | Firebase 私鑰 |
| `FIREBASE_CLIENT_EMAIL` | Firebase 客戶端郵箱 |
| `FIREBASE_STORAGE_BUCKET` | Firebase 儲存桶 |

### OpenAI 配置

| 變數名稱 | 說明 | 預設值 |
|---------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 金鑰 | 必需 |
| `OPENAI_MODEL` | 使用的模型 | `gpt-3.5-turbo` |
| `OPENAI_MAX_TOKENS` | 最大 Token 數 | `4000` |
| `OPENAI_TEMPERATURE` | 創意度參數 | `0.7` |

### Line Bot 配置

| 變數名稱 | 說明 |
|---------|------|
| `LINE_CHANNEL_SECRET` | Line Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | Line Channel Access Token |
| `LINE_WEBHOOK_URL` | Line Webhook URL |

### 安全與限制

| 變數名稱 | 說明 | 預設值 |
|---------|------|--------|
| `RATE_LIMIT_WINDOW_MS` | 速率限制時間窗口 | `900000` (15分鐘) |
| `RATE_LIMIT_MAX_REQUESTS` | 最大請求數 | `100` |

## 🌐 前端環境變數

### 必需變數

| 變數名稱 | 說明 | 範例值 |
|---------|------|--------|
| `NEXT_PUBLIC_API_URL` | 後端 API 的完整 URL | `https://backend.zeabur.app` |

### 可選變數

| 變數名稱 | 說明 | 預設值 |
|---------|------|--------|
| `NEXT_PUBLIC_APP_NAME` | 應用名稱 | `Line Assistant` |
| `NEXT_PUBLIC_APP_VERSION` | 應用版本 | `1.0.0` |
| `NEXT_PUBLIC_ENABLE_FIREBASE_AUTH` | 啟用 Firebase 認證 | `true` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | 啟用分析 | `false` |

### Firebase 配置（可選）

| 變數名稱 | 說明 |
|---------|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API 金鑰 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 認證域名 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 專案 ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase 儲存桶 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase 發送者 ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase 應用 ID |

## 🚀 Zeabur 部署配置

### 1. 後端服務配置

在 Zeabur 後端服務中設定以下環境變數：
```bash
# 複製 backend/.env.example 的內容
# 確保 DATABASE_URL 指向你的 PostgreSQL 服務
# 設定所有 API 金鑰
```

### 2. 前端服務配置

在 Zeabur 前端服務中設定以下環境變數：
```bash
# 複製 frontend/.env.example 的內容
# 確保 NEXT_PUBLIC_API_URL 指向你的後端服務 URL
```

### 3. 資料庫服務配置

在 Zeabur PostgreSQL 服務中：
- 自動生成資料庫連線字串
- 複製到後端服務的 `DATABASE_URL`

### 4. 域名配置

確保：
- `CORS_ORIGIN` 包含前端服務的域名
- `NEXT_PUBLIC_API_URL` 指向後端服務的域名
- `LINE_WEBHOOK_URL` 指向後端服務的 webhook 端點

## 🔒 安全注意事項

1. **永遠不要**將 `.env` 檔案提交到 Git
2. **使用強密碼**作為 JWT_SECRET
3. **限制 CORS 來源**只允許必要的域名
4. **定期輪換**API 金鑰
5. **使用環境變數**而非硬編碼值

## 📝 配置檢查清單

- [ ] 後端服務環境變數已設定
- [ ] 前端服務環境變數已設定
- [ ] 資料庫連線字串已配置
- [ ] CORS 設定正確
- [ ] API 金鑰已設定
- [ ] 域名配置正確
- [ ] 安全設定已檢查

## 🆘 故障排除

### 常見問題

1. **CORS 錯誤**：檢查 `CORS_ORIGIN` 設定
2. **API 連線失敗**：檢查 `NEXT_PUBLIC_API_URL` 設定
3. **資料庫連線失敗**：檢查 `DATABASE_URL` 設定
4. **認證失敗**：檢查 JWT 和 Firebase 配置

### 測試命令

```bash
# 測試後端健康狀態
curl https://your-backend.zeabur.app/health

# 測試前端是否正常載入
curl https://your-frontend.zeabur.app
```
