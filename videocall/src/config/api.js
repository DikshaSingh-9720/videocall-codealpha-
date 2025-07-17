// API Configuration
const getApiUrl = () => {
  if (import.meta.env.DEV) {
    // 👇 Replace with your PC's IP address for local testing on mobile
    return "http://192.168.115.110:5000"; // Example IP address
  }

  // For production - Replace with your actual deployed backend URL
  return import.meta.env.VITE_API_URL || "https://videomeet-backend-7c7e.onrender.com";
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = getApiUrl();
