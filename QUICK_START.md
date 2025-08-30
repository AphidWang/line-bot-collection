# 🚀 LINE Assistant 快速啟動指南

## 📋 快速開始

### 方法 1：一鍵啟動（推薦）
```bash
# 啟動開發環境
./dev.sh
```

### 方法 2：使用 Makefile
```bash
# 啟動開發環境
make dev
```

### 方法 3：手動啟動
```bash
# 切換到 Zeabur 環境
./switch_env.sh zeabur

# 啟動後端服務
cd backend
python run.py
```

## 🔧 開發流程

### 1. 啟動開發環境
```bash
./dev.sh
```

### 2. 存取服務
- **前端**: http://localhost:3000
- **後端 API**: http://localhost:8000
- **API 文檔**: http://localhost:8000/docs
- **健康檢查**: http://localhost:8000/health

### 3. 開發流程
- 前端和後端會同時啟動
- 前端會自動連接到後端 API
- 修改程式碼會自動重新載入

## 📊 服務架構

```
┌─────────────────┐    ┌─────────────────┐
│   前端 (3000)   │◄──►│   後端 (8000)   │
│                 │    │                 │
│   - Dashboard   │    │   - FastAPI     │
│   - 登入表單     │    │   - 認證 API    │
│   - 備份按鈕     │    │   - 資料庫操作   │
└─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Zeabur DB     │
                       │                 │
                       │  PostgreSQL    │
                       └─────────────────┘
```

## 🗄️ 資料庫連接

### 開發環境
- **主機**: hkg1.clusters.zeabur.com
- **端口**: 31127
- **資料庫**: zeabur
- **用戶**: root

### 生產環境
- **主機**: ${PORT_FORWARDED_HOSTNAME}
- **端口**: ${DATABASE_PORT_FORWARDED_PORT}
- **資料庫**: zeabur
- **用戶**: root

## 🔄 環境切換

### 檢查當前環境
```bash
./switch_env.sh status
```

### 切換到 Zeabur 環境
```bash
./switch_env.sh zeabur
```

## 📦 依賴管理

### 安裝 Python 依賴
```bash
make install
```

### 執行資料遷移
```bash
make migrate
```

## 🚨 故障排除

### 常見問題

#### 1. 資料庫連接失敗
- 檢查 `.env` 檔案中的 `DATABASE_URL`
- 確認 Zeabur 資料庫服務是否運行

#### 2. 依賴安裝失敗
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 3. 端口被佔用
```bash
# 檢查端口佔用
lsof -i :8000

# 停止佔用端口的服務
kill -9 <PID>
```

## 📁 檔案說明

| 檔案 | 說明 |
|------|------|
| `dev.sh` | 一鍵啟動腳本 |
| `switch_env.sh` | 環境切換腳本 |
| `Makefile` | 簡化命令管理 |
| `.env.dev` | Zeabur 開發環境配置 |
| `.env.zeabur` | Zeabur 生產環境配置 |

## 🎯 下一步

1. **啟動開發環境**: `./dev.sh`
2. **測試前端**: 訪問 http://localhost:3000
3. **測試後端**: 訪問 http://localhost:8000/health
4. **開發功能**: 前後端同時開發

---

**提示**: 使用 `./dev.sh` 一鍵啟動開發環境！
