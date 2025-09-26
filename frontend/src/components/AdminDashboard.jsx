import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // API call helper
  const apiCall = async (endpoint, options = {}) => {
    const token = getAuthToken();
    const response = await fetch(`http://localhost:5000${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'API request failed');
    }

    return response.json();
  };

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      const data = await apiCall('/api/admin/stats');
      setStats(data.stats);
    } catch (error) {
      setError('Failed to fetch statistics');
      console.error('Stats error:', error);
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const data = await apiCall('/api/admin/users');
      setUsers(data.users);
    } catch (error) {
      setError('Failed to fetch users');
      console.error('Users error:', error);
    }
  };

  // Fetch all donations
  const fetchDonations = async () => {
    try {
      const data = await apiCall('/api/admin/donations');
      setDonations(data.donations);
    } catch (error) {
      setError('Failed to fetch donations');
      console.error('Donations error:', error);
    }
  };

  // Fetch all chats
  const fetchChats = async () => {
    try {
      const data = await apiCall('/api/admin/chats');
      setChats(data.chats);
    } catch (error) {
      setError('Failed to fetch chats');
      console.error('Chats error:', error);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also delete all their donations and chats.')) {
      return;
    }

    try {
      await apiCall(`/api/admin/users/${userId}`, { method: 'DELETE' });
      setUsers(users.filter(user => user._id !== userId));
      await fetchStats(); // Refresh stats
    } catch (error) {
      setError('Failed to delete user');
      console.error('Delete user error:', error);
    }
  };

  // Update donation status (admin)
  const updateDonationStatus = async (donationId, newStatus) => {
    try {
      await apiCall(`/api/donations/${donationId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      
      // Update local state
      setDonations(donations.map(donation => 
        donation._id === donationId 
          ? { ...donation, status: newStatus }
          : donation
      ));
      
      await fetchStats(); // Refresh stats
    } catch (error) {
      setError('Failed to update donation status');
      console.error('Update donation status error:', error);
    }
  };

  // Delete donation
  const deleteDonation = async (donationId) => {
    if (!window.confirm('Are you sure you want to delete this donation?')) {
      return;
    }

    try {
      await apiCall(`/api/admin/donations/${donationId}`, { method: 'DELETE' });
      setDonations(donations.filter(donation => donation._id !== donationId));
      await fetchStats(); // Refresh stats
    } catch (error) {
      setError('Failed to delete donation');
      console.error('Delete donation error:', error);
    }
  };

  // Update user role
  const updateUserRole = async (userId, newRole) => {
    try {
      await apiCall(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      setUsers(users.map(user => 
        user._id === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      setError('Failed to update user role');
      console.error('Update role error:', error);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      
      try {
        await fetchStats(); // Always fetch stats
        
        switch (activeTab) {
          case 'users':
            await fetchUsers();
            break;
          case 'donations':
            await fetchDonations();
            break;
          case 'chats':
            await fetchChats();
            break;
          default:
            break;
        }
      } catch (error) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab]);

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🛡️ Admin Dashboard</h1>
        <p>Manage users, donations, and monitor platform activity</p>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="admin-navigation">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          className={activeTab === 'donations' ? 'active' : ''}
          onClick={() => setActiveTab('donations')}
        >
          🍽️ Donations
        </button>
        <button 
          className={activeTab === 'chats' ? 'active' : ''}
          onClick={() => setActiveTab('chats')}
        >
          💬 Chats
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="overview-tab">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                      <h3>{stats.totalUsers}</h3>
                      <p>Total Users</p>
                      <small>+{stats.newUsersThisWeek} this week</small>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">🍽️</div>
                    <div className="stat-content">
                      <h3>{stats.totalDonations}</h3>
                      <p>Total Donations</p>
                      <small>+{stats.newDonationsThisWeek} this week</small>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                      <h3>{stats.activeDonations}</h3>
                      <p>Active Donations</p>
                      <small>{stats.completedDonations} completed</small>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">💬</div>
                    <div className="stat-content">
                      <h3>{stats.totalChats}</h3>
                      <p>Total Chats</p>
                      <small>Communication active</small>
                    </div>
                  </div>
                </div>

                <div className="charts-section">
                  <div className="chart-card">
                    <h4>Food Type Distribution</h4>
                    <div className="food-type-chart">
                      <div className="chart-bar">
                        <div className="bar veg" style={{width: `${(stats.vegDonations / stats.totalDonations) * 100}%`}}>
                          <span>🥬 Vegetarian: {stats.vegDonations}</span>
                        </div>
                      </div>
                      <div className="chart-bar">
                        <div className="bar non-veg" style={{width: `${(stats.nonVegDonations / stats.totalDonations) * 100}%`}}>
                          <span>🍖 Non-Vegetarian: {stats.nonVegDonations}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="users-tab">
                <div className="tab-header">
                  <h2>👥 User Management</h2>
                  <p>Manage platform users and their roles</p>
                </div>
                
                <div className="users-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user._id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            <select 
                              value={user.role} 
                              onChange={(e) => updateUserRole(user._id, e.target.value)}
                              className={`role-select ${user.role}`}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>{formatDate(user.createdAt)}</td>
                          <td>
                            <button 
                              className="delete-btn"
                              onClick={() => deleteUser(user._id)}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Donations Tab */}
            {activeTab === 'donations' && (
              <div className="donations-tab">
                <div className="tab-header">
                  <h2>🍽️ Donation Management</h2>
                  <p>Monitor and manage food donations</p>
                </div>
                
                <div className="donations-grid">
                  {donations.map(donation => (
                    <div key={donation._id} className="donation-card">
                      <div className="donation-header">
                        <h4>{donation.title}</h4>
                        <span className={`status ${donation.status}`}>
                          {donation.status}
                        </span>
                      </div>
                      
                      <div className="donation-details">
                        <p><strong>Donor:</strong> {donation.donor?.name} ({donation.donor?.email})</p>
                        <p><strong>Quantity:</strong> {donation.quantity}</p>
                        <p><strong>Location:</strong> {donation.location}</p>
                        <p><strong>Expiry:</strong> {formatDate(donation.expiryDate)}</p>
                        <p><strong>Posted:</strong> {formatDate(donation.createdAt)}</p>
                      </div>
                      
                      <div className="donation-actions">
                        <select 
                          value={donation.status}
                          onChange={(e) => updateDonationStatus(donation._id, e.target.value)}
                          className={`status-select ${donation.status}`}
                        >
                          <option value="available">Available</option>
                          <option value="reserved">Reserved</option>
                          <option value="picked_up">Picked Up</option>
                          <option value="delivered">Delivered</option>
                          <option value="expired">Expired</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button 
                          className="delete-btn"
                          onClick={() => deleteDonation(donation._id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chats Tab */}
            {activeTab === 'chats' && (
              <div className="chats-tab">
                <div className="tab-header">
                  <h2>💬 Chat Monitoring</h2>
                  <p>Monitor platform communications</p>
                </div>
                
                <div className="chats-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Participants</th>
                        <th>Donation</th>
                        <th>Messages</th>
                        <th>Last Activity</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chats.map(chat => (
                        <tr key={chat._id}>
                          <td>
                            {chat.participants.map(p => p.name).join(', ')}
                          </td>
                          <td>{chat.donationId?.title || 'N/A'}</td>
                          <td>{chat.messageCount}</td>
                          <td>{formatDate(chat.updatedAt)}</td>
                          <td>{formatDate(chat.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
