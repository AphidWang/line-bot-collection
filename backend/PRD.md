# Line Assistant 後端產品需求文檔 (PRD)

## 產品概述
Line Assistant 是一個整合 Line 官方帳號訊息管理的平台，提供訊息儲存、搜尋、AI 總結等功能。

## 核心功能需求

### 1. 身份驗證系統
- **帳密登入**: 支援傳統帳號密碼登入
- **JWT 認證**: 使用 JWT token 進行身份驗證
- **Firebase 支援**: 條件式啟用 Firebase 第三方登入
  - 無 Firebase key 時不啟用
  - 有 key 時啟用 Google、Facebook 等第三方登入

### 2. Line 訊息接收與儲存
- **Webhook 端點**: 接收 Line Official Account Messaging API 的訊息
- **訊息儲存**: 將接收到的訊息儲存到資料庫
- **訊息結構**: 包含 channel ID、用戶 ID、訊息內容、時間戳等

### 3. 訊息查詢與展示
- **Channel 訊息列表**: 顯示指定 channel 的所有訊息
- **關鍵字搜尋**: 支援跨 channel 關鍵字搜尋
- **跳轉功能**: 搜尋結果可直接跳轉到對應 channel 的特定訊息

### 4. 用戶搜尋功能
- **用戶搜尋**: 根據用戶 ID 或名稱搜尋
- **用戶訊息列表**: 顯示指定用戶的所有訊息
- **跳轉支援**: 支援跳轉到對應 channel 的訊息

### 5. Channel 管理
- **新訊息排序**: 有新訊息的 channel 優先顯示
- **Channel 選擇**: 支援多選 channel 進行操作
- **取消追蹤**: 用戶可取消追蹤特定 channel

### 6. AI 總結功能
- **Channel 總結**: 支援選擇特定 channel 進行 AI 總結
- **全部總結**: 支援全部 channel 的綜合總結
- **ChatGPT 整合**: 使用 OpenAI API 進行總結
- **Chunk 處理**: 訊息過長時自動分段處理

### 7. 總結記錄管理
- **總結記錄**: 記錄已總結過的訊息（以天為單位）
- **新訊息處理**: 已總結日期的新訊息仍當作新訊息處理
- **UI 提示**: 在介面上提示用戶已總結的狀態

## 技術架構

### 後端技術棧
- **Runtime**: Node.js
- **Framework**: Express.js 或 Fastify
- **資料庫**: PostgreSQL (推薦) 或 MongoDB
- **ORM**: Prisma 或 TypeORM
- **認證**: JWT + Firebase Admin SDK
- **API 文檔**: Swagger/OpenAPI

### 資料庫設計
- **Users**: 用戶資訊
- **Channels**: Line channel 資訊
- **Messages**: 訊息內容
- **Summaries**: AI 總結記錄
- **UserChannels**: 用戶與 channel 的追蹤關係

### API 端點設計
- **認證**: `/auth/login`, `/auth/register`, `/auth/firebase`
- **訊息**: `/messages`, `/messages/search`, `/messages/channel/:id`
- **Channel**: `/channels`, `/channels/:id/messages`, `/channels/:id/track`
- **用戶**: `/users/:id/messages`
- **總結**: `/summaries`, `/summaries/generate`

## 非功能性需求
- **效能**: 支援大量訊息儲存和快速搜尋
- **安全性**: JWT 過期機制、API 限流
- **可擴展性**: 模組化架構、支援水平擴展
- **監控**: 日誌記錄、錯誤追蹤、效能監控

## 開發階段
1. **Phase 1**: 基礎架構、認證系統、Line webhook
2. **Phase 2**: 訊息儲存、基本查詢功能
3. **Phase 3**: 搜尋功能、Channel 管理
4. **Phase 4**: AI 總結功能、總結記錄
5. **Phase 5**: 優化、測試、部署
