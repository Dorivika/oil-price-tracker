from fastapi import FastAPI, HTTPException, Depends, status, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field, validator
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import stripe
import httpx
from typing import Optional, List
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from bson import ObjectId
from dotenv import load_dotenv

# --- Load .env ---
load_dotenv()
# --- Config ---
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://127.0.0.1:27017/oil_price_tracker')
JWT_SECRET = os.getenv('JWT_SECRET', 'supersecret')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', 'sk_test')
EIA_API_KEY = os.getenv('EIA_API_KEY', 'G19nzdqrKjjAkYvnZt4KuKesf5eti3AhoHE7NSyR')
print(f"EIA_API_KEY loaded: {EIA_API_KEY[:10]}..." if EIA_API_KEY else "EIA_API_KEY not found")
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')

stripe.api_key = STRIPE_SECRET_KEY

# --- Database ---
client = AsyncIOMotorClient(MONGO_URI)
db = client.oil_price_tracker

# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise
    
    yield
    
    # Shutdown
    client.close()

# --- App ---
app = FastAPI(lifespan=lifespan)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# --- Models ---
class UserIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern='^(trucker|owner)$')

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AlertIn(BaseModel):
    product: str = Field(..., pattern='^(Diesel|Gasoline)$')
    area: str = Field(..., min_length=1, max_length=100)
    threshold: float = Field(..., gt=0)

class AlertOut(BaseModel):
    id: str
    product: str
    area: str
    threshold: float
    created_at: datetime

class OrderIn(BaseModel):
    product: str = Field(..., pattern='^(Diesel|Gasoline)$')
    area: str = Field(..., min_length=1, max_length=100)
    quantity: int = Field(..., gt=0)
    target_price: float = Field(..., gt=0)
    location: Optional[str] = Field(None, max_length=200)

class OrderOut(BaseModel):
    id: str
    product: str
    area: str
    quantity: int
    target_price: float
    location: Optional[str]
    status: str
    created_at: datetime

class PaymentIntentRequest(BaseModel):
    amount: int = Field(..., gt=0, description="Amount in cents")

# --- Utils ---
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    # Ensure ObjectId for MongoDB
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise credentials_exception
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise credentials_exception
    return user

# --- Auth Endpoints ---
@app.post('/auth/register', response_model=UserOut)
@limiter.limit("5/minute")
async def register(request: Request, user: UserIn):
    # Check if email already exists
    if await db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_doc = {
        "name": user.name,
        "email": user.email,
        "password": get_password_hash(user.password),
        "role": user.role,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    
    return UserOut(
        id=str(result.inserted_id),
        name=user.name,
        email=user.email,
        role=user.role
    )

@app.post('/auth/login', response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    # OAuth2PasswordRequestForm expects username field, but we use email
    user = await db.users.find_one({"email": form_data.username})
    
    if not user or not verify_password(form_data.password, user['password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token({"user_id": str(user['_id'])})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut(
            id=str(user['_id']),
            name=user['name'],
            email=user['email'],
            role=user['role']
        )
    )

# Alternative login endpoint for JSON body (for frontend compatibility)
@app.post('/auth/login/json', response_model=Token)
@limiter.limit("10/minute")
async def login_json(request: Request, login_data: LoginRequest):
    user = await db.users.find_one({"email": login_data.email})
    
    if not user or not verify_password(login_data.password, user['password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token({"user_id": str(user['_id'])})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut(
            id=str(user['_id']),
            name=user['name'],
            email=user['email'],
            role=user['role']
        )
    )

# --- Price Endpoint ---
@app.get('/prices')
@limiter.limit("30/minute")
async def get_prices(request: Request, current_user: dict = Depends(get_current_user)):
    try:
        url = f"https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key={EIA_API_KEY}&frequency=weekly&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&length=5000"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            
        return resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Failed to fetch prices from EIA")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")

# --- Alerts ---
@app.post('/alerts', response_model=AlertOut)
async def create_alert(alert: AlertIn, current_user: dict = Depends(get_current_user)):
    alert_doc = {
        **alert.dict(),
        "user_id": str(current_user['_id']),
        "created_at": datetime.utcnow(),
        "active": True
    }
    
    result = await db.pricealerts.insert_one(alert_doc)
    
    return AlertOut(
        id=str(result.inserted_id),
        **alert.dict(),
        created_at=alert_doc["created_at"]
    )

@app.get('/alerts', response_model=List[AlertOut])
async def get_alerts(current_user: dict = Depends(get_current_user)):
    alerts = await db.pricealerts.find(
        {"user_id": str(current_user['_id']), "active": True}
    ).to_list(100)
    
    return [
        AlertOut(
            id=str(alert['_id']),
            product=alert['product'],
            area=alert['area'],
            threshold=alert['threshold'],
            created_at=alert['created_at']
        )
        for alert in alerts
    ]

@app.delete('/alerts/{alert_id}')
async def delete_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(alert_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid alert ID")
    result = await db.pricealerts.update_one(
        {"_id": obj_id, "user_id": str(current_user['_id'])},
        {"$set": {"active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted"}

# --- Orders ---
@app.post('/orders', response_model=OrderOut)
async def place_order(order: OrderIn, current_user: dict = Depends(get_current_user)):
    order_doc = {
        **order.dict(),
        "user_id": str(current_user['_id']),
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await db.orders.insert_one(order_doc)
    
    return OrderOut(
        id=str(result.inserted_id),
        **order.dict(),
        status="pending",
        created_at=order_doc["created_at"]
    )

@app.get('/orders', response_model=List[OrderOut])
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"user_id": str(current_user['_id'])}
    ).sort("created_at", -1).to_list(100)
    return [
        OrderOut(
            id=str(order['_id']),
            product=order['product'],
            area=order['area'],
            quantity=order['quantity'],
            target_price=order['target_price'],
            location=order.get('location'),
            status=order['status'],
            created_at=order['created_at']
        )
        for order in orders
    ]

# --- Stripe Payment Intent ---
@app.post('/payments/create-intent')
async def create_payment_intent(
    payment_request: PaymentIntentRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        intent = stripe.PaymentIntent.create(
            amount=payment_request.amount,
            currency='usd',
            metadata={
                'user_id': str(current_user['_id']),
                'user_email': current_user['email']
            }
        )
        
        return {"client_secret": intent.client_secret}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Health Check ---
@app.get('/health')
async def health_check():
    try:
        # Check MongoDB connection
        await client.admin.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)