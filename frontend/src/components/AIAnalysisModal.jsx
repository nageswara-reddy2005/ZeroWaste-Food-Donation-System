import React, { useState } from 'react';
import './AIAnalysisModal.css';

const AIAnalysisModal = ({ donation, isOpen, onClose }) => {
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const analyzeFood = async () => {
    if (!donation.imagePath) {
      setError('No image available for analysis');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      // Convert image URL to blob for analysis
      const imageResponse = await fetch(`http://localhost:5000${donation.imagePath}`);
      const imageBlob = await imageResponse.blob();
      
      const formData = new FormData();
      formData.append('image', imageBlob, 'food-image.jpg');

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
      setAnalysisResults(results);

    } catch (err) {
      console.error('AI Analysis Error:', err);
      setError(err.message || 'Failed to analyze food image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    setAnalysisResults(null);
    setError(null);
    setIsAnalyzing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay" onClick={handleClose}>
      <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h3>🤖 AI Food Analysis</h3>
          <button className="ai-modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="ai-modal-body">
          {/* Food Image */}
          <div className="food-image-section">
            {donation.imagePath ? (
              <img 
                src={`http://localhost:5000${donation.imagePath}`} 
                alt="Food to analyze"
                className="food-analysis-image"
              />
            ) : (
              <div className="no-image-placeholder">
                <span>🍽️</span>
                <p>No image available</p>
              </div>
            )}
          </div>

          {/* Analysis Button */}
          {!analysisResults && !isAnalyzing && !error && (
            <div className="analysis-action">
              <button 
                className="analyze-btn" 
                onClick={analyzeFood}
                disabled={!donation.imagePath}
              >
                🔍 Analyze with AI
              </button>
              <p className="analysis-description">
                Get detailed insights about this food including nutrition, freshness, and quality
              </p>
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <div className="analysis-loading">
              <div className="loading-spinner"></div>
              <p>🤖 AI is analyzing the food...</p>
              <div className="loading-steps">
                <div className="loading-step">Detecting food type...</div>
                <div className="loading-step">Analyzing nutrition...</div>
                <div className="loading-step">Checking freshness...</div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="analysis-error">
              <div className="error-icon">⚠️</div>
              <h4>Analysis Failed</h4>
              <p>{error}</p>
              <button className="retry-btn" onClick={analyzeFood}>
                🔄 Try Again
              </button>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResults && (
            <div className="analysis-results">
              <div className="results-header">
                <h4>✅ Analysis Complete</h4>
                <div className="confidence-badge">
                  {analysisResults.confidence}% confidence
                </div>
              </div>

              <div className="results-content">
                {/* Basic Info */}
                <div className="result-section">
                  <h5>📊 Basic Information</h5>
                  <div className="result-grid">
                    <div className="result-item">
                      <span className="result-label">Quantity:</span>
                      <span className="result-value">{analysisResults.quantityEstimate}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Category:</span>
                      <span className="result-value">
                        {analysisResults.category === 'perishable' ? '⏰ Perishable' : '📦 Non-Perishable'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Enhanced Info */}
                {analysisResults.aiAnalysis && (
                  <>
                    <div className="result-section">
                      <h5>🤖 AI Insights</h5>
                      {analysisResults.aiAnalysis.description && (
                        <div className="ai-insight">
                          <span className="insight-icon">📝</span>
                          <p>{analysisResults.aiAnalysis.description}</p>
                        </div>
                      )}
                      {analysisResults.aiAnalysis.nutritionalInfo && (
                        <div className="ai-insight">
                          <span className="insight-icon">🥗</span>
                          <p>{analysisResults.aiAnalysis.nutritionalInfo}</p>
                        </div>
                      )}
                      {analysisResults.aiAnalysis.allergenInfo && (
                        <div className="ai-insight">
                          <span className="insight-icon">⚠️</span>
                          <p>Allergens: {analysisResults.aiAnalysis.allergenInfo}</p>
                        </div>
                      )}
                    </div>

                    {/* Quality Metrics */}
                    <div className="result-section">
                      <h5>📈 Quality Metrics</h5>
                      <div className="metrics-grid">
                        {analysisResults.aiAnalysis.freshness && (
                          <div className="metric-item">
                            <div className="metric-header">
                              <span className="metric-icon">🌿</span>
                              <span className="metric-label">Freshness</span>
                              <span className="metric-value">{analysisResults.aiAnalysis.freshness}%</span>
                            </div>
                            <div className="metric-bar">
                              <div 
                                className="metric-fill freshness" 
                                style={{ width: `${analysisResults.aiAnalysis.freshness}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        {analysisResults.aiAnalysis.qualityScore && (
                          <div className="metric-item">
                            <div className="metric-header">
                              <span className="metric-icon">⭐</span>
                              <span className="metric-label">Quality</span>
                              <span className="metric-value">{analysisResults.aiAnalysis.qualityScore}%</span>
                            </div>
                            <div className="metric-bar">
                              <div 
                                className="metric-fill quality" 
                                style={{ width: `${analysisResults.aiAnalysis.qualityScore}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="result-section">
                      <h5>ℹ️ Additional Information</h5>
                      <div className="additional-info">
                        {analysisResults.aiAnalysis.estimatedCalories && (
                          <div className="info-badge">
                            <span className="info-icon">🔥</span>
                            <span>~{analysisResults.aiAnalysis.estimatedCalories} calories</span>
                          </div>
                        )}
                        {analysisResults.aiAnalysis.servingSize && (
                          <div className="info-badge">
                            <span className="info-icon">👥</span>
                            <span>Serves {analysisResults.aiAnalysis.servingSize} people</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="results-footer">
                <button className="analyze-again-btn" onClick={analyzeFood}>
                  🔄 Analyze Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisModal;
