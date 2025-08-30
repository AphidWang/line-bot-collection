"""
Google Drive 資料存儲
所有資料都存儲在 Google Drive 中
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import json

# 虛擬的資料模型，實際資料存在 Google Drive
class User:
    def __init__(self, email: str, password_hash: str, user_type: str = "jwt", is_active: bool = True):
        self.email = email
        self.password_hash = password_hash
        self.user_type = user_type
        self.is_active = is_active
        self.created_at = datetime.now().isoformat()

class Message:
    def __init__(self, group_id: str, user_id: str, message: str, timestamp: Optional[datetime] = None):
        self.group_id = group_id
        self.user_id = user_id
        self.message = message
        self.timestamp = timestamp.isoformat() if timestamp else datetime.now().isoformat()

# 這些函數會被 Google Drive 服務取代
async def get_db():
    """虛擬的資料庫會話，實際使用 Google Drive"""
    # 返回一個模擬的資料庫會話物件
    class MockDB:
        async def execute(self, query):
            # 模擬 execute 方法
            class MockResult:
                def scalar_one_or_none(self):
                    return None
            return MockResult()
        
        async def add(self, obj):
            pass
        
        async def commit(self):
            pass
        
        async def refresh(self, obj):
            pass
    
    return MockDB()

async def init_db():
    """初始化 Google Drive 資料夾結構"""
    pass
