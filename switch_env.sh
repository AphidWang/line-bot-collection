#!/bin/bash

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 環境切換工具${NC}"
echo ""

# 檢查參數
if [ "$1" = "zeabur" ]; then
    echo -e "${YELLOW}🔄 切換到 Zeabur 開發環境...${NC}"
    
    # 備份現有的 .env
    if [ -f ".env" ]; then
        cp .env .env.backup
        echo -e "${BLUE}💾 已備份現有 .env 到 .env.backup${NC}"
    fi
    
    # 複製 Zeabur 開發環境配置
    if [ -f ".env.dev" ]; then
        cp .env.dev .env
        echo -e "${GREEN}✅ 已切換到 Zeabur 開發環境${NC}"
        echo -e "${BLUE}📋 資料庫: hkg1.clusters.zeabur.com:31127${NC}"
    else
        echo -e "${RED}❌ .env.dev 檔案不存在${NC}"
        exit 1
    fi
    
elif [ "$1" = "status" ]; then
    echo -e "${BLUE}📊 當前環境狀態：${NC}"
    
    if [ -f ".env" ]; then
        echo -e "${GREEN}✅ .env 檔案存在${NC}"
        
        # 檢查資料庫配置
        if grep -q "hkg1.clusters.zeabur.com" .env; then
            echo -e "${BLUE}🗄️  資料庫: Zeabur 開發環境${NC}"
        else
            echo -e "${YELLOW}⚠️  資料庫: 未知配置${NC}"
        fi
        
        # 顯示資料庫 URL
        DB_URL=$(grep "DATABASE_URL=" .env | cut -d'=' -f2)
        echo -e "${BLUE}🔗 DATABASE_URL: ${DB_URL}${NC}"
    else
        echo -e "${RED}❌ .env 檔案不存在${NC}"
    fi
    
    if [ -f ".env.backup" ]; then
        echo -e "${BLUE}💾 備份檔案: .env.backup${NC}"
    fi
    
else
    echo -e "${YELLOW}📋 使用方法：${NC}"
    echo "  $0 zeabur   - 切換到 Zeabur 開發環境"
    echo "  $0 status   - 檢查當前環境狀態"
    echo ""
    echo -e "${BLUE}💡 提示：${NC}"
    echo "  • 切換環境前會自動備份現有配置"
    echo "  • 使用 .env.backup 可以恢復之前的設定"
    echo "  • 直接連接到 Zeabur 資料庫，無需本地資料庫"
fi

echo ""
