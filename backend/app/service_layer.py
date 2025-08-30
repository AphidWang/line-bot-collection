"""
服務層 - 處理業務邏輯
使用 PostgreSQL 作為主要資料庫，Google Drive 作為備份
"""

import logging
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime
from app.config import settings
from app.google_drive import GoogleDriveService
from app.database.database import get_db
from app.services.postgresql_service import PostgreSQLService

logger = logging.getLogger(__name__)

# 初始化 Google Drive 服務 (用於備份)
google_drive_service = None

try:
    if settings.is_google_drive_accessible():
        credentials_path = settings.get_google_credentials_path()
        google_drive_service = GoogleDriveService(
            credentials_path=credentials_path,
            folder_id=settings.google_drive_folder_id
        )
        logger.info("Google Drive 服務初始化成功 (備份用)")
    else:
        logger.warning("Google Drive 未設定，備份功能將不可用")
except Exception as e:
    logger.warning(f"Google Drive 服務初始化失敗: {e}")

# 取得資料庫服務實例
async def get_postgresql_service():
    """取得 PostgreSQL 服務實例"""
    async for db in get_db():
        try:
            service = PostgreSQLService(db)
            yield service
        finally:
            await db.close()

# 用戶服務
async def create_user(email: str, password_hash: str, user_type: str = "jwt") -> Optional[int]:
    """建立新用戶"""
    try:
        async for service in get_postgresql_service():
            return await service.create_user(email, password_hash, user_type)
    except Exception as e:
        logger.error(f"建立用戶失敗: {e}")
        return None

async def verify_user(email: str, password: str) -> bool:
    """驗證用戶密碼"""
    try:
        async for service in get_postgresql_service():
            return await service.verify_user_password(email, password)
    except Exception as e:
        logger.error(f"驗證用戶失敗: {e}")
        return False

async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """根據 email 取得用戶"""
    try:
        async for service in get_postgresql_service():
            return await service.get_user_by_email(email)
    except Exception as e:
        logger.error(f"取得用戶失敗: {e}")
        return None

# 權限服務
async def get_user_permissions(user_id: str) -> Dict[str, Any]:
    """取得用戶權限"""
    try:
        async for service in get_postgresql_service():
            return await service.get_user_permissions(user_id)
    except Exception as e:
        logger.error(f"取得用戶權限失敗: {e}")
        return {}

async def check_permission(user_id: str, permission: str) -> bool:
    """檢查用戶是否有特定權限"""
    try:
        async for service in get_postgresql_service():
            return await service.check_permission(user_id, permission)
    except Exception as e:
        logger.error(f"檢查權限失敗: {e}")
        return False

async def create_user_permission(user_id: str, email: str, role: str, allowed_groups: List[str]) -> bool:
    """建立用戶權限"""
    try:
        async for service in get_postgresql_service():
            return await service.create_user_permission(user_id, allowed_groups)
    except Exception as e:
        logger.error(f"建立用戶權限失敗: {e}")
        return False

# 群組服務
async def list_user_groups(user_id: str) -> List[str]:
    """列出用戶可存取的群組"""
    try:
        async for service in get_postgresql_service():
            return await service.list_user_groups(user_id)
    except Exception as e:
        logger.error(f"列出用戶群組失敗: {e}")
        return []

# 訊息服務
async def get_conversation(group_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """取得群組對話記錄"""
    try:
        async for service in get_postgresql_service():
            return await service.get_conversation(group_id, limit)
    except Exception as e:
        logger.error(f"取得對話記錄失敗: {e}")
        return []

async def add_message(group_id: str, user_id: str, message: str) -> bool:
    """新增訊息到群組"""
    try:
        async for service in get_postgresql_service():
            return await service.add_message(group_id, user_id, message)
    except Exception as e:
        logger.error(f"新增訊息失敗: {e}")
        return False

# 初始化資料庫資料
async def init_database_data():
    """初始化資料庫資料"""
    try:
        async for service in get_postgresql_service():
            # 檢查是否已有 admin 用戶
            admin_user = await service.get_user_by_email('admin@example.com')
            if not admin_user:
                from app.auth import get_password_hash
                
                # 建立 admin 用戶
                user_id = await service.create_user(
                    'admin@example.com',
                    get_password_hash('bearwin2025'),
                    'jwt'
                )
                
                if user_id:
                    logger.info("Admin 用戶初始化完成")
                else:
                    logger.warning("Admin 用戶初始化失敗")
            else:
                logger.info("Admin 用戶已存在")
                
    except Exception as e:
        logger.error(f"初始化資料庫資料失敗: {e}")

# 啟動時初始化資料庫資料
# init_database_data()  # 註解掉，因為這是非同步函數，需要在適當的地方調用
