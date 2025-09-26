const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = createServer(app);

// Import models
const User = require('./models/User');
const FoodPost = require('./models/FoodPost');
const Donation = require('./models/Donation');
const Chat = require('./models/Chat');
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'zerowaste_secret_key_2024';
const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini AI
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('🤖 Gemini AI initialized successfully');
} else {
  console.log('⚠️ GEMINI_API_KEY not found - using simulated AI analysis');
}

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'donation-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Socket.IO Authentication Middleware
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.user = user;
    next();
  });
};

// Socket.IO Connection Handling
io.use(authenticateSocket);

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`User ${socket.user.email} connected to chat`);
  connectedUsers.set(socket.user.userId, socket.id);

  // Join user to their personal room
  socket.join(`user_${socket.user.userId}`);

  // Handle joining a chat room
  socket.on('join_chat', async (data) => {
    try {
      const { donationId, receiverId } = data;
      const chatRoom = `chat_${donationId}`;
      
      socket.join(chatRoom);
      console.log(`User ${socket.user.email} joined chat room: ${chatRoom}`);
      
      // Get or create chat
      const participants = [socket.user.userId, receiverId].filter(Boolean);
      const chat = await Chat.findOrCreateChat(donationId, participants);
      
      // Send chat history to the user
      socket.emit('chat_history', {
        chatId: chat._id,
        messages: chat.messages,
        participants: chat.participants
      });
    } catch (error) {
      console.error('Error joining chat:', error);
      socket.emit('chat_error', { message: 'Failed to join chat' });
    }
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { chatId, message, donationId } = data;
      
      // Find the chat
      let chat = await Chat.findById(chatId)
        .populate('participants', 'name email')
        .populate('messages.sender', 'name email');
      
      if (!chat) {
        socket.emit('chat_error', { message: 'Chat not found' });
        return;
      }
      
      // Add message to chat
      await chat.addMessage(socket.user.userId, message);
      
      // Reload chat with populated data
      chat = await Chat.findById(chatId)
        .populate('participants', 'name email')
        .populate('messages.sender', 'name email');
      
      const newMessage = chat.messages[chat.messages.length - 1];
      
      // Emit message to all participants in the chat room
      const chatRoom = `chat_${donationId}`;
      io.to(chatRoom).emit('new_message', {
        chatId: chat._id,
        message: {
          _id: newMessage._id,
          sender: newMessage.sender,
          content: newMessage.content,
          timestamp: newMessage.timestamp,
          read: newMessage.read
        }
      });
      
      console.log(`Message sent in chat ${chatId}: ${message}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('chat_error', { message: 'Failed to send message' });
    }
  });

  // Handle marking messages as read
  socket.on('mark_as_read', async (data) => {
    try {
      const { chatId } = data;
      const chat = await Chat.findById(chatId);
      
      if (chat) {
        await chat.markAsRead(socket.user.userId);
        
        // Notify other participants that messages were read
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== socket.user.userId) {
            const participantSocketId = connectedUsers.get(participantId.toString());
            if (participantSocketId) {
              io.to(participantSocketId).emit('messages_read', { chatId });
            }
          }
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.email} disconnected from chat`);
    connectedUsers.delete(socket.user.userId);
  });
});

// MongoDB Atlas Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('🍃 Connected to MongoDB Atlas successfully!');
  console.log('📊 Database: zerowaste');
})
.catch((error) => {
  console.error('❌ MongoDB Atlas connection error:', error.message);
  process.exit(1);
});

