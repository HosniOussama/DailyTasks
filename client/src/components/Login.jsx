import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' // Default role
  });
  const navigate = useNavigate();

  // Check if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? 'login' : 'register';
      console.log('Submitting to:', endpoint);
      
      // Prepare the data based on whether it's login or register
      const submitData = isLogin ? {
        email: formData.email,
        password: formData.password,
        role: formData.role
      } : formData;

      console.log('Form data:', { ...submitData, password: '***' });

      const res = await axios.post(`http://localhost:5000/api/auth/${endpoint}`, submitData);
      console.log('Response:', { ...res.data, token: res.data.token ? 'exists' : 'none' });
      
      if (res.data.token) {
        console.log('Token received, storing in localStorage');
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        // Call the onLoginSuccess callback to update auth state
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        
        // Redirect based on user role
        const userRole = res.data.user.role;
        console.log('User role:', userRole);
        navigate(userRole === 'admin' ? '/admin' : '/', { replace: true });
      } else if (!isLogin) {
        setIsLogin(true);
        alert('Registration successful! Please login.');
      }
    } catch (error) {
      console.error('Error during auth:', error.response?.data || error.message);
      alert(error.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">DailyTasks</h2>
        <h3>{isLogin ? 'Login' : 'Register'}</h3>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
              />
              <div className="validation-requirements">
                <p>Username requirements:</p>
                <ul>
                  <li>Must be between 3 and 30 characters</li>
                  <li>Can only contain letters, numbers, and underscores</li>
                  <li>Must be unique</li>
                </ul>
              </div>
            </div>
          )}
          
          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <div className="validation-requirements">
              <p>Password requirements:</p>
              <ul>
                <li>Must be at least 6 characters long</li>
                <li>Cannot be empty</li>
              </ul>
            </div>
          </div>

          <div className="role-selector">
            <label className="role-label">Select Role:</label>
            <div className="role-options">
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={formData.role === 'user'}
                  onChange={handleChange}
                />
                <span>User</span>
              </label>
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={formData.role === 'admin'}
                  onChange={handleChange}
                />
                <span>Admin</span>
              </label>
            </div>
          </div>
          
          <button type="submit" className="auth-button">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        
        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            className="switch-button"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;