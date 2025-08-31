# Line Assistant - 部署指南

## 🚀 快速開始

### 前置需求

- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **PostgreSQL**: 12.0 或更高版本
- **Docker**: 20.10 或更高版本（可選）
- **Docker Compose**: 2.0 或更高版本（可選）

### 環境檢查

```bash
# 檢查 Node.js 版本
node --version

# 檢查 npm 版本
npm --version

# 檢查 PostgreSQL 版本
psql --version

# 檢查 Docker 版本
docker --version
docker-compose --version
```

## 🏠 本地開發環境

### 1. 克隆專案

```bash
git clone <repository-url>
cd LineAssistant
```

### 2. 安裝依賴

```bash
# 安裝所有依賴
make install

# 或手動安裝
cd backend && npm install
cd ../frontend && npm install
```

### 3. 環境配置

```bash
# 複製環境變數模板
cp backend/.env.example backend/.env

# 編輯環境變數
nano backend/.env
```

#### 必要的環境變數

```bash
# 資料庫連線
DATABASE_URL="postgresql://username:password@localhost:5432/line_assistant"

# JWT 認證
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# 服務配置
PORT=3001
NODE_ENV=development
```

#### 可選的環境變數

```bash
# Firebase 認證（可選）
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"

# OpenAI API（可選）
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-3.5-turbo"

# Line Bot（可選）
LINE_CHANNEL_SECRET="your-line-channel-secret"
LINE_CHANNEL_ACCESS_TOKEN="your-line-channel-access-token"

# 限流配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. 資料庫設定

```bash
# 建立資料庫
createdb line_assistant

# 同步資料庫 Schema
make db-push

# 或手動執行
cd backend
npx prisma db push
```

### 5. 啟動服務

```bash
# 啟動完整開發環境
make dev

# 或分別啟動
make backend    # 後端服務
make frontend   # 前端服務
```

### 6. 驗證部署

```bash
# 健康檢查
curl http://localhost:3001/health

# 執行 API 測試
make test
```

## 🐳 Docker 部署

### 1. 建置映像

```bash
# 建置所有映像
make build

# 或手動建置
docker build -t line-assistant-backend ./backend
docker build -t line-assistant-frontend ./frontend
```

### 2. 環境配置

```bash
# 複製環境變數
cp backend/.env.example .env

# 編輯環境變數
nano .env
```

### 3. 啟動服務

```bash
# 啟動 Docker 服務
make docker

# 或手動啟動
docker-compose up -d
```

### 4. 服務管理

```bash
# 查看服務狀態
docker-compose ps

# 查看日誌
make logs

# 重啟服務
make restart

# 停止服務
make stop
```

## ☁️ 雲端部署

### 1. 資料庫部署

#### PostgreSQL 雲端服務

**推薦選項：**
- **Supabase**: 免費層級，PostgreSQL 13+
- **Neon**: 無伺服器 PostgreSQL，按使用量計費
- **AWS RDS**: 企業級，高可用性
- **Google Cloud SQL**: 整合 Google 生態系統

#### 資料庫連線字串格式

```bash
# Supabase
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Neon
DATABASE_URL="postgresql://[user]:[password]@[endpoint]/[database]?sslmode=require"

# AWS RDS
DATABASE_URL="postgresql://[user]:[password]@[endpoint]:5432/[database]"

# Google Cloud SQL
DATABASE_URL="postgresql://[user]:[password]@[ip]:5432/[database]"
```

### 2. 後端部署

#### 容器化部署

**推薦平台：**
- **Railway**: 簡單部署，自動 HTTPS
- **Render**: 免費層級，自動部署
- **Heroku**: 成熟平台，豐富生態
- **AWS ECS**: 企業級，高可擴展性

#### Railway 部署步驟

```bash
# 1. 安裝 Railway CLI
npm install -g @railway/cli

# 2. 登入 Railway
railway login

# 3. 初始化專案
railway init

# 4. 設定環境變數
railway variables set DATABASE_URL="your-database-url"
railway variables set JWT_SECRET="your-jwt-secret"

# 5. 部署
railway up
```

#### Render 部署步驟

```bash
# 1. 連接 GitHub 倉庫
# 2. 設定建置命令: npm run build
# 3. 設定啟動命令: npm start
# 4. 設定環境變數
# 5. 自動部署
```

### 3. 前端部署

#### 靜態網站託管

**推薦平台：**
- **Vercel**: Next.js 官方平台，自動部署
- **Netlify**: 免費層級，豐富功能
- **GitHub Pages**: 免費，整合 Git
- **Cloudflare Pages**: 全球 CDN，快速

#### Vercel 部署步驟

```bash
# 1. 安裝 Vercel CLI
npm install -g vercel

# 2. 登入 Vercel
vercel login

# 3. 部署
vercel

