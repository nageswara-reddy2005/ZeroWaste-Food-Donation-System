import React, { useState } from 'react';
import { authService } from '../services/authService';
import './RegistrationPage.css';

const RegistrationPage = () => {
  const [formData, setFormData] = useState({
    name: '',
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

    const result = await authService.register(
      formData.name,
      formData.email,
      formData.password,
      'user' // Default role, users can be both donors and receivers
    );
    
    if (result.success) {
      // Redirect to dashboard will be handled by parent component
      window.location.reload();
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        <h2 className="registration-title">Create Account</h2>
        <form onSubmit={handleSubmit} className="registration-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

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
              placeholder="Create a password"
              required
            />
          </div>



          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="login-link">
          <p>Already have an account? <button 
            className="nav-link"
            onClick={() => window.location.hash = '#login'}
          >
            Login
          </button></p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
