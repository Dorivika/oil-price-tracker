from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL - Use SQLite for local testing if PostgreSQL is unavailable
SUPABASE_PASSWORD = os.getenv('SUPABASE_PASSWORD', 'A0000000l123')
USE_LOCAL_DB = os.getenv('USE_LOCAL_DB', 'false').lower() in ['true', '1', 'yes']

if USE_LOCAL_DB:
    DATABASE_URL = 'sqlite+aiosqlite:///./oil_tracker.db'
else:
    DATABASE_URL = os.getenv('DATABASE_URL', f'postgresql+asyncpg://postgres:{SUPABASE_PASSWORD}@db.uatnbrfhdgpljsqcezlr.supabase.co:5432/postgres')

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Base class
Base = declarative_base()

# User model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'trucker' or 'owner'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Price Alert model
class PriceAlert(Base):
    __tablename__ = "price_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    product = Column(String(50), nullable=False)  # 'Diesel' or 'Gasoline'
    area = Column(String(100), nullable=False)
    threshold = Column(Float, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Order model
class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    product = Column(String(50), nullable=False)  # 'Diesel' or 'Gasoline'
    area = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    target_price = Column(Float, nullable=False)
    location = Column(String(200), nullable=True)
    status = Column(String(20), default="pending")  # 'pending', 'completed', 'cancelled'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Database dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()