import React, { useState, useRef } from 'react';
import './PostFoodDonation.css';
import AIFoodAnalysis from './AIFoodAnalysis';

const PostFoodDonation = () => {
  const [formData, setFormData] = useState({
    quantity: '',
    foodType: '',
    foodCategory: '',
    expiryDate: '',
    image: null,
    location: '',
    description: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' or 'error'
  const [dragActive, setDragActive] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysisComplete, setAiAnalysisComplete] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState(null);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      // Show AI analysis component when image is uploaded
      setShowAIAnalysis(true);
      setAiAnalysisComplete(false);
    } else {
      setStatusMessage('Please select a valid image file');
      setStatusType('error');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  // Handle AI analysis completion
  const handleAIAnalysisComplete = (aiResults) => {
    console.log('🤖 AI Analysis completed:', aiResults);
    
    // Update form data with AI results
    setFormData(prev => ({
      ...prev,
      quantity: aiResults.quantityEstimate || prev.quantity,
      foodType: aiResults.foodType || prev.foodType,
      foodCategory: aiResults.category || prev.foodCategory,
      image: aiResults.image || prev.image
    }));
    
    // Store complete AI analysis data for backend submission
    setAiAnalysisData(aiResults.aiAnalysis || null);
    
    // Mark AI analysis as complete
    setAiAnalysisComplete(true);
    setShowAIAnalysis(false);
    
    // Show success message
    setStatusMessage('✅ AI analysis completed! Form fields have been updated.');
    setStatusType('success');
    setTimeout(() => setStatusMessage(''), 5000);
  };

  // Handle manual image upload (without AI)
  const handleManualImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      // Don't show AI analysis for manual upload
      setShowAIAnalysis(false);
      setAiAnalysisComplete(false);
    } else {
      setStatusMessage('Please select a valid image file');
      setStatusType('error');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // In a real app, you'd reverse geocode these coordinates
          setFormData(prev => ({
            ...prev,
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }));
          setStatusMessage('Location updated successfully!');
          setStatusType('success');
          setTimeout(() => setStatusMessage(''), 3000);
        },
        (error) => {
          setStatusMessage('Unable to get location. Please enter manually.');
          setStatusType('error');
          setTimeout(() => setStatusMessage(''), 3000);
        }
      );
    } else {
      setStatusMessage('Geolocation is not supported by this browser.');
      setStatusType('error');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.quantity || !formData.foodType || !formData.foodCategory || !formData.expiryDate) {
      setStatusMessage('Please fill in all required fields');
      setStatusType('error');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add all form fields except image
      submitData.append('quantity', formData.quantity);
      submitData.append('foodType', formData.foodType);
      submitData.append('foodCategory', formData.foodCategory);
      submitData.append('expiryDate', formData.expiryDate);
      if (formData.location) submitData.append('location', formData.location);
      if (formData.description) submitData.append('description', formData.description);
      
      // Add image file if present
      if (formData.image) {
        submitData.append('image', formData.image);
      }
      
      // Add AI analysis data if available
      if (aiAnalysisData) {
        submitData.append('aiAnalysis', JSON.stringify(aiAnalysisData));
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setStatusMessage('Please log in to post a donation.');
        setStatusType('error');
        setTimeout(() => setStatusMessage(''), 3000);
        return;
      }

      const response = await fetch('http://localhost:5000/api/donations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      const responseData = await response.json();
      
      if (response.ok) {
        setStatusMessage('Food donation posted successfully! 🎉');
        setStatusType('success');
        // Reset form
        setFormData({
          quantity: '',
          foodType: '',
          foodCategory: '',
          expiryDate: '',
          image: null,
          location: '',
          description: ''
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Show specific error message from backend
        setStatusMessage(responseData.error || 'Failed to post donation. Please try again.');
        setStatusType('error');
      }
    } catch (error) {
      console.error('Donation submission error:', error);
      setStatusMessage('Network error. Please check your connection and try again.');
      setStatusType('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  return (
    <div className="post-food-donation">
      <div className="form-header">
        <h2>🍽️ Post Food Donation</h2>
        <p>Share your surplus food and help reduce waste</p>
      </div>

      <form onSubmit={handleSubmit} className="donation-form">
        <div className="form-grid">
          {/* Quantity Input */}
          <div className="form-group">
            <label htmlFor="quantity">Quantity (approx) *</label>
            <div className="input-wrapper">
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="Enter quantity"
                min="1"
                required
              />
              <span className="input-hint">You can estimate or use AI</span>
            </div>
          </div>

          {/* Food Type Dropdown */}
          <div className="form-group">
            <label htmlFor="foodType">Food Type *</label>
            <div className="select-wrapper">
              <select
                id="foodType"
                name="foodType"
                value={formData.foodType}
                onChange={handleInputChange}
                required
              >
                <option value="">Select food type</option>
                <option value="veg">🥬 Veg</option>
                <option value="non-veg">🍖 Non-Veg</option>
              </select>
            </div>
          </div>

          {/* Food Category Dropdown */}
          <div className="form-group">
            <label htmlFor="foodCategory">Food Category *</label>
            <div className="select-wrapper">
              <select
                id="foodCategory"
                name="foodCategory"
                value={formData.foodCategory}
                onChange={handleInputChange}
                required
              >
                <option value="">Select category</option>
                <option value="perishable">⏰ Perishable</option>
                <option value="non-perishable">📦 Non-Perishable</option>
              </select>
            </div>
          </div>

          {/* DateTime Picker */}
          <div className="form-group">
            <label htmlFor="expiryDate">Expiry Window or Pickup Deadline *</label>
            <div className="input-wrapper datetime-wrapper">
              <input
                type="datetime-local"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                required
              />
              <span className="input-icon">📅</span>
            </div>
          </div>

          {/* AI-Powered Image Upload */}
          <div className="form-group full-width">
            <label>Upload Image for AI Analysis</label>
            <div className="upload-options">
              <button
                type="button"
                className="ai-upload-btn"
                onClick={() => setShowAIAnalysis(true)}
              >
                🤖 Smart Upload with AI Analysis
              </button>
              <span className="upload-separator">or</span>
              <div 
                className={`image-upload-area manual-upload ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  const files = e.dataTransfer.files;
                  if (files && files[0]) {
                    handleManualImageUpload(files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleManualImageUpload(file);
                    }
                  }}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <div className="upload-content">
                  <span className="upload-icon">📷</span>
                  {formData.image ? (
                    <div className="image-preview">
                      <p>✅ {formData.image.name}</p>
                      <span>Click to change image</span>
                      {aiAnalysisComplete && (
                        <div className="ai-badge">🤖 AI Analyzed</div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p>Manual Upload (without AI)</p>
                      <span>PNG, JPG, GIF up to 10MB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Food Analysis Component */}
          {showAIAnalysis && (
            <div className="form-group full-width">
              <AIFoodAnalysis 
                onAnalysisComplete={handleAIAnalysisComplete}
                initialImage={formData.image}
              />
            </div>
          )}

          {/* Location */}
          <div className="form-group full-width">
            <label htmlFor="location">Location</label>
            <div className="location-wrapper">
              <div className="input-wrapper">
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Location will be filled automatically"
                  readOnly
                />
                <span className="input-icon">📍</span>
              </div>
              <button
                type="button"
                className="location-btn"
                onClick={getCurrentLocation}
              >
                📍 Use My Location
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="form-group full-width">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Any additional details about the food..."
              rows="4"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`submit-btn ${isSubmitting ? 'submitting' : ''}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner"></span>
              Posting...
            </>
          ) : (
            <>
              <span className="submit-icon">🎯</span>
              Post Donation
            </>
          )}
        </button>

        {/* Status Message */}
        {statusMessage && (
          <div className={`status-message ${statusType}`}>
            <span className="status-icon">
              {statusType === 'success' ? '✅' : '❌'}
            </span>
            {statusMessage}
          </div>
        )}
      </form>
    </div>
  );
};

export default PostFoodDonation;
