# LINE Bot 設定指南

## 🚀 快速開始

### 1. 環境變數設定

在 `.env` 檔案中加入以下設定：

```bash
# LINE Bot 設定
LINE_CHANNEL_ID=2008019986
LINE_CHANNEL_SECRET=13adcc0df62c107fb3a72d0a03cb2666
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
```

**注意：** 你需要從 LINE Developers Console 取得 `LINE_CHANNEL_ACCESS_TOKEN`

### 2. 取得 Channel Access Token

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 登入你的 LINE 帳號
3. 選擇你的 Channel (2008019986)
4. 在 "Messaging API" 頁籤中
5. 複製 "Channel access token (long-lived)"

### 3. Webhook URL 設定

在 LINE Developers Console 中設定 Webhook URL：

```
https://your-domain.com/webhook
```

**本地測試：**
- 使用 ngrok 建立隧道：`ngrok http 8000`
- Webhook URL：`https://your-ngrok-url.ngrok.io/webhook`

## 🔧 功能特色

### 群組訊息處理
- ✅ 自動儲存群組訊息到 Google Drive
- ✅ 智能關鍵字回覆
- ✅ 群組加入歡迎訊息
- ✅ 按鈕互動支援

### 私聊功能
- ✅ 個人設定管理
- ✅ 使用統計查詢
- ✅ 個人化建議

### 智能回覆
- ✅ 關鍵字觸發回覆
- ✅ 問候語自動回覆
- ✅ 功能說明快速回覆
- ✅ 隨機提示訊息

## 📱 支援的訊息類型

### 文字訊息
- 一般文字對話
- 關鍵字觸發功能
- 指令查詢

### 按鈕互動
- 快速回覆按鈕
- 功能選單
- 設定選項

### 系統事件
- 群組加入/離開
- 用戶加入/離開
- 訊息回覆

## 🎯 關鍵字指令

| 關鍵字 | 功能 | 說明 |
|--------|------|------|
| 幫助 / help | 顯示功能說明 | 列出所有可用功能 |
| 查詢 / search | 訊息查詢 | 提供查詢條件說明 |
| 分析 / analyze | 群組分析 | 顯示分析功能說明 |
| 摘要 / summary | AI 摘要 | 說明摘要功能 |
| 狀態 / status | Bot 狀態 | 顯示運行狀態 |
| 設定 / settings | 個人設定 | 私聊專用功能 |
| 統計 / stats | 個人統計 | 私聊專用功能 |

## 🔐 安全性

### Webhook 簽名驗證
- 使用 HMAC-SHA256 驗證
- 防止偽造請求
- 自動拒絕無效簽名

### 環境變數保護
- 敏感資訊不寫入程式碼
- 支援多環境設定
- 生產環境安全建議

## 🚨 故障排除

### 常見問題

1. **Webhook 無法接收訊息**
   - 檢查 Channel Secret 是否正確
   - 確認 Webhook URL 可被 LINE 伺服器存取
   - 檢查防火牆設定

2. **Bot 無法回覆訊息**
   - 檢查 Channel Access Token 是否正確
   - 確認 Bot 有回覆權限
   - 檢查 API 配額限制

3. **簽名驗證失敗**
   - 確認 Channel Secret 設定
   - 檢查請求內容編碼
   - 驗證時間戳記

### 日誌檢查

```bash
# 檢查後端日誌
tail -f backend/logs/app.log

# 檢查 LINE Bot 日誌
grep "LINE Bot" backend/logs/app.log
```

## 📊 監控與統計

### 健康檢查
```bash
curl http://localhost:8000/health
```

### Webhook 狀態
```bash
curl -X POST http://localhost:8000/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```

## 🔄 更新與維護

### 定期檢查
- Channel Access Token 有效期
- API 配額使用情況
- 錯誤日誌分析

### 備份設定
- 定期備份環境變數
- 保存 Channel 設定截圖
- 記錄 Webhook URL 變更

## 📞 支援

如有問題，請檢查：
1. 日誌檔案
2. LINE Developers Console 狀態
3. 網路連線
4. 環境變數設定

---

**版本：** 1.0.0  
**更新日期：** 2025-08-30  
**維護者：** LINE Assistant Team
