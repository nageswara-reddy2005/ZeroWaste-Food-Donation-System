import React, { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import RegistrationPage from './RegistrationPage';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import LandingPage from './LandingPage';
import { authService } from '../services/authService';

const AppRouter = () => {
  const [currentPage, setCurrentPage] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication status on component mount
    if (authService.isAuthenticated()) {
      setIsAuthenticated(true);
      setUser(authService.getCurrentUser());
    }
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'register') {
        setCurrentPage('register');
      } else if (hash === 'admin') {
        setCurrentPage('admin');
      } else if (hash === 'login') {
        setCurrentPage('login');
      } else {
        setCurrentPage('landing');
      }
    };

    // Set initial page based on hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    window.location.hash = '';
  };

  const renderPage = () => {
    // If authenticated, show appropriate dashboard based on user role
    if (isAuthenticated) {
      // Check if user is admin and current page is admin
      if (currentPage === 'admin' && user?.role === 'admin') {
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      }
      // Default to regular dashboard
      return <Dashboard user={user} onLogout={handleLogout} />;
    }

    // If not authenticated, show appropriate pages
    switch (currentPage) {
      case 'register':
        return <RegistrationPage />;
      case 'admin':
        return <LoginPage isAdminLogin={true} />;
      case 'login':
        return <LoginPage />;
      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="app-router">
      {renderPage()}
    </div>
  );
};

export default AppRouter;
