import requests
import time
import uuid
from datetime import datetime
import sys

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
        
        # Create transfer
        if not self.test_create_transfer():
            print("❌ Creating transfer failed, stopping tests")
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
        
        if self.tests_passed == self.tests_run:
            print("\n✅ All tests passed!")
            return 0
        else:
            print(f"\n❌ {self.tests_run - self.tests_passed} tests failed")
            return 1
            
    def test_transaction_approval_fix(self, transaction_id, user_id, amount):
        """Run only the transaction approval fix test"""
        print("\n🏦 Testing Transaction Approval Fix 🏦\n")
        print(f"Base URL: {self.base_url}")
        print(f"Transaction ID: {transaction_id}")
        print(f"User ID: {user_id}")
        print(f"Amount to add: ${amount}\n")
        
        # Admin login
        if not self.test_admin_login():
            print("❌ Admin login failed, stopping test")
            return self.report_results()
            
        # Test the specific transaction approval
        if not self.test_specific_transaction_approval(transaction_id, user_id, amount):
            print("❌ Transaction approval test failed")
            return self.report_results()
            
        print("\n✅ Transaction approval test passed!")
        return self.report_results()

if __name__ == "__main__":
    # Use the public endpoint from the frontend .env file
    backend_url = "https://4d7018b7-5a0c-4fa2-a488-2cc75af693d2.preview.emergentagent.com"
    
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