import React, { useState } from 'react';
import { authService } from '../services/authService';
import './LoginPage.css';

const LoginPage = ({ isAdminLogin = false }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await authService.login(formData.email, formData.password);
    
    if (result.success) {
      // Check if this is admin login and user has admin role
      if (isAdminLogin && result.user?.role !== 'admin') {
        setError('Admin access required. Please use an admin account.');
        setLoading(false);
        return;
      }
      
      // Redirect to appropriate dashboard
      if (isAdminLogin && result.user?.role === 'admin') {
        window.location.hash = 'admin';
      }
      
      // Force a page reload to trigger authentication check
      window.location.reload();
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    // Handle forgot password logic here
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">{isAdminLogin ? '🛡️ Admin Access' : 'Welcome Back'}</h2>
        <p className="login-subtitle">{isAdminLogin ? 'Admin login required' : 'Sign in to your account'}</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="forgot-password">
            <button 
              type="button" 
              className="forgot-link"
              onClick={handleForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {!isAdminLogin && (
          <div className="signup-link">
            <p>New user? <button 
              className="nav-link"
              onClick={() => window.location.hash = '#register'}
            >
              Create an account
            </button></p>
          </div>
        )}
        
        <div className="admin-access">
          {isAdminLogin ? (
            <p>
              <button 
                className="nav-link"
                onClick={() => window.location.hash = ''}
              >
                ← Back to User Login
              </button>
            </p>
          ) : (
            <p>
              <button 
                className="nav-link admin-link"
                onClick={() => window.location.hash = '#admin'}
              >
                🛡️ Admin Access
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
