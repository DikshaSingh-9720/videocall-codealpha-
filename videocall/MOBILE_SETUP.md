# Mobile Testing Setup Guide

## Problem
When accessing the VideoMeet app from your phone, you get network errors because the app is hardcoded to use `localhost:5000`, which refers to the phone itself, not your development computer.

## Solution

### Step 1: Run the Setup Script
```bash
npm run setup-mobile
```

This script will:
- Find your computer's IP address
- Create a `.env.local` file with the correct API URL
- Show you the URL to access from your phone

### Step 2: Start the Backend Server
```bash
cd Backend
npm run dev
```

The backend will now listen on `0.0.0.0:5000`, allowing connections from other devices.

### Step 3: Start the Frontend
```bash
npm run dev
```

The frontend will now be accessible from other devices on your network.

### Step 4: Access from Your Phone
1. Make sure your phone and computer are on the same WiFi network
2. Open your phone's browser
3. Navigate to the URL shown by the setup script (e.g., `http://192.168.1.100:5173`)

## Troubleshooting

### Firewall Issues
If you can't connect, you may need to allow the connections through your firewall:
- **Windows**: Allow Node.js and the development server through Windows Firewall
- **Mac**: Allow incoming connections for the development server
- **Linux**: Check if your firewall is blocking the ports

### Network Issues
- Ensure both devices are on the same WiFi network
- Try using your computer's IP address instead of localhost
- Check if your router blocks local network connections

### Port Issues
- Make sure ports 5000 (backend) and 5173 (frontend) are not blocked
- Some corporate networks may block these ports

## Manual Configuration

If the setup script doesn't work, you can manually create a `.env.local` file:

```env
VITE_API_URL=http://YOUR_COMPUTER_IP:5000
```

Replace `YOUR_COMPUTER_IP` with your computer's actual IP address.

## Finding Your IP Address

### Windows
```cmd
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter.

### Mac/Linux
```bash
ifconfig
# or
ip addr
```
Look for your WiFi interface (usually `wlan0` or `en0`).

## Testing the Connection

1. Open your phone's browser
2. Try accessing `http://YOUR_COMPUTER_IP:5000` - you should see a response
3. If that works, try the full app URL: `http://YOUR_COMPUTER_IP:5173`

## Security Note

This setup is for development/testing only. In production, you should:
- Use HTTPS
- Implement proper authentication
- Use a proper domain name
- Configure CORS properly 