// Create default admin user if it doesn't exist
const createDefaultUsers = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@zerowaste.com' });
    
    if (!adminExists) {
      const defaultUsers = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password',
          role: 'user'
        },
        {
          name: 'Admin User',
          email: 'admin@zerowaste.com',
          password: 'password',
          role: 'admin'
        }
      ];

      for (const userData of defaultUsers) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created default user: ${userData.email}`);
      }
    }
  } catch (error) {
    console.error('Error creating default users:', error.message);
  }
};

// Create default users after connection
mongoose.connection.once('open', () => {
  createDefaultUsers();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/foodPosts', require('./routes/foodPosts'));
app.use('/api/public', require('./routes/public'));
app.use('/api/user', require('./routes/user'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'ZeroWaste Backend API is running!' });
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create new user
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'user'
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected route middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Dashboard data endpoint
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const dashboardData = {
    user: req.user,
    stats: {
      totalDonations: 156,
      foodSaved: '2,340 kg',
      peopleServed: 1250,
      co2Prevented: '890 kg'
    },
    recentActivity: [
      {
        id: 1,
        type: 'donation',
        message: 'Fresh vegetables donated by Green Restaurant',
        time: '2 hours ago',
        status: 'pending'
      },
      {
        id: 2,
        type: 'pickup',
        message: 'Food picked up by Hope Foundation',
        time: '4 hours ago',
        status: 'completed'
      },
      {
        id: 3,
        type: 'registration',
        message: 'New NGO registered: Care Center',
        time: '6 hours ago',
        status: 'verified'
      }
    ]
  };

  res.json(dashboardData);
});

// Post donation endpoint
app.post('/api/donations', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { quantity, foodType, foodCategory, expiryDate, location, description, aiAnalysis } = req.body;

    // Validate required fields
    if (!quantity || !foodType || !foodCategory || !expiryDate) {
      return res.status(400).json({ error: 'Quantity, food type, food category, and expiry date are required' });
    }

    // Validate expiry date is in the future
    const expiry = new Date(expiryDate);
    if (expiry <= new Date()) {
      return res.status(400).json({ error: 'Expiry date must be in the future' });
    }

    // Handle image upload
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    // Parse AI analysis data if provided
    let aiAnalysisData = null;
    if (aiAnalysis && typeof aiAnalysis === 'string') {
      try {
        aiAnalysisData = JSON.parse(aiAnalysis);
      } catch (e) {
        console.log('Failed to parse AI analysis data:', e);
      }
    } else if (aiAnalysis && typeof aiAnalysis === 'object') {
      aiAnalysisData = aiAnalysis;
    }

    // Create new donation
    const newDonation = new Donation({
      userId: req.user.userId,
      quantity: parseInt(quantity),
      foodType,
      foodCategory,
      expiryDate: expiry,
      location: location || '',
      description: description || '',
      imagePath: imagePath,
      status: 'available',
      
      // Include AI analysis data if available
      aiAnalysis: aiAnalysisData ? {
        description: aiAnalysisData.description || null,
        nutritionalInfo: aiAnalysisData.nutritionalInfo || null,
        allergenInfo: aiAnalysisData.allergenInfo || null,
        freshness: aiAnalysisData.freshness || null,
        qualityScore: aiAnalysisData.qualityScore || null,
        estimatedCalories: aiAnalysisData.estimatedCalories || null,
        servingSize: aiAnalysisData.servingSize || null,
        confidence: aiAnalysisData.confidence || null,
        analysisTimestamp: aiAnalysisData.analysisTimestamp ? new Date(aiAnalysisData.analysisTimestamp) : null,
        isAiAnalyzed: true
      } : {
        isAiAnalyzed: false
      }
    });

    await newDonation.save();

    // Populate user information for response
    await newDonation.populate('userId', 'name email');

    res.status(201).json({
      message: 'Food donation posted successfully!',
      donation: {
        id: newDonation._id,
        quantity: newDonation.quantity,
        foodType: newDonation.foodType,
        foodCategory: newDonation.foodCategory,
        expiryDate: newDonation.expiryDate,
        location: newDonation.location,
        description: newDonation.description,
        imagePath: newDonation.imagePath,
        status: newDonation.status,
        timeRemaining: newDonation.timeRemaining,
        createdAt: newDonation.createdAt,
        donor: {
          name: newDonation.userId.name,
          email: newDonation.userId.email
        }
      }
    });
  } catch (error) {
    console.error('Donation creation error:', error);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: error.message });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Food Analysis endpoint
app.post('/api/ai/analyze-food', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('🤖 AI analyzing food image:', req.file.filename);
    
    // Simulate AI analysis with realistic results based on common food patterns
    // In production, you would integrate with actual AI services like:
    // - Google Vision API
    // - AWS Rekognition
    // - Custom ML models
    // - OpenAI GPT-4 Vision
    
    const analyzeWithGemini = async () => {
      if (!genAI) {
        // Fallback to simulated analysis if no API key
        console.log('⚠️ No Gemini API key - using fallback analysis');
        return {
          quantityEstimate: '2-3 pieces',
          category: 'perishable',
          confidence: 75,
          aiDescription: 'Fresh food item (simulated analysis)',
          nutritionalInfo: 'Contains essential nutrients',
          allergenInfo: 'Check ingredients for allergens',
          freshness: 85,
          qualityScore: 90,
          estimatedCalories: 100,
          servingSize: 2
        };
      }

      try {
        console.log('🤖 Analyzing food image with Gemini Vision API...');
        
        // Read the uploaded image file
        const imagePath = req.file.path;
        const imageData = fs.readFileSync(imagePath);
        const base64Image = imageData.toString('base64');
        
        // Get the Gemini Vision model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Create the prompt for food analysis
        const prompt = `You are a food expert analyzing this image. Provide detailed information in JSON format.

