const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@zerowaste.com' });
    
    if (existingAdmin) {
      // Update existing user to admin role
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('✅ Updated existing user admin@zerowaste.com to admin role');
    } else {
      // Create new admin user
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@zerowaste.com',
        password: 'password',
        role: 'admin'
      });

      await adminUser.save();
      console.log('✅ Created new admin user: admin@zerowaste.com');
    }

    // Also update john@example.com to admin for testing
    const johnUser = await User.findOne({ email: 'john@example.com' });
    if (johnUser) {
      johnUser.role = 'admin';
      await johnUser.save();
      console.log('✅ Updated john@example.com to admin role');
    }

    console.log('\n🛡️ Admin users ready:');
    console.log('   Email: admin@zerowaste.com | Password: password');
    console.log('   Email: john@example.com | Password: password');
    console.log('\n🚀 You can now access the admin dashboard!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createAdminUser();
