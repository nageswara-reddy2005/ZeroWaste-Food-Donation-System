const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FoodPost = require('../models/FoodPost');
const Donation = require('../models/Donation');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { name, phone, location, bio } = req.body;
    const updateData = { name, phone, location, bio };
    
    if (req.file) {
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get user's donations and received donations
    const userDonations = await FoodPost.find({
      donorId: req.user.userId,
      createdAt: { $gte: startDate }
    });

    const userReceived = await Donation.find({
      receiverId: req.user.userId,
      createdAt: { $gte: startDate }
    });

    // Calculate stats
    const totalDonations = userDonations.length;
    const totalReceived = userReceived.length;
    const foodSaved = totalDonations * 2; // Estimate 2 lbs per donation
    const impactScore = Math.floor((totalDonations * 10) + (totalReceived * 5));

    // Monthly data for chart
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const monthDonations = userDonations.filter(d => 
        new Date(d.createdAt) >= monthStart && new Date(d.createdAt) < monthEnd
      ).length;
      
      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        count: monthDonations
      });
    }

    // Category breakdown
    const categoryBreakdown = {};
    userDonations.forEach(donation => {
      const category = donation.foodCategory || 'Other';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });

    // Recent activity
    const recentActivity = [
      ...userDonations.slice(-5).map(d => ({
        description: `Donated ${d.foodType}`,
        timestamp: d.createdAt,
        icon: '🍽️'
      })),
      ...userReceived.slice(-5).map(d => ({
        description: `Received food donation`,
        timestamp: d.createdAt,
        icon: '🎯'
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    res.json({
      totalDonations,
      totalReceived,
      foodSaved,
      impactScore,
      monthlyData,
      categoryBreakdown,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get expiring donations
router.get('/donations/expiring', auth, async (req, res) => {
  try {
    const now = new Date();
    const in48Hours = new Date(now.getTime() + (48 * 60 * 60 * 1000));

    const expiringDonations = await FoodPost.find({
      donorId: req.user.userId,
      expiryDate: { $lte: in48Hours, $gte: now },
      status: { $in: ['available', 'reserved'] }
    }).sort({ expiryDate: 1 });

    res.json(expiringDonations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expiring donations' });
  }
});

module.exports = router;
