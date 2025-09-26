import React, { useState } from 'react';
import LoginPage from './LoginPage';
import RegistrationPage from './RegistrationPage';

const Router = () => {
  const [currentPage, setCurrentPage] = useState('login');

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onNavigate={setCurrentPage} />;
      case 'register':
        return <RegistrationPage onNavigate={setCurrentPage} />;
      default:
        return <LoginPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="router">
      {renderPage()}
    </div>
  );
};

export default Router;
