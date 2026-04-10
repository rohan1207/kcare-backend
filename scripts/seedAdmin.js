const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kcare-clinic';

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'kcare@admin' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. Updating password...');
      // Set password and mark as modified to trigger pre-save hook
      existingAdmin.set('password', 'Kcareclinic@2026');
      await existingAdmin.save();
      console.log('✅ Admin password updated successfully');
    } else {
      // Create new admin
      const admin = new Admin({
        email: 'Kcare@admin',
        password: 'Kcareclinic@2026',
        name: 'K Care Admin',
        role: 'admin'
      });

      await admin.save();
      console.log('✅ Admin user created successfully');
      console.log('📧 Email: Kcare@admin');
      console.log('🔑 Password: Kcareclinic@2026');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();

