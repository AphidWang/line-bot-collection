#!/bin/bash

# 開發環境啟動腳本
# 連接到 prod 資料庫，但使用本地開發設定

echo "🚀 啟動開發環境..."
echo "📊 連接到 prod 資料庫: hkg1.clusters.zeabur.com:31127"

# 複製 dev 環境變數
cp .env.dev .env

# 啟動後端
echo "🔧 啟動後端服務..."
cd backend
npm install
npm run dev &
BACKEND_PID=$!

# 等待後端啟動
sleep 5

# 啟動前端
echo "🎨 啟動前端服務..."
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

echo "✅ 開發環境已啟動！"
echo "📱 前端: http://localhost:3000"
echo "🔧 後端: http://localhost:3001"
echo "📊 資料庫: 連接到 prod 資料庫"
echo ""
echo "按 Ctrl+C 停止所有服務"

# 等待用戶中斷
trap "echo '🛑 停止服務...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
