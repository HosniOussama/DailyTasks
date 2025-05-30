const { Sequelize } = require('sequelize');
const config = require('../config/config.json');
const User = require('../models/User');

async function initializeDatabase() {
  try {
    const env = process.env.NODE_ENV || 'development';
    const dbConfig = config[env];

    // Create Sequelize instance
    const sequelize = new Sequelize({
      ...dbConfig,
      logging: false
    });

    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync all models
    await sequelize.sync({ force: true }); // This will drop all tables and recreate them
    console.log('Database structure synchronized.');

    // Check if admin exists
    let adminUser = await User.findOne({
      where: {
        email: 'hosnioussama512@gmail.com'
      }
    });

    if (!adminUser) {
      // Create admin user if doesn't exist
      adminUser = await User.create({
        username: 'admin',
        email: 'hosnioussama512@gmail.com',
        password: 'admin123', // Will be hashed by model hooks
        role: 'admin',
        isApproved: true
      });
      console.log('Admin user created successfully.');
    } else {
      // Update existing admin user
      await adminUser.update({
        role: 'admin',
        isApproved: true,
        password: 'admin123' // Will be hashed by model hooks
      });
      console.log('Existing admin user updated successfully.');
    }

    console.log('Admin user details:', {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role,
      isApproved: adminUser.isApproved
    });

    await sequelize.close();
    console.log('Database initialization completed.');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase(); 