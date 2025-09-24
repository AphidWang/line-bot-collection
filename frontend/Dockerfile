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

# 安裝 pnpm
RUN npm install -g pnpm

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package.json ./

# 只安裝生產依賴
RUN pnpm install --prod

# 複製建置結果
COPY --from=builder /app/.next ./.next

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 設定權限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露埠號
EXPOSE 3000

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000

# 啟動應用程式
CMD ["pnpm", "start"]
