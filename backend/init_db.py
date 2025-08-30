#!/usr/bin/env python3
"""
初始化資料庫腳本
"""

import asyncio
from app.database.database import init_db
from app.auth import get_password_hash
from app.database.database import AsyncSessionLocal
from app.database.models import User

async def create_admin_user():
    """建立 admin 用戶"""
    async with AsyncSessionLocal() as session:
        # 檢查是否已存在
        existing_user = await session.get(User, 1)
        if existing_user:
            print("Admin 用戶已存在")
            return
            
        
        # 建立 admin 用戶
        admin_user = User(
            id=1,
            email="admin@example.com",
            firebase_uid="admin",  # 隨便填，因為是 JWT 登入
            password_hash=get_password_hash("bearwin2025"),
            is_active=True,
            user_type="jwt"
        )
        
        session.add(admin_user)
        await session.commit()
        print("Admin 用戶建立成功: admin@example.com / bearwin2025")

async def main():
    """主函數"""
    print("初始化資料庫...")
    await init_db()
    print("資料庫表建立完成")
    
    print("建立 admin 用戶...")
    await create_admin_user()
    
    print("初始化完成！")

if __name__ == "__main__":
    asyncio.run(main())
