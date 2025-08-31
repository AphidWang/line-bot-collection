# Line Assistant

一個整合 Line 官方帳號訊息管理的現代化平台，提供訊息儲存、搜尋、AI 總結等功能。

## ✨ 功能特色

- 🔐 **JWT 認證** + Firebase 第三方登入
- 📱 **Line 訊息管理** - 自動接收和儲存
- 🔍 **智能搜尋** - 跨 Channel 關鍵字搜尋
- 📊 **Channel 管理** - 追蹤狀態和統計分析
- 🤖 **AI 總結** - OpenAI 整合的智能總結
- 📈 **完整統計** - 用戶活躍度和訊息分析

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
├── frontend/          # Next.js 前端應用
├── backend/           # Node.js 後端 API
├── deploy.sh          # 統一部署腳本
├── Makefile           # 建置管理
└── docs/              # 專案文檔
```

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

## 🐳 Docker 部署

```bash
# 啟動 Docker 服務
make docker

# 查看服務狀態
docker-compose ps

# 查看日誌
make logs
```

## 📚 詳細文檔

- [專案架構與設計指南](PROJECT_ARCHITECTURE.md)
- [部署指南](DEPLOYMENT_GUIDE.md)
- [後端 API 文檔](backend/README.md)

## 🔧 技術架構

- **前端**: Next.js 14 + Tailwind CSS
- **後端**: Node.js + Express.js + Prisma
- **資料庫**: PostgreSQL
- **認證**: JWT + Firebase
- **AI**: OpenAI GPT API
- **容器化**: Docker + Docker Compose

## 🌐 服務端點

- **前端**: http://localhost:3000
- **後端**: http://localhost:3001
- **健康檢查**: http://localhost:3001/health
- **API 文檔**: http://localhost:3001/api

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
