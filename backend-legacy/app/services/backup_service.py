"""
備份服務 - 處理資料庫備份到 Google Drive
"""

import logging
import os
import tempfile
import json
from datetime import datetime
from typing import Dict, Any, Optional
import subprocess
import zipfile

from app.database.models import User, UserPermission, Group, Message, Backup
from app.google_drive import GoogleDriveService
from app.config import settings

logger = logging.getLogger(__name__)

class BackupService:
    """備份服務"""
    
    def __init__(self, db_session, google_drive_service: Optional[GoogleDriveService] = None):
        self.db = db_session
        self.google_drive_service = google_drive_service
        self.backup_dir = "./backups"
        
        # 確保備份目錄存在
        os.makedirs(self.backup_dir, exist_ok=True)
    
    async def create_database_backup(self) -> Dict[str, Any]:
        """建立資料庫備份"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"line_assistant_backup_{timestamp}.sql"
            filepath = os.path.join(self.backup_dir, filename)
            
            # 使用 pg_dump 建立備份
            result = subprocess.run([
                "pg_dump",
                "-h", "localhost",
                "-U", "admin",
                "-d", "line_assistant",
                "-f", filepath,
                "--no-password"  # 使用環境變數或 .pgpass
            ], capture_output=True, text=True, env={"PGPASSWORD": "bearwin2025"})
            
            if result.returncode != 0:
                logger.error(f"資料庫備份失敗: {result.stderr}")
                return {"success": False, "error": result.stderr}
            
            # 取得檔案大小
            file_size = os.path.getsize(filepath)
            
            # 建立備份記錄
            backup_record = Backup(
                filename=filename,
                size=file_size,
                status="completed",
                notes="自動資料庫備份"
            )
            self.db.add(backup_record)
            await self.db.commit()
            
            logger.info(f"資料庫備份成功: {filename} ({file_size} bytes)")
            
            return {
                "success": True,
                "filename": filename,
                "size": file_size,
                "filepath": filepath
            }
            
        except Exception as e:
            logger.error(f"建立資料庫備份失敗: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_json_backup(self) -> Dict[str, Any]:
        """建立 JSON 格式備份"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"line_assistant_json_{timestamp}.zip"
            filepath = os.path.join(self.backup_dir, filename)
            
            # 建立臨時目錄
            with tempfile.TemporaryDirectory() as temp_dir:
                # 備份用戶資料
                users_data = await self._export_users()
                users_file = os.path.join(temp_dir, "users.json")
                with open(users_file, 'w', encoding='utf-8') as f:
                    json.dump(users_data, f, ensure_ascii=False, indent=2, default=str)
                
                # 備份權限資料
                permissions_data = await self._export_permissions()
                permissions_file = os.path.join(temp_dir, "permissions.json")
                with open(permissions_file, 'w', encoding='utf-8') as f:
                    json.dump(permissions_data, f, ensure_ascii=False, indent=2, default=str)
                
                # 備份群組資料
                groups_data = await self._export_groups()
                groups_file = os.path.join(temp_dir, "groups.json")
                with open(groups_file, 'w', encoding='utf-8') as f:
                    json.dump(groups_data, f, ensure_ascii=False, indent=2, default=str)
                
                # 備份訊息資料
                messages_data = await self._export_messages()
                messages_file = os.path.join(temp_dir, "messages.json")
                with open(messages_file, 'w', encoding='utf-8') as f:
                    json.dump(messages_data, f, ensure_ascii=False, indent=2, default=str)
                
                # 建立 ZIP 檔案
                with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    zipf.write(users_file, "users.json")
                    zipf.write(permissions_file, "permissions.json")
                    zipf.write(groups_file, "groups.json")
                    zipf.write(messages_file, "messages.json")
                
                # 取得檔案大小
                file_size = os.path.getsize(filepath)
                
                # 建立備份記錄
                backup_record = Backup(
                    filename=filename,
                    size=file_size,
                    status="completed",
                    notes="JSON 格式備份"
                )
                self.db.add(backup_record)
                await self.db.commit()
                
                logger.info(f"JSON 備份成功: {filename} ({file_size} bytes)")
                
                return {
                    "success": True,
                    "filename": filename,
                    "size": file_size,
                    "filepath": filepath
                }
                
        except Exception as e:
            logger.error(f"建立 JSON 備份失敗: {e}")
            return {"success": False, "error": str(e)}
    
    async def upload_to_google_drive(self, filepath: str, filename: str) -> Dict[str, Any]:
        """上傳備份檔案到 Google Drive"""
        try:
            if not self.google_drive_service:
                return {"success": False, "error": "Google Drive 服務未啟用"}
            
            # 上傳到 Google Drive
            file_id = self.google_drive_service.upload_file(filepath, filename)
            
            if file_id:
                # 更新備份記錄
                backup_record = await self.db.execute(
                    "SELECT * FROM backups WHERE filename = :filename",
                    {"filename": filename}
                )
                backup_record = backup_record.scalar_one_or_none()
                
                if backup_record:
                    backup_record.file_path = f"https://drive.google.com/file/d/{file_id}/view"
                    await self.db.commit()
                
                logger.info(f"備份上傳到 Google Drive 成功: {filename}")
                return {
                    "success": True,
                    "file_id": file_id,
                    "file_path": f"https://drive.google.com/file/d/{file_id}/view"
                }
            else:
                return {"success": False, "error": "上傳到 Google Drive 失敗"}
                
        except Exception as e:
            logger.error(f"上傳到 Google Drive 失敗: {e}")
            return {"success": False, "error": str(e)}
    
    async def _export_users(self) -> list:
        """匯出用戶資料"""
        try:
            users = await self.db.execute("SELECT * FROM users")
            result = []
            for user in users:
                result.append({
                    "id": user.id,
                    "email": user.email,
                    "user_type": user.user_type,
                    "is_active": user.is_active,
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "updated_at": user.updated_at.isoformat() if user.updated_at else None
                })
            return result
        except Exception as e:
            logger.error(f"匯出用戶資料失敗: {e}")
            return []
    
    async def _export_permissions(self) -> list:
        """匯出權限資料"""
        try:
            permissions = await self.db.execute("SELECT * FROM user_permissions")
            result = []
            for perm in permissions:
                result.append({
                    "id": perm.id,
                    "user_id": perm.user_id,
                    "role": perm.role,
                    "allowed_groups": perm.allowed_groups,
                    "created_at": perm.created_at.isoformat() if perm.created_at else None
                })
            return result
        except Exception as e:
            logger.error(f"匯出權限資料失敗: {e}")
            return []
    
    async def _export_groups(self) -> list:
        """匯出群組資料"""
        try:
            groups = await self.db.execute("SELECT * FROM groups")
            result = []
            for group in groups:
                result.append({
                    "id": group.id,
                    "group_id": group.group_id,
                    "name": group.name,
                    "created_at": group.created_at.isoformat() if group.created_at else None
                })
            return result
        except Exception as e:
            logger.error(f"匯出群組資料失敗: {e}")
            return []
    
    async def _export_messages(self) -> list:
        """匯出訊息資料"""
        try:
            messages = await self.db.execute("SELECT * FROM messages")
            result = []
            for msg in messages:
                result.append({
                    "id": msg.id,
                    "group_id": msg.group_id,
                    "user_id": msg.user_id,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                    "created_at": msg.created_at.isoformat() if msg.created_at else None
                })
            return result
        except Exception as e:
            logger.error(f"匯出訊息資料失敗: {e}")
            return []
    
    async def cleanup_old_backups(self, keep_days: int = 30) -> Dict[str, Any]:
        """清理舊備份檔案"""
        try:
            import glob
            from datetime import timedelta
            
            cutoff_date = datetime.now() - timedelta(days=keep_days)
            deleted_count = 0
            deleted_size = 0
            
            # 清理本地備份檔案
            for backup_file in glob.glob(os.path.join(self.backup_dir, "*.sql")):
                file_time = datetime.fromtimestamp(os.path.getctime(backup_file))
                if file_time < cutoff_date:
                    file_size = os.path.getsize(backup_file)
                    os.remove(backup_file)
                    deleted_count += 1
                    deleted_size += file_size
                    logger.info(f"刪除舊備份檔案: {backup_file}")
            
            # 清理 JSON 備份檔案
            for backup_file in glob.glob(os.path.join(self.backup_dir, "*.zip")):
                file_time = datetime.fromtimestamp(os.path.getctime(backup_file))
                if file_time < cutoff_date:
                    file_size = os.path.getsize(backup_file)
                    os.remove(backup_file)
                    deleted_count += 1
                    deleted_size += file_size
                    logger.info(f"刪除舊備份檔案: {backup_file}")
            
            logger.info(f"清理完成: 刪除 {deleted_count} 個檔案，釋放 {deleted_size} bytes")
            
            return {
                "success": True,
                "deleted_count": deleted_count,
                "deleted_size": deleted_size
            }
            
        except Exception as e:
            logger.error(f"清理舊備份失敗: {e}")
            return {"success": False, "error": str(e)}
