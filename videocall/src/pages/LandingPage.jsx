import React, { useState } from "react";
import "../styles/LandingPage.css";
import Authentication from "./Authentication";
import { useNavigate } from "react-router-dom";

// If you use the illustration, use the public path:
// const illustration = "/video-illustration.png";

const LandingPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const handleAuthClick = () => {
    setIsLogin(prev => !prev);
    setShowForm(true);
    setSidebarOpen(false);
  };

  return (
    <div className="landing-container">
      {/* Navbar */}
      <div className="nav">
        {!sidebarOpen && (
          <button className="menu-btn" onClick={toggleSidebar}>☰</button>
        )}
        <div className="h1">
          <h1>VideoMeet</h1>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "show" : ""}`}>
        <button className="close-btn" onClick={toggleSidebar}>✕</button>
        <a href="#auth" onClick={handleAuthClick}>
          {isLogin ? (
            <><span className="icon">📝</span> Register</>
          ) : (
            <><span className="icon">🔑</span> Login</>
          )}
        </a>
        <a href="/"><span className="icon">🏠</span> Home</a>
        <a href="#about"><span className="icon">👤</span> About Us</a>
      </div>

      {/* Main Content */}
      <div className="landing-content">
        <div className="hero">
          <img src="https://www.stuff.tv/wp-content/uploads/sites/2/2021/08/stuff-video-call-apps-2020-lead_0.png?w=1080" width={500} />
          <h2>Welcome to <span>VideoMeet</span></h2>
          <p>One-click HD video meetings, no hassle. Talk, share and collaborate — all in one place.</p>
          <button onClick={() => setShowForm(true)}>Get Started</button>
          
        </div>
        {showForm && (
          <div className="auth-modal-overlay" onClick={() => setShowForm(false)}>
            <div className="auth-modal" onClick={e => e.stopPropagation()}>
              <div className="auth-card-modal-wrapper">
                
                  
                  <Authentication setShowForm={setShowForm}/>
                
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;