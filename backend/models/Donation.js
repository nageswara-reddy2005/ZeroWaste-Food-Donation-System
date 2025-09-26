const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  // User who made the donation
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Basic donation details
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  
  foodType: {
    type: String,
    required: true,
    enum: ['veg', 'non-veg']
  },
  
  foodCategory: {
    type: String,
    required: true,
    enum: ['perishable', 'non-perishable']
  },
  
  // Expiry/pickup deadline
  expiryDate: {
    type: Date,
    required: true
  },
  
  // Optional image
  imagePath: {
    type: String,
    default: null
  },
  
  // Location details
  location: {
    type: String,
    required: false
  },
  
  // Optional description
  description: {
    type: String,
    default: ''
  },
  
  // AI Analysis Data (for enhanced receiver experience)
  aiAnalysis: {
    description: {
      type: String,
      default: null
    },
    nutritionalInfo: {
      type: String,
      default: null
    },
    allergenInfo: {
      type: String,
      default: null
    },
    freshness: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    estimatedCalories: {
      type: Number,
      min: 0,
      default: null
    },
    servingSize: {
      type: Number,
      min: 1,
      default: null
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    analysisTimestamp: {
      type: Date,
      default: null
    },
    isAiAnalyzed: {
      type: Boolean,
      default: false
    }
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['available', 'reserved', 'picked_up', 'delivered', 'expired', 'cancelled'],
    default: 'available'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Reserved by (when someone claims the donation)
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  reservedAt: {
    type: Date,
    default: null
  },
  
  // Pickup details
  pickedUpAt: {
    type: Date,
    default: null
  }
});

// Update the updatedAt field before saving
donationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for checking if donation is expired
donationSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiryDate;
});

// Virtual for time remaining
donationSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diff = expiry - now;
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
});

// Ensure virtual fields are serialized
donationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Donation', donationSchema);
