# 開發環境設定指南

## 概述

這個設定讓你可以：
- **Prod 環境**：接收 LINE 訊息並儲存到資料庫
- **Dev 環境**：連接到同一個資料庫，開發和測試 UI

## 快速開始

### 方法 1：使用 Makefile
```bash
# 啟動開發環境（連接到 prod 資料庫）
make dev-prod-db
```

### 方法 2：使用腳本
```bash
# 直接執行開發腳本
./scripts/dev.sh
```

### 方法 3：手動啟動
```bash
# 1. 複製 dev 環境變數
cp .env.dev .env

# 2. 啟動後端
cd backend
npm install
npm run dev

# 3. 啟動前端（新終端）
cd frontend
npm install
npm run dev
```

## 環境說明

### 資料庫連接
- **Dev 和 Prod 都連接到同一個資料庫**
- 資料庫：`hkg1.clusters.zeabur.com:31127`
- 這樣可以即時看到 prod 接收的訊息

### 服務端點
- **前端**：http://localhost:3000
- **後端**：http://localhost:3001
- **資料庫**：連接到 prod 資料庫

### 環境變數
- 使用 `.env.dev` 設定
- JWT 設定與 prod 相容
- 資料庫連接與 prod 相同

## 工作流程

1. **Prod 接收訊息**：
   - LINE Bot 接收訊息
   - 儲存到共享資料庫

2. **Dev 開發 UI**：
   - 連接到同一個資料庫
   - 即時看到新訊息
   - 開發和測試 UI 功能

3. **測試新功能**：
   - 在 dev 環境測試
   - 確認無誤後部署到 prod

## 常用指令

```bash
# 啟動開發環境
make dev-prod-db

# 只啟動後端
make backend

# 只啟動前端
make frontend

# 檢查服務狀態
make health

# 資料庫操作
make db-studio  # 開啟 Prisma Studio
make db-push    # 推送 schema 變更
```

## 注意事項

1. **資料庫共享**：dev 和 prod 使用同一個資料庫，請小心操作
2. **JWT 相容**：dev 環境使用與 prod 相同的 JWT secret
3. **環境變數**：確保 `.env.dev` 設定正確
4. **端口衝突**：確保 3000 和 3001 端口沒有被其他服務占用

## 故障排除

### 連接問題
```bash
# 檢查資料庫連接
cd backend
npx prisma db push

# 檢查服務狀態
make health
```

### 環境變數問題
```bash
# 重新複製環境變數
cp .env.dev .env

# 檢查環境變數
cat .env | grep DATABASE_URL
```

### 端口占用
```bash
# 檢查端口使用情況
lsof -i :3000
lsof -i :3001

# 停止占用端口的程序
kill -9 <PID>
```
