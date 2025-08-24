// Debug authentication and receipt upload issue
console.log('=== Client Authentication Debug ===');

// Check if user is logged in
const token = localStorage.getItem('authToken');
const userData = localStorage.getItem('userData');

console.log('Auth Token exists:', !!token);
console.log('User Data exists:', !!userData);

if (token) {
  console.log('Token length:', token.length);
  console.log('Token starts with:', token.substring(0, 20) + '...');
}

if (userData) {
  try {
    const user = JSON.parse(userData);
    console.log('User data:', user);
  } catch (e) {
    console.error('Invalid user data in localStorage:', e);
  }
}

// Test API call to verify authentication
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000,
});

// Add auth header
if (token) {
  api.defaults.headers.Authorization = `Bearer ${token}`;
}

// Test authentication
api.get('/transactions')
  .then(response => {
    console.log('✅ Authentication test successful');
    console.log('Response:', response.data);
  })
  .catch(error => {
    console.error('❌ Authentication test failed');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Full error:', error);
  });
