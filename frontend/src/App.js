import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuspiciousLogin, setShowSuspiciousLogin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token validity by fetching dashboard
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setUser(response.data.user);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/login`, { email, password });
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(user);
      setLoading(false); // Ensure loading is set to false after successful login
      return { success: true };
    } catch (error) {
      setLoading(false); // Ensure loading is set to false on login failure
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Components
const HomePage = () => {
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showServiceUnavailable, setShowServiceUnavailable] = useState(false);

  const handleNavClick = (e) => {
    e.preventDefault();
    setShowServiceUnavailable(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Modern Header */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">SecureBank</span>
              <span className="text-sm bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">2.0</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#personal" onClick={handleNavClick} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Personal</a>
              <a href="#small-business" onClick={handleNavClick} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Small Business</a>
              <a href="#wealth" onClick={handleNavClick} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Wealth Management</a>
              <a href="#business" onClick={handleNavClick} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Businesses & Institutions</a>
              <a href="#security" onClick={handleNavClick} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Security</a>
              <a href="#about" onClick={handleNavClick} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">About Us</a>
              <a href="#espanol" onClick={handleNavClick} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">En español</a>
              <a href="#contact" onClick={handleNavClick} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Contact us</a>
              <a href="#help" onClick={handleNavClick} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Help</a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowLogin(true)}
                className="hidden md:block text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => setShowSignup(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <span>Open Account</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>Welcome</span>
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Manage your
                  <br />
                  <span className="text-blue-600">finances simply</span>
                  <br />
                  and easily.
                </h1>
              </div>
              
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                A safe and friendly application for managing your own
                portfolio. Manage your money easily with the free app
                on our platform!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowSignup(true)}
                  className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <span>Read more</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowLogin(true)}
                  className="border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  Secure Login
                </button>
              </div>
            </div>

            {/* Right Content - Floating Card */}
            <div className="relative">
              {/* Background Elements */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-50"></div>
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-50"></div>
              
              {/* Main Card */}
              <div className="relative bg-white p-8 rounded-3xl shadow-2xl backdrop-blur-sm border border-gray-100">
                {/* Notification */}
                <div className="absolute -top-4 right-8 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-lg">N</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-900">Net payment</span>
                        <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full font-medium">new</span>
                      </div>
                      <p className="text-xs text-gray-500">Today, 12:50 PM</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-semibold">25.40</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white relative overflow-hidden mt-8">
                  <div className="absolute top-4 right-4">
                    <svg className="w-8 h-8 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div className="relative z-10">
                    <p className="text-blue-100 text-sm font-medium mb-1">****4519</p>
                    <div className="text-3xl font-bold mb-2">5,203.45 <span className="text-lg font-normal text-blue-200">USD</span></div>
                    <p className="text-blue-200 text-sm">Total Balance</p>
                    
                    {/* User Avatar */}
                    <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white rounded-full p-1">
                      <img 
                        src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face&auto=format" 
                        alt="User" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10"></div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-6 mt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                      </svg>
                    </div>
                    <div className="text-lg font-bold text-gray-900">32 transfers</div>
                    <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Incoming</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="text-lg font-bold text-gray-900">4,209.48</div>
                    <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Payment money</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose SecureBank?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional banking services with cutting-edge security and modern technology
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-200">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Transactions</h3>
              <p className="text-gray-600 leading-relaxed">All transactions are encrypted and require admin approval for maximum security.</p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-200">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Access</h3>
              <p className="text-gray-600 leading-relaxed">Real-time balance updates and transaction history at your fingertips.</p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-200">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Trusted Platform</h3>
              <p className="text-gray-600 leading-relaxed">Professional-grade banking with full compliance and audit trails.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showServiceUnavailable && <ServiceUnavailableModal onClose={() => setShowServiceUnavailable(false)} />}
    </div>
  );
};

const ServiceUnavailableModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Unavailable in Your Location</h2>
          <p className="text-gray-600 mb-6">This service is currently not available in your region.</p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const SignupModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    ssn: '',
    tin: '',
    phone: '',
    address: '',
    unique_code: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await axios.post(`${API}/signup`, formData);
      setSuccess(true);
    } catch (error) {
      setError(error.response?.data?.detail || 'Signup failed');
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-navy-900 mb-2">Account Created!</h2>
            <p className="text-gray-600 mb-6">Your account has been created successfully. Please wait for admin approval before you can login.</p>
            <button
              onClick={onClose}
              className="bg-navy-900 text-white px-6 py-2 rounded-lg hover:bg-navy-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-navy-900">Open Account</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SSN</label>
            <input
              type="text"
              required
              value={formData.ssn}
              onChange={(e) => setFormData({...formData, ssn: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TIN</label>
            <input
              type="text"
              required
              value={formData.tin}
              onChange={(e) => setFormData({...formData, tin: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unique Code</label>
            <input
              type="text"
              required
              value={formData.unique_code}
              onChange={(e) => setFormData({...formData, unique_code: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              placeholder="Enter the unique code"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button
            type="submit"
            className="w-full bg-navy-900 text-white py-2 rounded-lg hover:bg-navy-800 transition-colors"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

const LoginModal = ({ onClose }) => {
  const { login } = React.useContext(AuthContext);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(formData.email, formData.password);
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-navy-900">Secure Login</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button
            type="submit"
            className="w-full bg-navy-900 text-white py-2 rounded-lg hover:bg-navy-800 transition-colors"
          >
            Login
          </button>
        </form>
        
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Contact administrator for login credentials</p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = React.useContext(AuthContext);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      // If dashboard fetch fails but user is available, use user data
      if (user) {
        setDashboard({
          user: user,
          recent_transactions: []
        });
      }
    }
  };

  // If user is available but dashboard is still loading, show user data immediately for customer
  if (user && user.role !== 'admin' && !dashboard) {
    setDashboard({
      user: user,
      recent_transactions: []
    });
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-navy-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user.role === 'admin' ? (
        <>
          {/* Header for Admin */}
          <nav className="bg-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-navy-900">SecureBank</div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">Welcome, {user.full_name}</span>
                  <button
                    onClick={logout}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AdminDashboard />
          </div>
        </>
      ) : (
        <CustomerDashboard dashboard={dashboard} />
      )}
    </div>
  );
};

const CustomerDashboard = ({ dashboard }) => {
  const { logout } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [liveData, setLiveData] = useState(dashboard);
  const [incomeOutcomeStats, setIncomeOutcomeStats] = useState({
    income: 0,
    outcome: 0,
    monthlyData: []
  });

  // Real-time data fetching
  useEffect(() => {
    setLiveData(dashboard);
    calculateIncomeOutcome(dashboard?.recent_transactions || []);
    
    // Set up polling for real-time updates
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API}/dashboard`);
        setLiveData(response.data);
        calculateIncomeOutcome(response.data?.recent_transactions || []);
      } catch (error) {
        console.error('Error fetching live data:', error);
      }
    }, 5000); // Poll every 5 seconds for real-time updates

    return () => clearInterval(interval);
  }, [dashboard]);

  const calculateIncomeOutcome = (transactions) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let income = 0;
    let outcome = 0;
    const monthlyData = Array(7).fill(0).map((_, index) => {
      const month = new Date();
      month.setMonth(currentMonth - (6 - index));
      return {
        month: month.toLocaleDateString('en-US', { month: 'short' }),
        income: 0,
        outcome: 0
      };
    });

    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.created_at);
      const transactionMonth = transactionDate.getMonth();
      const transactionYear = transactionDate.getFullYear();
      
      // Calculate current month totals
      if (transactionMonth === currentMonth && transactionYear === currentYear) {
        if (transaction.transaction_type === 'credit' || 
            (transaction.transaction_type === 'self' && transaction.to_user_id === liveData?.user?.id)) {
          income += transaction.amount;
        } else {
          outcome += transaction.amount;
        }
      }
      
      // Calculate monthly data for graph
      const monthIndex = monthlyData.findIndex(m => {
        const targetMonth = new Date();
        targetMonth.setMonth(currentMonth - (6 - monthlyData.indexOf(m)));
        return targetMonth.getMonth() === transactionMonth && targetMonth.getFullYear() === transactionYear;
      });
      
      if (monthIndex !== -1) {
        if (transaction.transaction_type === 'credit' || 
            (transaction.transaction_type === 'self' && transaction.to_user_id === liveData?.user?.id)) {
          monthlyData[monthIndex].income += transaction.amount;
        } else {
          monthlyData[monthIndex].outcome += transaction.amount;
        }
      }
    });

    setIncomeOutcomeStats({ income, outcome, monthlyData });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-100 relative">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-gray-900">SecureBank</span>
          </div>
          
          <nav className="space-y-2 flex-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('transfer')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'transfer' 
                  ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="font-medium">Transfer</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'transactions' 
                  ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m2-2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m0 0V3a2 2 0 00-2 2v0m2 0v2M7 21h10a2 2 0 002-2v-6a2 2 0 00-2-2H7a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Transactions</span>
            </button>
          </nav>

          {/* Logout Button */}
          <div className="mt-auto">
            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors text-gray-600 hover:bg-red-50 hover:text-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Hello Josh, welcome back</h1>
                  <p className="text-gray-500 mt-1">Here's an overview of your account</p>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setActiveTab('transfer')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New transaction</span>
                  </button>
                  <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                    Settings
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                  {/* My Cards */}
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-semibold text-gray-900">My cards</h2>
                      <button className="text-blue-600 hover:text-blue-700 font-medium">See all</button>
                    </div>
                    <div className="flex space-x-6 overflow-x-auto pb-4">
                      {/* Primary Card */}
                      <div className="min-w-[280px] h-[180px] bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
                        <div className="absolute top-4 right-4">
                          <div className="text-white font-bold text-lg">VISA</div>
                        </div>
                        <div className="absolute bottom-6 left-6">
                          <div className="text-blue-100 text-sm font-medium mb-1">Balance</div>
                          <div className="text-2xl font-bold">${liveData?.user?.checking_balance?.toFixed(2) || '0.00'}</div>
                          <div className="text-blue-100 text-sm mt-2">**** **** **** 4255</div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10"></div>
                      </div>
                      
                      {/* Secondary Card */}
                      <div className="min-w-[280px] h-[180px] bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl p-6 text-gray-700 relative overflow-hidden shadow-lg">
                        <div className="absolute top-4 right-4">
                          <div className="text-gray-600 font-bold text-lg">VISA</div>
                        </div>
                        <div className="absolute bottom-6 left-6">
                          <div className="text-gray-500 text-sm font-medium mb-1">Savings</div>
                          <div className="text-2xl font-bold text-gray-700">${liveData?.user?.savings_balance?.toFixed(2) || '0.00'}</div>
                          <div className="text-gray-500 text-sm mt-2">**** **** **** 2847</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Summary */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Monthly summary</h3>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Download report</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div>
                        <div className="text-gray-500 text-sm font-medium mb-1">Income</div>
                        <div className="text-2xl font-bold text-green-600">${incomeOutcomeStats.income.toFixed(2)}</div>
                        <div className="text-green-600 text-sm flex items-center mt-1">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                          </svg>
                          Live Updates
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm font-medium mb-1">Expense</div>
                        <div className="text-2xl font-bold text-red-500">${incomeOutcomeStats.outcome.toFixed(2)}</div>
                        <div className="text-red-500 text-sm flex items-center mt-1">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                          </svg>
                          Real-time
                        </div>
                      </div>
                    </div>

                    {/* Live Graph */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-500 mb-4">
                        {incomeOutcomeStats.monthlyData.map((data, index) => (
                          <span key={index}>{data.month}</span>
                        ))}
                      </div>
                      <div className="flex justify-between items-end space-x-2 h-32">
                        {incomeOutcomeStats.monthlyData.map((data, index) => {
                          const maxValue = Math.max(...incomeOutcomeStats.monthlyData.map(d => Math.max(d.income, d.outcome)));
                          const incomeHeight = maxValue > 0 ? (data.income / maxValue) * 80 + 20 : 20;
                          const outcomeHeight = maxValue > 0 ? (data.outcome / maxValue) * 80 + 20 : 20;
                          
                          return (
                            <div key={index} className="flex flex-col items-center space-y-1 flex-1">
                              <div 
                                className="bg-blue-100 w-full rounded-t transition-all duration-500" 
                                style={{ height: `${incomeHeight}px` }}
                                title={`Income: $${data.income.toFixed(2)}`}
                              ></div>
                              <div 
                                className="bg-blue-600 w-full rounded-b transition-all duration-500" 
                                style={{ height: `${outcomeHeight}px` }}
                                title={`Expense: $${data.outcome.toFixed(2)}`}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Balance Overview */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance</h3>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 mb-2">
                        ${((liveData?.user?.checking_balance || 0) + (liveData?.user?.savings_balance || 0)).toFixed(2)}
                      </div>
                      <div className="text-gray-500 text-sm mb-6">Total balance</div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-gray-600">+${incomeOutcomeStats.income.toFixed(2)}</span>
                          </div>
                          <div className="text-gray-400">Income</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                            <span className="text-gray-600">-${incomeOutcomeStats.outcome.toFixed(2)}</span>
                          </div>
                          <div className="text-gray-400">Outcome</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Latest Transactions */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Latest transactions</h3>
                      <button 
                        onClick={() => setActiveTab('transactions')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View all
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(liveData?.recent_transactions || []).slice(0, 4).map((transaction, index) => (
                        <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transaction.transaction_type === 'credit' ? 'bg-green-100' : 'bg-blue-100'
                            }`}>
                              {transaction.transaction_type === 'credit' ? (
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {transaction.description.length > 25 
                                  ? transaction.description.substring(0, 25) + '...' 
                                  : transaction.description}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold text-sm ${
                              transaction.transaction_type === 'credit' 
                                ? 'text-green-600' 
                                : 'text-gray-900'
                            }`}>
                              {transaction.transaction_type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full mt-1 ${
                              transaction.status === 'approved' 
                                ? 'bg-green-100 text-green-700' 
                                : transaction.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {transaction.status}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {(!liveData?.recent_transactions || liveData.recent_transactions.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m2-2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m0 0V3a2 2 0 00-2 2v0m2 0v2M7 21h10a2 2 0 002-2v-6a2 2 0 00-2-2H7a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                          <p>No recent transactions</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transfer' && <TransferForm />}
          {activeTab === 'transactions' && <TransactionHistory />}
        </div>
      </div>
    </div>
  );
};

const TransferForm = () => {
  const { user } = React.useContext(AuthContext);
  const [formData, setFormData] = useState({
    from_account_type: 'checking',
    to_user_id: '',
    to_account_info: '',
    amount: '',
    transaction_type: 'internal',
    description: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await axios.post(`${API}/transfer`, formData);
      setSuccess(true);
      setFormData({
        from_account_type: 'checking',
        to_user_id: '',
        to_account_info: '',
        amount: '',
        transaction_type: 'internal',
        description: ''
      });
    } catch (error) {
      setError(error.response?.data?.detail || 'Transfer failed');
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-navy-900 mb-2">Transfer Submitted!</h3>
          <p className="text-gray-600 mb-4">Your transfer has been submitted and is waiting for admin approval.</p>
          <button
            onClick={() => setSuccess(false)}
            className="bg-navy-900 text-white px-6 py-2 rounded-lg hover:bg-navy-800 transition-colors"
          >
            New Transfer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-navy-900 mb-6">New Transfer</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Account</label>
          <select
            value={formData.from_account_type}
            onChange={(e) => setFormData({...formData, from_account_type: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
          >
            <option value="checking">
              Checking Account (****1234) - ${user?.checking_balance?.toFixed(2) || '0.00'}
            </option>
            <option value="savings">
              Savings Account (****5678) - ${user?.savings_balance?.toFixed(2) || '0.00'}
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Type</label>
          <select
            value={formData.transaction_type}
            onChange={(e) => setFormData({...formData, transaction_type: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
          >
            <option value="internal">Internal Transfer</option>
            <option value="self">Transfer Between My Accounts</option>
            <option value="domestic">Domestic Transfer</option>
            <option value="international">International Transfer</option>
          </select>
        </div>

        {formData.transaction_type === 'internal' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recipient User ID</label>
            <input
              type="text"
              required
              value={formData.to_user_id}
              onChange={(e) => setFormData({...formData, to_user_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              placeholder="Enter recipient's user ID"
            />
          </div>
        ) : formData.transaction_type === 'self' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Account</label>
            <select
              value={formData.to_account_info}
              onChange={(e) => setFormData({...formData, to_account_info: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              required
            >
              <option value="">Select destination account</option>
              {formData.from_account_type !== 'checking' && (
                <option value="checking">
                  Checking Account (****1234) - ${user?.checking_balance?.toFixed(2) || '0.00'}
                </option>
              )}
              {formData.from_account_type !== 'savings' && (
                <option value="savings">
                  Savings Account (****5678) - ${user?.savings_balance?.toFixed(2) || '0.00'}
                </option>
              )}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.transaction_type === 'international' ? 'SWIFT/IBAN' : 'Account Information'}
            </label>
            <textarea
              required
              value={formData.to_account_info}
              onChange={(e) => setFormData({...formData, to_account_info: e.target.value})}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              placeholder={formData.transaction_type === 'international' ? 'Enter SWIFT code and IBAN' : 'Enter account details'}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            placeholder="Enter transfer description"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-navy-900 text-white py-2 rounded-lg hover:bg-navy-800 transition-colors"
        >
          Submit Transfer
        </button>
      </form>
    </div>
  );
};

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-navy-900 mb-6">Transaction History</h3>
      
      <div className="space-y-4">
        {transactions.map((transaction, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    transaction.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : transaction.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {transaction.status}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                    {transaction.transaction_type}
                  </span>
                </div>
                <p className="font-medium text-gray-900">{transaction.description}</p>
                <p className="text-sm text-gray-500">
                  {new Date(transaction.created_at).toLocaleDateString()} at {new Date(transaction.created_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-navy-900">${transaction.amount.toFixed(2)}</p>
                <p className="text-sm text-gray-500">ID: {transaction.id.slice(0, 8)}</p>
              </div>
            </div>
          </div>
        ))}
        
        {transactions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CreditDebitForm = ({ allUsers }) => {
  const [formData, setFormData] = useState({
    user_id: '',
    account_type: 'checking',
    transaction_type: 'credit',
    amount: '',
    description: '',
    backdate: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const requestData = {
        user_id: formData.user_id,
        action: formData.transaction_type,
        amount: parseFloat(formData.amount),
        account_type: formData.account_type,
        description: formData.description
      };

      // Add custom date if provided
      if (formData.backdate) {
        requestData.custom_date = new Date(formData.backdate).toISOString();
      }

      await axios.post(`${API}/admin/manual-transaction`, requestData);
      setSuccess(true);
      setFormData({
        user_id: '',
        account_type: 'checking',
        transaction_type: 'credit',
        amount: '',
        description: '',
        backdate: ''
      });
    } catch (error) {
      setError(error.response?.data?.detail || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const runBulkOperations = () => {
    // Placeholder for bulk operations functionality
    alert('Bulk operations feature would be implemented here');
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-navy-900 mb-2">Transaction Completed!</h3>
          <p className="text-gray-600 mb-4">The {formData.transaction_type} transaction has been processed successfully.</p>
          <button
            onClick={() => setSuccess(false)}
            className="bg-navy-900 text-white px-6 py-2 rounded-lg hover:bg-navy-800 transition-colors"
          >
            New Transaction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-navy-900">Credit/Debit Account</h3>
        <button
          onClick={runBulkOperations}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Run Bulk Operations
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData({...formData, user_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              required
            >
              <option value="">Select account</option>
              {allUsers.filter(user => user.role !== 'admin').map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email}) - Checking: ${user.checking_balance.toFixed(2)}, Savings: ${user.savings_balance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
            <select
              value={formData.transaction_type}
              onChange={(e) => setFormData({...formData, transaction_type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="credit">Credit (Add Money)</option>
              <option value="debit">Debit (Subtract Money)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
            <select
              value={formData.account_type}
              onChange={(e) => setFormData({...formData, account_type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="checking">Checking Account</option>
              <option value="savings">Savings Account</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            placeholder="Enter transaction description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Backdate (Optional)</label>
          <input
            type="datetime-local"
            value={formData.backdate}
            onChange={(e) => setFormData({...formData, backdate: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-lg transition-colors ${
            loading 
              ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? 'Processing...' : `${formData.transaction_type === 'credit' ? 'Credit' : 'Debit'} Account`}
        </button>
      </form>
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending-users');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    fetchPendingUsers();
    fetchPendingTransactions();
    fetchAllUsers();
    fetchActiveSessions();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/pending-users`);
      setPendingUsers(response.data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    }
  };

  const fetchPendingTransactions = async () => {
    try {
      const response = await axios.get(`${API}/admin/pending-transactions`);
      setPendingTransactions(response.data);
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`);
      setAllUsers(response.data);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await axios.get(`${API}/admin/active-sessions`);
      setActiveSessions(response.data);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  const handleForceLogout = async (userId) => {
    try {
      const response = await axios.post(`${API}/admin/force-logout`, {
        user_id: userId,
        action: 'force-logout'
      });
      
      if (response.status === 200) {
        // Refresh active sessions
        fetchActiveSessions();
        alert('User has been logged out successfully!');
      }
    } catch (error) {
      console.error('Error forcing logout:', error);
      alert(`Error: ${error.response?.data?.detail || 'Failed to logout user'}`);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      const response = await axios.post(`${API}/admin/approve-user`, {
        user_id: userId,
        action: action
      });
      
      if (response.status === 200) {
        // Refresh the pending users list
        fetchPendingUsers();
        // Also refresh all users list
        fetchAllUsers();
        
        // Show success message
        alert(`User ${action}d successfully!`);
      }
    } catch (error) {
      console.error('Error processing user action:', error);
      alert(`Error: ${error.response?.data?.detail || `Failed to ${action} user`}`);
    }
  };

  const handleTransactionAction = async (transactionId, action) => {
    try {
      const response = await axios.post(`${API}/admin/process-transaction?transaction_id=${transactionId}&action=${action}`);
      
      if (response.status === 200) {
        // Refresh the pending transactions list
        fetchPendingTransactions();
        // Also refresh all users to see updated balances
        fetchAllUsers();
        
        // Show success message
        alert(`Transaction ${action}d successfully!`);
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      alert(`Error: ${error.response?.data?.detail || `Failed to ${action} transaction`}`);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users and transactions</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending-users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending-users' 
                ? 'border-navy-500 text-navy-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Users ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('pending-transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending-transactions' 
                ? 'border-navy-500 text-navy-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Transactions ({pendingTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('credit-debit')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'credit-debit' 
                ? 'border-navy-500 text-navy-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Credit/Debit Account
          </button>
          <button
            onClick={() => setActiveTab('active-sessions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active-sessions' 
                ? 'border-navy-500 text-navy-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Sessions
          </button>
          <button
            onClick={() => setActiveTab('all-users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all-users' 
                ? 'border-navy-500 text-navy-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setActiveTab('all-users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all-users' 
                ? 'border-navy-500 text-navy-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Users
          </button>
        </nav>
      </div>

      {activeTab === 'pending-users' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">Pending User Approvals</h3>
            <div className="space-y-4">
              {pendingUsers.map((user, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{user.full_name}</h4>
                      <p className="text-sm text-gray-500">Email: {user.email}</p>
                      <p className="text-sm text-gray-500">SSN: {user.ssn}</p>
                      <p className="text-sm text-gray-500">TIN: {user.tin}</p>
                      <p className="text-sm text-gray-500">Phone: {user.phone}</p>
                      <p className="text-sm text-gray-500">Address: {user.address}</p>
                      <p className="text-sm text-gray-500">Applied: {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUserAction(user.id, 'approve')}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUserAction(user.id, 'decline')}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {pendingUsers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending user approvals</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pending-transactions' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">Pending Transactions</h3>
            <div className="space-y-4">
              {pendingTransactions.map((transaction, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          {transaction.transaction_type}
                        </span>
                        <span className="text-sm text-gray-500">
                          ID: {transaction.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">Amount: ${transaction.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">From: {transaction.from_user_id}</p>
                      {transaction.to_user_id && (
                        <p className="text-sm text-gray-500">To User: {transaction.to_user_id}</p>
                      )}
                      {transaction.to_account_info && (
                        <p className="text-sm text-gray-500">To Account: {transaction.to_account_info}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        Created: {new Date(transaction.created_at).toLocaleDateString()} at {new Date(transaction.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleTransactionAction(transaction.id, 'approve')}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleTransactionAction(transaction.id, 'decline')}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {pendingTransactions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending transactions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'credit-debit' && <CreditDebitForm allUsers={allUsers} />}

      {activeTab === 'active-sessions' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">Active User Sessions</h3>
            <div className="space-y-4">
              {activeSessions.map((session, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{session.full_name}</h4>
                      <p className="text-sm text-gray-500">Email: {session.email}</p>
                      <p className="text-sm text-gray-500">User ID: {session.id}</p>
                      <p className="text-sm text-gray-500">
                        Last Activity: {new Date(session.last_activity).toLocaleDateString()} at {new Date(session.last_activity).toLocaleTimeString()}
                      </p>
                      {session.force_logout_at && (
                        <p className="text-sm text-red-500">
                          Force Logged Out: {new Date(session.force_logout_at).toLocaleDateString()} at {new Date(session.force_logout_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleForceLogout(session.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                        disabled={session.force_logout_at}
                      >
                        {session.force_logout_at ? 'Logged Out' : 'Force Logout'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {activeSessions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No active user sessions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'all-users' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">All Users</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balances</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allUsers.filter(user => user.role !== 'admin').map((user, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Checking: ${user.checking_balance.toFixed(2)}</div>
                        <div>Savings: ${user.savings_balance.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_approved 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AuthContext.Consumer>
          {({ user, loading }) => {
            if (loading) {
              return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-navy-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                  </div>
                </div>
              );
            }

            return user ? <Dashboard /> : <HomePage />;
          }}
        </AuthContext.Consumer>
      </div>
    </AuthProvider>
  );
}

export default App;