"""
PostgreSQL 服務層 - 處理資料庫操作
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.database.models import User, UserPermission, Group, Message, Backup
from app.auth import verify_password

logger = logging.getLogger(__name__)

class PostgreSQLService:
    """PostgreSQL 資料庫服務"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # 用戶相關方法
    async def create_user(self, email: str, password_hash: str, user_type: str = "jwt") -> Optional[int]:
        """建立新用戶"""
        try:
            # 檢查用戶是否已存在
            existing_user = await self.db.execute(
                select(User).where(User.email == email)
            )
            if existing_user.scalar_one_or_none():
                logger.warning(f"用戶已存在: {email}")
                return None
            
            # 建立新用戶
            new_user = User(
                email=email,
                password_hash=password_hash,
                user_type=user_type
            )
            self.db.add(new_user)
            await self.db.commit()
            
            # 建立預設權限
            await self.create_user_permission(new_user.id, ["read", "write", "admin"])
            
            logger.info(f"用戶建立成功: {email}")
            return new_user.id
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"建立用戶失敗: {e}")
            return None

    
    async def verify_user_password(self, email: str, password: str) -> bool:
        """驗證用戶密碼"""
        try:
            user = await self.db.execute(
                select(User).where(User.email == email)
            )
            user = user.scalar_one_or_none()
            
            if not user or not user.is_active:
                return False
            
            return verify_password(password, user.password_hash)
            
        except Exception as e:
            logger.error(f"驗證用戶密碼失敗: {e}")
            return False
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根據 email 取得用戶"""
        try:
            user = await self.db.execute(
                select(User).where(User.email == email)
            )
            user = user.scalar_one_or_none()
            
            if user:
                return {
                    "id": user.id,
                    "email": user.email,
                    "user_type": user.user_type,
                    "is_active": user.is_active,
                    "created_at": user.created_at
                }
            return None
            
        except Exception as e:
            logger.error(f"取得用戶失敗: {e}")
            return None
    
    # 權限相關方法
    async def get_user_permissions(self, user_id: str) -> Dict[str, Any]:
        """取得用戶權限"""
        try:
            # 如果是 JWT 用戶，先找到對應的用戶記錄
            if user_id.startswith("jwt_"):
                email = user_id[4:]  # 移除 "jwt_" 前綴
                user = await self.db.execute(
                    select(User).where(User.email == email)
                )
                user = user.scalar_one_or_none()
                if not user:
                    return {}
                user_id = user.id
            
            # 查詢用戶權限
            permission = await self.db.execute(
                select(UserPermission).where(UserPermission.user_id == user_id)
            )
            permission = permission.scalar_one_or_none()
            
            if permission:
                return {
                    "role": permission.role,
                    "allowed_groups": permission.allowed_groups or [],
                    "created_at": permission.created_at.isoformat()
                }
            return {}
            
        except Exception as e:
            logger.error(f"取得用戶權限失敗: {e}")
            return {}
    
    async def check_permission(self, user_id: str, permission: str) -> bool:
        """檢查用戶是否有特定權限"""
        try:
            user_perms = await self.get_user_permissions(user_id)
            if user_perms.get("role") == "admin":
                return True
            
            allowed_permissions = user_perms.get("allowed_groups", [])
            return permission in allowed_permissions
            
        except Exception as e:
            logger.error(f"檢查權限失敗: {e}")
            return False
    
    async def create_user_permission(self, user_id: str, permissions: List[str]) -> bool:
        """建立用戶權限"""
        try:
            # 如果是 JWT 用戶，先找到對應的用戶記錄
            if user_id.startswith("jwt_"):
                email = user_id[4:]  # 移除 "jwt_" 前綴
                user = await self.db.execute(
                    select(User).where(User.email == email)
                )
                user = user.scalar_one_or_none()
                if not user:
                    return False
                user_id = user.id
            
            # 檢查是否已有權限記錄
            existing = await self.db.execute(
                select(UserPermission).where(UserPermission.user_id == user_id)
            )
            existing = existing.scalar_one_or_none()
            
            if existing:
                # 更新現有權限
                existing.allowed_groups = permissions
            else:
                # 建立新權限記錄
                new_permission = UserPermission(
                    user_id=user_id,
                    allowed_groups=permissions
                )
                self.db.add(new_permission)
            
            await self.db.commit()
            logger.info(f"用戶權限建立/更新成功: {user_id}")
            return True
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"建立用戶權限失敗: {e}")
            return False
    
    # 群組相關方法
    async def list_user_groups(self, user_id: str) -> List[str]:
        """列出用戶可存取的群組"""
        try:
            user_perms = await self.get_user_permissions(user_id)
            allowed_groups = user_perms.get("allowed_groups", [])
            
            if not allowed_groups:
                return []
            
            # 查詢群組資訊
            groups = await self.db.execute(
                select(Group).where(Group.group_id.in_(allowed_groups))
            )
            return [group.group_id for group in groups.scalars()]
            
        except Exception as e:
            logger.error(f"列出用戶群組失敗: {e}")
            return []
    
    # 訊息相關方法
    async def get_conversation(self, group_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """取得群組對話記錄"""
        try:
            # 先檢查群組是否存在，不存在則建立
            group = await self.db.execute(
                select(Group).where(Group.group_id == group_id)
            )
            group = group.scalar_one_or_none()
            
            if not group:
                # 建立新群組
                group = Group(group_id=group_id, name=f"Group {group_id}")
                self.db.add(group)
                await self.db.commit()
            
            # 查詢訊息
            messages = await self.db.execute(
                select(Message)
                .where(Message.group_id == group.id)
                .order_by(Message.timestamp.desc())
                .limit(limit)
                .options(selectinload(Message.user))
            )
            
            result = []
            for msg in messages.scalars():
                result.append({
                    "id": msg.id,
                    "user_id": msg.user.email if msg.user else "unknown",
                    "message": msg.content,
                    "timestamp": msg.timestamp.isoformat()
                })
            
            return result[::-1]  # 反轉順序，最新的在最後
            
        except Exception as e:
            logger.error(f"取得對話記錄失敗: {e}")
            return []
    
    async def add_message(self, group_id: str, user_id: str, message: str) -> bool:
        """新增訊息到群組"""
        try:
            # 確保群組存在
            group = await self.db.execute(
                select(Group).where(Group.group_id == group_id)
            )
            group = group.scalar_one_or_none()
            
            if not group:
                group = Group(group_id=group_id, name=f"Group {group_id}")
                self.db.add(group)
                await self.db.commit()
            
            # 確保用戶存在
            if user_id.startswith("jwt_"):
                email = user_id[4:]
                user = await self.db.execute(
                    select(User).where(User.email == email)
                )
                user = user.scalar_one_or_none()
                if not user:
                    # 建立匿名用戶
                    user = User(
                        email=email,
                        password_hash="",  # 匿名用戶不需要密碼
                        user_type="anonymous"
                    )
                    self.db.add(user)
                    await self.db.commit()
            else:
                # 查找現有用戶
                user = await self.db.execute(
                    select(User).where(User.email == user_id)
                )
                user = user.scalar_one_or_none()
                if not user:
                    return False
            
            # 新增訊息
            new_message = Message(
                group_id=group.id,
                user_id=user.id,
                content=message
            )
            self.db.add(new_message)
            await self.db.commit()
            
            logger.info(f"訊息新增成功: {group_id}")
            return True
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"新增訊息失敗: {e}")
            return False
    
    # 備份相關方法
    async def create_backup(self, filename: str, size: int, file_path: str = None, notes: str = None) -> bool:
        """建立備份記錄"""
        try:
            backup = Backup(
                filename=filename,
                size=size,
                file_path=file_path,
                notes=notes
            )
            self.db.add(backup)
            await self.db.commit()
            
            logger.info(f"備份記錄建立成功: {filename}")
            return True
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"建立備份記錄失敗: {e}")
            return False
    
    async def get_backups(self, limit: int = 50) -> List[Dict[str, Any]]:
        """取得備份列表"""
        try:
            backups = await self.db.execute(
                select(Backup)
                .order_by(Backup.uploaded_at.desc())
                .limit(limit)
            )
            
            result = []
            for backup in backups.scalars():
                result.append({
                    "id": backup.id,
                    "filename": backup.filename,
                    "size": backup.size,
                    "uploaded_at": backup.uploaded_at.isoformat(),
                    "status": backup.status,
                    "file_path": backup.file_path,
                    "notes": backup.notes
                })
            
            return result
            
        except Exception as e:
            logger.error(f"取得備份列表失敗: {e}")
            return []