Analyze this food image and identify:

1. Category: Is this perishable or non_perishable?
2. Quantity: Estimate serving size (e.g., "2-3 pieces", "1 bowl", "3-4 servings")
3. Description: Brief description of what you see
4. Nutritional Info: Key nutritional benefits
5. Allergen Info: Potential allergens or "No common allergens"
6. Estimated Calories: Approximate calories for the portion shown
7. Serving Size: How many people this could serve (1-6)
8. Freshness: Rate freshness 1-100 based on visual appearance
9. Quality: Rate overall quality 1-100 based on visual appearance

Respond ONLY with valid JSON in this exact format:
{
  "quantityEstimate": "string",
  "category": "perishable",
  "confidence": number (1-100),
  "aiDescription": "string",
  "nutritionalInfo": "string",
  "allergenInfo": "string",
  "freshness": number (1-100),
  "qualityScore": number (1-100),
  "estimatedCalories": number,
  "servingSize": number (1-6)
}`;
        
        // Analyze the image
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: req.file.mimetype
            }
          }
        ]);
        
        const response = await result.response;
        const text = response.text();
        
        console.log('🔍 Gemini raw response:', text);
        console.log('📏 Response length:', text.length);
        
        // Parse the JSON response
        let analysisResult;
        try {
          // Clean the response text (remove markdown code blocks if present)
          const cleanedText = text.replace(/```json\n?|```\n?/g, '').trim();
          console.log('🧹 Cleaned response:', cleanedText);
          analysisResult = JSON.parse(cleanedText);
          console.log('📊 Parsed result BEFORE validation:', JSON.stringify(analysisResult, null, 2));
          
          // Food type classification removed - no longer needed
          console.log('✅ AI analysis completed without food type classification');
          
        } catch (parseError) {
          console.error('❌ Error parsing Gemini response:', parseError);
          console.log('Raw response:', text);
          
          // Fallback analysis if JSON parsing fails
          analysisResult = {
            quantityEstimate: '2-3 servings',
            category: 'perishable',
            confidence: 75,
            aiDescription: 'Food item analyzed (parsing error occurred)',
            nutritionalInfo: 'Contains essential nutrients',
            allergenInfo: 'Check ingredients for allergens',
            freshness: 85,
            qualityScore: 88,
            estimatedCalories: 150,
            servingSize: 2
          };
        }
        
        console.log('✅ Gemini analysis result:', {
          type: analysisResult.foodType,
          category: analysisResult.category,
          confidence: analysisResult.confidence + '%',
          description: analysisResult.aiDescription
        });
        
        return analysisResult;
        
      } catch (error) {
        console.error('❌ Gemini API error:', error);
        
        // Fallback analysis if API fails
        return {
          quantityEstimate: '2-3 servings',
          category: 'perishable',
          confidence: 70,
          aiDescription: 'Food item (API error occurred)',
          nutritionalInfo: 'Contains essential nutrients',
          allergenInfo: 'Check ingredients for allergens',
          freshness: 80,
          qualityScore: 85,
          estimatedCalories: 120,
          servingSize: 2
        };
      }
    };

    const analysisResult = await analyzeWithGemini();
    
    console.log('✅ AI analysis completed:', analysisResult);
    
    res.json({
      success: true,
      quantityEstimate: analysisResult.quantityEstimate,
      foodType: analysisResult.foodType,
      category: analysisResult.category,
      confidence: analysisResult.confidence,
      imageUrl: `/uploads/${req.file.filename}`,
      message: 'Food analysis completed successfully',
      
      // Enhanced AI information for receivers
      aiAnalysis: {
        description: analysisResult.aiDescription,
        nutritionalInfo: analysisResult.nutritionalInfo,
        allergenInfo: analysisResult.allergenInfo,
        freshness: analysisResult.freshness,
        qualityScore: analysisResult.qualityScore,
        estimatedCalories: analysisResult.estimatedCalories,
        servingSize: analysisResult.servingSize,
        analysisTimestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ AI analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze food image',
      details: error.message 
    });
  }
});

// Get all donations endpoint
app.get('/api/donations', authenticateToken, async (req, res) => {
  try {
    const { status, foodType, foodCategory } = req.query;
    
    // Build filter object
    let filter = {};
    if (status) filter.status = status;
    if (foodType) filter.foodType = foodType;
    if (foodCategory) filter.foodCategory = foodCategory;
    
    // Get donations with user info
    const donations = await Donation.find(filter)
      .populate('userId', 'name email')
      .populate('reservedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedDonations = donations.map(donation => ({
      id: donation._id,
      quantity: donation.quantity,
      foodType: donation.foodType,
      foodCategory: donation.foodCategory,
      expiryDate: donation.expiryDate,
      location: donation.location,
      description: donation.description,
      imagePath: donation.imagePath,
      status: donation.status,
      timeRemaining: donation.timeRemaining,
      isExpired: donation.isExpired,
      createdAt: donation.createdAt,
      donor: {
        name: donation.userId.name,
        email: donation.userId.email
      },
      reservedBy: donation.reservedBy ? {
        name: donation.reservedBy.name,
        email: donation.reservedBy.email
      } : null
    }));

    res.json({
      donations: formattedDonations,
      total: formattedDonations.length
    });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reserve donation endpoint
app.post('/api/donations/:id/reserve', authenticateToken, async (req, res) => {
  try {
    const donationId = req.params.id;
    const userId = req.user.userId;

    // Find the donation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Check if donation is available
    if (donation.status !== 'available') {
      return res.status(400).json({ error: 'Donation is not available for reservation' });
    }

    // Check if user is trying to reserve their own donation
    if (donation.userId.toString() === userId) {
      return res.status(400).json({ error: 'You cannot reserve your own donation' });
    }

    // Check if donation is expired
    if (new Date() > donation.expiryDate) {
      donation.status = 'expired';
      await donation.save();
      return res.status(400).json({ error: 'This donation has expired' });
    }

    // Reserve the donation
    donation.status = 'reserved';
    donation.reservedBy = userId;
    donation.reservedAt = new Date();
    await donation.save();

    // Populate user information for response
    await donation.populate('userId', 'name email');
    await donation.populate('reservedBy', 'name email');

    res.json({
      message: 'Donation reserved successfully!',
      donation: {
        id: donation._id,
        quantity: donation.quantity,
        foodType: donation.foodType,
        foodCategory: donation.foodCategory,
        expiryDate: donation.expiryDate,
        location: donation.location,
        description: donation.description,
        imagePath: donation.imagePath,
        status: donation.status,
        timeRemaining: donation.timeRemaining,
        createdAt: donation.createdAt,
        reservedAt: donation.reservedAt,
        donor: {
          name: donation.userId.name,
          email: donation.userId.email
        },
        reservedBy: {
          name: donation.reservedBy.name,
          email: donation.reservedBy.email
        }
      }
    });
  } catch (error) {
    console.error('Reserve donation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chat API Endpoints

// Get or create chat for a donation
app.post('/api/chats', authenticateToken, async (req, res) => {
  try {
    const { donationId, receiverId } = req.body;
    const userId = req.user.userId;

    // Validate donation exists
    const donation = await Donation.findById(donationId).populate('userId', 'name email');
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Determine participants (donor and receiver)
    let participants = [];
    if (receiverId) {
      // Receiver is starting the chat
      participants = [donation.userId._id, receiverId];
    } else {
      // Donor is accessing the chat, need to find receiver from reservation
      if (donation.reservedBy) {
        participants = [donation.userId._id, donation.reservedBy];
      } else {
        return res.status(400).json({ error: 'No receiver found for this donation' });
      }
    }

    // Ensure current user is one of the participants
    if (!participants.some(p => p.toString() === userId)) {
      return res.status(403).json({ error: 'You are not authorized to access this chat' });
    }

    // Get or create chat
    const chat = await Chat.findOrCreateChat(donationId, participants);

    res.json({
      chatId: chat._id,
      donationId: chat.donationId,
      participants: chat.participants,
      messages: chat.messages,
      lastActivity: chat.lastActivity,
      unreadCount: chat.getUnreadCount(userId)
    });
  } catch (error) {
    console.error('Get/Create chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's chats
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Fetching chats for user ID:', userId);

    const chats = await Chat.find({
      participants: userId,
      status: 'active'
    })
    .populate('participants', 'name email')
    .populate('donationId', 'quantity foodType foodCategory status imagePath userId')
    .populate('messages.sender', 'name email')
    .sort({ lastActivity: -1 })
    .limit(20);
    
    console.log('Found chats:', chats.length);
    chats.forEach((chat, index) => {
      console.log(`Chat ${index + 1}:`, {
        id: chat._id,
        donationId: chat.donationId?._id,
        participants: chat.participants.map(p => ({ id: p._id, name: p.name })),
        messageCount: chat.messages.length
      });
    });

    const formattedChats = chats.map(chat => {
      if (!chat.donationId) {
        console.warn('Chat missing donationId:', chat._id);
        return null;
      }
      
      return {
        chatId: chat._id,
        donation: {
          id: chat.donationId._id,
          quantity: chat.donationId.quantity,
          foodType: chat.donationId.foodType,
          foodCategory: chat.donationId.foodCategory || 'perishable',
          status: chat.donationId.status,
          imagePath: chat.donationId.imagePath,
          userId: chat.donationId.userId
        },
        participants: chat.participants,
        lastMessage: chat.messages.length > 0 ? {
          content: chat.messages[chat.messages.length - 1].content,
          sender: chat.messages[chat.messages.length - 1].sender,
          timestamp: chat.messages[chat.messages.length - 1].timestamp
        } : null,
        lastActivity: chat.lastActivity,
        unreadCount: chat.getUnreadCount(userId),
        status: chat.status
      };
    }).filter(chat => chat !== null); // Remove any null entries

    res.json({ chats: formattedChats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific chat messages
app.get('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findById(chatId)
      .populate('participants', 'name email')
      .populate('messages.sender', 'name email');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p._id.toString() === userId)) {
      return res.status(403).json({ error: 'You are not authorized to access this chat' });
    }

    // Paginate messages (most recent first)
    const startIndex = (page - 1) * limit;
    const messages = chat.messages
      .slice(-limit * page)
      .slice(startIndex)
      .reverse();

    res.json({
      messages,
      hasMore: chat.messages.length > limit * page,
      totalMessages: chat.messages.length
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message via REST API (alternative to Socket.IO)
app.post('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const chat = await Chat.findById(chatId)
      .populate('participants', 'name email');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p._id.toString() === userId)) {
      return res.status(403).json({ error: 'You are not authorized to send messages in this chat' });
    }

    // Add message
    await chat.addMessage(userId, message.trim());

    // Get the new message with populated sender
    const updatedChat = await Chat.findById(chatId)
      .populate('messages.sender', 'name email');
    
    const newMessage = updatedChat.messages[updatedChat.messages.length - 1];

    // Emit via Socket.IO if available
    const donation = await Donation.findById(chat.donationId);
    if (donation) {
      io.to(`chat_${donation._id}`).emit('new_message', {
        chatId: chat._id,
        message: newMessage
      });
    }

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: newMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Food Posts API Routes
const foodPostRoutes = require('./routes/foodPosts');
app.use('/api/food-posts', foodPostRoutes);

// Socket.IO Event Handlers
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.userName = user.name;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.userName} connected to chat`);

  // Join chat room and send chat history
  socket.on('join_chat', async (data) => {
    try {
      const { donationId, receiverId } = data;
      const userId = socket.userId;

      console.log(`User ${socket.userName} joining chat for donation ${donationId}`);

      // Validate donation exists
      const donation = await Donation.findById(donationId).populate('userId', 'name email');
      if (!donation) {
        socket.emit('chat_error', { message: 'Donation not found' });
        return;
      }

      // Determine participants (donor and receiver)
      let participants = [];
      if (receiverId) {
        // Receiver is starting the chat
        participants = [donation.userId._id, receiverId];
      } else {
        // Donor is accessing the chat, need to find receiver from reservation
        if (donation.reservedBy) {
          participants = [donation.userId._id, donation.reservedBy];
        } else {
          socket.emit('chat_error', { message: 'No receiver found for this donation' });
          return;
        }
      }

      // Ensure current user is one of the participants
      if (!participants.some(p => p.toString() === userId)) {
        socket.emit('chat_error', { message: 'You are not authorized to access this chat' });
        return;
      }

      // Get or create chat
      const chat = await Chat.findOrCreateChat(donationId, participants);
      await chat.populate('participants', 'name email');
      await chat.populate('messages.sender', 'name email');

      // Join the chat room
      const roomName = `chat_${donation._id}`;
      socket.join(roomName);
      console.log(`User ${socket.userName} joined chat room: ${roomName}`);

      // Send chat history
      socket.emit('chat_history', {
        chatId: chat._id,
        donationId: chat.donationId,
        participants: chat.participants,
        messages: chat.messages,
        lastActivity: chat.lastActivity
      });

    } catch (error) {
      console.error('Join chat error:', error);
      socket.emit('chat_error', { message: 'Failed to join chat' });
    }
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const { chatId, message, donationId } = data;
      const userId = socket.userId;

      console.log(`User ${socket.userName} sending message to chat ${chatId}`);

      if (!message || message.trim().length === 0) {
        socket.emit('chat_error', { message: 'Message content is required' });
        return;
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit('chat_error', { message: 'Chat not found' });
        return;
      }

      // Check if user is participant
      if (!chat.participants.some(p => p.toString() === userId)) {
        socket.emit('chat_error', { message: 'You are not authorized to send messages in this chat' });
        return;
      }

      // Add message
      await chat.addMessage(userId, message.trim());

      // Get the new message with populated sender
      const updatedChat = await Chat.findById(chatId)
        .populate('messages.sender', 'name email');
      
      const newMessage = updatedChat.messages[updatedChat.messages.length - 1];

      // Emit to all users in the chat room EXCEPT the sender
      const donation = await Donation.findById(donationId || chat.donationId);
      if (donation) {
        const roomName = `chat_${donation._id}`;
        socket.to(roomName).emit('new_message', {
          chatId: chat._id,
          message: newMessage
        });
        console.log(`Message sent to room ${roomName} (excluding sender):`, newMessage.content);
      }

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('chat_error', { message: 'Failed to send message' });
    }
  });

  // Mark messages as read
  socket.on('mark_as_read', async (data) => {
    try {
      const { chatId } = data;
      const userId = socket.userId;

      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit('chat_error', { message: 'Chat not found' });
        return;
      }

      // Check if user is participant
      if (!chat.participants.some(p => p.toString() === userId)) {
        socket.emit('chat_error', { message: 'You are not authorized to access this chat' });
        return;
      }

      // Mark messages as read
      await chat.markAsRead(userId);

      console.log(`User ${socket.userName} marked messages as read in chat ${chatId}`);

    } catch (error) {
      console.error('Mark as read error:', error);
      socket.emit('chat_error', { message: 'Failed to mark messages as read' });
    }
  });

  // Handle disconnect
});

