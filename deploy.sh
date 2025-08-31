#!/bin/bash

# Line Assistant - Unified Deployment Script
# 支援多種部署方式：本地、Docker、雲端

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_NAME="line-assistant"
BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# 函數：顯示幫助
show_help() {
    echo -e "${BLUE}🚀 Line Assistant - Unified Deployment${NC}"
    echo "============================================="
    echo ""
    echo -e "${BLUE}📋 Usage:${NC}"
    echo "  $0 [command] [options]"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo "  local       - 本地開發環境"
    echo "  docker      - Docker 容器部署"
    echo "  build       - 建置 Docker 映像"
    echo "  clean       - 清理建置檔案"
    echo "  test        - 執行 API 測試"
    echo "  help        - 顯示此說明"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0 local              # 啟動本地開發環境"
    echo "  $0 docker             # 啟動 Docker 容器"
    echo "  $0 build              # 建置 Docker 映像"
    echo "  $0 test               # 測試 API"
}

# 函數：本地開發環境
deploy_local() {
    echo -e "${BLUE}🏠 Starting local development environment...${NC}"
    
    # 檢查後端
    if [ ! -d "backend" ]; then
        echo -e "${RED}❌ Backend directory not found${NC}"
        exit 1
    fi
    
    # 檢查前端
    if [ ! -d "frontend" ]; then
        echo -e "${RED}❌ Frontend directory not found${NC}"
        exit 1
    fi
    
    # 啟動後端
    echo -e "${BLUE}🔧 Starting backend...${NC}"
    cd backend
    if [ -f "scripts/setup.sh" ]; then
        chmod +x scripts/setup.sh
        ./scripts/setup.sh &
    else
        npm run dev &
    fi
    BACKEND_PID=$!
    cd ..
    
    # 等待後端啟動
    echo "Waiting for backend to start..."
    sleep 5
    
    # 啟動前端
    echo -e "${BLUE}🌐 Starting frontend...${NC}"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo ""
    echo -e "${GREEN}✅ Services started successfully!${NC}"
    echo -e "${BLUE}🔧 Backend: http://localhost:${BACKEND_PORT}${NC}"
    echo -e "${BLUE}🌐 Frontend: http://localhost:${FRONTEND_PORT}${NC}"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # 等待用戶中斷
    trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
    wait
}

# 函數：Docker 部署
deploy_docker() {
    echo -e "${BLUE}🐳 Starting Docker deployment...${NC}"
    
    # 檢查 Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not found. Please install Docker first${NC}"
        exit 1
    fi
    
    # 檢查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose first${NC}"
        exit 1
    fi
    
    # 建立 docker-compose.yml
    create_docker_compose
    
    # 啟動服務
    echo "Starting services with Docker Compose..."
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}✅ Docker services started successfully!${NC}"
    echo -e "${BLUE}🔧 Backend: http://localhost:${BACKEND_PORT}${NC}"
    echo -e "${BLUE}🌐 Frontend: http://localhost:${FRONTEND_PORT}${NC}"
    echo ""
    echo "Useful commands:"
    echo "  docker-compose logs -f    # 查看日誌"
    echo "  docker-compose down      # 停止服務"
    echo "  docker-compose restart   # 重啟服務"
}

# 函數：建置 Docker 映像
build_docker() {
    echo -e "${BLUE}🔨 Building Docker images...${NC}"
    
    # 建置後端
    echo "Building backend image..."
    cd backend
    docker build -t ${PROJECT_NAME}-backend .
    cd ..
    
    # 建置前端
    echo "Building frontend image..."
    cd frontend
    docker build -t ${PROJECT_NAME}-frontend .
    cd ..
    
    echo -e "${GREEN}✅ Docker images built successfully!${NC}"
    echo "Images:"
    echo "  - ${PROJECT_NAME}-backend"
    echo "  - ${PROJECT_NAME}-frontend"
}

# 函數：清理建置檔案
clean_build() {
    echo -e "${BLUE}🧹 Cleaning build files...${NC}"
    
    # 清理 Docker
    docker system prune -f
    docker image prune -f
    
    # 清理 Node.js
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # 清理 Python
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    find . -name "venv" -type d -exec rm -rf {} + 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
}

# 函數：執行測試
run_tests() {
    echo -e "${BLUE}🧪 Running API tests...${NC}"
    
    if [ ! -f "backend/test-api.js" ]; then
        echo -e "${RED}❌ Test file not found${NC}"
        exit 1
    fi
    
    cd backend
    node test-api.js
    cd ..
}

# 函數：建立 Docker Compose 配置
create_docker_compose() {
    if [ ! -f "docker-compose.yml" ]; then
        echo "Creating docker-compose.yml..."
        cat > docker-compose.yml << EOF
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "${BACKEND_PORT}:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
      - JWT_SECRET=\${JWT_SECRET}
      - FIREBASE_PROJECT_ID=\${FIREBASE_PROJECT_ID}
      - FIREBASE_PRIVATE_KEY=\${FIREBASE_PRIVATE_KEY}
      - FIREBASE_CLIENT_EMAIL=\${FIREBASE_CLIENT_EMAIL}
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - LINE_CHANNEL_SECRET=\${LINE_CHANNEL_SECRET}
      - LINE_CHANNEL_ACCESS_TOKEN=\${LINE_CHANNEL_ACCESS_TOKEN}
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "${FRONTEND_PORT}:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}
    depends_on:
      - backend
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=line_assistant
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
EOF
        echo -e "${GREEN}✅ docker-compose.yml created${NC}"
    fi
}

# 主函數
main() {
    case "${1:-help}" in
        local)
            deploy_local
            ;;
        docker)
            deploy_docker
            ;;
        build)
            build_docker
            ;;
        clean)
            clean_build
            ;;
        test)
            run_tests
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# 執行主函數
main "$@"
