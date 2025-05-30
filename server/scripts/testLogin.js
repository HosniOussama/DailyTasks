const axios = require('axios');

async function testLogin() {
  try {
    console.log('Attempting to login...');
    
    const loginData = {
      email: 'hosnioussama512@gmail.com',
      password: 'admin123',
      role: 'admin'
    };

    console.log('Login attempt with:', { ...loginData, password: '***' });

    const response = await axios.post(
      'http://localhost:5000/api/auth/login',
      loginData
    );

    console.log('Login successful!');
    console.log('Response:', {
      message: response.data.message,
      user: response.data.user,
      hasToken: !!response.data.token
    });
  } catch (error) {
    console.error('Login failed!');
    console.error('Error:', {
      message: error.response?.data?.message || error.message,
      errors: error.response?.data?.errors,
      status: error.response?.status
    });
  }
}

// Run the test
testLogin(); 