// Admin middleware to check if user is admin
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ==================== ADMIN ROUTES ====================

// Get all users (admin only)
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      users: users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || null
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's donations
    await Donation.deleteMany({ donor: userId });
    
    // Delete user's chats
    await Chat.deleteMany({ participants: userId });
    
    // Delete the user
    await User.findByIdAndDelete(userId);

    console.log(`Admin ${req.user.email} deleted user ${user.email}`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Get all donations (admin only)
app.get('/api/admin/donations', adminAuth, async (req, res) => {
  try {
    const donations = await Donation.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      donations: donations.map(donation => ({
        _id: donation._id,
        description: donation.description,
        quantity: donation.quantity,
        foodType: donation.foodType,
        foodCategory: donation.foodCategory,
        location: donation.location,
        expiryDate: donation.expiryDate,
        imagePath: donation.imagePath,
        status: donation.status,
        donor: donation.userId,
        createdAt: donation.createdAt
      }))
    });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ message: 'Failed to fetch donations' });
  }
});

// Delete donation (admin only)
app.delete('/api/admin/donations/:donationId', adminAuth, async (req, res) => {
  try {
    const { donationId } = req.params;
    
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Delete associated chats
    await Chat.deleteMany({ donationId: donationId });
    
    // Delete the donation
    await Donation.findByIdAndDelete(donationId);

    console.log(`Admin ${req.user.email} deleted donation ${donation.title}`);
    res.json({ success: true, message: 'Donation deleted successfully' });
  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ message: 'Failed to delete donation' });
  }
});

