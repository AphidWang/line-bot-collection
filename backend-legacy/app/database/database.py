from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

import os

# 資料庫 URL - 從環境變數讀取，本地開發時使用預設值
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://root:3w04HbJrmGjeT9yshzY1u5N7X2UF68SO@hkg1.clusters.zeabur.com:31127/zeabur"
)

# 自動處理不同的資料庫協議
if DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+asyncpg://"):
    # 如果是標準 postgresql:// 協議，轉換為 asyncpg 協議
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# 建立非同步引擎
engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # 開發環境顯示 SQL 查詢
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_reset_on_return='commit',
)

# 建立非同步 session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# 建立同步 session factory (用於遷移腳本)
SessionLocal = sessionmaker(
    bind=engine.sync_engine,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db() -> AsyncSession:
    """取得資料庫 session"""
    session = AsyncSessionLocal()
    try:
        yield session
    except Exception as e:
        await session.rollback()
        raise e
    finally:
        await session.close()

async def init_db():
    """初始化資料庫"""
    try:
        async with engine.begin() as conn:
            # 建立所有表
            await conn.run_sync(Base.metadata.create_all)
            
            # 檢查資料庫連接
            result = await conn.execute(text("SELECT 1"))
            logger.info("資料庫初始化成功")
            
    except Exception as e:
        logger.error(f"資料庫初始化失敗: {e}")
        raise e

async def close_db():
    """關閉資料庫連接"""
    await engine.dispose()
