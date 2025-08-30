#!/usr/bin/env python3
"""
資料遷移腳本 - 從 Google Drive 遷移到 PostgreSQL
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List

from app.database.database import init_db, get_db
from app.services.postgresql_service import PostgreSQLService
from app.google_drive import GoogleDriveService
from app.config import settings
from app.auth import get_password_hash

# 設定 logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_users(google_drive_service: GoogleDriveService, postgres_service: PostgreSQLService):
    """遷移用戶資料"""
    try:
        logger.info("開始遷移用戶資料...")
        
        # 讀取 Google Drive 中的 users.json
        users_data = google_drive_service.read_file("users.json")
        if not users_data:
            logger.warning("未找到 users.json 檔案")
            return
        
        users = json.loads(users_data)
        migrated_count = 0
        
        for user in users:
            try:
                # 檢查用戶是否已存在
                existing_user = await postgres_service.get_user_by_email(user.get('email', ''))
                if existing_user:
                    logger.info(f"用戶已存在，跳過: {user.get('email')}")
                    continue
                
                # 建立新用戶
                success = await postgres_service.create_user(
                    user.get('email', ''),
                    user.get('password_hash', ''),
                    user.get('user_type', 'jwt')
                )
                
                if success:
                    migrated_count += 1
                    logger.info(f"用戶遷移成功: {user.get('email')}")
                else:
                    logger.error(f"用戶遷移失敗: {user.get('email')}")
                    
            except Exception as e:
                logger.error(f"遷移用戶時發生錯誤 {user.get('email')}: {e}")
        
        logger.info(f"用戶遷移完成，成功遷移 {migrated_count} 個用戶")
        
    except Exception as e:
        logger.error(f"遷移用戶資料失敗: {e}")

async def migrate_permissions(google_drive_service: GoogleDriveService, postgres_service: PostgreSQLService):
    """遷移權限資料"""
    try:
        logger.info("開始遷移權限資料...")
        
        # 讀取 Google Drive 中的 permissions.json
        permissions_data = google_drive_service.read_file("permissions.json")
        if not permissions_data:
            logger.warning("未找到 permissions.json 檔案")
            return
        
        permissions = json.loads(permissions_data)
        migrated_count = 0
        
        for perm in permissions:
            try:
                # 建立用戶權限
                success = await postgres_service.create_user_permission(
                    perm.get('firebase_uid', ''),
                    perm.get('email', ''),
                    perm.get('role', 'user'),
                    perm.get('allowed_groups', [])
                )
                
                if success:
                    migrated_count += 1
                    logger.info(f"權限遷移成功: {perm.get('email')}")
                else:
                    logger.error(f"權限遷移失敗: {perm.get('email')}")
                    
            except Exception as e:
                logger.error(f"遷移權限時發生錯誤 {perm.get('email')}: {e}")
        
        logger.info(f"權限遷移完成，成功遷移 {migrated_count} 個權限記錄")
        
    except Exception as e:
        logger.error(f"遷移權限資料失敗: {e}")

async def migrate_conversations(google_drive_service: GoogleDriveService, postgres_service: PostgreSQLService):
    """遷移對話資料"""
    try:
        logger.info("開始遷移對話資料...")
        
        # 列出 Google Drive 中的對話檔案
        conversation_files = google_drive_service.list_files("conversations/")
        if not conversation_files:
            logger.warning("未找到對話檔案")
            return
        
        migrated_count = 0
        
        for file_info in conversation_files:
            try:
                if not file_info['name'].endswith('.json'):
                    continue
                
                # 讀取對話檔案
                conversation_data = google_drive_service.read_file(f"conversations/{file_info['name']}")
                if not conversation_data:
                    continue
                
                conversation = json.loads(conversation_data)
                group_id = file_info['name'].replace('.json', '')
                
                # 遷移訊息
                for message in conversation:
                    try:
                        success = await postgres_service.add_message(
                            group_id,
                            message.get('user_id', ''),
                            message.get('message', '')
                        )
                        
                        if success:
                            migrated_count += 1
                        else:
                            logger.error(f"訊息遷移失敗: {group_id} - {message.get('user_id')}")
                            
                    except Exception as e:
                        logger.error(f"遷移訊息時發生錯誤: {e}")
                
                logger.info(f"群組 {group_id} 遷移完成")
                
            except Exception as e:
                logger.error(f"遷移對話檔案時發生錯誤 {file_info['name']}: {e}")
        
        logger.info(f"對話遷移完成，成功遷移 {migrated_count} 條訊息")
        
    except Exception as e:
        logger.error(f"遷移對話資料失敗: {e}")

async def create_admin_user(postgres_service: PostgreSQLService):
    """建立 admin 用戶"""
    try:
        logger.info("檢查並建立 admin 用戶...")
        
        # 檢查是否已有 admin 用戶
        admin_user = await postgres_service.get_user_by_email('admin@example.com')
        if admin_user:
            logger.info("Admin 用戶已存在")
            return
        
        # 建立 admin 用戶
        success = await postgres_service.create_user(
            'admin@example.com',
            get_password_hash('bearwin2025'),
            'jwt'
        )
        
        if success:
            # 設定 admin 權限
            await postgres_service.create_user_permission(
                'admin@example.com',
                ['read', 'write', 'admin']
            )
            logger.info("Admin 用戶建立成功")
        else:
            logger.error("Admin 用戶建立失敗")
            
    except Exception as e:
        logger.error(f"建立 admin 用戶失敗: {e}")

async def main():
    """主遷移函數"""
    try:
        logger.info("開始資料遷移...")
        
        # 初始化資料庫
        await init_db()
        
        # 檢查 Google Drive 是否可用
        if not settings.is_google_drive_accessible():
            logger.error("Google Drive 未設定，無法進行遷移")
            return
        
        # 初始化 Google Drive 服務
        credentials_path = settings.get_google_credentials_path()
        google_drive_service = GoogleDriveService(
            credentials_path=credentials_path,
            folder_id=settings.google_drive_folder_id
        )
        
        # 取得 PostgreSQL 服務
        async for db in get_db():
            postgres_service = PostgreSQLService(db)
            
            # 建立 admin 用戶
            await create_admin_user(postgres_service)
            
            # 遷移用戶資料
            await migrate_users(google_drive_service, postgres_service)
            
            # 遷移權限資料
            await migrate_permissions(google_drive_service, postgres_service)
            
            # 遷移對話資料
            await migrate_conversations(google_drive_service, postgres_service)
            
            break
        
        logger.info("資料遷移完成！")
        
    except Exception as e:
        logger.error(f"資料遷移失敗: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(main())
