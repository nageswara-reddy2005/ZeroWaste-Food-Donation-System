import React, { useState, useEffect } from 'react';
import './MyDonations.css';

const MyDonations = ({ user }) => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState({});

  useEffect(() => {
    fetchMyDonations();
  }, []);

  const fetchMyDonations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/my-donations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDonations(data.donations);
      } else {
        setError('Failed to fetch your donations');
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      setError('Error loading donations');
    } finally {
      setLoading(false);
    }
  };

  const updateDonationStatus = async (donationId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [donationId]: true }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/donations/${donationId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the donation in the local state
        setDonations(prev => prev.map(donation => 
          donation._id === donationId 
            ? { ...donation, status: newStatus, updatedAt: new Date() }
            : donation
        ));
        
        // Show success message briefly
        setError(`✅ Donation marked as ${newStatus}`);
        setTimeout(() => setError(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update donation status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Error updating donation status');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [donationId]: false }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#22c55e';
      case 'reserved': return '#f59e0b';
      case 'picked_up': return '#3b82f6';
      case 'delivered': return '#10b981';
      case 'expired': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'available': return '🟢';
      case 'reserved': return '🟡';
      case 'picked_up': return '🔵';
      case 'delivered': return '✅';
      case 'expired': return '🔴';
      case 'cancelled': return '❌';
      default: return '⚪';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="my-donations-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your donations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-donations-container">
      <div className="my-donations-header">
        <h2>🍽️ My Donations</h2>
        <p>Manage and track your food donations</p>
        {error && (
          <div className={`status-message ${error.includes('✅') ? 'success' : 'error'}`}>
            {error}
          </div>
        )}
      </div>

      {donations.length === 0 ? (
        <div className="no-donations">
          <div className="no-donations-icon">📦</div>
          <h3>No donations yet</h3>
          <p>Start sharing food with your community!</p>
        </div>
      ) : (
        <div className="donations-grid">
          {donations.map((donation) => (
            <div key={donation._id} className="donation-card">
              <div className="donation-header">
                <div className="donation-status">
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(donation.status) }}>
                    {getStatusEmoji(donation.status)} {donation.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="donation-date">
                  {formatDate(donation.createdAt)}
                </div>
              </div>

              {donation.imagePath && (
                <div className="donation-image">
                  <img 
                    src={`http://localhost:5000${donation.imagePath}`} 
                    alt="Food donation"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="donation-details">
                <div className="donation-info">
                  <div className="info-item">
                    <div className="info-label">Quantity:</div>
                    <div className="info-value">{donation.quantity}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Type:</div>
                    <div className="info-value">
                      {donation.foodType === 'veg' ? '🥬 Vegetarian' : '🍖 Non-Vegetarian'}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Category:</div>
                    <div className="info-value">
                      {donation.foodCategory === 'perishable' ? '⏰ Perishable' : '📦 Non-Perishable'}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Expires:</div>
                    <div className="info-value">{formatDate(donation.expiryDate)}</div>
                  </div>
                  {donation.location && (
                    <div className="info-item">
                      <div className="info-label">Location:</div>
                      <div className="info-value">📍 {donation.location}</div>
                    </div>
                  )}
                </div>

                {donation.description && (
                  <div className="donation-description">
                    <p>{donation.description}</p>
                  </div>
                )}

                {donation.reservedBy && (
                  <div className="reserved-info">
                    <h4>🤝 Reserved by:</h4>
                    <p>{donation.reservedBy.name} ({donation.reservedBy.email})</p>
                  </div>
                )}
              </div>

              <div className="donation-actions">
                {donation.status === 'reserved' && (
                  <button
                    className="status-btn delivered-btn"
                    onClick={() => updateDonationStatus(donation._id, 'delivered')}
                    disabled={updatingStatus[donation._id]}
                  >
                    {updatingStatus[donation._id] ? '⏳ Updating...' : '✅ Mark as Delivered'}
                  </button>
                )}
                
                {donation.status === 'available' && (
                  <button
                    className="status-btn cancel-btn"
                    onClick={() => updateDonationStatus(donation._id, 'cancelled')}
                    disabled={updatingStatus[donation._id]}
                  >
                    {updatingStatus[donation._id] ? '⏳ Updating...' : '❌ Cancel Donation'}
                  </button>
                )}

                {donation.status === 'picked_up' && (
                  <button
                    className="status-btn delivered-btn"
                    onClick={() => updateDonationStatus(donation._id, 'delivered')}
                    disabled={updatingStatus[donation._id]}
                  >
                    {updatingStatus[donation._id] ? '⏳ Updating...' : '✅ Confirm Delivered'}
                  </button>
                )}

                {donation.status === 'available' && !donation.reservedBy && (
                  <button
                    className="status-btn delivered-btn"
                    onClick={() => updateDonationStatus(donation._id, 'delivered')}
                    disabled={updatingStatus[donation._id]}
                  >
                    {updatingStatus[donation._id] ? '⏳ Updating...' : '✅ Mark as Delivered'}
                  </button>
                )}

                {donation.status === 'delivered' && (
                  <div className="delivered-status">
                    <span className="delivered-icon">✅</span>
                    Successfully Delivered
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyDonations;