# 4. 設定環境變數
vercel env add NEXT_PUBLIC_API_URL
```

## 🔧 進階配置

### 1. 反向代理 (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 後端 API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Line Webhook
    location /api/line/webhook {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. SSL 憑證

#### Let's Encrypt (免費)

```bash
# 安裝 Certbot
sudo apt install certbot python3-certbot-nginx

# 取得憑證
sudo certbot --nginx -d your-domain.com

# 自動更新
sudo crontab -e
# 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 雲端平台 SSL

- **Railway**: 自動 HTTPS
- **Render**: 自動 HTTPS
- **Vercel**: 自動 HTTPS
- **Cloudflare**: 免費 SSL

### 3. 環境變數管理

#### 生產環境配置

```bash
# 建立生產環境配置
cp backend/.env.example backend/.env.production

# 編輯生產環境變數
nano backend/.env.production

# 設定環境變數
export NODE_ENV=production
export $(cat backend/.env.production | xargs)
```

#### 環境變數驗證

```bash
# 檢查必要變數
node -e "
const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    process.exit(1);
}
console.log('All required environment variables are set');
"
```

## 📊 監控與維護

### 1. 健康檢查

```bash
# 手動健康檢查
curl -f http://localhost:3001/health

# 自動化監控腳本
#!/bin/bash
while true; do
    if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "$(date): Service is down, restarting..."
        make restart
    fi
    sleep 30
done
```

### 2. 日誌管理

#### 日誌輪轉

```bash
# 使用 logrotate
sudo nano /etc/logrotate.d/line-assistant

/var/log/line-assistant/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload line-assistant
    endscript
}
```

#### 日誌聚合

- **Loki + Grafana**: 輕量級日誌聚合
- **ELK Stack**: 企業級日誌管理
- **CloudWatch**: AWS 整合日誌服務

### 3. 備份策略

#### 資料庫備份

```bash
# 自動備份腳本
#!/bin/bash
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="line_assistant"

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 執行備份
pg_dump $DB_NAME > $BACKUP_DIR/${DB_NAME}_${DATE}.sql

# 壓縮備份
gzip $BACKUP_DIR/${DB_NAME}_${DATE}.sql

# 清理舊備份（保留 30 天）
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.sql.gz"
```

#### 檔案備份

```bash
# 備份重要檔案
tar -czf /backups/config_$(date +%Y%m%d).tar.gz \
    backend/.env \
    backend/prisma/ \
    docker-compose.yml
```

## 🚨 故障排除

### 1. 常見問題

#### 資料庫連線失敗

```bash
# 檢查資料庫狀態
sudo systemctl status postgresql

# 檢查連線
psql -h localhost -U postgres -d line_assistant

# 檢查防火牆
sudo ufw status
```

#### 服務無法啟動

```bash
# 檢查日誌
make logs

# 檢查埠號佔用
sudo netstat -tlnp | grep :3001

# 檢查環境變數
echo $DATABASE_URL
echo $JWT_SECRET
```

#### 記憶體不足

```bash
# 檢查記憶體使用
free -h

# 檢查 Node.js 記憶體限制
node --max-old-space-size=4096 src/index.js

# 優化 Docker 記憶體
docker run --memory=2g line-assistant-backend
```

### 2. 效能調優

#### 資料庫優化

```sql
-- 建立索引
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);

-- 分析查詢效能
EXPLAIN ANALYZE SELECT * FROM messages WHERE channel_id = 'xxx';
```

#### Node.js 優化

```bash
# 增加記憶體限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 啟用叢集模式
npm install -g pm2
pm2 start src/index.js -i max
```

### 3. 安全檢查

```bash
# 檢查開放埠號
sudo netstat -tlnp

# 檢查 SSL 憑證
openssl s_client -connect your-domain.com:443

# 檢查安全標頭
curl -I https://your-domain.com

# 掃描安全漏洞
npm audit
```

## 📚 參考資源

### 官方文檔
- [Node.js 官方文檔](https://nodejs.org/docs/)
- [Express.js 官方文檔](https://expressjs.com/)
- [Prisma 官方文檔](https://www.prisma.io/docs/)
- [Next.js 官方文檔](https://nextjs.org/docs)

### 部署平台
- [Railway 部署指南](https://docs.railway.app/)
- [Render 部署指南](https://render.com/docs)
- [Vercel 部署指南](https://vercel.com/docs)
- [Docker 官方文檔](https://docs.docker.com/)

### 監控工具
- [Grafana 官方文檔](https://grafana.com/docs/)
- [Prometheus 官方文檔](https://prometheus.io/docs/)
- [ELK Stack 指南](https://www.elastic.co/guide/)

---

*此部署指南會持續更新，請定期查看最新版本。如有問題，請參考故障排除章節或聯絡開發團隊。*
