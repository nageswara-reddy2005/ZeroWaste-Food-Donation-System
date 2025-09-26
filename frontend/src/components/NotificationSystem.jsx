import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './NotificationSystem.css';

const NotificationSystem = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      const newSocket = io('http://localhost:5000', {
        auth: { token }
      });

      setSocket(newSocket);

      // Listen for various notification events
      newSocket.on('donation_status_changed', (data) => {
        addNotification({
          id: Date.now(),
          type: 'status',
          title: 'Donation Status Updated',
          message: `Your donation "${data.foodType}" is now ${data.status}`,
          timestamp: new Date(),
          icon: '📦'
        });
      });

      newSocket.on('new_message', (data) => {
        addNotification({
          id: Date.now(),
          type: 'message',
          title: 'New Message',
          message: `New message from ${data.senderName}`,
          timestamp: new Date(),
          icon: '💬'
        });
      });

      newSocket.on('donation_reserved', (data) => {
        addNotification({
          id: Date.now(),
          type: 'reservation',
          title: 'Donation Reserved',
          message: `Someone reserved your "${data.foodType}" donation`,
          timestamp: new Date(),
          icon: '🎯'
        });
      });

      newSocket.on('expiry_reminder', (data) => {
        addNotification({
          id: Date.now(),
          type: 'expiry',
          title: 'Food Expiring Soon',
          message: `Your "${data.foodType}" expires in ${data.hoursLeft} hours`,
          timestamp: new Date(),
          icon: '⏰'
        });
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep max 5 notifications
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'status': return '#3b82f6';
      case 'message': return '#22c55e';
      case 'reservation': return '#f59e0b';
      case 'expiry': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          style={{ borderLeftColor: getNotificationColor(notification.type) }}
        >
          <div className="notification-content">
            <div className="notification-header">
              <span className="notification-icon">{notification.icon}</span>
              <span className="notification-title">{notification.title}</span>
              <button 
                className="notification-close"
                onClick={() => removeNotification(notification.id)}
              >
                ×
              </button>
            </div>
            <p className="notification-message">{notification.message}</p>
            <span className="notification-time">
              {notification.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
