FROM python:3.11.7-slim

WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 複製 requirements.txt
COPY backend/requirements.txt .

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製後端代碼
COPY backend/ .

# 複製前端構建結果
COPY frontend/out ./frontend/out

# 暴露端口
EXPOSE 8000

# 啟動命令
CMD ["python", "run.py"]
