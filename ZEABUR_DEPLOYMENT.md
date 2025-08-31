# Zeabur 部署指南

## 🚀 快速部署

### 1. 創建 Zeabur 專案

1. 登入 [Zeabur](https://zeabur.com)
2. 點擊 "New Project"
3. 選擇 "GitHub" 並連接到你的 repository
4. 選擇 `line-bot-collection` 專案

### 2. 部署服務

#### 2.1 資料庫服務 (PostgreSQL)
1. 點擊 "New Service"
2. 選擇 "PostgreSQL"
3. 等待部署完成
4. 複製 `DATABASE_URL` 連線字串

#### 2.2 後端服務 (Backend)
1. 點擊 "New Service"
2. 選擇 "Source Code"
3. 選擇你的 repository
4. 設定根目錄為 `/backend`
5. 設定環境變數：

```bash
# 複製 backend/.env.example 的內容並填入實際值
PORT=3001
NODE_ENV=production
DATABASE_URL=你的_POSTGRESQL_DATABASE_URL
JWT_SECRET=你的_JWT_SECRET
# ... 其他必要的環境變數
```

#### 2.3 前端服務 (Frontend)
1. 點擊 "New Service"
2. 選擇 "Source Code"
3. 選擇你的 repository
4. 設定根目錄為 `/frontend`
5. 設定環境變數：

```bash
# 複製 frontend/.env.example 的內容
NEXT_PUBLIC_API_URL=https://你的後端服務URL.zeabur.app
# ... 其他 Firebase 配置（可選）
```

### 3. 環境變數配置

#### 3.1 後端環境變數 (必需)

| 變數名稱 | 說明 | 範例值 |
|---------|------|--------|
| `PORT` | 服務埠號 | `3001` |
| `NODE_ENV` | 環境模式 | `production` |
| `DATABASE_URL` | PostgreSQL 連線字串 | 從資料庫服務複製 |
| `JWT_SECRET` | JWT 簽名密鑰 | 生成強密碼 |
| `CORS_ORIGIN` | 允許的前端域名 | `https://你的前端服務.zeabur.app` |

#### 3.2 前端環境變數 (必需)

| 變數名稱 | 說明 | 範例值 |
|---------|------|--------|
| `NEXT_PUBLIC_API_URL` | 後端 API 的完整 URL | `https://你的後端服務.zeabur.app` |

### 4. 域名配置

#### 4.1 獲取服務 URL
1. 在每個服務的設定頁面
2. 找到 "Domains" 部分
3. 複製分配的域名

#### 4.2 更新環境變數
1. **後端服務**：設定 `CORS_ORIGIN` 為前端服務的域名
2. **前端服務**：設定 `NEXT_PUBLIC_API_URL` 為後端服務的域名

### 5. 部署檢查清單

- [ ] PostgreSQL 資料庫已部署並獲取 `DATABASE_URL`
- [ ] 後端服務已部署並設定所有環境變數
- [ ] 前端服務已部署並設定 `NEXT_PUBLIC_API_URL`
- [ ] `CORS_ORIGIN` 已設定為前端服務域名
- [ ] 所有服務都能正常訪問

### 6. 常見問題

#### 6.1 埠號問題
- **前端服務**：Zeabur 通常使用 8080 埠
- **後端服務**：我們設定為 3001 埠
- **實際訪問**：使用 Zeabur 分配的域名，不需要指定埠號

#### 6.2 CORS 錯誤
- 確保 `CORS_ORIGIN` 包含前端服務的完整域名
- 檢查域名是否包含 `https://` 前綴

#### 6.3 API 連線失敗
- 確保 `NEXT_PUBLIC_API_URL` 指向正確的後端服務域名
- 檢查後端服務是否正常運行

### 7. 測試部署

#### 7.1 測試後端
```bash
curl https://你的後端服務.zeabur.app/health
```

#### 7.2 測試前端
```bash
curl https://你的前端服務.zeabur.app
```

#### 7.3 測試 API 連線
在前端頁面嘗試登入，檢查瀏覽器開發者工具中的網路請求

### 8. 監控和維護

- 使用 Zeabur 的日誌功能監控服務狀態
- 定期檢查服務的健康狀態
- 監控資料庫連線和 API 響應時間

## 🔗 相關文檔

- [環境變數配置指南](./ENVIRONMENT_VARIABLES.md)
- [專案架構說明](./PROJECT_ARCHITECTURE.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
