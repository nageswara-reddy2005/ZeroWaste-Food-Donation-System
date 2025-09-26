import React, { useState, useRef } from 'react';
import './AIFoodAnalysis.css';

const AIFoodAnalysis = ({ onAnalysisComplete, initialImage = null }) => {
  const [image, setImage] = useState(initialImage);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [editableResults, setEditableResults] = useState(null);
  const fileInputRef = useRef(null);

  // AI API call function
  const analyzeFood = async (imageFile) => {
    try {
      setIsAnalyzing(true);
      setError(null);

      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('http://localhost:5000/api/ai/analyze-food', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const results = await response.json();
      
      // Validate response structure
      if (!results.quantityEstimate || !results.foodType || !results.category) {
        throw new Error('Invalid response from AI service');
      }

      setAnalysisResults(results);
      setEditableResults({
        quantityEstimate: results.quantityEstimate,
        foodType: results.foodType,
        category: results.category
      });

    } catch (err) {
      console.error('AI Analysis Error:', err);
      setError(err.message || 'Failed to analyze food image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle file upload
  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }

      setImage(file);
      setAnalysisResults(null);
      setEditableResults(null);
      setError(null);
      
      // Automatically start analysis
      analyzeFood(file);
    } else {
      setError('Please select a valid image file (JPG, PNG, etc.)');
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
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

  // Handle manual file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // Handle editable field changes
  const handleResultChange = (field, value) => {
    setEditableResults(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Confirm and pass results to parent
  const handleConfirmResults = () => {
    if (editableResults && onAnalysisComplete) {
      onAnalysisComplete({
        ...editableResults,
        image: image
      });
    }
  };

  // Retry analysis
  const handleRetry = () => {
    if (image) {
      analyzeFood(image);
    }
  };

  // Reset component
  const handleReset = () => {
    setImage(null);
    setAnalysisResults(null);
    setEditableResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="ai-food-analysis">
      <div className="ai-analysis-header">
        <h3>🤖 AI Food Analysis</h3>
        <p>Upload a food image for automatic quantity and type detection</p>
      </div>

      {/* Image Upload Area */}
      {!image && (
        <div 
          className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-content">
            <div className="upload-icon">📸</div>
            <h4>Drop your food image here</h4>
            <p>or click to browse files</p>
            <div className="upload-formats">
              <span>Supports: JPG, PNG, WebP (max 10MB)</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Image Preview */}
      {image && (
        <div className="image-preview-section">
          <div className="image-preview">
            <img 
              src={URL.createObjectURL(image)} 
              alt="Food to analyze" 
              className="preview-image"
            />
            <button 
              className="change-image-btn"
              onClick={handleReset}
              title="Change image"
            >
              🔄
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="analysis-loading">
          <div className="loading-animation">
            <div className="ai-brain">🧠</div>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <h4>AI is analyzing your food...</h4>
          <p>This may take a few seconds</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="analysis-error">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <h4>Analysis Failed</h4>
            <p>{error}</p>
            <div className="error-actions">
              <button 
                className="retry-btn"
                onClick={handleRetry}
                disabled={!image}
              >
                🔄 Retry Analysis
              </button>
              <button 
                className="reset-btn"
                onClick={handleReset}
              >
                📸 Choose Different Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults && editableResults && !isAnalyzing && (
        <div className="analysis-results">
          <div className="results-header">
            <h4>🎯 AI Analysis Results</h4>
            <p>Review and edit the detected information before confirming</p>
          </div>

          <div className="results-grid">
            {/* Quantity Estimate */}
            <div className="result-field">
              <label htmlFor="ai-quantity">
                <span className="field-icon">⚖️</span>
                Quantity Estimate
              </label>
              <input
                id="ai-quantity"
                type="text"
                value={editableResults.quantityEstimate}
                onChange={(e) => handleResultChange('quantityEstimate', e.target.value)}
                className="result-input"
                placeholder="e.g., 5 kg, 20 servings"
              />
              <div className="ai-confidence">
                AI detected: "{analysisResults.quantityEstimate}"
              </div>
            </div>

            {/* Food Type */}
            <div className="result-field">
              <label htmlFor="ai-food-type">
                <span className="field-icon">🥗</span>
                Food Type
              </label>
              <select
                id="ai-food-type"
                value={editableResults.foodType}
                onChange={(e) => handleResultChange('foodType', e.target.value)}
                className="result-select"
              >
                <option value="Veg">🥬 Vegetarian</option>
                <option value="Non-Veg">🍖 Non-Vegetarian</option>
              </select>
              <div className="ai-confidence">
                AI detected: {analysisResults.foodType}
              </div>
            </div>

            {/* Category */}
            <div className="result-field">
              <label htmlFor="ai-category">
                <span className="field-icon">📦</span>
                Category
              </label>
              <select
                id="ai-category"
                value={editableResults.category}
                onChange={(e) => handleResultChange('category', e.target.value)}
                className="result-select"
              >
                <option value="Perishable">❄️ Perishable</option>
                <option value="Non-Perishable">📦 Non-Perishable</option>
              </select>
              <div className="ai-confidence">
                AI detected: {analysisResults.category}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="results-actions">
            <button 
              className="confirm-btn"
              onClick={handleConfirmResults}
            >
              ✅ Confirm & Use Results
            </button>
            <button 
              className="reanalyze-btn"
              onClick={handleRetry}
            >
              🔄 Re-analyze Image
            </button>
          </div>
        </div>
      )}

      {/* Tips Section */}
      {!image && (
        <div className="ai-tips">
          <h5>💡 Tips for better AI analysis:</h5>
          <ul>
            <li>📷 Take clear, well-lit photos</li>
            <li>🎯 Focus on the food items</li>
            <li>📏 Include objects for scale reference</li>
            <li>🔍 Avoid blurry or dark images</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AIFoodAnalysis;
