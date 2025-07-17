import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function GoogleAuthHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      // Optionally, fetch user info or set auth state here
      navigate("/dashboard"); // or wherever you want to redirect
    } else {
      // Handle error
      navigate("/login");
    }
  }, [navigate]);

  return <div>Logging you in...</div>;
} 