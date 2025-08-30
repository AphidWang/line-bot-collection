.PHONY: help dev install migrate

# 預設目標
help:
	@echo "🚀 LINE Assistant 開發命令"
	@echo ""
	@echo "📋 可用命令："
	@echo "  make dev       - 啟動開發環境（前端 3000 + 後端 8000）"
	@echo "  make install   - 安裝 Python 依賴"
	@echo "  make fix-deps  - 修復依賴問題"
	@echo "  make migrate   - 執行資料遷移"
	@echo "  make help      - 顯示此說明"
	@echo ""
	@echo "🔧 快速啟動："
	@echo "  make dev       # 啟動前後端服務"

# 啟動開發環境
dev:
	@echo "🚀 啟動 Zeabur 開發環境..."
	@./switch_env.sh zeabur
	@echo "📦 啟動前後端服務..."
	@./dev.sh

# 安裝 Python 依賴
install:
	@echo "📦 安裝 Python 依賴..."
	@cd backend && python3 -m venv venv
	@cd backend && source venv/bin/activate && pip install -r requirements.txt
	@echo "✅ 依賴安裝完成"

# 修復依賴問題
fix-deps:
	@echo "🔧 修復 Python 依賴..."
	@./fix_deps.sh

# 執行資料遷移
migrate:
	@echo "🔄 執行資料遷移..."
	@cd backend && source venv/bin/activate && python migrate_data.py
