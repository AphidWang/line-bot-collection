#!/usr/bin/env python3
"""
初始化 users.json 檔案
"""

import sys
import os

# 加入專案路徑
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.google_drive import GoogleDriveService
from app.auth import get_password_hash

def init_users():
    """初始化用戶資料"""
    try:
        print("🚀 開始初始化 users.json...")
        
        # 初始化服務
        credentials_path = settings.get_google_credentials_path()
        google_drive_service = GoogleDriveService(
            credentials_path=credentials_path,
            folder_id=settings.google_drive_folder_id
        )
        
        print("✅ Google Drive 服務初始化成功")
        
        # 建立 admin 用戶資料
        admin_user = {
            'email': 'admin@example.com',
            'password_hash': get_password_hash('bearwin2025'),
            'user_type': 'jwt',
            'is_active': True,
            'created_at': '2025-08-30T00:00:00'
        }
        
        # 建立用戶資料結構
        users_content = {
            'users': {
                'admin@example.com': admin_user
            }
        }
        
        print("📝 建立用戶資料...")
        print(f"  - 帳號: {admin_user['email']}")
        print(f"  - 密碼: bearwin2025")
        print(f"  - 類型: {admin_user['user_type']}")
        print(f"  - 狀態: {'啟用' if admin_user['is_active'] else '停用'}")
        
        # 寫入 Google Drive
        print("\n💾 寫入 Google Drive...")
        file_id = google_drive_service._create_file_if_not_exists('users.json', users_content)
        print(f"✅ 檔案寫入成功，ID: {file_id}")
        
        # 驗證寫入
        print("\n📖 驗證檔案內容...")
        content = google_drive_service._read_file_content('users.json')
        if content:
            print("✅ 檔案讀取成功")
            print(f"📊 用戶數量: {len(content.get('users', {}))}")
            for email, user in content.get('users', {}).items():
                print(f"  - {email}: {user.get('user_type', 'unknown')}")
        else:
            print("❌ 檔案讀取失敗")
            return False
        
        print("\n🎉 users.json 初始化完成！")
        print("📧 現在可以使用 admin@example.com / bearwin2025 登入")
        
        return True
        
    except Exception as e:
        print(f"❌ 初始化失敗: {e}")
        return False

if __name__ == "__main__":
    success = init_users()
    
    if success:
        print("\n✅ 初始化成功！現在可以測試登入了。")
    else:
        print("\n❌ 初始化失敗！")
        sys.exit(1)
