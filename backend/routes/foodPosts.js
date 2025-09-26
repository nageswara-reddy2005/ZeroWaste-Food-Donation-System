const express = require('express');
const router = express.Router();
const FoodPost = require('../models/FoodPost');
const authenticateToken = require('../middleware/auth');

// Get all food posts with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      status = 'Pending', 
      foodType, 
      page = 1, 
      limit = 10,
      lat,
      lng,
      radius = 10 // km
    } = req.query;

    const query = { isActive: true };
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by food type
    if (foodType && foodType !== 'All') {
      query.foodType = foodType;
    }

    // Geospatial query if coordinates provided
    if (lat && lng) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    const skip = (page - 1) * limit;
    
    const foodPosts = await FoodPost.find(query)
      .populate('donorId', 'name email')
      .populate('receiverId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FoodPost.countDocuments(query);

    res.json({
      foodPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get food posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single food post by ID
router.get('/:id', async (req, res) => {
  try {
    const foodPost = await FoodPost.findById(req.params.id)
      .populate('donorId', 'name email')
      .populate('receiverId', 'name email')
      .populate('statusHistory.updatedBy', 'name email');

    if (!foodPost) {
      return res.status(404).json({ error: 'Food post not found' });
    }

    res.json(foodPost);
  } catch (error) {
    console.error('Get food post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new food post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      foodType,
      quantity,
      expiryDate,
      location,
      contactInfo,
      pickupInstructions,
      dietaryInfo,
      tags
    } = req.body;

    // Validate required fields
    if (!title || !description || !foodType || !quantity || !expiryDate || !location?.address || !contactInfo?.phone) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, description, foodType, quantity, expiryDate, location.address, contactInfo.phone' 
      });
    }

    const newFoodPost = new FoodPost({
      title: title.trim(),
      description: description.trim(),
      foodType,
      quantity: quantity.trim(),
      expiryDate: new Date(expiryDate),
      location,
      contactInfo,
      donorId: req.user.userId,
      pickupInstructions: pickupInstructions?.trim(),
      dietaryInfo,
      tags: tags || [],
      status: 'Pending'
    });

    await newFoodPost.save();
    await newFoodPost.populate('donorId', 'name email');

    res.status(201).json({
      message: 'Food post created successfully',
      foodPost: newFoodPost
    });
  } catch (error) {
    console.error('Create food post error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update food post status (Protected - Lifecycle Management)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const userId = req.user.userId;
    const foodPostId = req.params.id;

    // Validate status
    const validStatuses = ['Pending', 'Accepted', 'Picked', 'Verified'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const foodPost = await FoodPost.findById(foodPostId)
      .populate('donorId', 'name email')
      .populate('receiverId', 'name email');

    if (!foodPost) {
      return res.status(404).json({ error: 'Food post not found' });
    }

    // Authorization check
    const isDonor = foodPost.donorId._id.toString() === userId;
    const isReceiver = foodPost.receiverId && foodPost.receiverId._id.toString() === userId;
    
    if (!isDonor && !isReceiver) {
      // For 'Accepted' status, allow any authenticated user to accept
      if (status === 'Accepted' && foodPost.status === 'Pending') {
        foodPost.receiverId = userId;
      } else {
        return res.status(403).json({ 
          error: 'You are not authorized to update this food post status' 
        });
      }
    }

    // Status transition validation
    const currentStatus = foodPost.status;
    const statusFlow = {
      'Pending': ['Accepted'],
      'Accepted': ['Picked'],
      'Picked': ['Verified'],
      'Verified': []
    };

    if (!statusFlow[currentStatus].includes(status)) {
      return res.status(400).json({ 
        error: `Cannot change status from ${currentStatus} to ${status}. Valid next statuses: ${statusFlow[currentStatus].join(', ') || 'None'}` 
      });
    }

    // Update status using the model method
    await foodPost.updateStatus(status, userId, notes || '');

    // Populate the updated food post
    await foodPost.populate('statusHistory.updatedBy', 'name email');

    res.json({
      message: 'Food post status updated successfully',
      foodPost: foodPost,
      previousStatus: currentStatus,
      newStatus: status
    });
  } catch (error) {
    console.error('Update food post status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's food posts (donations and received)
router.get('/user/my-posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = 'all' } = req.query; // 'donated', 'received', 'all'

    let query = {};
    
    if (type === 'donated') {
      query.donorId = userId;
    } else if (type === 'received') {
      query.receiverId = userId;
    } else {
      query.$or = [
        { donorId: userId },
        { receiverId: userId }
      ];
    }

    const foodPosts = await FoodPost.find(query)
      .populate('donorId', 'name email')
      .populate('receiverId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      foodPosts,
      counts: {
        donated: await FoodPost.countDocuments({ donorId: userId }),
        received: await FoodPost.countDocuments({ receiverId: userId }),
        total: foodPosts.length
      }
    });
  } catch (error) {
    console.error('Get user food posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete food post (only by donor and only if status is Pending)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const foodPost = await FoodPost.findById(req.params.id);

    if (!foodPost) {
      return res.status(404).json({ error: 'Food post not found' });
    }

    // Only donor can delete and only if status is Pending
    if (foodPost.donorId.toString() !== userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this food post' });
    }

    if (foodPost.status !== 'Pending') {
      return res.status(400).json({ error: 'Cannot delete food post that has been accepted or is in progress' });
    }

    await FoodPost.findByIdAndDelete(req.params.id);

    res.json({ message: 'Food post deleted successfully' });
  } catch (error) {
    console.error('Delete food post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
