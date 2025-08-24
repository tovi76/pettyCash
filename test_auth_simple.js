// Simple test to check authentication and create a test user
const axios = require('axios');

async function testAuth() {
  try {
    console.log('Testing authentication flow...');
    
    // Test login with admin credentials
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      console.log('Token:', loginResponse.data.data.token.substring(0, 20) + '...');
      
      // Test authenticated request
      const token = loginResponse.data.data.token;
      const testResponse = await axios.get('http://localhost:5000/api/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Authenticated request successful');
      console.log('Transactions found:', testResponse.data.data?.length || 0);
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔍 Authentication issue detected');
    }
  }
}

testAuth();
