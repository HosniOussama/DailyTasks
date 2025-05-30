const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const adminEmail = 'hosnioussama512@gmail.com';
    
    // Check if admin already exists
    const existingAdmin = await queryInterface.sequelize.query(
      `SELECT id FROM Users WHERE email = ?`,
      {
        replacements: [adminEmail],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (existingAdmin.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await queryInterface.bulkInsert('Users', [{
        username: 'admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', {
      email: 'hosnioussama512@gmail.com'
    });
  }
}; 