import React, { useState, useEffect } from 'react';
import FoodPostStatusStepper from './FoodPostStatusStepper';
import FoodPostService from '../services/foodPostService';

const FoodPostDemo = () => {
  const [foodPosts, setFoodPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  // Sample food post data for demonstration
  const sampleFoodPost = {
    _id: 'demo-1',
    title: 'Fresh Vegetable Surplus',
    description: 'We have excess fresh vegetables from our restaurant that need to be donated before they expire.',
    foodType: 'Raw Ingredients',
    quantity: '15 kg mixed vegetables',
    expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    location: {
      address: '123 Green Street, Eco City, EC 12345',
      coordinates: {
        latitude: 40.7128,
        longitude: -74.0060
      }
    },
    contactInfo: {
      phone: '+1-555-0123',
      preferredContactTime: 'Anytime'
    },
    status: 'Pending',
    donorId: {
      _id: 'donor-1',
      name: 'Green Restaurant',
      email: 'contact@greenrestaurant.com'
    },
    statusHistory: [
      {
        status: 'Pending',
        updatedBy: {
          _id: 'donor-1',
          name: 'Green Restaurant',
          email: 'contact@greenrestaurant.com'
        },
        updatedAt: new Date(),
        notes: 'Initial posting'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  useEffect(() => {
    // Simulate loading food posts
    setTimeout(() => {
      setFoodPosts([sampleFoodPost]);
      setSelectedPost(sampleFoodPost);
      setLoading(false);
    }, 1000);
  }, []);

  const handleStatusUpdate = async (newStatus, notes) => {
    try {
      // Simulate API call
      console.log(`Updating status to: ${newStatus}`, { notes });
      
      // Update the selected post
      const updatedPost = {
        ...selectedPost,
        status: newStatus,
        statusHistory: [
          ...selectedPost.statusHistory,
          {
            status: newStatus,
            updatedBy: {
              _id: 'current-user',
              name: 'Current User',
              email: 'user@example.com'
            },
            updatedAt: new Date(),
            notes: notes
          }
        ]
      };
      
      setSelectedPost(updatedPost);
      
      // Show success message
      alert(`Status successfully updated to: ${newStatus}`);
      
    } catch (error) {
      console.error('Status update failed:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const canUpdateStatus = () => {
    // In a real app, this would check user permissions
    return selectedPost && selectedPost.status !== 'Verified';
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '1.2rem',
        color: '#6b7280'
      }}>
        Loading food post demo...
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: 'white',
        padding: '24px',
        borderRadius: '16px',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>
          🌱 ZeroWaste Food Post Demo
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Donation Lifecycle Management with Map Integration
        </p>
      </div>

      {selectedPost && (
        <FoodPostStatusStepper
          currentStatus={selectedPost.status}
          statusHistory={selectedPost.statusHistory}
          canUpdateStatus={canUpdateStatus()}
          onStatusUpdate={handleStatusUpdate}
          foodPost={selectedPost}
        />
      )}

      <div style={{
        background: '#f8fafc',
        padding: '20px',
        borderRadius: '12px',
        marginTop: '24px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ 
          color: '#1f2937', 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ✨ Demo Features
        </h3>
        <ul style={{ 
          color: '#4b5563', 
          lineHeight: '1.6',
          paddingLeft: '20px'
        }}>
          <li><strong>Status Timeline:</strong> Beautiful animated stepper showing donation lifecycle</li>
          <li><strong>Find Location:</strong> Click the "Find Location" button to open Google Maps</li>
          <li><strong>Status Updates:</strong> Try updating the status with the "Mark as Accepted" button</li>
          <li><strong>History Tracking:</strong> View complete status change history with timestamps</li>
          <li><strong>Responsive Design:</strong> Works perfectly on mobile and desktop</li>
        </ul>
      </div>

      <div style={{
        background: '#ecfdf5',
        border: '1px solid #a7f3d0',
        padding: '16px',
        borderRadius: '8px',
        marginTop: '16px'
      }}>
        <p style={{ 
          margin: 0, 
          color: '#065f46',
          fontSize: '0.9rem'
        }}>
          💡 <strong>Tip:</strong> This is a demo component showcasing the food post lifecycle management system. 
          In the full application, this would be integrated into the main dashboard with real data from MongoDB Atlas.
        </p>
      </div>
    </div>
  );
};

export default FoodPostDemo;
