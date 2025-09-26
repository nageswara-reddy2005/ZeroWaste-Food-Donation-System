import React, { useState, useEffect } from 'react';
import './UserProfile.css';

const UserProfile = ({ user, onClose }) => {
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: '',
    avatar: null
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(prev => ({ ...prev, ...data }));
        if (data.avatar) {
          setAvatarPreview(`http://localhost:5000${data.avatar}`);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileData(prev => ({ ...prev, avatar: file }));
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      Object.keys(profileData).forEach(key => {
        if (profileData[key] && key !== 'avatar') {
          formData.append(key, profileData[key]);
        }
      });

      if (profileData.avatar instanceof File) {
        formData.append('avatar', profileData.avatar);
      }

      const response = await fetch('http://localhost:5000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      setMessage('Error updating profile. Please try again.');
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-header">
          <h2>👤 User Profile</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="avatar-section">
            <div className="avatar-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="avatar-image" />
              ) : (
                <div className="avatar-placeholder">
                  {user?.name?.charAt(0)?.toUpperCase() || '👤'}
                </div>
              )}
            </div>
            <label className="avatar-upload-btn">
              📷 Change Avatar
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>👤 Full Name</label>
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>📧 Email</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleInputChange}
                required
                disabled
              />
            </div>

            <div className="form-group">
              <label>📱 Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="form-group">
              <label>📍 Location</label>
              <input
                type="text"
                name="location"
                value={profileData.location}
                onChange={handleInputChange}
                placeholder="Enter your location"
              />
            </div>

            <div className="form-group full-width">
              <label>📝 Bio</label>
              <textarea
                name="bio"
                value={profileData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself and your food donation goals..."
                rows="3"
              />
            </div>
          </div>

          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? 'Saving...' : '💾 Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;
