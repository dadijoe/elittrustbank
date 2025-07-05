from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import json
from bson import ObjectId

# Custom JSON encoder to handle ObjectId
class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return super().default(o)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
ALGORITHM = "HS256"

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    ssn: str
    tin: str
    phone: str
    address: str
    role: str = "customer"  # customer or admin
    is_approved: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    checking_balance: float = 0.0
    savings_balance: float = 0.0
    account_frozen: bool = False

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    ssn: str
    tin: str
    phone: str
    address: str
    unique_code: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: str
    to_user_id: Optional[str] = None
    to_account_info: Optional[str] = None  # For external transfers
    amount: float
    transaction_type: str  # "internal", "domestic", "international"
    description: str
    status: str = "pending"  # pending, approved, declined
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    admin_notes: Optional[str] = None

class TransactionCreate(BaseModel):
    to_user_id: Optional[str] = None
    to_account_info: Optional[str] = None
    amount: float
    transaction_type: str
    description: str

class AdminAction(BaseModel):
    user_id: str
    action: str  # "approve", "decline", "freeze", "unfreeze"
    amount: Optional[float] = None
    account_type: Optional[str] = None  # "checking", "savings"
    description: Optional[str] = None

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Routes
@api_router.post("/signup")
async def signup(user_data: UserSignup):
    # Check unique code
    if user_data.unique_code != "28032803":
        raise HTTPException(status_code=400, detail="Invalid unique code")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    user_dict.pop("password")
    user_dict.pop("unique_code")
    user_dict["hashed_password"] = hashed_password
    
    user = User(**user_dict)
    await db.users.insert_one(user.dict())
    
    return {"message": "Account created successfully. Please wait for admin approval."}

@api_router.post("/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_approved"]:
        raise HTTPException(status_code=403, detail="Account not approved yet")
    
    if user["account_frozen"]:
        raise HTTPException(status_code=403, detail="Account is frozen")
    
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=timedelta(hours=24)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "checking_balance": user["checking_balance"],
            "savings_balance": user["savings_balance"]
        }
    }

@api_router.get("/dashboard")
async def get_dashboard(current_user: User = Depends(get_current_user)):
    # Get recent transactions
    transactions = await db.transactions.find({
        "$or": [
            {"from_user_id": current_user.id},
            {"to_user_id": current_user.id}
        ]
    }).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "user": current_user.dict(),
        "recent_transactions": transactions
    }

@api_router.post("/transfer")
async def create_transfer(transfer_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    # Create transaction
    transaction = Transaction(
        from_user_id=current_user.id,
        **transfer_data.dict()
    )
    
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": "Transfer created successfully. Waiting for admin approval."}

@api_router.get("/transactions")
async def get_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find({
        "$or": [
            {"from_user_id": current_user.id},
            {"to_user_id": current_user.id}
        ]
    }).sort("created_at", -1).to_list(100)
    
    return transactions

# Admin routes
@api_router.get("/admin/pending-users")
async def get_pending_users(admin_user: User = Depends(get_admin_user)):
    users = await db.users.find({"is_approved": False}).to_list(100)
    return users

@api_router.get("/admin/pending-transactions")
async def get_pending_transactions(admin_user: User = Depends(get_admin_user)):
    transactions = await db.transactions.find({"status": "pending"}).to_list(100)
    return transactions

@api_router.post("/admin/approve-user")
async def approve_user(action: AdminAction, admin_user: User = Depends(get_admin_user)):
    if action.action == "approve":
        await db.users.update_one(
            {"id": action.user_id},
            {"$set": {"is_approved": True}}
        )
        return {"message": "User approved successfully"}
    elif action.action == "decline":
        await db.users.delete_one({"id": action.user_id})
        return {"message": "User declined and removed"}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@api_router.post("/admin/process-transaction")
async def process_transaction(transaction_id: str, action: str, admin_user: User = Depends(get_admin_user)):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if action == "approve":
        # Update balances
        from_user = await db.users.find_one({"id": transaction["from_user_id"]})
        if from_user["checking_balance"] >= transaction["amount"]:
            # Deduct from sender
            await db.users.update_one(
                {"id": transaction["from_user_id"]},
                {"$inc": {"checking_balance": -transaction["amount"]}}
            )
            
            # Add to receiver (if internal transfer)
            if transaction["to_user_id"]:
                await db.users.update_one(
                    {"id": transaction["to_user_id"]},
                    {"$inc": {"checking_balance": transaction["amount"]}}
                )
            
            # Update transaction status
            await db.transactions.update_one(
                {"id": transaction_id},
                {"$set": {"status": "approved", "approved_at": datetime.utcnow()}}
            )
            
            return {"message": "Transaction approved successfully"}
        else:
            raise HTTPException(status_code=400, detail="Insufficient funds")
    
    elif action == "decline":
        await db.transactions.update_one(
            {"id": transaction_id},
            {"$set": {"status": "declined", "approved_at": datetime.utcnow()}}
        )
        return {"message": "Transaction declined"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@api_router.post("/admin/manual-transaction")
async def manual_transaction(action: AdminAction, admin_user: User = Depends(get_admin_user)):
    if action.action == "credit":
        field = f"{action.account_type}_balance"
        await db.users.update_one(
            {"id": action.user_id},
            {"$inc": {field: action.amount}}
        )
        
        # Create transaction record
        transaction = Transaction(
            from_user_id="system",
            to_user_id=action.user_id,
            amount=action.amount,
            transaction_type="credit",
            description=action.description or "Manual credit",
            status="approved",
            approved_at=datetime.utcnow()
        )
        await db.transactions.insert_one(transaction.dict())
        
        return {"message": "Credit added successfully"}
    
    elif action.action == "debit":
        field = f"{action.account_type}_balance"
        await db.users.update_one(
            {"id": action.user_id},
            {"$inc": {field: -action.amount}}
        )
        
        # Create transaction record
        transaction = Transaction(
            from_user_id=action.user_id,
            to_user_id="system",
            amount=action.amount,
            transaction_type="debit",
            description=action.description or "Manual debit",
            status="approved",
            approved_at=datetime.utcnow()
        )
        await db.transactions.insert_one(transaction.dict())
        
        return {"message": "Debit processed successfully"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@api_router.get("/admin/users")
async def get_all_users(admin_user: User = Depends(get_admin_user)):
    users = await db.users.find().to_list(1000)
    return users

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Create admin user on startup
@app.on_event("startup")
async def create_admin_user():
    admin_exists = await db.users.find_one({"role": "admin"})
    if not admin_exists:
        admin_user = User(
            email="admin@bank.com",
            full_name="Bank Administrator",
            ssn="000-00-0000",
            tin="00-0000000",
            phone="555-0000",
            address="Bank HQ",
            role="admin",
            is_approved=True,
            checking_balance=0.0,
            savings_balance=0.0
        )
        admin_user_dict = admin_user.dict()
        admin_user_dict["hashed_password"] = get_password_hash("admin123")
        await db.users.insert_one(admin_user_dict)
        logger.info("Admin user created: admin@bank.com / admin123")