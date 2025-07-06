import requests
import time
import uuid
from datetime import datetime, timedelta
import sys
import json
import re
from decimal import Decimal

class BankAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.customer_token = None
        self.customer_id = None
        self.test_user_email = f"test_user_{int(time.time())}@example.com"
        self.test_user_password = "Test123!"
        self.tests_run = 0
        self.tests_passed = 0
        self.number_format_issues = []
        self.transaction_test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return success, response.json() if response.text else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}
            
    def validate_number_formatting(self, response_data, endpoint_name):
        """Validate number formatting in API responses"""
        print(f"\n🔍 Validating number formatting in {endpoint_name} response...")
        
        def check_number_format(value, path):
            # Handle string values that represent numbers
            if isinstance(value, str):
                try:
                    # Check if it's a numeric string
                    float_value = float(value)
                    # Check if it has exactly 2 decimal places
                    if '.' in value:
                        decimal_places = len(value.split('.')[1])
                        if decimal_places != 2:
                            self.number_format_issues.append({
                                'endpoint': endpoint_name,
                                'path': path,
                                'value': value,
                                'issue': f"Expected 2 decimal places, got {decimal_places}"
                            })
                            return False
                    return True
                except ValueError:
                    # Not a numeric string
                    return True
            
            # Handle numeric values
            elif isinstance(value, (int, float)):
                # Check if monetary value (assuming values >= 1 or <= -1 are monetary)
                if abs(value) >= 1 or value == 0:
                    # For monetary values, check decimal precision
                    str_value = str(value)
                    if '.' in str_value:
                        decimal_places = len(str_value.split('.')[1])
                        if decimal_places != 2:
                            self.number_format_issues.append({
                                'endpoint': endpoint_name,
                                'path': path,
                                'value': value,
                                'issue': f"Expected 2 decimal places, got {decimal_places}"
                            })
                            return False
            return True
        
        def recursive_check(data, current_path=""):
            if isinstance(data, dict):
                for key, value in data.items():
                    new_path = f"{current_path}.{key}" if current_path else key
                    if key in ['amount', 'balance', 'checking_balance', 'savings_balance'] or 'balance' in key or 'amount' in key:
                        check_number_format(value, new_path)
                    recursive_check(value, new_path)
            elif isinstance(data, list):
                for i, item in enumerate(data):
                    new_path = f"{current_path}[{i}]"
                    recursive_check(item, new_path)
        
        recursive_check(response_data)
        
        if not self.number_format_issues:
            print(f"✅ Number formatting validation passed for {endpoint_name}")
            return True
        else:
            print(f"❌ Found {len(self.number_format_issues)} number formatting issues in {endpoint_name}")
            for issue in self.number_format_issues:
                print(f"  - {issue['path']}: {issue['value']} - {issue['issue']}")
            return False

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "login",
            200,
            data={"email": "admin@bank.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"Admin login successful, token received")
            return True
        return False

    def test_customer_signup(self):
        """Test customer signup with unique code"""
        success, response = self.run_test(
            "Customer Signup",
            "POST",
            "signup",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password,
                "full_name": "Test User",
                "ssn": "123-45-6789",
                "tin": "12-3456789",
                "phone": "555-123-4567",
                "address": "123 Test St, Test City, TS 12345",
                "unique_code": "28032803"
            }
        )
        return success

    def test_get_pending_users(self):
        """Test getting pending users as admin"""
        if not self.admin_token:
            print("❌ Admin token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Get Pending Users",
            "GET",
            "admin/pending-users",
            200,
            token=self.admin_token
        )
        
        if success:
            # Find our test user in the pending users
            for user in response:
                if user.get('email') == self.test_user_email:
                    self.customer_id = user.get('id')
                    print(f"Found test user in pending users, ID: {self.customer_id}")
                    return True
            
            print("❌ Test user not found in pending users")
            return False
        return False

    def test_approve_user(self):
        """Test approving a user as admin"""
        if not self.admin_token or not self.customer_id:
            print("❌ Admin token or customer ID not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Approve User",
            "POST",
            "admin/approve-user",
            200,
            data={"user_id": self.customer_id, "action": "approve"},
            token=self.admin_token
        )
        return success

    def test_customer_login(self):
        """Test customer login after approval"""
        success, response = self.run_test(
            "Customer Login",
            "POST",
            "login",
            200,
            data={"email": self.test_user_email, "password": self.test_user_password}
        )
        if success and 'access_token' in response:
            self.customer_token = response['access_token']
            print(f"Customer login successful, token received")
            return True
        return False

    def test_customer_dashboard(self):
        """Test customer dashboard access"""
        if not self.customer_token:
            print("❌ Customer token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Customer Dashboard",
            "GET",
            "dashboard",
            200,
            token=self.customer_token
        )
        
        if success:
            # Validate number formatting in dashboard response
            self.validate_number_formatting(response, "dashboard")
        
        return success

    def test_create_transfer(self):
        """Test creating a transfer"""
        if not self.customer_token:
            print("❌ Customer token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Create Transfer",
            "POST",
            "transfer",
            200,
            data={
                "amount": 100.00,
                "transaction_type": "internal",
                "description": "Test transfer",
                "to_user_id": "system"  # Using system as recipient for testing
            },
            token=self.customer_token
        )
        return success
        
    def test_transfer_types(self):
        """Test all transfer types (internal, self, domestic, international)"""
        if not self.customer_token or not self.admin_token:
            print("❌ Customer or admin token not available, skipping test")
            return False
            
        # First, add funds to the customer account
        print("\n🔍 Adding funds to customer account for transfer tests...")
        success, response = self.run_test(
            "Add Funds to Customer",
            "POST",
            "admin/manual-transaction",
            200,
            data={
                "user_id": self.customer_id,
                "action": "credit",
                "amount": 5000.00,
                "account_type": "checking",
                "description": "Adding funds for transfer tests"
            },
            token=self.admin_token
        )
        
        if not success:
            print("❌ Failed to add funds to customer account")
            return False
            
        # Test internal transfer
        print("\n🔍 Testing internal transfer...")
        success1, response1 = self.run_test(
            "Internal Transfer",
            "POST",
            "transfer",
            200,
            data={
                "amount": 100.00,
                "transaction_type": "internal",
                "description": "Test internal transfer",
                "to_user_id": "system"  # Using system as recipient for testing
            },
            token=self.customer_token
        )
        
        # Test self transfer (between checking and savings)
        print("\n🔍 Testing self transfer...")
        success2, response2 = self.run_test(
            "Self Transfer",
            "POST",
            "transfer",
            200,
            data={
                "amount": 200.00,
                "transaction_type": "self",
                "description": "Test self transfer",
                "from_account_type": "checking",
                "to_account_info": "savings"
            },
            token=self.customer_token
        )
        
        # Test domestic transfer
        print("\n🔍 Testing domestic transfer...")
        success3, response3 = self.run_test(
            "Domestic Transfer",
            "POST",
            "transfer",
            200,
            data={
                "amount": 300.00,
                "transaction_type": "domestic",
                "description": "Test domestic transfer",
                "to_account_info": "Bank of America - Account #1234567890"
            },
            token=self.customer_token
        )
        
        # Test international transfer
        print("\n🔍 Testing international transfer...")
        success4, response4 = self.run_test(
            "International Transfer",
            "POST",
            "transfer",
            200,
            data={
                "amount": 400.00,
                "transaction_type": "international",
                "description": "Test international transfer",
                "to_account_info": "Deutsche Bank - IBAN: DE89370400440532013000"
            },
            token=self.customer_token
        )
        
        # Get pending transactions to verify all transfers were created
        print("\n🔍 Verifying all transfers were created...")
        success5, transactions = self.run_test(
            "Get Pending Transactions",
            "GET",
            "admin/pending-transactions",
            200,
            token=self.admin_token
        )
        
        if success5:
            # Count our test transfers
            test_transfers = [t for t in transactions if t.get('from_user_id') == self.customer_id]
            print(f"Found {len(test_transfers)} pending transfers from test customer")
            
            # Verify each transfer type exists
            transfer_types = [t.get('transaction_type') for t in test_transfers]
            print(f"Transfer types found: {transfer_types}")
            
            all_types_found = all(t in transfer_types for t in ['internal', 'self', 'domestic', 'international'])
            if all_types_found:
                print("✅ All transfer types were created successfully")
            else:
                print("❌ Not all transfer types were found in pending transactions")
                return False
        else:
            print("❌ Failed to get pending transactions")
            return False
            
        return success1 and success2 and success3 and success4 and success5

    def test_admin_manual_transactions(self):
        """Test admin manual transactions with custom dates"""
        if not self.admin_token or not self.customer_id:
            print("❌ Admin token or customer ID not available, skipping test")
            return False
            
        # Test credit with current date
        print("\n🔍 Testing manual credit with current date...")
        success1, response1 = self.run_test(
            "Manual Credit - Current Date",
            "POST",
            "admin/manual-transaction",
            200,
            data={
                "user_id": self.customer_id,
                "action": "credit",
                "amount": 1000.00,
                "account_type": "checking",
                "description": "Test manual credit - current date"
            },
            token=self.admin_token
        )
        
        # Test credit with custom date (yesterday)
        yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
        print(f"\n🔍 Testing manual credit with custom date ({yesterday})...")
        success2, response2 = self.run_test(
            "Manual Credit - Custom Date",
            "POST",
            "admin/manual-transaction",
            200,
            data={
                "user_id": self.customer_id,
                "action": "credit",
                "amount": 2000.00,
                "account_type": "savings",
                "description": "Test manual credit - custom date",
                "custom_date": yesterday
            },
            token=self.admin_token
        )
        
        # Test debit with current date
        print("\n🔍 Testing manual debit with current date...")
        success3, response3 = self.run_test(
            "Manual Debit - Current Date",
            "POST",
            "admin/manual-transaction",
            200,
            data={
                "user_id": self.customer_id,
                "action": "debit",
                "amount": 500.00,
                "account_type": "checking",
                "description": "Test manual debit - current date"
            },
            token=self.admin_token
        )
        
        # Test debit with custom date (last week)
        last_week = (datetime.utcnow() - timedelta(days=7)).isoformat()
        print(f"\n🔍 Testing manual debit with custom date ({last_week})...")
        success4, response4 = self.run_test(
            "Manual Debit - Custom Date",
            "POST",
            "admin/manual-transaction",
            200,
            data={
                "user_id": self.customer_id,
                "action": "debit",
                "amount": 300.00,
                "account_type": "savings",
                "description": "Test manual debit - custom date",
                "custom_date": last_week
            },
            token=self.admin_token
        )
        
        # Get customer dashboard to verify balance changes
        print("\n🔍 Verifying balance changes...")
        success5, dashboard = self.run_test(
            "Get Customer Dashboard",
            "GET",
            "dashboard",
            200,
            token=self.customer_token
        )
        
        if success5:
            user = dashboard.get('user', {})
            checking_balance = user.get('checking_balance', 0)
            savings_balance = user.get('savings_balance', 0)
            
            print(f"Current checking balance: ${checking_balance}")
            print(f"Current savings balance: ${savings_balance}")
            
            # Verify number formatting
            self.validate_number_formatting(dashboard, "dashboard")
            
            # Get transactions to verify custom dates
            print("\n🔍 Verifying transaction dates...")
            success6, transactions = self.run_test(
                "Get Transactions",
                "GET",
                "transactions",
                200,
                token=self.customer_token
            )
            
            if success6:
                # Verify number formatting in transactions
                self.validate_number_formatting(transactions, "transactions")
                
                # Find our test transactions
                test_transactions = [
                    t for t in transactions 
                    if (t.get('description', '').startswith('Test manual') and 
                        (t.get('from_user_id') == self.customer_id or t.get('to_user_id') == self.customer_id))
                ]
                
                print(f"Found {len(test_transactions)} test transactions")
                
                # Verify custom dates
                custom_date_transactions = [
                    t for t in test_transactions 
                    if 'custom date' in t.get('description', '').lower()
                ]
                
                if custom_date_transactions:
                    for t in custom_date_transactions:
                        print(f"Transaction: {t.get('description')} - Date: {t.get('created_at')}")
                        
                        # Check if the date matches our custom dates
                        if 'yesterday' in t.get('description', '').lower():
                            # Check if date is close to yesterday
                            created_date = datetime.fromisoformat(t.get('created_at').replace('Z', '+00:00'))
                            yesterday_date = datetime.fromisoformat(yesterday.replace('Z', '+00:00'))
                            date_diff = abs((created_date - yesterday_date).total_seconds())
                            
                            if date_diff > 300:  # Allow 5 minutes difference for processing time
                                print(f"❌ Custom date not set correctly. Expected: {yesterday}, Got: {t.get('created_at')}")
                                return False
                        
                        elif 'last week' in t.get('description', '').lower():
                            # Check if date is close to last week
                            created_date = datetime.fromisoformat(t.get('created_at').replace('Z', '+00:00'))
                            last_week_date = datetime.fromisoformat(last_week.replace('Z', '+00:00'))
                            date_diff = abs((created_date - last_week_date).total_seconds())
                            
                            if date_diff > 300:  # Allow 5 minutes difference for processing time
                                print(f"❌ Custom date not set correctly. Expected: {last_week}, Got: {t.get('created_at')}")
                                return False
                    
                    print("✅ Custom dates were set correctly")
                else:
                    print("❌ No transactions with custom dates found")
                    return False
            else:
                print("❌ Failed to get transactions")
                return False
        else:
            print("❌ Failed to get customer dashboard")
            return False
            
        return success1 and success2 and success3 and success4 and success5 and success6

    def test_monthly_summary_logic(self):
        """Test monthly summary transaction logic (credits vs debits)"""
        if not self.admin_token or not self.customer_id or not self.customer_token:
            print("❌ Admin or customer token not available, skipping test")
            return False
            
        # First, get current balance to use as baseline
        print("\n🔍 Getting current balance as baseline...")
        success0, dashboard = self.run_test(
            "Get Initial Dashboard",
            "GET",
            "dashboard",
            200,
            token=self.customer_token
        )
        
        if not success0:
            print("❌ Failed to get initial dashboard")
            return False
            
        initial_balance = float(dashboard.get('user', {}).get('checking_balance', 0))
        print(f"Initial checking balance: ${initial_balance}")
        
        # Add funds to the customer account for monthly summary test
        print("\n🔍 Adding funds to customer account for monthly summary test...")
        success1, response1 = self.run_test(
            "Add Initial Funds",
            "POST",
            "admin/manual-transaction",
            200,
            data={
                "user_id": self.customer_id,
                "action": "credit",
                "amount": 10000.00,
                "account_type": "checking",
                "description": "Initial funds for monthly summary test"
            },
            token=self.admin_token
        )
        
        if not success1:
            print("❌ Failed to add initial funds")
            return False
            
        # Create transactions for the current month
        current_month = datetime.utcnow().strftime("%Y-%m")
        
        # Track total credits and debits for verification
        total_credits = 0
        total_debits = 0
        
        # Add credits with different dates in current month
        for i, day in enumerate([5, 10, 15, 20]):
            amount = 500.00 * (i+1)
            total_credits += amount
            date_str = f"{current_month}-{day:02d}T12:00:00"
            success, response = self.run_test(
                f"Add Credit Transaction {i+1}",
                "POST",
                "admin/manual-transaction",
                200,
                data={
                    "user_id": self.customer_id,
                    "action": "credit",
                    "amount": amount,
                    "account_type": "checking",
                    "description": f"Monthly test credit {i+1}",
                    "custom_date": date_str
                },
                token=self.admin_token
            )
            if not success:
                print(f"❌ Failed to add credit transaction {i+1}")
                return False
        
        # Add debits with different dates in current month
        for i, day in enumerate([8, 12, 18, 25]):
            amount = 300.00 * (i+1)
            total_debits += amount
            date_str = f"{current_month}-{day:02d}T12:00:00"
            success, response = self.run_test(
                f"Add Debit Transaction {i+1}",
                "POST",
                "admin/manual-transaction",
                200,
                data={
                    "user_id": self.customer_id,
                    "action": "debit",
                    "amount": amount,
                    "account_type": "checking",
                    "description": f"Monthly test debit {i+1}",
                    "custom_date": date_str
                },
                token=self.admin_token
            )
            if not success:
                print(f"❌ Failed to add debit transaction {i+1}")
                return False
        
        # Get transactions to verify monthly summary
        print("\n🔍 Getting transactions for monthly summary verification...")
        success2, transactions = self.run_test(
            "Get Transactions",
            "GET",
            "transactions",
            200,
            token=self.customer_token
        )
        
        if not success2:
            print("❌ Failed to get transactions")
            return False
            
        # Verify number formatting in transactions
        self.validate_number_formatting(transactions, "transactions")
        
        # Calculate monthly summary
        monthly_transactions = {}
        
        for transaction in transactions:
            if transaction.get('description', '').startswith('Monthly test'):
                created_at = transaction.get('created_at', '')
                if created_at:
                    month = created_at.split('T')[0].rsplit('-', 1)[0]  # Extract YYYY-MM
                    
                    if month not in monthly_transactions:
                        monthly_transactions[month] = {'credits': 0, 'debits': 0}
                    
                    amount = float(transaction.get('amount', 0))
                    
                    if 'credit' in transaction.get('description', '').lower() or transaction.get('transaction_type') == 'credit':
                        monthly_transactions[month]['credits'] += amount
                    elif 'debit' in transaction.get('description', '').lower() or transaction.get('transaction_type') == 'debit':
                        monthly_transactions[month]['debits'] += amount
        
        # Print monthly summary
        print("\n📊 Monthly Transaction Summary:")
        for month, data in monthly_transactions.items():
            print(f"Month: {month}")
            print(f"  Credits: ${data['credits']:.2f}")
            print(f"  Debits: ${data['debits']:.2f}")
            print(f"  Net: ${data['credits'] - data['debits']:.2f}")
            
            # Verify credits and debits are calculated correctly
            credits_match = abs(data['credits'] - total_credits) < 0.01
            debits_match = abs(data['debits'] - total_debits) < 0.01
            
            if credits_match and debits_match:
                print("✅ Monthly summary calculations are correct")
                self.transaction_test_results.append({
                    'month': month,
                    'credits': data['credits'],
                    'debits': data['debits'],
                    'net': data['credits'] - data['debits'],
                    'status': 'correct'
                })
            else:
                print("❌ Monthly summary calculations are incorrect")
                print(f"  Expected credits: ${total_credits:.2f}, got: ${data['credits']:.2f}")
                print(f"  Expected debits: ${total_debits:.2f}, got: ${data['debits']:.2f}")
                self.transaction_test_results.append({
                    'month': month,
                    'credits': data['credits'],
                    'debits': data['debits'],
                    'net': data['credits'] - data['debits'],
                    'status': 'incorrect',
                    'expected_credits': total_credits,
                    'expected_debits': total_debits
                })
                return False
        
        # Get customer dashboard to verify balance changes
        print("\n🔍 Verifying final balance...")
        success3, dashboard = self.run_test(
            "Get Customer Dashboard",
            "GET",
            "dashboard",
            200,
            token=self.customer_token
        )
        
        if success3:
            user = dashboard.get('user', {})
            checking_balance = float(user.get('checking_balance', 0))
            
            print(f"Final checking balance: ${checking_balance}")
            
            # Calculate expected balance
            expected_balance = initial_balance + 10000.00  # Initial funds
            expected_balance += total_credits  # Credits
            expected_balance -= total_debits  # Debits
            
            balance_match = abs(checking_balance - expected_balance) < 0.01
            
            if balance_match:
                print(f"✅ Final balance is correct: ${checking_balance}")
            else:
                print(f"❌ Final balance is incorrect. Expected: ${expected_balance:.2f}, got: ${checking_balance}")
                return False
        else:
            print("❌ Failed to get customer dashboard")
            return False
            
        return True

    def test_get_pending_transactions(self):
        """Test getting pending transactions as admin"""
        if not self.admin_token:
            print("❌ Admin token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Get Pending Transactions",
            "GET",
            "admin/pending-transactions",
            200,
            token=self.admin_token
        )
        
        if success:
            # Validate number formatting in transactions
            self.validate_number_formatting(response, "pending-transactions")
        
        return success
        
    def test_specific_transaction_approval(self, transaction_id, user_id, amount):
        """Test approving a specific transaction after adding funds to user"""
        if not self.admin_token:
            print("❌ Admin token not available, skipping test")
            return False
            
        # First, add funds to the user
        print(f"\n🔍 Adding ${amount} to user {user_id}...")
        success, response = self.run_test(
            "Add Funds to User",
            "POST",
            "admin/manual-transaction",
            200,
            data={
                "user_id": user_id,
                "action": "credit",
                "amount": amount,
                "account_type": "checking",
                "description": "Adding funds for transaction approval test"
            },
            token=self.admin_token
        )
        
        if not success:
            print("❌ Failed to add funds to user")
            return False
            
        # Now approve the transaction
        print(f"\n🔍 Approving transaction {transaction_id}...")
        success, response = self.run_test(
            "Approve Specific Transaction",
            "POST",
            f"admin/process-transaction?transaction_id={transaction_id}&action=approve",
            200,
            token=self.admin_token
        )
        
        if success:
            print(f"✅ Transaction {transaction_id} approved successfully")
        else:
            print(f"❌ Failed to approve transaction {transaction_id}")
            
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("\n🏦 Starting Bank API Tests 🏦\n")
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {self.test_user_email}\n")
        
        # Admin login
        if not self.test_admin_login():
            print("❌ Admin login failed, stopping tests")
            return self.report_results()
        
        # Customer signup
        if not self.test_customer_signup():
            print("❌ Customer signup failed, stopping tests")
            return self.report_results()
        
        # Get pending users
        if not self.test_get_pending_users():
            print("❌ Getting pending users failed, stopping tests")
            return self.report_results()
        
        # Approve user
        if not self.test_approve_user():
            print("❌ Approving user failed, stopping tests")
            return self.report_results()
        
        # Customer login
        if not self.test_customer_login():
            print("❌ Customer login failed, stopping tests")
            return self.report_results()
        
        # Customer dashboard
        if not self.test_customer_dashboard():
            print("❌ Customer dashboard failed, stopping tests")
            return self.report_results()
        
        # Test transfer types
        if not self.test_transfer_types():
            print("❌ Testing transfer types failed, stopping tests")
            return self.report_results()
        
        # Test admin manual transactions with custom dates
        if not self.test_admin_manual_transactions():
            print("❌ Testing admin manual transactions failed, stopping tests")
            return self.report_results()
        
        # Test monthly summary logic
        if not self.test_monthly_summary_logic():
            print("❌ Testing monthly summary logic failed, stopping tests")
            return self.report_results()
        
        # Get pending transactions
        if not self.test_get_pending_transactions():
            print("❌ Getting pending transactions failed, stopping tests")
            return self.report_results()
        
        return self.report_results()
    
    def report_results(self):
        """Report test results"""
        print("\n📊 Test Results:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0:.2f}%")
        
        # Report number formatting issues
        if self.number_format_issues:
            print(f"\n❌ Found {len(self.number_format_issues)} number formatting issues:")
            for issue in self.number_format_issues[:5]:  # Show first 5 issues
                print(f"  - {issue['endpoint']} - {issue['path']}: {issue['value']} - {issue['issue']}")
            if len(self.number_format_issues) > 5:
                print(f"  ... and {len(self.number_format_issues) - 5} more issues")
        else:
            print("\n✅ No number formatting issues found")
            
        # Report transaction test results
        if self.transaction_test_results:
            print("\n📈 Transaction Test Results:")
            for result in self.transaction_test_results:
                status_icon = "✅" if result['status'] == 'correct' else "❌"
                print(f"{status_icon} Month: {result['month']}")
                print(f"  Credits: ${result['credits']:.2f}")
                print(f"  Debits: ${result['debits']:.2f}")
                print(f"  Net: ${result['net']:.2f}")
                
                if result['status'] == 'incorrect':
                    print(f"  Expected credits: ${result['expected_credits']:.2f}")
                    print(f"  Expected debits: ${result['expected_debits']:.2f}")
        
        if self.tests_passed == self.tests_run:
            print("\n✅ All tests passed!")
            return 0
        else:
            print(f"\n❌ {self.tests_run - self.tests_passed} tests failed")
            return 1
            
    def test_transaction_approval_fix(self, transaction_id, partial_user_id, amount):
        """Run only the transaction approval fix test"""
        print("\n🏦 Testing Transaction Approval Fix 🏦\n")
        print(f"Base URL: {self.base_url}")
        print(f"Transaction ID: {transaction_id}")
        print(f"Partial User ID: {partial_user_id}")
        print(f"Amount to add: ${amount}\n")
        
        # Admin login
        if not self.test_admin_login():
            print("❌ Admin login failed, stopping test")
            return self.report_results()
            
        # Get pending transactions to find the correct transaction
        print("\n🔍 Getting pending transactions to find the correct transaction...")
        success, transactions = self.run_test(
            "Get Pending Transactions",
            "GET",
            "admin/pending-transactions",
            200,
            token=self.admin_token
        )
        
        if not success:
            print("❌ Failed to get pending transactions")
            return self.report_results()
            
        # Find the specific transaction
        transaction = None
        for t in transactions:
            if t.get('id') == transaction_id:
                transaction = t
                print(f"✅ Found transaction: {transaction_id}")
                print(f"Transaction details: {t}")
                break
                
        if not transaction:
            print(f"❌ Could not find transaction with ID {transaction_id}")
            return self.report_results()
            
        # Get the user ID from the transaction
        user_id = transaction.get('from_user_id')
        if not user_id:
            print("❌ Could not find user ID in transaction")
            return self.report_results()
            
        print(f"✅ Found user ID from transaction: {user_id}")
            
        # Get all users to verify the user exists
        print("\n🔍 Getting all users to verify the user exists...")
        success, users = self.run_test(
            "Get All Users",
            "GET",
            "admin/users",
            200,
            token=self.admin_token
        )
        
        if not success:
            print("❌ Failed to get users")
            return self.report_results()
            
        # Find the user
        user = None
        for u in users:
            if u.get('id') == user_id:
                user = u
                print(f"✅ Found user: {user.get('full_name')} ({user.get('email')})")
                print(f"Current balance: ${user.get('checking_balance', 0)}")
                break
                
        if not user:
            print(f"❌ Could not find user with ID {user_id}")
            return self.report_results()
            
        # Test the specific transaction approval
        if not self.test_specific_transaction_approval(transaction_id, user_id, amount):
            print("❌ Transaction approval test failed")
            return self.report_results()
            
        print("\n✅ Transaction approval test passed!")
        return self.report_results()

if __name__ == "__main__":
    # Use the public endpoint from the frontend .env file
    backend_url = "https://fd0f97d2-1638-4ac9-9947-f34eb9420097.preview.emergentagent.com"
    
    # Check if we're running the specific transaction approval test
    if len(sys.argv) > 1 and sys.argv[1] == "test_transaction_approval":
        # Transaction details from the request
        transaction_id = "c59bf2ab-db9c-4986-a39b-f9444d01f861"
        user_id = "bb879107-e252-42ad-b6ec-b83e5589586"  # This might be partial
        amount = 15000.0
        
        tester = BankAPITester(backend_url)
        exit_code = tester.test_transaction_approval_fix(transaction_id, user_id, amount)
    else:
        # Run all tests
        tester = BankAPITester(backend_url)
        exit_code = tester.run_all_tests()
        
    sys.exit(exit_code)