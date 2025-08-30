# Line Assistant

一個整合 LINE Bot 和 AI 的對話管理系統，使用 Google Drive 作為資料存儲。

## 專案概述

這個系統的核心功能是：
1. **接收 LINE Bot webhook**：自動接收 LINE 群組訊息
2. **儲存對話記錄**：將訊息存到 Google Drive
3. **權限管理**：控制哪些用戶可以存取哪些群組的對話
4. **AI 摘要**：使用 OpenAI 生成對話摘要
5. **Web 儀表板**：讓授權用戶查看和分析對話

## 架構

- **前端**: Next.js + TypeScript + Tailwind CSS
- **後端**: FastAPI + Python
- **認證**: Firebase Auth
- **資料存儲**: Google Drive
- **AI 服務**: OpenAI
- **LINE Bot**: 接收群組訊息 webhook

## 系統流程

```
LINE 群組 → LINE Bot → Webhook → 後端 → Google Drive (儲存訊息)
用戶登入 → Firebase Auth → 前端 → 後端 → Google Drive (讀取權限/訊息)
```

## 快速開始

### 1. 設定 Google Drive API

#### 建立 Google Cloud 專案
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 Google Drive API

#### 建立 Service Account
1. 在 Google Cloud Console 中，前往「IAM 與管理」>「Service Accounts」
2. 點擊「建立 Service Account」
3. 填寫名稱和描述
4. 建立並下載 JSON 金鑰檔案

#### 設定資料夾權限
1. 在 Google Drive 中建立專用資料夾
2. 右鍵點擊資料夾 >「共用」
3. 加入你的 Service Account 電子郵件（在 JSON 金鑰檔案中）
4. 給予「編輯者」權限
5. 複製資料夾 ID（URL 中的長字串）

### 2. 設定 LINE Bot

#### 建立 LINE Bot
1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立新的 Provider 和 Channel
3. 取得 Channel Secret 和 Channel Access Token
4. 設定 Webhook URL：`https://your-domain.com/webhook`

### 3. 環境設定

複製 `env.example` 到 `.env` 並填入：

```bash
# Google Drive
GOOGLE_CREDENTIALS_PATH=./google-credentials.json
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here

# LINE Bot (核心功能)
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token

# Firebase (前端認證)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id

# OpenAI (AI 摘要功能)
OPENAI_API_KEY=your-openai-api-key
```

### 4. 放置金鑰檔案

將下載的 Service Account JSON 金鑰檔案放在 `backend/` 目錄下，命名為 `google-credentials.json`

### 5. 初始化 Google Drive

```bash
cd backend
python init_google_drive.py
```

### 6. 啟動服務

```bash
# 使用 Docker Compose
docker-compose up

# 或分別啟動
cd backend && python run.py
cd frontend && npm run dev
```

## API 端點

### LINE Bot Webhook
- `POST /webhook` - 接收 LINE 訊息並儲存到 Google Drive

### 用戶權限
- `GET /api/user/permissions` - 取得當前用戶權限
- `POST /api/user/permissions` - 建立用戶權限（需要 admin）

### 群組管理
- `GET /api/groups` - 取得用戶可存取的群組

### 訊息管理
- `GET /api/messages/{group_id}` - 取得群組對話
- `POST /api/messages/{group_id}` - 新增訊息

### AI 摘要
- `POST /api/messages/summarize` - 生成對話摘要

## 權限系統

- **admin**: 可以存取所有群組，管理用戶權限
- **user**: 可以讀寫被授權的群組
- **readonly**: 只能讀取被授權的群組

## 資料結構

### 權限檔案 (permissions.json)
```json
{
  "users": {
    "firebase_uid": {
      "email": "user@example.com",
      "role": "admin",
      "allowed_groups": ["*"],
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 對話檔案 (conversations/{group_id}.json)
```json
{
  "group_id": "group1",
  "messages": [
    {
      "timestamp": "2024-01-01T10:00:00Z",
      "user_id": "user123",
      "message": "Hello"
    }
  ]
}
```

## 開發注意事項

- 權限檢查有 5 分鐘快取
- 所有資料操作都會記錄錯誤日誌
- 支援向後相容性（舊的 SQLite API 仍然可用）
- LINE Bot webhook 會自動將訊息儲存到 Google Drive

## 故障排除

### 常見問題
1. **權限錯誤**: 檢查 Service Account 是否有資料夾存取權限
2. **認證失敗**: 確認 JSON 金鑰檔案路徑正確
3. **資料夾不存在**: 確認 GOOGLE_DRIVE_FOLDER_ID 正確
4. **LINE Bot 不工作**: 檢查 webhook URL 和 Channel Secret 設定
5. **訊息沒儲存**: 檢查 Google Drive 權限和 API 配額

### 日誌
檢查後端日誌以獲取詳細錯誤資訊。

## 部署注意事項

- 確保 webhook URL 可以被 LINE 伺服器存取
- 設定適當的 CORS 政策
- 監控 Google Drive API 使用量（免費版有限制）
- 定期備份 Google Drive 資料
