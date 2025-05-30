const User = require('../models/User');
const sequelize = require('../config/database');

async function checkAdminAccount() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    const adminUser = await User.findOne({
      where: {
        email: 'hosnioussama512@gmail.com'
      }
    });

    if (adminUser) {
      console.log('Admin account found:', {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        isApproved: adminUser.isApproved,
        passwordLength: adminUser.password?.length || 0
      });

      // Test password validation
      const testPassword = 'admin123';
      const isValidPassword = await adminUser.validatePassword(testPassword);
      console.log('Password validation test:', {
        testPassword,
        isValid: isValidPassword
      });
    } else {
      console.log('Admin account not found!');
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error checking admin account:', error);
  }
}

checkAdminAccount(); 