const jwt = require('jsonwebtoken');
require('dotenv').config();

// Debug authentication issues
console.log('=== Authentication Debug ===');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);

// Test token creation and verification
try {
  const testPayload = { userId: 1, role: 'client' };
  const testToken = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
  console.log('✅ Token creation successful');
  
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
  console.log('✅ Token verification successful');
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.error('❌ JWT Error:', error.message);
}

console.log('=== Environment Variables ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
