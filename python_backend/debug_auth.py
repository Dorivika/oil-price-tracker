import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://127.0.0.1:27017/oil_price_tracker')

async def debug_user():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.oil_price_tracker
    
    # Check if user exists
    user = await db.users.find_one({"email": "hululu1@gmail.com"})
    if user:
        print(f"User found: {user}")
        
        # Test password verification
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        stored_password = user.get('password', '')
        test_password = "A0000000l"
        
        print(f"Stored password hash: {stored_password}")
        print(f"Testing password: {test_password}")
        
        try:
            is_valid = pwd_context.verify(test_password, stored_password)
            print(f"Password verification result: {is_valid}")
        except Exception as e:
            print(f"Password verification error: {e}")
    else:
        print("User not found in database")
        
        # List all users
        users = await db.users.find({}).to_list(length=None)
        print(f"All users in database: {len(users)}")
        for u in users:
            print(f"  - {u.get('email', 'no email')} ({u.get('name', 'no name')})")

if __name__ == "__main__":
    asyncio.run(debug_user())