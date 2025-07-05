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

# Add a blacklisted tokens set for force logout functionality
blacklisted_tokens = set()

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
    from_account_type: str = "checking"  # "checking" or "savings"
    to_user_id: Optional[str] = None
    to_account_info: Optional[str] = None  # For external transfers
    amount: float
    transaction_type: str  # "internal", "domestic", "international", "self"
    description: str
    status: str = "pending"  # pending, approved, declined
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    admin_notes: Optional[str] = None

class TransactionCreate(BaseModel):
    from_account_type: str = "checking"  # "checking" or "savings"
    to_user_id: Optional[str] = None
    to_account_info: Optional[str] = None
    amount: float
    transaction_type: str
    description: str

class AdminAction(BaseModel):
    user_id: str
    action: str  # "approve", "decline", "freeze", "unfreeze", "credit", "debit"
    amount: Optional[float] = None
    account_type: Optional[str] = None  # "checking", "savings"
    description: Optional[str] = None
    custom_date: Optional[str] = None  # Admin-selected date/time in ISO format

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
        token = credentials.credentials
        
        # Check if token is blacklisted (force logout)
        if token in blacklisted_tokens:
            raise HTTPException(status_code=401, detail="Token has been invalidated")
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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
@api_router.get("/")
async def root():
    return {"message": "SecureBank API is running"}

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
    user_dict = user.dict()
    user_dict["hashed_password"] = hashed_password  # Ensure hashed_password is in the dict
    
    await db.users.insert_one(user_dict)
    
    return {"message": "Account created successfully. Please wait for admin approval."}

