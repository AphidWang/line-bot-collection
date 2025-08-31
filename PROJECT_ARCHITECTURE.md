# Line Assistant - 專案架構與設計指南

## 🏗️ 專案概述

Line Assistant 是一個整合 Line 官方帳號訊息管理的平台，提供訊息儲存、搜尋、AI 總結等功能。專案採用現代化的微服務架構，前後端分離設計。

## 📁 專案結構

```
LineAssistant/
├── frontend/                 # Next.js 前端應用
│   ├── app/                 # App Router 結構
│   ├── components/          # React 組件
│   ├── lib/                 # 工具函數
│   └── package.json         # 前端依賴
├── backend/                  # Node.js 後端 API
│   ├── src/                 # 源碼目錄
│   │   ├── config/          # 配置檔案
│   │   ├── middleware/      # 中間件
│   │   ├── routes/          # API 路由
│   │   ├── services/        # 業務邏輯服務
│   │   └── scripts/         # 工具腳本
│   ├── prisma/              # 資料庫 Schema 和 Migration
│   ├── Dockerfile           # 後端容器化配置
│   └── package.json         # 後端依賴
├── deploy.sh                 # 統一部署腳本
├── Makefile                  # 統一建置管理
├── docker-compose.yml        # 容器編排配置
└── README.md                 # 專案說明
```

## 🎯 核心功能架構

### 1. 身份驗證系統
- **JWT 認證**：支援傳統帳號密碼登入
- **Firebase 整合**：條件式啟用第三方登入
- **權限管理**：基於角色的存取控制

### 2. Line 訊息管理
- **Webhook 接收**：自動接收 Line 官方帳號訊息
- **訊息儲存**：結構化儲存到 PostgreSQL
- **訊息類型**：支援文字、圖片、影片等多種格式

### 3. 搜尋與查詢
- **全文搜尋**：跨 Channel 關鍵字搜尋
- **用戶搜尋**：根據用戶 ID 或名稱搜尋
- **進階篩選**：按時間、類型、Channel 等條件篩選

### 4. Channel 管理
- **追蹤狀態**：用戶可控制追蹤的 Channel
- **新訊息排序**：有新訊息的 Channel 優先顯示
- **統計分析**：Channel 活躍度和訊息統計

### 5. AI 總結功能
- **OpenAI 整合**：使用 GPT 模型生成總結
- **多種總結類型**：日、週、月、自訂總結
- **智能分塊**：長訊息自動分段處理
- **總結記錄**：避免重複總結，追蹤使用量

## 🗄️ 資料庫設計

### 核心資料表

#### Users
```sql
- id: 用戶唯一識別碼
- email: 電子郵件（唯一）
- password: 加密密碼
- name: 顯示名稱
- avatar: 頭像 URL
- firebaseUid: Firebase 用戶 ID
- createdAt/updatedAt: 時間戳記
```

#### Channels
```sql
- id: Channel 唯一識別碼
- lineId: Line Channel ID（唯一）
- name: Channel 名稱
- pictureUrl: Channel 圖片
- status: 狀態（active/inactive）
- createdAt/updatedAt: 時間戳記
```

#### Messages
```sql
- id: 訊息唯一識別碼
- lineId: Line 訊息 ID（唯一）
- channelId: 所屬 Channel
- userId: 發送用戶
- type: 訊息類型
- content: 訊息內容
- metadata: 額外資料（JSON）
- timestamp: 訊息時間
```

#### UserChannels
```sql
- userId: 用戶 ID
- channelId: Channel ID
- isTracked: 是否追蹤
- createdAt/updatedAt: 時間戳記
```

#### Summaries
```sql
- id: 總結唯一識別碼
- userId: 用戶 ID
- channelId: Channel ID（可為空，表示全部總結）
- date: 總結日期
- content: AI 生成的總結內容
- tokens: 使用的 Token 數量
```

### 關聯關係
- **Users** ↔ **UserChannels** ↔ **Channels**（多對多）
- **Channels** → **Messages**（一對多）
- **Users** → **Summaries**（一對多）
- **Channels** → **Summaries**（一對多）

## 🔧 技術架構

