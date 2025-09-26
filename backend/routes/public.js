const express = require('express');
const router = express.Router();
const FoodPost = require('../models/FoodPost');
const User = require('../models/User');

// Get public stats for landing page
router.get('/stats', async (req, res) => {
  try {
    const totalDonations = await FoodPost.countDocuments();
    const activeDonors = await User.countDocuments({ role: { $ne: 'admin' } });
    
    // Calculate approximate food saved (assuming average 2 lbs per donation)
    const foodSaved = totalDonations * 2;
    
    // Mock communities served (could be calculated based on unique locations)
    const communitiesServed = Math.min(Math.floor(totalDonations / 10), 50);

    res.json({
      totalDonations,
      activeDonors,
      foodSaved,
      communitiesServed
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
