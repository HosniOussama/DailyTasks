const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Op } = require('sequelize');

// Helper function to format validation errors
const formatValidationErrors = (error) => {
  if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
    return error.errors.reduce((acc, err) => {
      acc[err.path] = err.message;
      return acc;
    }, {});
  }
  return null;
};

// Register a new user
const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required',
        errors: {
          ...((!username && { username: 'Username is required' }) || {}),
          ...((!email && { email: 'Email is required' }) || {}),
          ...((!password && { password: 'Password is required' }) || {})
        }
      });
    }

    console.log('Checking for existing user with:', { username, email });

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Username or email already exists'
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password, // Password will be hashed by the model hook
      role: role || 'user' // Default to 'user' if not specified
    });

    // All registrations now require approval
    res.status(201).json({
      message: 'Registration successful! Your account is pending approval. Please wait for an admin to approve your account.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors
    const validationErrors = formatValidationErrors(error);
    if (validationErrors) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validationErrors
      });
    }

    res.status(500).json({
      message: 'Error registering user',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    console.log('Login attempt:', { email, role }); // Log login attempt

    if (!email || !password) {
      console.log('Missing credentials');
      return res.status(400).json({
        message: 'Email and password are required',
        errors: {
          ...((!email && { email: 'Email is required' }) || {}),
          ...((!password && { password: 'Password is required' }) || {})
        }
      });
    }

    // Find user
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Looking for user with email:', normalizedEmail);
    
    const user = await User.findOne({ 
      where: { 
        email: normalizedEmail,
        ...(role && { role }) // Include role in query if provided
      } 
    });

    console.log('User found:', user ? {
      id: user.id,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved
    } : 'No user found');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
        errors: {
          email: 'No account found with this email address'
        }
      });
    }

    // Check if user is approved
    if (!user.isApproved) {
      console.log('User not approved');
      return res.status(403).json({
        message: 'Account pending approval',
        errors: {
          account: 'Your account is pending approval'
        }
      });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    console.log('Password validation:', isValidPassword ? 'success' : 'failed');

    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Invalid credentials',
        errors: {
          password: 'Incorrect password'
        }
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', user.email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle validation errors
    const validationErrors = formatValidationErrors(error);
    if (validationErrors) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validationErrors
      });
    }

    res.status(500).json({
      message: 'Error logging in',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'role', 'isApproved']
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// Get pending user registrations (admin only)
const getPendingUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    const pendingUsers = await User.findAll({
      where: { isApproved: false },
      attributes: ['id', 'username', 'email', 'role', 'createdAt']
    });

    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching pending users',
      error: error.message
    });
  }
};

// Approve or reject user registration (admin only)
const handleUserApproval = async (req, res, action) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    const { userId } = req.params;
    console.log('Processing user approval:', { userId, action });

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (action === 'approve') {
      await user.update({ isApproved: true });
      console.log('User approved successfully:', user.email);
      res.json({ 
        message: 'User approved successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isApproved: true
        }
      });
    } else if (action === 'reject') {
      const userEmail = user.email;
      await user.destroy();
      console.log('User rejected and removed:', userEmail);
      res.json({ 
        message: 'User rejected and removed',
        user: { id: userId }
      });
    } else {
      res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error handling user approval:', error);
    res.status(500).json({
      message: 'Error handling user approval',
      error: error.message
    });
  }
};

module.exports = { 
  register, 
  login, 
  getProfile,
  getPendingUsers,
  handleUserApproval
};