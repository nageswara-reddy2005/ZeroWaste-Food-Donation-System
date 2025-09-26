const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
});

const chatSchema = new mongoose.Schema({
  // The donation this chat is about
  donationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: true
  },
  
  // Participants in the chat (donor and receiver)
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // Messages in the chat
  messages: [messageSchema],
  
  // Last activity timestamp
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Chat status
  status: {
    type: String,
    enum: ['active', 'closed', 'archived'],
    default: 'active'
  },
  
  // Created timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Update lastActivity when a new message is added
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = Date.now();
  }
  next();
});

// Index for efficient queries
chatSchema.index({ donationId: 1 });
chatSchema.index({ participants: 1 });
chatSchema.index({ lastActivity: -1 });

// Virtual for unread message count for each participant
chatSchema.methods.getUnreadCount = function(userId) {
  return this.messages.filter(msg => 
    !msg.read && 
    msg.sender.toString() !== userId.toString()
  ).length;
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userId) {
  this.messages.forEach(msg => {
    if (msg.sender.toString() !== userId.toString()) {
      msg.read = true;
    }
  });
  return this.save();
};

// Method to add a new message
chatSchema.methods.addMessage = function(senderId, content) {
  this.messages.push({
    sender: senderId,
    content: content,
    timestamp: new Date(),
    read: false
  });
  this.lastActivity = new Date();
  return this.save();
};

// Static method to find or create chat for a donation
chatSchema.statics.findOrCreateChat = async function(donationId, participantIds) {
  let chat = await this.findOne({
    donationId: donationId,
    participants: { $all: participantIds }
  }).populate('participants', 'name email')
    .populate('donationId', 'quantity foodType status')
    .populate('messages.sender', 'name email');

  if (!chat) {
    chat = new this({
      donationId: donationId,
      participants: participantIds,
      messages: [],
      status: 'active'
    });
    await chat.save();
    
    // Populate the newly created chat
    chat = await this.findById(chat._id)
      .populate('participants', 'name email')
      .populate('donationId', 'quantity foodType status')
      .populate('messages.sender', 'name email');
  }

  return chat;
};

module.exports = mongoose.model('Chat', chatSchema);
