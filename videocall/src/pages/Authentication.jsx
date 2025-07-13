import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Authcontext } from "../context/Authcontext";
import "../styles/Authentication.css";
import { GoogleLogin } from '@react-oauth/google';
// import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
// import { LinkedIn } from 'react-linkedin-login-oauth2';

export default function Authentication({setShowForm}) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", username: "", password: "" });
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
      if (mode === "login") {
        await handleLogin(form.username, form.password);
        navigate("/dashboard");
      } else {
        if (!form.name) {
          setError("Name is required for registration");
          return;
        }
        await handleRegister(form.name, form.username, form.password);
        setMode("login");
        setForm({ name: "", username: "", password: "" });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button className="auth-modal-close" title="Close"><span  onClick={() => setShowForm(false)}>&times;</span></button>
        <div className="auth-header">
          <h2>{mode === "login" ? "Sign in to VideoMeet" : "Create your VideoMeet account"}</h2>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
          {mode === "register" && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
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
              value={form.username}
              onChange={handleChange}
              placeholder="Username"
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-btn" type="submit" disabled={isLoading}>
            {isLoading ? (mode === "login" ? "Signing in..." : "Registering...") : (mode === "login" ? "Sign In" : "Register")}
          </button>
        </form>
        {/* Social Login Buttons */}
        <div className="social-login-container">
          {/* <div className="social-divider"><span>or sign in with</span></div> */}
          <div className="social-buttons">
            {/* Google Login */}
            <GoogleLogin
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
              width="240px"
            />
            {/* Facebook Login - Temporarily disabled
            <FacebookLogin
              appId="YOUR_FACEBOOK_APP_ID"
              callback={response => {
                console.log('Facebook response:', response);
                if (response.status === 'unknown') setError('Facebook Sign In Failed');
              }}
              render={renderProps => (
                <button className="social-btn facebook" onClick={renderProps.onClick} type="button">
                  <i className="fab fa-facebook"></i> Facebook
                </button>
              )}
            />
            */}
            {/* LinkedIn Login - Temporarily disabled
            <LinkedIn
              clientId="YOUR_LINKEDIN_CLIENT_ID"
              onSuccess={code => {
                console.log('LinkedIn code:', code);
              }}
              onError={err => {
                setError('LinkedIn Sign In Failed');
              }}
              redirectUri={window.location.origin + '/auth'}
              renderElement={({ onClick, disabled }) => (
                <button className="social-btn linkedin" onClick={onClick} disabled={disabled} type="button">
                  <i className="fab fa-linkedin"></i> LinkedIn
                </button>
              )}
            />
            */}
          </div>
        </div>
        <div className="auth-toggle">
          <div className="toggle-divider" />
          {mode === "login" ? (
            <>
              <span>Don't have an account?</span>
              <button type="button" className="toggle-btn" onClick={() => setMode("register")}>Register</button>
            </>
          ) : (
            <>
              <span>Already have an account?</span>
              <button type="button" className="toggle-btn" onClick={() => setMode("login")}>Sign In</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 