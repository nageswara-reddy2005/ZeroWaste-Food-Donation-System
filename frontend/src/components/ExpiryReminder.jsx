import React, { useState, useEffect } from 'react';
import './ExpiryReminder.css';

const ExpiryReminder = ({ user }) => {
  const [expiringDonations, setExpiringDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiringDonations();
    // Check every hour for expiring donations
    const interval = setInterval(fetchExpiringDonations, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchExpiringDonations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/donations/expiring', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExpiringDonations(data);
      }
    } catch (error) {
      console.error('Error fetching expiring donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const hoursLeft = Math.ceil((expiry - now) / (1000 * 60 * 60));
    
    if (hoursLeft <= 0) return 'Expired';
    if (hoursLeft < 24) return `${hoursLeft}h left`;
    const daysLeft = Math.ceil(hoursLeft / 24);
    return `${daysLeft}d left`;
  };

  const getUrgencyLevel = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const hoursLeft = (expiry - now) / (1000 * 60 * 60);
    
    if (hoursLeft <= 0) return 'expired';
    if (hoursLeft <= 6) return 'critical';
    if (hoursLeft <= 24) return 'urgent';
    if (hoursLeft <= 48) return 'warning';
    return 'normal';
  };

  if (loading) {
    return (
      <div className="expiry-reminder-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (expiringDonations.length === 0) {
    return null; // Don't show anything if no expiring donations
  }

  return (
    <div className="expiry-reminder-container">
      <div className="expiry-header">
        <h3>⏰ Expiry Reminders</h3>
        <span className="expiry-count">{expiringDonations.length}</span>
      </div>
      
      <div className="expiring-list">
        {expiringDonations.map((donation) => (
          <div 
            key={donation._id} 
            className={`expiring-item ${getUrgencyLevel(donation.expiryDate)}`}
          >
            <div className="expiring-icon">
              {getUrgencyLevel(donation.expiryDate) === 'critical' ? '🚨' : 
               getUrgencyLevel(donation.expiryDate) === 'urgent' ? '⚠️' : '⏰'}
            </div>
            <div className="expiring-content">
              <p className="expiring-food">{donation.foodType}</p>
              <p className="expiring-time">{getTimeUntilExpiry(donation.expiryDate)}</p>
            </div>
            <div className="expiring-actions">
              <button className="remind-btn" title="Set reminder">
                🔔
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpiryReminder;
