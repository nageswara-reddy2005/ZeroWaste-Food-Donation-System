import React, { useState, useEffect } from 'react';
import './FindFood.css';
import EmbeddedMap from './EmbeddedMap';
import ChatWindow from './ChatWindow';

const FindFood = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    foodType: '',
    foodCategory: '',
    status: '',
    location: '',
    radius: '10'
  });
  const [showMap, setShowMap] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatDonation, setChatDonation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailDonation, setDetailDonation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchDonations();
    getCurrentUser();
  }, [filters]);

  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  };

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please log in to view donations');
        setLoading(false);
        return;
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters.foodType) queryParams.append('foodType', filters.foodType);
      if (filters.foodCategory) queryParams.append('foodCategory', filters.foodCategory);
      if (filters.status) queryParams.append('status', filters.status);

      const response = await fetch(`http://localhost:5000/api/donations?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDonations(data.donations || []);
        setError('');
      } else {
        throw new Error('Failed to fetch donations');
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      setError('Failed to load donations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#22c55e';
      case 'reserved': return '#f59e0b';
      case 'picked_up': return '#6b7280';
      case 'delivered': return '#22c55e';
      case 'expired': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return '✅';
      case 'reserved': return '⏳';
      case 'picked_up': return '📦';
      case 'delivered': return '✅';
      case 'expired': return '❌';
      default: return '❓';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isExpiringSoon = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  };

  const handleReserveDonation = async (donationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/donations/${donationId}/reserve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh donations list
        fetchDonations();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reserve donation');
      }
    } catch (error) {
      console.error('Error reserving donation:', error);
      alert('Failed to reserve donation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="find-food-loading">
        <div className="loading-spinner"></div>
        <p>Loading available food donations...</p>
      </div>
    );
  }

  return (
    <div className="find-food">
      <div className="find-food-header">
        <h2>🔍 Find Food Donations</h2>
        <p>Discover fresh food donations available near you</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Food Type:</label>
          <select 
            value={filters.foodType} 
            onChange={(e) => handleFilterChange('foodType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="veg">🥬 Vegetarian</option>
            <option value="non-veg">🍖 Non-Vegetarian</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select 
            value={filters.foodCategory} 
            onChange={(e) => handleFilterChange('foodCategory', e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="perishable">⏰ Perishable</option>
            <option value="non-perishable">📦 Non-Perishable</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="available">✅ Available</option>
            <option value="reserved">⏳ Reserved</option>
            <option value="picked_up">📦 Picked Up</option>
            <option value="delivered">✅ Delivered</option>
          </select>
        </div>

        <div className="filter-group">
          <label>📍 Location:</label>
          <input
            type="text"
            placeholder="Enter location or address"
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>📏 Radius:</label>
          <select 
            value={filters.radius} 
            onChange={(e) => handleFilterChange('radius', e.target.value)}
          >
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
        </div>

        <button className="refresh-btn" onClick={fetchDonations}>
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
        </div>
      )}

      {/* Donations Grid - Compact Cards */}
      <div className="donations-grid compact">
        {donations.length === 0 ? (
          <div className="no-donations">
            <div className="no-donations-icon">🍽️</div>
            <h3>No donations found</h3>
            <p>Try adjusting your filters or check back later for new donations.</p>
          </div>
        ) : (
          donations.map((donation) => (
            <div 
              key={donation.id} 
              className={`donation-card compact ${donation.status}`}
              onClick={() => {
                setDetailDonation(donation);
                setShowDetailModal(true);
              }}
            >
              {/* Status Badge */}
              <div className="status-badge" style={{ backgroundColor: getStatusColor(donation.status) }}>
                {getStatusIcon(donation.status)} {donation.status.replace('_', ' ').toUpperCase()}
              </div>

              {/* Expiry Warning */}
              {isExpiringSoon(donation.expiryDate) && donation.status === 'available' && (
                <div className="expiry-warning">
                  ⚠️ Expires Soon!
                </div>
              )}

              {/* Compact Image */}
              <div className="donation-image compact">
                {donation.imagePath ? (
                  <img 
                    src={`http://localhost:5000${donation.imagePath}`} 
                    alt="Food donation"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="image-placeholder" style={{ display: donation.imagePath ? 'none' : 'flex' }}>
                  <span className="placeholder-icon">🍽️</span>
                </div>
              </div>

              {/* Compact Content */}
              <div className="donation-content compact">
                <h3 className="donation-title compact">
                  {donation.foodType === 'veg' ? '🥬' : '🍖'} 
                  {donation.foodType === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                </h3>
                <div className="compact-info">
                  <span className="quantity">Qty: {donation.quantity}</span>
                  <span className="category">{donation.foodCategory === 'perishable' ? '⏰' : '📦'}</span>
                </div>
                <div className="compact-location">📍 {donation.location}</div>
                <div className="click-hint">Click for details</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && detailDonation && (
        <div className="detail-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Food Donation Details</h2>
              <button 
                className="close-modal"
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              {/* Status Badge */}
              <div className="status-badge large" style={{ backgroundColor: getStatusColor(detailDonation.status) }}>
                {getStatusIcon(detailDonation.status)} {detailDonation.status.replace('_', ' ').toUpperCase()}
              </div>

              {/* Image */}
              {detailDonation.imagePath && (
                <div className="modal-image">
                  <img 
                    src={`http://localhost:5000${detailDonation.imagePath}`} 
                    alt="Food donation"
                  />
                </div>
              )}

              {/* Detailed Info */}
              <div className="modal-details">
                <div className="detail-section">
                  <h3>Food Information</h3>
                  <div className="detail-grid">
                    <div className="detail-row">
                      <span className="detail-label">Quantity:</span>
                      <span className="detail-value">{detailDonation.quantity}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">
                        {detailDonation.foodType === 'veg' ? '🥬 Vegetarian' : '🍖 Non-Vegetarian'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Category:</span>
                      <span className="detail-value">
                        {detailDonation.foodCategory === 'perishable' ? '⏰ Perishable' : '📦 Non-Perishable'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Expires:</span>
                      <span className="detail-value">{formatDate(detailDonation.expiryDate)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">📍 {detailDonation.location}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Donor:</span>
                      <span className="detail-value">👤 {detailDonation.donor.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Posted:</span>
                      <span className="detail-value">📅 {formatDate(detailDonation.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {detailDonation.description && (
                  <div className="detail-section">
                    <h3>Description</h3>
                    <p className="description-text">{detailDonation.description}</p>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="modal-actions">
                {detailDonation.status === 'available' && (
                  <button 
                    className="reserve-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReserveDonation(detailDonation.id);
                      setShowDetailModal(false);
                    }}
                  >
                    🎯 Reserve This Food
                  </button>
                )}
                
                {detailDonation.status === 'reserved' && detailDonation.reservedBy && (
                  <div className="reserved-info">
                    <span className="reserved-icon">⏳</span>
                    Reserved by {detailDonation.reservedBy.name}
                  </div>
                )}

                {detailDonation.status === 'delivered' && (
                  <div className="delivered-info">
                    <span className="delivered-icon">✅</span>
                    Successfully Delivered
                  </div>
                )}

                {detailDonation.status === 'picked_up' && (
                  <div className="picked-up-info">
                    <span className="picked-up-icon">📦</span>
                    Picked Up - Awaiting Delivery Confirmation
                  </div>
                )}
                
                <button 
                  className="location-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDonation(detailDonation);
                    setShowMap(true);
                    setShowDetailModal(false);
                  }}
                >
                  📍 Find Location
                </button>
                
                <button 
                  className="chat-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatDonation(detailDonation);
                    setShowChat(true);
                    setShowDetailModal(false);
                  }}
                >
                  💬 Chat with Donor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {donations.length > 0 && (
        <div className="donations-stats">
          <div className="stat-item">
            <span className="stat-number">{donations.length}</span>
            <span className="stat-label">Total Donations</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{donations.filter(d => d.status === 'available').length}</span>
            <span className="stat-label">Available Now</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{donations.filter(d => isExpiringSoon(d.expiryDate)).length}</span>
            <span className="stat-label">Expiring Soon</span>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {showChat && chatDonation && (
        <ChatWindow
          donation={chatDonation}
          onClose={() => setShowChat(false)}
          currentUser={currentUser}
        />
      )}

      {/* Embedded Map */}
      {showMap && selectedDonation && (
        <EmbeddedMap
          donation={selectedDonation}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
};

export default FindFood;
