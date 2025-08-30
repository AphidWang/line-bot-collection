#!/usr/bin/env python3
"""
初始化 Google Drive 資料夾結構
使用 OAuth delegation 代表個人帳號
"""

import asyncio
import sys
import os

# 加入專案路徑
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.google_drive import GoogleDriveService
from app.auth import get_password_hash

async def init_google_drive():
    """初始化 Google Drive 資料夾結構"""
    try:
        # 檢查設定
        if not settings.is_google_drive_accessible():
            print("❌ Google Drive 未設定或無法存取")
            return False
        
        # 取得個人 Google 帳號 email（從環境變數或手動設定）
        user_email = os.getenv('GOOGLE_USER_EMAIL', 'your-email@gmail.com')
        if user_email == 'your-email@gmail.com':
            print("⚠️  請設定 GOOGLE_USER_EMAIL 環境變數為你的 Google 帳號")
            print("   例如: export GOOGLE_USER_EMAIL=your-email@gmail.com")
            return False
        
        print(f"📧 使用 OAuth delegation 代表用戶: {user_email}")
        
        # 初始化服務
        credentials_path = settings.get_google_credentials_path()
        google_drive_service = GoogleDriveService(
            credentials_path=credentials_path,
            folder_id=settings.google_drive_folder_id,
            user_email=user_email
        )
        
        print("✅ Google Drive 服務初始化成功")
        
        # 建立 users.json
        print("📝 建立 users.json...")
        admin_user = {
            'email': 'admin@example.com',
            'password_hash': get_password_hash('bearwin2025'),
            'user_type': 'jwt',
            'is_active': True,
            'created_at': '2025-08-30T00:00:00'
        }
        
        users_content = {
            'users': {
                'admin@example.com': admin_user
            }
        }
        
        google_drive_service._create_file_if_not_exists('users.json', users_content)
        print("✅ users.json 建立成功")
        
        # 建立 permissions.json
        print("📝 建立 permissions.json...")
        permissions_content = {
            'permissions': {
                'admin@example.com': ['read', 'write', 'admin']
            }
        }
        
        google_drive_service._create_file_if_not_exists('permissions.json', permissions_content)
        print("✅ permissions.json 建立成功")
        
        # 建立 groups.json
        print("📝 建立 groups.json...")
        groups_content = {
            'groups': ['test-group-1', 'test-group-2']
        }
        
        google_drive_service._create_file_if_not_exists('groups.json', groups_content)
        print("✅ groups.json 建立成功")
        
        # 建立 conversations 資料夾結構
        print("📝 建立 conversations 資料夾...")
        for group_id in ['test-group-1', 'test-group-2']:
            conversation_content = {
                'group_id': group_id,
                'messages': [
                    {
                        'user_id': 'admin@example.com',
                        'message': f'這是 {group_id} 的測試訊息',
                        'timestamp': '2025-08-30T00:00:00'
                    }
                ]
            }
            
            filename = f'conversations/{group_id}.json'
            google_drive_service._create_file_if_not_exists(filename, conversation_content)
            print(f"✅ {filename} 建立成功")
        
        print("\n🎉 Google Drive 初始化完成！")
        print("📧 管理員帳號: admin@example.com")
        print("🔑 管理員密碼: bearwin2025")
        print("🔐 預設權限: read, write, admin")
        
        return True
        
    except Exception as e:
        print(f"❌ 初始化失敗: {e}")
        return False

if __name__ == "__main__":
    print("🚀 開始初始化 Google Drive...")
    print("📝 注意: 需要設定 GOOGLE_USER_EMAIL 環境變數")
    success = asyncio.run(init_google_drive())
    
    if success:
        print("\n✅ 初始化成功！現在可以啟動應用程式了。")
    else:
        print("\n❌ 初始化失敗！請檢查設定和錯誤訊息。")
        sys.exit(1)
