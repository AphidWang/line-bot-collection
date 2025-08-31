#!/usr/bin/env python3
"""
測試讀取和修改現有的 users.json 檔案
"""

import sys
import os

# 加入專案路徑
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.google_drive import GoogleDriveService

def test_existing_file():
    """測試現有檔案"""
    try:
        print("🚀 開始測試現有檔案...")
        
        # 初始化服務
        credentials_path = settings.get_google_credentials_path()
        google_drive_service = GoogleDriveService(
            credentials_path=credentials_path,
            folder_id=settings.google_drive_folder_id
        )
        
        print("✅ Google Drive 服務初始化成功")
        
        # 讀取現有的 users.json
        print("📖 讀取 users.json...")
        content = google_drive_service._read_file_content('users.json')
        if content:
            print(f"✅ 檔案內容: {content}")
        else:
            print("⚠️  檔案是空的或讀取失敗")
            return False
        
        # 嘗試修改檔案
        print("\n✏️  測試修改檔案...")
        try:
            # 新增一個測試用戶
            if 'users' not in content:
                content['users'] = {}
            
            content['users']['test@example.com'] = {
                'email': 'test@example.com',
                'password_hash': 'test_hash',
                'user_type': 'jwt',
                'is_active': True,
                'created_at': '2025-08-30T00:00:00'
            }
            
            # 更新檔案
            file_id = google_drive_service._create_file_if_not_exists('users.json', content)
            print(f"✅ 檔案更新成功，ID: {file_id}")
            
            # 再次讀取確認更新
            print("\n📖 確認檔案更新...")
            updated_content = google_drive_service._read_file_content('users.json')
            if updated_content:
                print(f"✅ 更新後內容: {updated_content}")
            else:
                print("❌ 更新後讀取失敗")
            
        except Exception as e:
            print(f"❌ 修改檔案失敗: {e}")
            return False
        
        print("\n🎉 現有檔案測試完成！")
        return True
        
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        return False

if __name__ == "__main__":
    success = test_existing_file()
    
    if success:
        print("\n✅ 測試成功！可以讀取和修改現有檔案。")
    else:
        print("\n❌ 測試失敗！")
        sys.exit(1)
