const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add role column
    await queryInterface.addColumn('Users', 'role', {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false
    });

    // Add isApproved column
    await queryInterface.addColumn('Users', 'isApproved', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Update existing users to be approved
    await queryInterface.sequelize.query(`
      UPDATE Users SET isApproved = true WHERE role = 'admin'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'role');
    await queryInterface.removeColumn('Users', 'isApproved');
  }
}; 