// Get admin dashboard statistics
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonations = await Donation.countDocuments();
    const activeDonations = await Donation.countDocuments({ status: 'available' });
    const completedDonations = await Donation.countDocuments({ status: 'completed' });
    const totalChats = await Chat.countDocuments();
    
    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const newUsersThisWeek = await User.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });
    const newDonationsThisWeek = await Donation.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });

    // Food type breakdown
    const vegDonations = await Donation.countDocuments({ foodType: 'Veg' });
    const nonVegDonations = await Donation.countDocuments({ foodType: 'Non-Veg' });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalDonations,
        activeDonations,
        completedDonations,
        totalChats,
        newUsersThisWeek,
        newDonationsThisWeek,
        vegDonations,
        nonVegDonations
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Get all chats (admin only)
app.get('/api/admin/chats', adminAuth, async (req, res) => {
  try {
    const chats = await Chat.find({})
      .populate('participants', 'name email')
      .populate('donationId', 'title')
      .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      chats: chats.map(chat => ({
        _id: chat._id,
        participants: chat.participants,
        donationId: chat.donationId,
        messageCount: chat.messages.length,
        lastMessage: chat.messages[chat.messages.length - 1] || null,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Failed to fetch chats' });
  }
});

// Update user role (admin only)
app.put('/api/admin/users/:userId/role', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      userId, 
      { role }, 
      { new: true, select: '-password' }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`Admin ${req.user.email} updated user ${user.email} role to ${role}`);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// Get user's own donations
app.get('/api/my-donations', authenticateToken, async (req, res) => {
  try {
    const donations = await Donation.find({ userId: req.user.userId })
      .populate('reservedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      donations: donations
    });
  } catch (error) {
    console.error('Get my donations error:', error);
    res.status(500).json({ message: 'Failed to fetch your donations' });
  }
});

// Update donation status (donor or admin)
app.put('/api/donations/:donationId/status', authenticateToken, async (req, res) => {
  try {
    const { donationId } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['available', 'reserved', 'picked_up', 'delivered', 'expired', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Find donation and verify ownership or admin access
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    // Allow access for donation owner or admin
    const isOwner = donation.userId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this donation' });
    }
    
    // Update status
    donation.status = status;
    donation.updatedAt = new Date();
    
    if (status === 'delivered') {
      donation.pickedUpAt = new Date();
    }
    
    await donation.save();
    
    res.json({
      success: true,
      message: 'Donation status updated successfully',
      donation: donation
    });
  } catch (error) {
    console.error('Update donation status error:', error);
    res.status(500).json({ message: 'Failed to update donation status' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 ZeroWaste Backend server running on port ${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}`);
  console.log(`💬 Socket.IO chat enabled`);
  console.log(`🔐 Test credentials:`);
  console.log(`   Email: john@example.com | Password: password`);
  console.log(`   Email: admin@zerowaste.com | Password: password`);
});
