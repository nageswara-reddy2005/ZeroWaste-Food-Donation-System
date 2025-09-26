import React, { useState, useEffect } from 'react';
import './LandingPage.css';

const LandingPage = () => {
  const [stats, setStats] = useState({
    totalDonations: 0,
    activeDonors: 0,
    foodSaved: 0,
    communitiesServed: 0
  });

  useEffect(() => {
    fetchStats();
    // Animate counters
    animateCounters();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/public/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const animateCounters = () => {
    const counters = document.querySelectorAll('.counter-number');
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const increment = target / 100;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          counter.textContent = target.toLocaleString();
          clearInterval(timer);
        } else {
          counter.textContent = Math.floor(current).toLocaleString();
        }
      }, 20);
    });
  };

  const handleGetStarted = () => {
    window.location.hash = 'login';
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="floating-food">🍎</div>
          <div className="floating-food">🥖</div>
          <div className="floating-food">🥗</div>
          <div className="floating-food">🍊</div>
          <div className="floating-food">🥕</div>
        </div>
        
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="gradient-text">ZeroWaste</span>
              <br />
              Food Sharing Platform
            </h1>
            <p className="hero-subtitle">
              Connect food donors with those in need. Reduce waste, feed communities, 
              and make a positive impact on the environment.
            </p>
            <div className="hero-buttons">
              <button className="cta-button primary" onClick={handleGetStarted}>
                🚀 Get Started
              </button>
              <button className="cta-button secondary" onClick={() => window.location.hash = 'register'}>
                📖 Learn More
              </button>
            </div>
          </div>
          
          <div className="hero-image">
            <div className="hero-card">
              <div className="card-header">
                <span className="card-icon">🍽️</span>
                <span className="card-title">Fresh Vegetables</span>
              </div>
              <div className="card-content">
                <div className="card-detail">📍 Downtown Community Center</div>
                <div className="card-detail">⏰ Expires in 2 hours</div>
                <div className="card-detail">👤 Local Restaurant</div>
              </div>
              <button className="card-action">Reserve Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">🍽️</div>
            <div className="counter-number" data-target={stats.totalDonations || 1247}>0</div>
            <div className="stat-label">Food Donations</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="counter-number" data-target={stats.activeDonors || 342}>0</div>
            <div className="stat-label">Active Donors</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚖️</div>
            <div className="counter-number" data-target={stats.foodSaved || 5890}>0</div>
            <div className="stat-label">Pounds Saved</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏘️</div>
            <div className="counter-number" data-target={stats.communitiesServed || 28}>0</div>
            <div className="stat-label">Communities</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="section-title">Why Choose ZeroWaste?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Analysis</h3>
              <p>Advanced AI analyzes food quality, freshness, and nutritional content to ensure safe donations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Real-Time Chat</h3>
              <p>Instant messaging between donors and receivers for seamless coordination and pickup.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🗺️</div>
              <h3>Smart Location</h3>
              <p>Interactive maps with GPS routing to help you find and navigate to food donations easily.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Impact Tracking</h3>
              <p>Track your environmental impact and see how much food waste you've prevented.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Platform</h3>
              <p>Enterprise-grade security with role-based access and comprehensive admin controls.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Optimized performance with real-time updates and responsive design for all devices.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="how-it-works-container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">📸</div>
              <h3>Donate Food</h3>
              <p>Take a photo of your surplus food. Our AI analyzes quality and safety automatically.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">🔍</div>
              <h3>Find & Reserve</h3>
              <p>Browse available donations, filter by preferences, and reserve what you need.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">💬</div>
              <h3>Connect & Pickup</h3>
              <p>Chat with donors, get directions, and coordinate pickup times seamlessly.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon">🌱</div>
              <h3>Make Impact</h3>
              <p>Track your environmental impact and help build a sustainable community.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="testimonials-container">
          <h2 className="section-title">What Our Community Says</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                "ZeroWaste has transformed how our restaurant handles surplus food. The AI analysis gives us confidence in food safety, and the platform makes donation effortless."
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">👨‍🍳</div>
                <div className="author-info">
                  <div className="author-name">Chef Marco Rodriguez</div>
                  <div className="author-title">Green Bistro Restaurant</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                "As a community organizer, ZeroWaste helps us feed families in need while reducing environmental impact. The real-time chat feature is incredibly helpful."
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">👩‍💼</div>
                <div className="author-info">
                  <div className="author-name">Sarah Chen</div>
                  <div className="author-title">Community Food Network</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                "The platform's user experience is outstanding. Finding fresh food donations near me has never been easier, and the location features work perfectly."
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">👨‍👩‍👧‍👦</div>
                <div className="author-info">
                  <div className="author-name">The Johnson Family</div>
                  <div className="author-title">Local Recipients</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to Make a Difference?</h2>
          <p>Join thousands of donors and recipients building a sustainable future together.</p>
          <button className="cta-button large" onClick={handleGetStarted}>
            🌟 Start Your Impact Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>ZeroWaste</h3>
            <p>Connecting communities to reduce food waste and fight hunger.</p>
          </div>
          <div className="footer-section">
            <h4>Platform</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#impact">Impact</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Community</h4>
            <ul>
              <li><a href="#donors">For Donors</a></li>
              <li><a href="#recipients">For Recipients</a></li>
              <li><a href="#organizations">Organizations</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 ZeroWaste Platform. Building a sustainable future together.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