### 後端技術棧
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **資料庫**: PostgreSQL 12+
- **ORM**: Prisma
- **認證**: JWT + Firebase Admin SDK
- **AI 整合**: OpenAI GPT API
- **驗證**: express-validator
- **安全性**: Helmet, CORS, Rate Limiting

### 前端技術棧
- **Framework**: Next.js 14 (App Router)
- **UI 框架**: Tailwind CSS
- **狀態管理**: React Hooks + Context
- **認證**: Firebase Auth
- **HTTP 客戶端**: Axios

### 部署與基礎設施
- **容器化**: Docker + Docker Compose
- **資料庫**: PostgreSQL（本地/雲端）
- **環境管理**: 環境變數配置
- **監控**: 健康檢查端點

## 🚀 部署架構

### 1. 本地開發環境
```bash
# 快速啟動
make dev                    # 啟動前後端
make backend                # 只啟動後端
make frontend               # 只啟動前端

# 後端設定
make backend-setup          # 完整後端設定
make db-push                # 資料庫 Schema 同步
make db-seed                # 填充測試資料
```

### 2. Docker 容器部署
```bash
# 容器化部署
make docker                 # 啟動 Docker 服務
make build                  # 建置 Docker 映像
make logs                   # 查看服務日誌
make stop                   # 停止服務
```

### 3. 雲端部署
- **資料庫**: 使用雲端 PostgreSQL 服務
- **後端**: 部署到雲端容器服務
- **前端**: 部署到靜態網站託管服務

## 📋 API 設計原則

### RESTful 設計
- 使用標準 HTTP 方法（GET, POST, PUT, DELETE）
- 資源導向的 URL 設計
- 統一的錯誤回應格式
- 支援分頁和篩選

### 認證與授權
- JWT Token 認證
- 角色基礎的權限控制
- API 限流保護
- CORS 跨域控制

### 資料驗證
- 輸入參數驗證
- 資料類型檢查
- SQL 注入防護
- XSS 防護

## 🔒 安全性考量

### 認證安全
- JWT Secret 加密
- 密碼雜湊儲存
- Token 過期機制
- 安全的 Session 管理

### 資料安全
- 資料庫連線加密
- 敏感資料加密
- 輸入資料清理
- 錯誤訊息過濾

### 網路安全
- HTTPS 強制使用
- 安全標頭設定
- API 限流保護
- 防火牆規則

## 📊 監控與日誌

### 健康檢查
- `/health` 端點監控服務狀態
- 資料庫連線狀態檢查
- 外部服務依賴檢查

### 日誌記錄
- 結構化日誌格式
- 不同環境的日誌級別
- 錯誤追蹤和警報
- 效能監控指標

### 效能監控
- API 回應時間
- 資料庫查詢效能
- 記憶體和 CPU 使用率
- 錯誤率和成功率

## 🧪 測試策略

### 單元測試
- 業務邏輯測試
- 工具函數測試
- 資料驗證測試

### 整合測試
- API 端點測試
- 資料庫操作測試
- 外部服務整合測試

### 端到端測試
- 用戶流程測試
- 跨瀏覽器測試
- 效能負載測試

## 📚 開發指南

### 程式碼規範
- ESLint 程式碼檢查
- Prettier 程式碼格式化
- TypeScript 型別檢查
- Git 提交訊息規範

### 分支策略
- `main`: 生產環境分支
- `develop`: 開發環境分支
- `feature/*`: 功能開發分支
- `hotfix/*`: 緊急修復分支

### 部署流程
1. 功能開發完成
2. 程式碼審查
3. 自動化測試
4. 部署到測試環境
5. 驗收測試
6. 部署到生產環境

## 🔄 維護與更新

### 定期維護
- 依賴套件更新
- 安全性修補
- 效能優化
- 資料庫維護

### 版本管理
- 語意化版本控制
- 變更日誌記錄
- 向後相容性
- 升級指南

### 備份策略
- 資料庫定期備份
- 配置檔案備份
- 災難恢復計畫
- 監控和警報

## 📞 支援與聯絡

### 技術支援
- 開發團隊聯絡方式
- 問題回報流程
- 功能請求流程
- 文檔更新流程

### 社群參與
- 開源貢獻指南
- 問題討論區
- 功能投票系統
- 使用者回饋收集

---

*此文檔會隨著專案發展持續更新，請定期查看最新版本。*
