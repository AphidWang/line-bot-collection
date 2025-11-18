# 建置階段
FROM node:18-alpine AS builder

# 安裝 pnpm
RUN npm install -g pnpm

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package.json ./

# 安裝依賴 (不使用 frozen-lockfile，因為前端沒有獨立的 lockfile)
RUN pnpm install

# 複製原始碼
COPY . .

# 建置應用程式
RUN pnpm run build

# 生產階段
FROM node:18-alpine AS runner

# 設定工作目錄
WORKDIR /app

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製 standalone 建置結果
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# 暴露埠號（Zeabur 會動態設定 PORT 環境變數）
EXPOSE 3000

# 設定環境變數
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
# PORT 由 Zeabur 提供，不在此設定

# 啟動應用程式（standalone 模式）
# Next.js standalone 模式的 server.js 會自動讀取 PORT 環境變數
CMD ["node", "server.js"]
