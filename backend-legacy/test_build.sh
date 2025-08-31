#!/bin/bash

echo "🧪 本地測試 Zeabur build 環境..."

# 檢查 Python 版本
echo "📋 Python 版本:"
python --version

# 清理舊的虛擬環境
echo "🧹 清理舊環境..."
rm -rf test_env

# 創建新的虛擬環境
echo "🔧 創建虛擬環境..."
python -m venv test_env

# 啟動虛擬環境
echo "🚀 啟動虛擬環境..."
source test_env/bin/activate

# 檢查虛擬環境中的 Python 版本
echo "📋 虛擬環境 Python 版本:"
python --version

# 升級 pip
echo "⬆️ 升級 pip..."
pip install --upgrade pip

# 安裝依賴
echo "📦 安裝依賴..."
pip install -r requirements.txt

# 測試 import
echo "🧪 測試 import..."
python -c "
try:
    from app.main import app
    print('✅ 後端 app import 成功')
except Exception as e:
    print(f'❌ 後端 app import 失敗: {e}')
"

# 測試資料庫連接
echo "🧪 測試資料庫連接..."
python -c "
try:
    from app.database.database import engine
    print('✅ 資料庫連接成功')
except Exception as e:
    print(f'❌ 資料庫連接失敗: {e}')
"

echo "🎉 測試完成！"
