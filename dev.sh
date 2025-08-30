#!/bin/bash

echo "�� 啟動 LINE Assistant 開發環境..."

# 切換到 Zeabur 環境
./switch_env.sh zeabur

# 檢查 Python 虛擬環境
if [ ! -d "backend/venv" ]; then
    echo "📦 建立 Python 虛擬環境..."
    cd backend
    python3 -m venv venv
    cd ..
fi

# 安裝 Python 依賴
echo "📦 安裝 Python 依賴..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 檢查前端依賴
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 安裝前端依賴..."
    cd frontend
    npm install
    cd ..
fi

# 啟動後端
echo "🔧 啟動後端服務..."
cd backend
source venv/bin/activate
echo "後端服務將在 http://localhost:8000 啟動"
echo "按 Ctrl+C 停止後端服務"
python run.py &
BACKEND_PID=$!
cd ..

# 等待後端啟動
sleep 3

# 啟動前端
echo "🌐 啟動前端服務..."
cd frontend
echo "前端服務將在 http://localhost:3000 啟動"
echo "按 Ctrl+C 停止前端服務"
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ 服務已啟動！"
echo "🌐 前端: http://localhost:3000"
echo "🔧 後端: http://localhost:8000"
echo "📚 API 文檔: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服務"

# 等待用戶中斷
trap "echo '🛑 停止服務...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

wait
