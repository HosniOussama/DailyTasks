const User = require('../models/User');
const sequelize = require('../config/database');

async function createAdminUser() {
  try {
    await sequelize.sync();

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: {
        email: 'hosnioussama512@gmail.com'
      }
    });

    if (existingAdmin) {
      // Update role to admin if user exists
      await existingAdmin.update({
        role: 'admin',
        isApproved: true
      });
      console.log('Existing user updated to admin role');
      return;
    }

    // Create new admin user
    await User.create({
      username: 'admin',
      email: 'hosnioussama512@gmail.com',
      password: 'admin123', // You should change this password
      role: 'admin'
      // isApproved will be set to true automatically by the beforeCreate hook
    });

    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the function
createAdminUser(); 