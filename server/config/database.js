const { Sequelize } = require('sequelize');
const path = require('path');
const bcrypt = require('bcryptjs');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false, // Disable logging for cleaner output
  define: {
    timestamps: true, // Add createdAt and updatedAt timestamps
    underscored: true, // Use snake_case for fields
    freezeTableName: true // Prevent pluralization of table names
  }
});

// Function to create admin account
const createAdminAccount = async () => {
  try {
    const User = require('../models/User');
    const adminEmail = 'hosnioussama512@gmail.com';
    
    // Check if admin already exists
    let adminUser = await User.findOne({
      where: {
        email: adminEmail
      }
    });

    if (adminUser) {
      // If admin exists but not approved, update it
      if (!adminUser.isApproved) {
        await adminUser.update({
          isApproved: true,
          role: 'admin'
        });
        console.log('Admin account updated and approved');
      }
    } else {
      // If admin doesn't exist, create it
      // Don't hash password here - let the model hook do it
      adminUser = await User.create({
        username: 'admin',
        email: adminEmail,
        password: 'admin123', // Will be hashed by model hook
        role: 'admin',
        isApproved: true
      });
      console.log('Admin account created successfully');
    }

    // Double check to ensure the account is approved
    const verifyAdmin = await User.findOne({
      where: { email: adminEmail }
    });
    
    if (verifyAdmin && !verifyAdmin.isApproved) {
      await User.update(
        { isApproved: true, role: 'admin' },
        { where: { email: adminEmail } }
      );
      console.log('Admin approval enforced');
    }

  } catch (error) {
    console.error('Error managing admin account:', error);
  }
};

// Test the connection and sync the database
const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync all models with force: true to recreate tables
    await sequelize.sync({ force: true });
    console.log('Database synced successfully');

    // Create admin account after sync
    await createAdminAccount();

  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

// Initialize the database when this module is imported
initDatabase();

module.exports = sequelize;