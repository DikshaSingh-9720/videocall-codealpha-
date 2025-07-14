#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up VideoMeet for mobile testing...\n');

// Get local IP address
function getLocalIP() {
  try {
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const interface of interfaces[name]) {
        if (interface.family === 'IPv4' && !interface.internal) {
          return interface.address;
        }
      }
    }
  } catch (error) {
    console.error('Error getting IP address:', error);
  }
  return 'localhost';
}

const localIP = getLocalIP();
const apiUrl = `http://${localIP}:5000`;

console.log(`📱 Your computer's IP address: ${localIP}`);
console.log(`🔗 API URL for mobile: ${apiUrl}\n`);

// Create .env.local file
const envContent = `# Mobile testing configuration
VITE_API_URL=${apiUrl}
`;

const envPath = path.join(__dirname, '.env.local');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file with mobile configuration');
} catch (error) {
  console.error('❌ Error creating .env.local file:', error);
}

console.log('\n📋 Next steps:');
console.log('1. Make sure your phone and computer are on the same WiFi network');
console.log('2. Start the backend server: cd Backend && npm run dev');
console.log('3. Start the frontend: npm run dev');
console.log('4. Access the app on your phone using your computer\'s IP address');
console.log(`   Example: http://${localIP}:5173`);
console.log('\n⚠️  Note: You may need to allow the connection through your firewall'); 