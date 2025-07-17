import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Authcontext } from "../context/Authcontext";
import { API_BASE_URL } from "../config/api";
import "../styles/Authentication.css";
// import { GoogleLogin } from '@react-oauth/google';
// import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
// import { LinkedIn } from 'react-linkedin-login-oauth2';

export default function Authentication({setShowForm}) {
  const [isRegister, setIsRegister] = useState(true);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { handleLogin, handleRegister, isLoading, handleSocialLogin } = useContext(Authcontext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const endpoint = isRegister ? "/register" : "/login";
      const payload = isRegister ? { name, username, password } : { username, password };
      const res = await fetch(`${API_BASE_URL}/api/v1/users${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        // Redirect to dashboard or show success
        window.location.href = "/dashboard";
      } else {
        setError(data.message || "Something went wrong");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button className="auth-modal-close" title="Close"><span  onClick={() => setShowForm(false)}>&times;</span></button>
        <div className="auth-header">
          <h2>{isRegister ? "Create your VideoMeet account" : "Sign In to VideoMeet"}</h2>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="username">Email Id</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Email Id"
              autoComplete="Email Id"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
            />
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-btn" type="submit" disabled={isLoading}>
            {isLoading ? (isRegister ? "Registering..." : "Signing in...") : (isRegister ? "Register" : "Sign In")}
          </button>
        </form>
        {/* Social Login Buttons */}
        <div className="social-login-container">
          {/* <div className="social-divider"><span>or sign in with</span></div> */}
          <div className="social-buttons">
            {/* Google Login */}
            {/* <GoogleLogin
              onSuccess={async credentialResponse => {
                try {
                  await handleSocialLogin('google', credentialResponse.credential);
                } catch (err) {
                  setError(err.response?.data?.message || err.message || 'Google Sign In Failed');
                }
              }}
              onError={() => {
                setError('Google Sign In Failed');
              }}
              width="340px"
            /> */}
           
          </div>
        </div>
        <div className="auth-toggle">
          <div className="toggle-divider" />
          {isRegister ? (
            <>
              <span>Already have an account?</span>
              <button type="button" className="toggle-btn" onClick={() => setIsRegister(false)}>Sign In</button>
            </>
          ) : (
            <>
              <span>Don't have an account?</span>
              <button type="button" className="toggle-btn" onClick={() => setIsRegister(true)}>Register</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 