import React, { useState } from 'react';
import './FoodPostStatusStepper.css';

const FoodPostStatusStepper = ({ 
  currentStatus, 
  statusHistory, 
  canUpdateStatus, 
  onStatusUpdate,
  foodPost 
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');

  const statusSteps = [
    { 
      key: 'Pending', 
      label: 'Pending', 
      icon: '⏳', 
      color: '#f59e0b',
      description: 'Waiting for someone to accept'
    },
    { 
      key: 'Accepted', 
      label: 'Accepted', 
      icon: '✅', 
      color: '#10b981',
      description: 'Someone accepted the donation'
    },
    { 
      key: 'Picked', 
      label: 'Picked Up', 
      icon: '📦', 
      color: '#3b82f6',
      description: 'Food has been picked up'
    },
    { 
      key: 'Verified', 
      label: 'Verified', 
      icon: '🎉', 
      color: '#8b5cf6',
      description: 'Donation completed successfully'
    }
  ];

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(step => step.key === currentStatus);
  };

  const getNextValidStatus = () => {
    const statusFlow = {
      'Pending': 'Accepted',
      'Accepted': 'Picked',
      'Picked': 'Verified',
      'Verified': null
    };
    return statusFlow[currentStatus];
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus) return;
    
    setIsUpdating(true);
    try {
      await onStatusUpdate(selectedStatus, notes);
      setSelectedStatus('');
      setNotes('');
    } catch (error) {
      console.error('Status update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const openGoogleMaps = () => {
    const { address, coordinates } = foodPost.location;
    let mapsUrl;
    
    if (coordinates?.latitude && coordinates?.longitude) {
      // Use coordinates if available (more accurate)
      mapsUrl = `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
    } else {
      // Use address as fallback
      const encodedAddress = encodeURIComponent(address);
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }
    
    window.open(mapsUrl, '_blank');
  };

  const currentStepIndex = getCurrentStepIndex();
  const nextStatus = getNextValidStatus();

  return (
    <div className="food-post-status-stepper">
      {/* Status Timeline */}
      <div className="status-timeline">
        <h3 className="timeline-title">
          <span className="timeline-icon">📋</span>
          Donation Status
        </h3>
        
        <div className="timeline-container">
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            
            return (
              <div key={step.key} className={`timeline-step ${
                isCompleted ? 'completed' : 
                isCurrent ? 'current' : 
                'upcoming'
              }`}>
                <div className="step-connector" />
                <div 
                  className="step-circle"
                  style={{ 
                    backgroundColor: isCompleted ? step.color : '#e5e7eb',
                    borderColor: isCurrent ? step.color : '#e5e7eb'
                  }}
                >
                  <span className="step-icon">
                    {isCompleted ? step.icon : index + 1}
                  </span>
                </div>
                <div className="step-content">
                  <div className="step-label" style={{ 
                    color: isCompleted ? step.color : '#6b7280' 
                  }}>
                    {step.label}
                  </div>
                  <div className="step-description">
                    {step.description}
                  </div>
                  {statusHistory && statusHistory
                    .filter(h => h.status === step.key)
                    .map((history, idx) => (
                      <div key={idx} className="step-history">
                        <div className="history-time">
                          {new Date(history.updatedAt).toLocaleDateString()} at{' '}
                          {new Date(history.updatedAt).toLocaleTimeString()}
                        </div>
                        {history.notes && (
                          <div className="history-notes">"{history.notes}"</div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="status-actions">
        {/* Find Location Button */}
        <button 
          className="action-btn location-btn"
          onClick={openGoogleMaps}
          title="Open location in Google Maps"
        >
          <span className="btn-icon">📍</span>
          Find Location
        </button>

        {/* Status Update Button */}
        {canUpdateStatus && nextStatus && (
          <div className="status-update-section">
            <button 
              className="action-btn update-btn"
              onClick={() => setSelectedStatus(nextStatus)}
              disabled={isUpdating}
            >
              <span className="btn-icon">⬆️</span>
              {isUpdating ? 'Updating...' : `Mark as ${nextStatus}`}
            </button>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {selectedStatus && (
        <div className="status-modal-overlay">
          <div className="status-modal">
            <div className="modal-header">
              <h3>Update Status to {selectedStatus}</h3>
              <button 
                className="modal-close"
                onClick={() => setSelectedStatus('')}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <p>Are you sure you want to update the status to <strong>{selectedStatus}</strong>?</p>
              
              <div className="notes-section">
                <label htmlFor="status-notes">Add notes (optional):</label>
                <textarea
                  id="status-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional information..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setSelectedStatus('')}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleStatusUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Food Post Details Card */}
      <div className="food-details-card">
        <div className="card-header">
          <h4>📦 {foodPost.title}</h4>
          <span className={`status-badge ${currentStatus.toLowerCase()}`}>
            {currentStatus}
          </span>
        </div>
        
        <div className="card-content">
          <div className="detail-row">
            <span className="detail-label">📍 Location:</span>
            <span className="detail-value">{foodPost.location.address}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">🍽️ Food Type:</span>
            <span className="detail-value">{foodPost.foodType}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">📊 Quantity:</span>
            <span className="detail-value">{foodPost.quantity}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">⏰ Expires:</span>
            <span className="detail-value">
              {new Date(foodPost.expiryDate).toLocaleDateString()}
            </span>
          </div>
          
          {foodPost.contactInfo?.phone && (
            <div className="detail-row">
              <span className="detail-label">📞 Contact:</span>
              <span className="detail-value">
                <a href={`tel:${foodPost.contactInfo.phone}`}>
                  {foodPost.contactInfo.phone}
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodPostStatusStepper;