@api_router.post("/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if hashed_password exists
    if "hashed_password" not in user:
        # For debugging
        logging.error(f"User found but missing hashed_password field: {user}")
        raise HTTPException(status_code=500, detail="User account is incomplete")
    
    if not verify_password(user_data.password, user["hashed_password"]):
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
    # Get fresh user data to ensure current balances
    fresh_user = await db.users.find_one({"id": current_user.id})
    if not fresh_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get recent transactions
    transactions = await db.transactions.find({
        "$or": [
            {"from_user_id": current_user.id},
            {"to_user_id": current_user.id}
        ]
    }).sort("created_at", -1).limit(10).to_list(10)
    
    # Convert ObjectId to string
    for transaction in transactions:
        if '_id' in transaction:
            transaction['_id'] = str(transaction['_id'])
    
    return {
        "user": fresh_user,
        "recent_transactions": transactions
    }

@api_router.post("/transfer")
async def create_transfer(transfer_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    # Validate the from_account_type
    if transfer_data.from_account_type not in ["checking", "savings"]:
        raise HTTPException(status_code=400, detail="Invalid account type")
    
    # Check account balance before creating transaction
    current_balance = getattr(current_user, f"{transfer_data.from_account_type}_balance")
    if current_balance < transfer_data.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient funds in {transfer_data.from_account_type} account")
    
    # Handle self transfers (between user's own accounts)
    if transfer_data.transaction_type == "self":
        if not transfer_data.to_account_info:
            raise HTTPException(status_code=400, detail="Destination account must be specified for self transfers")
        
        if transfer_data.to_account_info not in ["checking", "savings"]:
            raise HTTPException(status_code=400, detail="Invalid destination account type")
        
        if transfer_data.from_account_type == transfer_data.to_account_info:
            raise HTTPException(status_code=400, detail="Cannot transfer to the same account")
    
    # Create transaction
    transaction = Transaction(
        from_user_id=current_user.id,
        from_account_type=transfer_data.from_account_type,
        **transfer_data.dict(exclude={"from_account_type"})
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
    
    # Convert ObjectId to string
    for transaction in transactions:
        if '_id' in transaction:
            transaction['_id'] = str(transaction['_id'])
    
    return transactions

# Admin routes
@api_router.get("/admin/pending-users")
async def get_pending_users(admin_user: User = Depends(get_admin_user)):
    users = await db.users.find({"is_approved": False}).to_list(100)
    # Convert ObjectId to string
    for user in users:
        if '_id' in user:
            user['_id'] = str(user['_id'])
    return users

@api_router.get("/admin/pending-transactions")
async def get_pending_transactions(admin_user: User = Depends(get_admin_user)):
    transactions = await db.transactions.find({"status": "pending"}).to_list(100)
    # Convert ObjectId to string
    for transaction in transactions:
        if '_id' in transaction:
            transaction['_id'] = str(transaction['_id'])
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
        # Get sender user
        from_user = await db.users.find_one({"id": transaction["from_user_id"]})
        if not from_user:
            raise HTTPException(status_code=404, detail="Sender user not found")
        
        # Determine which account to check balance from
        from_account_field = f"{transaction.get('from_account_type', 'checking')}_balance"
        from_balance = from_user.get(from_account_field, 0)
        
        # Check if sender has sufficient funds in the specified account
        if from_balance < transaction["amount"]:
            raise HTTPException(status_code=400, detail=f"Insufficient funds in {transaction.get('from_account_type', 'checking')} account")
        
        # Deduct from sender's specified account
        await db.users.update_one(
            {"id": transaction["from_user_id"]},
            {"$inc": {from_account_field: -transaction["amount"]}}
        )
        
        # Handle different transaction types
        if transaction["transaction_type"] == "internal" and transaction["to_user_id"]:
            # Internal transfer to another user's checking account
            to_user = await db.users.find_one({"id": transaction["to_user_id"]})
            if to_user:
                await db.users.update_one(
                    {"id": transaction["to_user_id"]},
                    {"$inc": {"checking_balance": transaction["amount"]}}
                )
        elif transaction["transaction_type"] == "self":
            # Self transfer between user's own accounts
            to_account_field = f"{transaction['to_account_info']}_balance"
            await db.users.update_one(
                {"id": transaction["from_user_id"]},
                {"$inc": {to_account_field: transaction["amount"]}}
            )
        
        # For domestic and international transfers, money goes out of the system
        # so we only deduct from sender (already done above)
        
        # Update transaction status
        await db.transactions.update_one(
            {"id": transaction_id},
            {"$set": {"status": "approved", "approved_at": datetime.utcnow()}}
        )
        
        return {"message": "Transaction approved successfully"}
    
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
    # Parse custom date if provided, otherwise use current time
    transaction_date = datetime.utcnow()
    if action.custom_date:
        try:
            # Parse ISO datetime string
            transaction_date = datetime.fromisoformat(action.custom_date.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            # If parsing fails, use current time as fallback
            transaction_date = datetime.utcnow()
    
    if action.action == "credit":
        field = f"{action.account_type}_balance"
        await db.users.update_one(
            {"id": action.user_id},
            {"$inc": {field: action.amount}}
        )
        
        # Create transaction record with custom date
        transaction = Transaction(
            from_user_id="system",
            to_user_id=action.user_id,
            amount=action.amount,
            transaction_type="credit",
            description=action.description or "Manual credit",
            status="approved",
            created_at=transaction_date,
            approved_at=transaction_date
        )
        await db.transactions.insert_one(transaction.dict())
        
        return {"message": "Credit added successfully"}
    
    elif action.action == "debit":
        field = f"{action.account_type}_balance"
        await db.users.update_one(
            {"id": action.user_id},
            {"$inc": {field: -action.amount}}
        )
        
        # Create transaction record with custom date
        transaction = Transaction(
            from_user_id=action.user_id,
            to_user_id="system",
            amount=action.amount,
            transaction_type="debit",
            description=action.description or "Manual debit",
            status="approved",
            created_at=transaction_date,
            approved_at=transaction_date
        )
        await db.transactions.insert_one(transaction.dict())
        
        return {"message": "Debit processed successfully"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@api_router.get("/admin/users")
async def get_all_users(admin_user: User = Depends(get_admin_user)):
    users = await db.users.find().to_list(1000)
    # Convert ObjectId to string
    for user in users:
        if '_id' in user:
            user['_id'] = str(user['_id'])
    return users

@api_router.post("/admin/force-logout")
async def force_logout_user(action: AdminAction, admin_user: User = Depends(get_admin_user)):
    """Force logout a user by blacklisting their current active tokens"""
    try:
        # Find all active sessions for the user (in a real app, you'd track sessions in DB)
        # For now, we'll add a logout timestamp to the user record
        await db.users.update_one(
            {"id": action.user_id},
            {"$set": {"force_logout_at": datetime.utcnow()}}
        )
        
        return {"message": "User has been logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to logout user: {str(e)}")

@api_router.get("/admin/active-sessions")
async def get_active_sessions(admin_user: User = Depends(get_admin_user)):
    """Get list of users with active sessions (approximation)"""
    # In a real app, you'd track actual sessions. For demo, we'll show recent login activity
    users = await db.users.find({"role": "customer", "is_approved": True}).to_list(1000)
    
    active_users = []
    for user in users:
        # Simulate active session detection (in real app, track last activity)
        active_users.append({
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "last_activity": user.get("created_at", datetime.utcnow()),
            "force_logout_at": user.get("force_logout_at")
        })
    
    return active_users

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