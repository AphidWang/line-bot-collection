# 🚀 LINE Assistant 架構遷移計劃

## 📋 專案概述

將現有的 Google Drive 架構遷移到 **Docker PostgreSQL + Google Drive 備份** 的混合架構，實現更穩定、可控的資料儲存方案。

## 🎯 目標

- [ ] 建立本地 PostgreSQL 資料庫
- [ ] 遷移現有資料到新架構
- [ ] 實作自動備份到 Google Drive
- [ ] 提升系統穩定性和效能
- [ ] 降低營運成本

## 🔄 架構對應關係

### 現有架構 → 新架構

| 現有組件 | 新架構 | 說明 |
|----------|--------|------|
| `users.json` | `users` 表 | 用戶資料從 JSON 遷移到資料庫 |
| `permissions.json` | `user_permissions` 表 | 權限資料結構化儲存 |
| `conversations/{group_id}.json` | `messages` 表 | 訊息從檔案遷移到資料庫 |
| Google Drive 即時寫入 | PostgreSQL 即時寫入 | 資料庫操作替換檔案操作 |
| 手動備份 | 按鈕觸發備份 | 自動化備份流程 |

## 🏗️ 新架構組件

### 資料庫層
```sql
-- 核心表結構
users (id, email, password_hash, user_type, created_at)
user_permissions (id, user_id, permissions, created_at)
groups (id, group_id, name, created_at)
messages (id, group_id, user_id, content, timestamp, created_at)
backups (id, filename, size, uploaded_at, status)
```

### 服務層重構
```python
# 現有：GoogleDriveService
# 新架構：PostgreSQLService

class PostgreSQLService:
    async def create_user(self, email, password_hash, user_type)
    async def verify_user_password(self, email, password)
    async def add_message(self, group_id, user_id, message)
    async def get_messages(self, filters)
    async def create_backup(self)  # 新增備份功能
```

## 📁 檔案結構變更

```
backend/
├── app/
│   ├── database/           # 新增
│   │   ├── models.py      # SQLAlchemy 模型
│   │   ├── database.py    # 資料庫連接
│   │   └── migrations/    # Alembic 遷移
│   ├── services/
│   │   ├── postgresql_service.py  # 替換 google_drive.py
│   │   └── backup_service.py      # 新增備份服務
│   └── main.py
├── docker-compose.yml      # 新增
├── alembic.ini            # 新增
└── requirements.txt        # 更新依賴
```

## 🔐 認證系統重構

### 登入流程變更

#### 現有流程
1. 前端發送 email/password
2. 後端讀取 Google Drive users.json
3. 驗證密碼 hash
4. 返回 JWT token

#### 新架構流程
1. 前端發送 email/password
2. 後端查詢 PostgreSQL users 表
3. 驗證密碼 hash
4. 返回 JWT token

### 權限檢查變更
```python
# 現有：從 permissions.json 讀取
# 新架構：從 user_permissions 表查詢

async def check_permission(user_id, permission):
    # 查詢 PostgreSQL 權限表
    result = await db.execute(
        select(UserPermission).where(
            UserPermission.user_id == user_id
        )
    )
    return permission in result.permissions
```

## 📊 資料遷移策略

### 用戶資料遷移
```python
# 遷移腳本
async def migrate_users():
    # 1. 讀取 Google Drive users.json
    # 2. 轉換為 SQLAlchemy 模型
    # 3. 寫入 PostgreSQL
    # 4. 驗證資料完整性
```

### 訊息資料遷移
```python
# 遷移腳本
async def migrate_messages():
    # 1. 掃描所有 conversations 檔案
    # 2. 解析 JSON 內容
    # 3. 批次插入 PostgreSQL
    # 4. 建立索引優化查詢
```

## 🚀 實施順序

### 第一階段：基礎設施
- [ ] 建立 Docker 環境
- [ ] 設計資料庫結構
- [ ] 建立基本表
- [ ] 設定資料庫連接

**預計時間：1-2 天**

### 第二階段：核心功能
- [ ] 實作 PostgreSQL 服務
- [ ] 遷移用戶認證
- [ ] 測試基本功能
- [ ] 建立基本 API

**預計時間：2-3 天**

### 第三階段：資料遷移
- [ ] 編寫遷移腳本
- [ ] 執行資料遷移
- [ ] 驗證資料完整性
- [ ] 測試所有功能

**預計時間：1-2 天**

### 第四階段：備份功能
- [ ] 實作備份 API
- [ ] 前端備份按鈕
- [ ] 測試備份還原
- [ ] 備份自動化

**預計時間：1-2 天**

### 第五階段：清理優化
- [ ] 移除舊的 Google Drive 程式碼
- [ ] 效能優化
- [ ] 文件更新
- [ ] 部署測試

**預計時間：1 天**

**總預計時間：6-10 天**

## 🐳 Docker 設定

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: line_assistant_db
    environment:
      POSTGRES_DB: line_assistant
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: bearwin2025
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: line_assistant_pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: bearwin2025
    ports:
      - "5050:80"
    depends_on:
      - postgres
```

## 💰 成本分析

### 免費資源
- Docker Desktop (本地開發)
- Google Drive 15GB 免費空間
- 本地儲存空間

### 潛在成本
- 生產環境伺服器 (如需要)
- Google Drive 額外空間 (如需要)

## ✅ 優勢

1. **完全控制** - 資料在自己手中
2. **成本低廉** - 主要是本地資源
3. **靈活備份** - 按需備份，節省空間
4. **熟悉技術** - PostgreSQL + Docker
5. **整合現有** - 可繼續使用 Google Drive

## ⚠️ 風險與注意事項

### 技術風險
- **資料遺失風險**：遷移過程中需要備份
- **服務中斷**：需要停機維護視窗
- **相容性問題**：新舊架構切換期間的相容性

### 緩解措施
- **資料備份**：遷移前完整備份
- **回滾準備**：準備快速回滾到舊架構
- **資料驗證**：遷移後需要驗證資料完整性
- **分階段部署**：逐步遷移，降低風險

## 🔧 技術依賴

### 新增依賴
```txt
# 資料庫相關
psycopg2-binary==2.9.7
asyncpg==0.28.0
alembic==1.12.0

# 現有依賴保持不變
fastapi==0.104.1
sqlalchemy==2.0.23
```

### 系統要求
- Docker Desktop
- 至少 2GB 可用記憶體
- 至少 5GB 可用磁碟空間

## 📝 檢查清單

### 遷移前檢查
- [ ] 完整備份現有資料
- [ ] 測試環境驗證
- [ ] 回滾計劃準備
- [ ] 團隊通知

### 遷移中檢查
- [ ] 資料庫連接正常
- [ ] 資料遷移進度
- [ ] 功能測試通過
- [ ] 效能監控

### 遷移後檢查
- [ ] 資料完整性驗證
- [ ] 所有功能正常
- [ ] 備份功能測試
- [ ] 監控告警設定

## 🎯 成功標準

- [ ] 所有現有功能正常運作
- [ ] 資料庫查詢效能提升
- [ ] 備份功能正常運作
- [ ] 系統穩定性提升
- [ ] 營運成本降低

## 📞 支援與聯絡

如有問題或需要協助，請聯絡：
- 技術負責人：[待定]
- 專案經理：[待定]
- 緊急聯絡：[待定]

---

**文件版本：** 1.0  
**建立日期：** 2025-08-30  
**最後更新：** 2025-08-30  
**維護者：** LINE Assistant Team
