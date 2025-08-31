#!/bin/bash

# Line Assistant Backend - Unified Setup Script
# 支援本地開發和生產部署

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
BACKEND_PORT=${BACKEND_PORT:-3001}
NODE_ENV=${NODE_ENV:-development}

echo -e "${BLUE}🚀 Line Assistant Backend - Unified Setup${NC}"
echo "================================================"
echo -e "${YELLOW}Environment: ${NODE_ENV}${NC}"
echo -e "${YELLOW}Port: ${BACKEND_PORT}${NC}"
echo ""

# 函數：檢查依賴
check_dependencies() {
    echo -e "${BLUE}🔍 Checking dependencies...${NC}"
    
    # 檢查 Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
        exit 1
    fi
    
    # 檢查 npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi
    
    # 檢查 Node.js 版本
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# 函數：設定環境變數
setup_environment() {
    echo -e "${BLUE}⚙️  Setting up environment...${NC}"
    
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
        cp .env.example .env
        
        echo -e "${GREEN}✅ .env file created${NC}"
        echo -e "${YELLOW}📝 Please edit .env file with your configuration:${NC}"
        echo "   - POSTGRES_CONNECTION_STRING (required)"
        echo "   - JWT_SECRET (required)"
        echo "   - Optional: FIREBASE_*, OPENAI_API_KEY, LINE_*"
        echo ""
        
        if [ "$NODE_ENV" = "development" ]; then
            read -p "Press Enter after editing .env file to continue..."
        fi
    else
        echo -e "${GREEN}✅ .env file exists${NC}"
    fi
}

# 函數：安裝依賴
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    if [ ! -d "node_modules" ]; then
        npm install
        echo -e "${GREEN}✅ Dependencies installed${NC}"
    else
        echo -e "${GREEN}✅ Dependencies already installed${NC}"
    fi
}

# 函數：設定 Prisma
setup_prisma() {
    echo -e "${BLUE}🔧 Setting up Prisma...${NC}"
    
    # 生成 Prisma 客戶端
    if [ ! -d "node_modules/.prisma" ]; then
        echo "Generating Prisma client..."
        npx prisma generate
        echo -e "${GREEN}✅ Prisma client generated${NC}"
    else
        echo -e "${GREEN}✅ Prisma client already exists${NC}"
    fi
    
    # 設定資料庫
    echo "Setting up database..."
    if npx prisma db push --accept-data-loss; then
        echo -e "${GREEN}✅ Database setup successful${NC}"
    else
        echo -e "${RED}❌ Database setup failed${NC}"
        echo "Please check your POSTGRES_CONNECTION_STRING in .env file"
        exit 1
    fi
}

# 函數：填充測試資料
seed_data() {
    if [ "$NODE_ENV" = "development" ]; then
        echo -e "${BLUE}🌱 Seeding test data...${NC}"
        
        read -p "Do you want to seed test data? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if node src/scripts/seed.js; then
                echo -e "${GREEN}✅ Test data seeded successfully${NC}"
            else
                echo -e "${YELLOW}⚠️  Test data seeding failed${NC}"
            fi
        fi
    fi
}

# 函數：啟動服務
start_server() {
    echo -e "${BLUE}🚀 Starting server...${NC}"
    echo ""
    echo -e "${GREEN}🎉 Setup complete!${NC}"
    echo -e "${BLUE}📱 Server will be available at: http://localhost:${BACKEND_PORT}${NC}"
    echo -e "${BLUE}🔗 Health check: http://localhost:${BACKEND_PORT}/health${NC}"
    echo -e "${BLUE}📊 API docs: http://localhost:${BACKEND_PORT}/api${NC}"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    
    if [ "$NODE_ENV" = "production" ]; then
        npm start
    else
        npm run dev
    fi
}

# 函數：顯示幫助
show_help() {
    echo -e "${BLUE}📋 Usage:${NC}"
    echo "  $0 [options]"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  --help, -h     Show this help message"
    echo "  --prod         Production mode"
    echo "  --port PORT    Set custom port (default: 3001)"
    echo "  --no-seed      Skip test data seeding"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0              # Development mode"
    echo "  $0 --prod      # Production mode"
    echo "  $0 --port 3002 # Custom port"
}

# 主函數
main() {
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --prod)
                NODE_ENV="production"
                shift
                ;;
            --port)
                BACKEND_PORT="$2"
                shift 2
                ;;
            --no-seed)
                SKIP_SEED=true
                shift
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 執行設定步驟
    check_dependencies
    setup_environment
    install_dependencies
    setup_prisma
    
    if [ "$SKIP_SEED" != "true" ]; then
        seed_data
    fi
    
    start_server
}

# 執行主函數
main "$@"
