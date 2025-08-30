#!/bin/bash

echo "🔧 修復 Python 依賴..."

# 進入後端目錄
cd backend

# 檢查虛擬環境
if [ ! -d "venv" ]; then
    echo "📦 建立虛擬環境..."
    python3 -m venv venv
fi

# 啟動虛擬環境
echo "🔧 啟動虛擬環境..."
source venv/bin/activate

# 升級 pip
echo "📦 升級 pip..."
pip install --upgrade pip

# 安裝依賴
echo "📦 安裝依賴..."
pip install -r requirements.txt

# 檢查關鍵依賴
echo "🔍 檢查關鍵依賴..."
python -c "import asyncpg; print('✅ asyncpg 已安裝')"
python -c "import sqlalchemy; print('✅ sqlalchemy 已安裝')"
python -c "import fastapi; print('✅ fastapi 已安裝')"

echo "✅ 依賴修復完成！"
echo "現在可以運行 ./dev.sh 了"
