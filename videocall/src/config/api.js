// API Configuration
const getApiUrl = () => {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    // For mobile testing, you can change this to your computer's IP address
    // Example: return "http://192.168.1.100:5000";
    return import.meta.env.VITE_API_URL || "http://localhost:5000";
  }
  
  // For production, use environment variable or default
  return import.meta.env.VITE_API_URL || "http://localhost:5000";
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = getApiUrl(); 