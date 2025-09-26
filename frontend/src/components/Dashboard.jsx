import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import PostFoodDonation from './PostFoodDonation';
import FindFood from './FindFood';
import ChatsList from './ChatsList';
import MyDonations from './MyDonations';
import ThemeToggle from './ThemeToggle';
import NotificationSystem from './NotificationSystem';
import UserProfile from './UserProfile';
import Analytics from './Analytics';
import ExpiryReminder from './ExpiryReminder';

const Dashboard = ({ user, onLogout }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState('overview');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);


  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  const handleAdminAccess = () => {
    if (user?.role === 'admin') {
      window.location.hash = 'admin';
      window.location.reload();
    } else {
      alert('Admin access required. Please contact administrator.');
    }
  };



  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading ZeroWaste Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🌱</span>
            <span className="logo-text">ZeroWaste</span>
          </div>
          <p className="tagline">Food Donation Platform</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3 className="nav-section-title">Main</h3>
            <button 
              className={`nav-item ${activeMode === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveMode('overview')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Overview</span>
            </button>
            <button 
              className={`nav-item ${activeMode === 'donate' ? 'active' : ''}`}
              onClick={() => setActiveMode('donate')}
            >
              <span className="nav-icon">🍽️</span>
              <span className="nav-text">Donate Food</span>
            </button>
            <button 
              className={`nav-item ${activeMode === 'receive' ? 'active' : ''}`}
              onClick={() => setActiveMode('receive')}
            >
              <span className="nav-icon">🔍</span>
              <span className="nav-text">Find Food</span>
            </button>
          </div>

          <div className="nav-section">
            <h3 className="nav-section-title">Activity</h3>
            <button 
              className={`nav-item ${activeMode === 'mydonations' ? 'active' : ''}`}
              onClick={() => setActiveMode('mydonations')}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-text">My Donations</span>
            </button>
            <button 
              className={`nav-item ${activeMode === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveMode('chats')}
            >
              <span className="nav-icon">💬</span>
              <span className="nav-text">Messages</span>
            </button>
            <button 
              className={`nav-item ${activeMode === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveMode('analytics')}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-text">Analytics</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role === 'admin' ? 'Administrator' : 'Member'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">
              {activeMode === 'overview' && '📊 Dashboard Overview'}
              {activeMode === 'donate' && '🍽️ Donate Food'}
              {activeMode === 'receive' && '🔍 Find Food'}
              {activeMode === 'mydonations' && '📋 My Donations'}
              {activeMode === 'chats' && '💬 Messages'}
              {activeMode === 'analytics' && '📈 Analytics'}
            </h1>
          </div>
          <div className="header-right">
            <div className="user-dropdown-container">
              <button 
                className="user-dropdown-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <div className="user-avatar">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <span className="user-name">{user?.name}</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              
              {showUserDropdown && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-header">
                    <div className="user-info-dropdown">
                      <span className="user-name-dropdown">{user?.name}</span>
                      <span className="user-email-dropdown">{user?.email}</span>
                      <span className="user-status-dropdown">Active Member</span>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item profile-item" onClick={() => setShowProfile(true)}>
                    <span className="dropdown-icon">👤</span>
                    Profile Settings
                  </button>
                  <div className="theme-toggle-container">
                    <ThemeToggle />
                  </div>
                  {user?.role === 'admin' && (
                    <button className="dropdown-item admin-item" onClick={handleAdminAccess}>
                      <span className="dropdown-icon">🛡️</span>
                      Admin Panel
                    </button>
                  )}
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-item" onClick={handleLogout}>
                    <span className="dropdown-icon">🚪</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {activeMode === 'overview' && (
            <div className="overview-content">
              {/* Animated Stats Cards */}
              <section className="stats-section">
                <h2 className="section-title">Your Impact</h2>
                <div className="stats-grid">
                  <div className="stat-card donations" style={{animationDelay: '0.1s'}}>
                    <div className="stat-background"></div>
                    <div className="stat-icon">📦</div>
                    <div className="stat-info">
                      <h3 className="counter">{dashboardData?.stats?.totalDonations || 156}</h3>
                      <p>Total Donations</p>
                    </div>
                    <div className="stat-trend">+12% this month</div>
                  </div>
                  <div className="stat-card food-saved" style={{animationDelay: '0.2s'}}>
                    <div className="stat-background"></div>
                    <div className="stat-icon">🥗</div>
                    <div className="stat-info">
                      <h3 className="counter">{dashboardData?.stats?.foodSaved || '2,340 kg'}</h3>
                      <p>Food Saved</p>
                    </div>
                    <div className="stat-trend">+8% this month</div>
                  </div>
                  <div className="stat-card people-served" style={{animationDelay: '0.3s'}}>
                    <div className="stat-background"></div>
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <h3 className="counter">{dashboardData?.stats?.peopleServed || 1250}</h3>
                      <p>People Served</p>
                    </div>
                    <div className="stat-trend">+15% this month</div>
                  </div>
                  <div className="stat-card co2-prevented" style={{animationDelay: '0.4s'}}>
                    <div className="stat-background"></div>
                    <div className="stat-icon">🌍</div>
                    <div className="stat-info">
                      <h3 className="counter">{dashboardData?.stats?.co2Prevented || '890 kg'}</h3>
                      <p>CO₂ Prevented</p>
                    </div>
                    <div className="stat-trend">+20% this month</div>
                  </div>
                </div>
              </section>

              {/* Recent Activity */}
              <section className="activity-section">
                <h2 className="section-title">Recent Activity</h2>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon">🍞</div>
                    <div className="activity-content">
                      <p><strong>Sarah M.</strong> donated 5kg of bread</p>
                      <span className="activity-time">2 hours ago</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">🥕</div>
                    <div className="activity-content">
                      <p><strong>Local Grocery</strong> donated fresh vegetables</p>
                      <span className="activity-time">4 hours ago</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">🍎</div>
                    <div className="activity-content">
                      <p><strong>Mike R.</strong> reserved fruits from downtown</p>
                      <span className="activity-time">6 hours ago</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Interactive Map */}
              <section className="map-section">
                <h2 className="section-title">🗺️ Live Food Map</h2>
                <div className="map-container">
                  <div className="map-placeholder">
                    <div className="map-content">
                      <div className="map-icon">🗺️</div>
                      <p>Interactive map will be displayed here</p>
                      <p className="map-subtitle">Real-time food availability and pickup locations</p>
                      <div className="map-features">
                        <span className="map-feature">📍 Live Locations</span>
                        <span className="map-feature">🚚 Pickup Routes</span>
                        <span className="map-feature">⏰ Real-time Updates</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeMode === 'donate' && (
            <div className="donate-content">
              <PostFoodDonation user={user} />
            </div>
          )}

          {activeMode === 'receive' && (
            <div className="receive-content">
              <FindFood user={user} />
            </div>
          )}

          {activeMode === 'mydonations' && (
            <div className="mydonations-content">
              <MyDonations user={user} />
            </div>
          )}

          {activeMode === 'chats' && (
            <div className="chats-content">
              <ChatsList />
            </div>
          )}

          {activeMode === 'analytics' && (
            <div className="analytics-content">
              <Analytics user={user} />
            </div>
          )}
        </div>
      </main>
      
      <NotificationSystem user={user} />
      <ExpiryReminder user={user} />
      {showProfile && (
        <UserProfile 
          user={user} 
          onClose={() => setShowProfile(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
