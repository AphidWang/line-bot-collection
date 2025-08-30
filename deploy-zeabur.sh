#!/bin/bash

echo "🚀 開始部署 Line Assistant 到 Zeabur..."

# 檢查是否已安裝 Zeabur CLI
if ! command -v zeabur &> /dev/null; then
    echo "❌ Zeabur CLI 未安裝，正在安裝..."
    npm install -g @zeabur/cli
fi

# 登入 Zeabur（如果未登入）
if ! zeabur whoami &> /dev/null; then
    echo "🔐 請登入 Zeabur..."
    zeabur login
fi

# 部署到 Zeabur
echo "📦 正在部署..."
zeabur deploy

echo "✅ 部署完成！"
echo "🌐 你的應用程式應該在幾分鐘內上線"
echo "📊 使用 'zeabur logs' 查看日誌"
echo "🔧 使用 'zeabur dashboard' 打開管理面板"
