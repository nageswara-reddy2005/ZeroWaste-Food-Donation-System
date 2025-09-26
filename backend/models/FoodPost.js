const mongoose = require('mongoose');

const foodPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Food post title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },
  foodType: {
    type: String,
    required: [true, 'Food type is required'],
    enum: ['Cooked Food', 'Raw Ingredients', 'Packaged Food', 'Beverages', 'Bakery Items', 'Dairy Products', 'Other'],
    default: 'Other'
  },
  quantity: {
    type: String,
    required: [true, 'Quantity is required'],
    trim: true
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Expiry date must be in the future'
    }
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: false
      },
      longitude: {
        type: Number,
        required: false
      }
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    preferredContactTime: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'Anytime'],
      default: 'Anytime'
    }
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Picked', 'Verified'],
    default: 'Pending',
    required: true
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Donor ID is required']
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  images: [{
    type: String, // URLs to uploaded images
    required: false
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Picked', 'Verified'],
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: 200
    }
  }],
  pickupInstructions: {
    type: String,
    maxlength: 300,
    trim: true
  },
  dietaryInfo: {
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false },
    allergens: [String]
  }
}, {
  timestamps: true
});

// Index for efficient queries
foodPostSchema.index({ donorId: 1, status: 1 });
foodPostSchema.index({ location: '2dsphere' }); // For geospatial queries
foodPostSchema.index({ expiryDate: 1 });
foodPostSchema.index({ createdAt: -1 });

// Pre-save middleware to add status history
foodPostSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      updatedBy: this.receiverId || this.donorId,
      updatedAt: new Date()
    });
  }
  next();
});

// Virtual for days until expiry
foodPostSchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if food post is still available
foodPostSchema.methods.isAvailable = function() {
  return this.isActive && 
         this.status === 'Pending' && 
         new Date(this.expiryDate) > new Date();
};

// Method to update status with history tracking
foodPostSchema.methods.updateStatus = function(newStatus, updatedBy, notes = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    updatedBy: updatedBy,
    updatedAt: new Date(),
    notes: notes
  });
  return this.save();
};

// Static method to get posts by status
foodPostSchema.statics.getByStatus = function(status) {
  return this.find({ status: status, isActive: true })
             .populate('donorId', 'name email')
             .populate('receiverId', 'name email')
             .sort({ createdAt: -1 });
};

// Method to format for JSON response
foodPostSchema.methods.toJSON = function() {
  const foodPost = this.toObject({ virtuals: true });
  delete foodPost.__v;
  return foodPost;
};

module.exports = mongoose.model('FoodPost', foodPostSchema);
