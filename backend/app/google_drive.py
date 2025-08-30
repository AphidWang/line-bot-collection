import os
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

class GoogleDriveService:
    def __init__(self, credentials_path: str, folder_id: str, user_email: str = None):
        self.credentials_path = credentials_path
        self.folder_id = folder_id
        self.user_email = user_email
        
        # 建立 Service Account 認證
        self.credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=['https://www.googleapis.com/auth/drive']
        )
        
        # 如果指定了用戶 email，使用 OAuth delegation
        if user_email:
            self.credentials = self.credentials.with_subject(user_email)
            logger.info(f"使用 OAuth delegation 代表用戶: {user_email}")
        
        self.service = build('drive', 'v3', credentials=self.credentials)
        
        # 快取
        self._permissions_cache = {}
        self._users_cache = {}
        self._cache_time = {}
        self._cache_duration = 300  # 5 分鐘

    def _get_file_id_by_name(self, filename: str) -> Optional[str]:
        """根據檔名取得檔案 ID"""
        try:
            results = self.service.files().list(
                q=f"name='{filename}' and '{self.folder_id}' in parents and trashed=false",
                fields="files(id, name)"
            ).execute()
            
            files = results.get('files', [])
            return files[0]['id'] if files else None
        except Exception as e:
            logger.error(f"取得檔案 ID 失敗: {e}")
            return None

    def _create_file_if_not_exists(self, filename: str, content: Dict[str, Any]) -> str:
        """如果檔案不存在就建立，存在就更新"""
        file_id = self._get_file_id_by_name(filename)
        
        if file_id:
            # 更新現有檔案
            try:
                self.service.files().update(
                    fileId=file_id,
                    media_body=self._create_media_body(content)
                ).execute()
                logger.info(f"檔案更新成功: {filename}")
                return file_id
            except Exception as e:
                logger.error(f"檔案更新失敗: {e}")
                raise
        else:
            # 建立新檔案
            try:
                file_metadata = {
                    'name': filename,
                    'parents': [self.folder_id]
                }
                
                file = self.service.files().create(
                    body=file_metadata,
                    media_body=self._create_media_body(content),
                    fields='id'
                ).execute()
                
                logger.info(f"檔案建立成功: {filename}")
                return file['id']
            except Exception as e:
                logger.error(f"檔案建立失敗: {e}")
                raise

    def _create_media_body(self, content: Dict[str, Any]) -> str:
        """建立媒體內容"""
        import io
        from googleapiclient.http import MediaIoBaseUpload
        
        content_str = json.dumps(content, ensure_ascii=False, indent=2)
        content_bytes = content_str.encode('utf-8')
        
        media = MediaIoBaseUpload(
            io.BytesIO(content_bytes),
            mimetype='application/json',
            resumable=True
        )
        return media

    def _read_file_content(self, filename: str) -> Optional[Dict[str, Any]]:
        """讀取檔案內容"""
        try:
            file_id = self._get_file_id_by_name(filename)
            if not file_id:
                return None
            
            content = self.service.files().get_media(fileId=file_id).execute()
            return json.loads(content.decode('utf-8'))
        except Exception as e:
            logger.error(f"讀取檔案失敗: {e}")
            return None

    # 權限管理
    def get_user_permissions(self, user_id: str) -> List[str]:
        """取得用戶權限"""
        cache_key = f"permissions_{user_id}"
        if self._is_cache_valid(cache_key):
            return self._permissions_cache.get(cache_key, [])
        
        try:
            content = self._read_file_content('permissions.json')
            if not content:
                return []
            
            permissions = content.get('permissions', {})
            user_perms = permissions.get(user_id, [])
            
            # 更新快取
            self._permissions_cache[cache_key] = user_perms
            self._cache_time[cache_key] = datetime.now()
            
            return user_perms
        except Exception as e:
            logger.error(f"取得用戶權限失敗: {e}")
            return []

    def check_permission(self, user_id: str, permission: str) -> bool:
        """檢查用戶是否有特定權限"""
        permissions = self.get_user_permissions(user_id)
        return permission in permissions

    def create_user_permission(self, user_id: str, permissions: List[str]) -> bool:
        """建立用戶權限"""
        try:
            content = self._read_file_content('permissions.json')
            if not content:
                content = {'permissions': {}}
            
            content['permissions'][user_id] = permissions
            self._create_file_if_not_exists('permissions.json', content)
            
            # 清除快取
            self._clear_permission_cache(user_id)
            return True
        except Exception as e:
            logger.error(f"建立用戶權限失敗: {e}")
            return False

    def list_user_groups(self, user_id: str) -> List[str]:
        """列出用戶可存取的群組"""
        if not self.check_permission(user_id, 'read'):
            return []
        
        try:
            content = self._read_file_content('groups.json')
            if not content:
                return []
            
            return content.get('groups', [])
        except Exception as e:
            logger.error(f"列出用戶群組失敗: {e}")
            return []

    # 用戶管理
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根據 email 取得用戶"""
        cache_key = f"user_{email}"
        if self._is_cache_valid(cache_key):
            return self._users_cache.get(cache_key)
        
        try:
            content = self._read_file_content('users.json')
            if not content:
                return None
            
            users = content.get('users', {})
            user = users.get(email)
            
            if user:
                # 更新快取
                self._users_cache[cache_key] = user
                self._cache_time[cache_key] = datetime.now()
            
            return user
        except Exception as e:
            logger.error(f"取得用戶失敗: {e}")
            return None

    def create_user(self, email: str, password_hash: str, user_type: str = "jwt") -> bool:
        """建立新用戶"""
        try:
            content = self._read_file_content('users.json')
            if not content:
                content = {'users': {}}
            
            # 檢查用戶是否已存在
            if email in content['users']:
                logger.warning(f"用戶已存在: {email}")
                return False
            
            # 建立新用戶
            user = {
                'email': email,
                'password_hash': password_hash,
                'user_type': user_type,
                'is_active': True,
                'created_at': datetime.now().isoformat()
            }
            
            content['users'][email] = user
            self._create_file_if_not_exists('users.json', content)
            
            # 清除快取
            self._clear_user_cache(email)
            
            # 建立預設權限
            self.create_user_permission(email, ['read', 'write'])
            
            logger.info(f"用戶建立成功: {email}")
            return True
        except Exception as e:
            logger.error(f"建立用戶失敗: {e}")
            return False

    def verify_user_password(self, email: str, password: str) -> bool:
        """驗證用戶密碼"""
        from app.auth import verify_password
        
        user = self.get_user_by_email(email)
        if not user:
            return False
        
        if not user.get('is_active', True):
            return False
        
        stored_hash = user.get('password_hash')
        if not stored_hash:
            return False
        
        return verify_password(password, stored_hash)

    # 對話記錄管理
    def get_conversation(self, group_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """取得群組對話記錄"""
        try:
            content = self._read_file_content(f'conversations/{group_id}.json')
            if not content:
                return []
            
            messages = content.get('messages', [])
            return messages[-limit:] if limit > 0 else messages
        except Exception as e:
            logger.error(f"取得對話記錄失敗: {e}")
            return []

    def add_message(self, group_id: str, user_id: str, message: str) -> bool:
        """新增訊息到群組"""
        try:
            filename = f'conversations/{group_id}.json'
            content = self._read_file_content(filename)
            if not content:
                content = {'group_id': group_id, 'messages': []}
            
            new_message = {
                'user_id': user_id,
                'message': message,
                'timestamp': datetime.now().isoformat()
            }
            
            content['messages'].append(new_message)
            self._create_file_if_not_exists(filename, content)
            
            logger.info(f"訊息新增成功: {group_id}")
            return True
        except Exception as e:
            logger.error(f"新增訊息失敗: {e}")
            return False

    # 快取管理
    def _is_cache_valid(self, cache_key: str) -> bool:
        """檢查快取是否有效"""
        if cache_key not in self._cache_time:
            return False
        
        elapsed = (datetime.now() - self._cache_time[cache_key]).total_seconds()
        return elapsed < self._cache_duration

    def _clear_permission_cache(self, user_id: str):
        """清除權限快取"""
        cache_key = f"permissions_{user_id}"
        if cache_key in self._permissions_cache:
            del self._permissions_cache[cache_key]
        if cache_key in self._cache_time:
            del self._cache_time[cache_key]

    def _clear_user_cache(self, email: str):
        """清除用戶快取"""
        cache_key = f"user_{email}"
        if cache_key in self._users_cache:
            del self._users_cache[cache_key]
        if cache_key in self._cache_time:
            del self._cache_time[cache_key]
