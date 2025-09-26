import React, { useState, useEffect } from 'react';
import './Analytics.css';

const Analytics = ({ user }) => {
  const [analytics, setAnalytics] = useState({
    totalDonations: 0,
    totalReceived: 0,
    foodSaved: 0,
    impactScore: 0,
    monthlyData: [],
    categoryBreakdown: {},
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/user/analytics?days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading your impact analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>📊 Your Impact Analytics</h2>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="time-range-selector"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 3 months</option>
          <option value="365">Last year</option>
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card donations">
          <div className="stat-icon">🍽️</div>
          <div className="stat-content">
            <h3>{analytics.totalDonations}</h3>
            <p>Food Donations</p>
          </div>
        </div>

        <div className="stat-card received">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{analytics.totalReceived}</h3>
            <p>Food Received</p>
          </div>
        </div>

        <div className="stat-card saved">
          <div className="stat-icon">💚</div>
          <div className="stat-content">
            <h3>{analytics.foodSaved} lbs</h3>
            <p>Food Saved</p>
          </div>
        </div>

        <div className="stat-card impact">
          <div className="stat-icon">🌟</div>
          <div className="stat-content">
            <h3>{analytics.impactScore}</h3>
            <p>Impact Score</p>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-card">
          <h3>📈 Monthly Activity</h3>
          <div className="simple-chart">
            {analytics.monthlyData.map((month, index) => (
              <div key={index} className="chart-bar">
                <div 
                  className="bar-fill"
                  style={{ height: `${(month.count / Math.max(...analytics.monthlyData.map(m => m.count))) * 100}%` }}
                ></div>
                <span className="bar-label">{month.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>🥗 Food Categories</h3>
          <div className="category-breakdown">
            {Object.entries(analytics.categoryBreakdown).map(([category, count]) => (
              <div key={category} className="category-item">
                <span className="category-name">{category}</span>
                <div className="category-bar">
                  <div 
                    className="category-fill"
                    style={{ width: `${(count / Math.max(...Object.values(analytics.categoryBreakdown))) * 100}%` }}
                  ></div>
                </div>
                <span className="category-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h3>🕒 Recent Activity</h3>
        <div className="activity-list">
          {analytics.recentActivity.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">{activity.icon}</div>
              <div className="activity-content">
                <p className="activity-text">{activity.description}</p>
                <span className="activity-time">{new Date(activity.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
