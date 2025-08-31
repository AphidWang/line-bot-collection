# Line Assistant - Unified Makefile
# 支援多種部署和開發方式

.PHONY: help install dev docker build clean test backend frontend

# 配置
BACKEND_PORT ?= 3001
FRONTEND_PORT ?= 3000
NODE_ENV ?= development

# 預設目標
help:
	@echo "🚀 Line Assistant - Unified Development Commands"
	@echo "================================================"
	@echo ""
	@echo "📋 可用命令："
	@echo "  make install   - 安裝所有依賴"
	@echo "  make dev       - 啟動完整開發環境（前後端）"
	@echo "  make backend   - 只啟動後端"
	@echo "  make frontend  - 只啟動前端"
	@echo "  make docker    - Docker 容器部署（可選）"
	@echo "  make build     - 建置專案"
	@echo "  make clean     - 清理建置檔案"
	@echo "  make test      - 執行 API 測試"
	@echo "  make help      - 顯示此說明"
	@echo ""
	@echo "🔧 環境變數："
	@echo "  BACKEND_PORT  - 後端埠號 (預設: 3001)"
	@echo "  FRONTEND_PORT - 前端埠號 (預設: 3000)"
	@echo "  NODE_ENV      - Node.js 環境 (預設: development)"
	@echo ""
	@echo "💡 快速啟動："
	@echo "  make dev       # 啟動完整開發環境"

# 安裝依賴
install:
	@echo "📦 Installing dependencies..."
	@if command -v pnpm &> /dev/null; then \
		echo "Using pnpm to install dependencies..."; \
		pnpm install; \
	else \
		echo "pnpm not found, using npm..."; \
		if [ -d "backend" ]; then \
			echo "Installing backend dependencies..."; \
			cd backend && npm install; \
		fi; \
		if [ -d "frontend" ]; then \
			echo "Installing frontend dependencies..."; \
			cd frontend && npm install; \
		fi; \
	fi
	@echo "✅ Dependencies installed successfully"

# 啟動完整開發環境
dev: install
	@echo "🚀 Starting complete development environment..."
	@./deploy.sh local

# 只啟動後端
backend: install
	@echo "🔧 Starting backend only..."
	@cd backend && NODE_ENV=$(NODE_ENV) PORT=$(BACKEND_PORT) npm run dev

# 只啟動前端
frontend: install
	@echo "🌐 Starting frontend only..."
	@cd frontend && npm run dev

# Docker 部署
docker: install
	@echo "🐳 Starting Docker deployment..."
	@./deploy.sh docker

# 建置專案
build: install
	@echo "🔨 Building project..."
	@if [ -d "backend" ]; then \
		echo "Building backend..."; \
		cd backend && npm run build; \
	fi
	@if [ -d "frontend" ]; then \
		echo "Building frontend..."; \
		cd frontend && npm run build; \
	fi
	@echo "✅ Project built successfully"

# 清理建置檔案
clean:
	@echo "🧹 Cleaning build files..."
	@./deploy.sh clean

# 執行測試
test: install
	@echo "🧪 Running tests..."
	@./deploy.sh test

# 後端設定
backend-setup: install
	@echo "🔧 Setting up backend..."
	@cd backend && chmod +x scripts/setup.sh && ./scripts/setup.sh

# 資料庫操作
db-migrate:
	@echo "🗄️  Running database migrations..."
	@cd backend && npx prisma migrate dev

db-push:
	@echo "🗄️  Pushing database schema..."
	@cd backend && npx prisma db push

db-studio:
	@echo "🗄️  Opening Prisma Studio..."
	@cd backend && npx prisma studio

db-seed:
	@echo "🌱 Seeding database..."
	@cd backend && node src/scripts/seed.js

# 環境管理
env-dev:
	@echo "🔄 Switching to development environment..."
	@if [ -f "switch_env.sh" ]; then \
		./switch_env.sh zeabur; \
	else \
		echo "⚠️  switch_env.sh not found, using default environment"; \
	fi

env-status:
	@echo "📊 Environment status:"
	@if [ -f "switch_env.sh" ]; then \
		./switch_env.sh status; \
	else \
		echo "⚠️  switch_env.sh not found"; \
	fi

# 開發工具
logs:
	@echo "📋 Service logs:"
	@if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then \
		docker-compose logs -f; \
	else \
		echo "⚠️  Docker Compose not available or no docker-compose.yml found"; \
	fi

restart:
	@echo "🔄 Restarting services..."
	@if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then \
		docker-compose restart; \
	else \
		echo "⚠️  Docker Compose not available or no docker-compose.yml found"; \
	fi

stop:
	@echo "🛑 Stopping services..."
	@if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then \
		docker-compose down; \
	else \
		echo "⚠️  Docker Compose not available or no docker-compose.yml found"; \
	fi

# 健康檢查
health:
	@echo "🔍 Health check:"
	@if [ -d "backend" ]; then \
		echo "Backend:"; \
		curl -s http://localhost:$(BACKEND_PORT)/health || echo "❌ Backend not responding"; \
	fi
	@if [ -d "frontend" ]; then \
		echo "Frontend:"; \
		curl -s http://localhost:$(FRONTEND_PORT) > /dev/null && echo "✅ Frontend responding" || echo "❌ Frontend not responding"; \
	fi

# 快速命令別名
up: dev
down: stop
start: dev
restart: restart
status: env-status
