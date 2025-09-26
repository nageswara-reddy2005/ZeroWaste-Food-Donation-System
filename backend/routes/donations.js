const express = require('express');
const router = express.Router();
const FoodPost = require('../models/FoodPost');
const Donation = require('../models/Donation');
const auth = require('../middleware/auth');

// Get expiring donations for current user
router.get('/expiring', auth, async (req, res) => {
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
    console.error('Error fetching expiring donations:', error);
    res.status(500).json({ error: 'Failed to fetch expiring donations' });
  }
});

// Reserve a donation
router.post('/:id/reserve', auth, async (req, res) => {
  try {
    const donation = await FoodPost.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (donation.status !== 'available') {
      return res.status(400).json({ error: 'Donation is not available for reservation' });
    }

    // Create reservation record
    const reservation = new Donation({
      donationId: donation._id,
      donorId: donation.donorId,
      receiverId: req.user.userId,
      status: 'reserved',
      reservedAt: new Date()
    });

    await reservation.save();

    // Update donation status
    donation.status = 'reserved';
    await donation.save();

    res.json({ message: 'Donation reserved successfully', reservation });
  } catch (error) {
    console.error('Error reserving donation:', error);
    res.status(500).json({ error: 'Failed to reserve donation' });
  }
});

// Update donation status (admin only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const donation = await FoodPost.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.json(donation);
  } catch (error) {
    console.error('Error updating donation status:', error);
    res.status(500).json({ error: 'Failed to update donation status' });
  }
});

module.exports = router;
