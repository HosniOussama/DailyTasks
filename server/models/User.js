const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    unique: {
      msg: 'This email is already registered'
    },
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Email cannot be empty'
      },
      isEmail: {
        msg: 'Please provide a valid email address'
      },
      normalizeEmail(value) {
        // Convert email to lowercase before saving
        this.setDataValue('email', value.toLowerCase().trim());
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Password cannot be empty'
      },
      len: {
        args: [6, 100],
        msg: 'Password must be at least 6 characters long'
      }
    }
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user'
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  tableName: 'Users',  // Explicitly set the table name
  timestamps: true,    // Enable timestamps (createdAt, updatedAt)
  hooks: {
    beforeValidate: async (user) => {
      if (user.username) {
        user.username = user.username.trim();
      }
      if (user.email) {
        user.email = user.email.toLowerCase().trim();
      }
    },
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      // All users start as unapproved
      user.isApproved = false;
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to check password
User.prototype.validatePassword = async function(password) {
  console.log('Validating password for user:', this.email);
  const result = await bcrypt.compare(password, this.password);
  console.log('Password validation result:', result);
  return result;
};

module.exports = User;