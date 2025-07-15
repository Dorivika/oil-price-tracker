from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from jose import JWTError, jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import os
import stripe
import httpx
import asyncio
from typing import Optional, List
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from database import get_db, engine, Base, User, PriceAlert, Order

# --- Load .env ---
load_dotenv()
# --- Config ---
SUPABASE_PASSWORD = os.getenv('SUPABASE_PASSWORD', 'A0000000l123')
DATABASE_URL = os.getenv('DATABASE_URL', f'postgresql+asyncpg://postgres:{SUPABASE_PASSWORD}@db.uatnbrfhdgpljsqcezlr.supabase.co:5432/postgres')
JWT_SECRET = os.getenv('JWT_SECRET', 'supersecret')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', 'sk_test')
EIA_API_KEY = os.getenv('EIA_API_KEY', 'G19nzdqrKjjAkYvnZt4KuKesf5eti3AhoHE7NSyR')
print(f"EIA_API_KEY loaded: {EIA_API_KEY[:10]}..." if EIA_API_KEY else "EIA_API_KEY not found")
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')

stripe.api_key = STRIPE_SECRET_KEY

# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - Create tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Successfully connected to database and created tables!")
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        raise
    
    yield
    
    # Shutdown
    await engine.dispose()

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
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
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

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
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
    
    # Query user from PostgreSQL
    try:
        user_id_int = int(user_id)
    except ValueError:
        raise credentials_exception
        
    stmt = select(User).where(User.id == user_id_int)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise credentials_exception
    return user

# --- Auth Endpoints ---
@app.post('/auth/register', response_model=UserOut)
@limiter.limit("5/minute")
async def register(request: Request, user: UserIn, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    stmt = select(User).where(User.email == user.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    new_user = User(
        name=user.name,
        email=user.email,
        password=get_password_hash(user.password),
        role=user.role
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return UserOut(
        id=str(new_user.id),
        name=new_user.name,
        email=new_user.email,
        role=new_user.role
    )

# --- Helper function to create login response ---
def create_login_response(user: User) -> Token:
    access_token = create_access_token({"user_id": str(user.id)})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut(
            id=str(user.id),
            name=user.name,
            email=user.email,
            role=user.role
        )
    )

async def authenticate_user(email: str, password: str, db: AsyncSession) -> User:
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    return user

@app.post('/auth/login', response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(form_data.username, form_data.password, db)
    return create_login_response(user)

@app.post('/auth/login/json', response_model=Token)
@limiter.limit("10/minute")
async def login_json(request: Request, login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(login_data.email, login_data.password, db)
    return create_login_response(user)

# --- Price Endpoint ---
@app.get('/prices')
@limiter.limit("30/minute")
async def get_prices(request: Request, current_user: User = Depends(get_current_user)):
    try:
        url = f"https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key={EIA_API_KEY}&frequency=weekly&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&length=1000"
        
        # Retry logic with exponential backoff
        max_retries = 3
        for attempt in range(max_retries):
            try:
                timeout = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    return resp.json()
            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                if attempt == max_retries - 1:
                    raise e
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        raise HTTPException(status_code=e.response.status_code, detail="Failed to fetch prices from EIA")
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="EIA service temporarily unavailable. Please try again in a few minutes.")
    except Exception as e:
        print(f"Unexpected error in get_prices: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# --- Alerts ---
@app.post('/alerts', response_model=AlertOut)
async def create_alert(alert: AlertIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    new_alert = PriceAlert(
        user_id=current_user.id,
        product=alert.product,
        area=alert.area,
        threshold=alert.threshold,
        active=True
    )
    
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)
    
    return AlertOut(
        id=str(new_alert.id),
        product=new_alert.product,
        area=new_alert.area,
        threshold=new_alert.threshold,
        created_at=new_alert.created_at
    )

@app.get('/alerts', response_model=List[AlertOut])
async def get_alerts(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(PriceAlert).where(PriceAlert.user_id == current_user.id, PriceAlert.active == True)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    
    return [AlertOut(
        id=str(alert.id),
        product=alert.product,
        area=alert.area,
        threshold=alert.threshold,
        created_at=alert.created_at
    ) for alert in alerts]

@app.delete('/alerts/{alert_id}')
async def delete_alert(alert_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        alert_id_int = int(alert_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid alert ID")
    
    stmt = update(PriceAlert).where(
        PriceAlert.id == alert_id_int, 
        PriceAlert.user_id == current_user.id
    ).values(active=False)
    
    result = await db.execute(stmt)
    await db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted"}

# --- Orders ---
@app.post('/orders', response_model=OrderOut)
async def place_order(order: OrderIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    new_order = Order(
        user_id=current_user.id,
        product=order.product,
        area=order.area,
        quantity=order.quantity,
        target_price=order.target_price,
        location=order.location,
        status="pending"
    )
    
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)
    
    return OrderOut(
        id=str(new_order.id),
        product=new_order.product,
        area=new_order.area,
        quantity=new_order.quantity,
        target_price=new_order.target_price,
        location=new_order.location,
        status=new_order.status,
        created_at=new_order.created_at
    )

@app.get('/orders', response_model=List[OrderOut])
async def get_orders(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Order).where(Order.user_id == current_user.id).order_by(Order.created_at.desc())
    result = await db.execute(stmt)
    orders = result.scalars().all()
    
    return [OrderOut(
        id=str(order.id),
        product=order.product,
        area=order.area,
        quantity=order.quantity,
        target_price=order.target_price,
        location=order.location,
        status=order.status,
        created_at=order.created_at
    ) for order in orders]

# --- Stripe Payment Intent ---
@app.post('/payments/create-intent')
async def create_payment_intent(
    payment_request: PaymentIntentRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        intent = stripe.PaymentIntent.create(
            amount=payment_request.amount,
            currency='usd',
            metadata={
                'user_id': str(current_user.id),
                'user_email': current_user.email
            }
        )
        
        return {"client_secret": intent.client_secret}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Health Check ---
@app.get('/health')
async def health_check():
    try:
        # Check PostgreSQL connection
        async with engine.begin() as conn:
            await conn.execute(select(1))
        return {"status": "healthy", "database": "connected"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)