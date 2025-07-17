const getApiUrl = () => {
  if (import.meta.env.DEV) {
    return "http://192.168.115.110:5000"; // Local IP for mobile testing
  }

  // For production, always use deployed backend
  return import.meta.env.VITE_API_URL || "https://videomeet-backend-7c7e.onrender.com";
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = getApiUrl();
