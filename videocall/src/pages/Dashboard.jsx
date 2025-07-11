import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/Dashboard.css";
import illustration from "/public/video-illustration.png";
import { Authcontext } from '../context/Authcontext';

export default function Dashboard() {
  const [meetingCode, setMeetingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentMeetings, setRecentMeetings] = useState([]);
  const navigate = useNavigate();

  const { addToUserHistory } = useContext(Authcontext);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
    
    // Load recent meetings from localStorage
    const savedMeetings = localStorage.getItem("recentMeetings");
    if (savedMeetings) {
      setRecentMeetings(JSON.parse(savedMeetings));
    }
  }, [navigate]);

  const handleJoinVideoCall = async () => {
    if (!meetingCode.trim()) {
      setError('Please enter a meeting ID');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await addToUserHistory(meetingCode);
      
      // Save to recent meetings
      const updatedMeetings = [
        { code: meetingCode, timestamp: Date.now() },
        ...recentMeetings.filter(m => m.code !== meetingCode)
      ].slice(0, 5); // Keep only 5 most recent
      
      setRecentMeetings(updatedMeetings);
      localStorage.setItem("recentMeetings", JSON.stringify(updatedMeetings));
      
      navigate(`/${meetingCode}`);
    } catch (err) {
      setError('Failed to join meeting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMeeting = () => {
    const newMeetingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setMeetingCode(newMeetingCode);
    setError('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinVideoCall();
    }
  };

  const handleRecentMeetingClick = (code) => {
    setMeetingCode(code);
    setError('');
  };

  const handleDeleteRecentMeeting = (code) => {
    const updatedMeetings = recentMeetings.filter(m => m.code !== code);
    setRecentMeetings(updatedMeetings);
    localStorage.setItem("recentMeetings", JSON.stringify(updatedMeetings));
  };

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="dashboard-container">
    <div className="dashboard-layout">
      <div className="dashboard-left">
          <div className="welcome-section">
            <div className="logo-section">
             
        <h1>Welcome to <span>VideoMeet</span></h1>
            </div>
            <p className="subtitle">Connect with anyone, anywhere. Start or join a meeting instantly.</p>
          </div>

          <div className="meeting-section">
            <div className="meeting-input-container">
              <div className="input-group">
                <label htmlFor="meeting-code">Meeting ID</label>
          <input
                  id="meeting-code"
            type="text"
                  placeholder="Enter Meeting ID (e.g., ABC123)"
            value={meetingCode}
                  onChange={(e) => {
                    setMeetingCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  onKeyPress={handleKeyPress}
                  className={error ? 'error' : ''}
                  aria-describedby={error ? 'error-message' : undefined}
                  maxLength="10"
                />
                {error && <span id="error-message" className="error-message" role="alert">{error}</span>}
              </div>
              
              <div className="button-group">
                <button 
                  className="join-btn"
                  onClick={handleJoinVideoCall}
                  disabled={isLoading}
                  aria-label={isLoading ? 'Joining meeting...' : 'Join meeting'}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner" aria-hidden="true"></span>
                      Joining...
                    </>
                  ) : (
                    <>
                      <span className="icon" aria-hidden="true"><i className="fas fa-play"></i></span>
                      Join Meeting
                    </>
                  )}
                </button>
                
                <button 
                  className="create-btn"
                  onClick={handleCreateMeeting}
                  disabled={isLoading}
                  aria-label="Create new meeting"
                >
                  <span className="icon" aria-hidden="true"><i className="fas fa-plus"></i></span>
                  Create Meeting
                </button>
              </div>
            </div>

            {recentMeetings.length > 0 && (
              <div className="recent-meetings">
                <h3>Recent Meetings</h3>
                <div className="recent-list">
                  {recentMeetings.map((meeting, index) => (
                    <div key={index} className="recent-item-wrapper" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <button
                        className="recent-item"
                        onClick={() => handleRecentMeetingClick(meeting.code)}
                        aria-label={`Join recent meeting ${meeting.code}`}
                        style={{ flex: 1 }}
                      >
                        <span className="recent-code">{meeting.code}</span>
                        <span className="recent-time">{formatTimeAgo(meeting.timestamp)}</span>
                      </button>
                      <button
                        className="delete-recent-btn"
                        onClick={() => handleDeleteRecentMeeting(meeting.code)}
                        aria-label={`Delete meeting ${meeting.code}`}
                        style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#ff6b6b', fontSize: '1.1rem', cursor: 'pointer' }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="features-section">
              <div className="feature-item">
                <span className="feature-icon" aria-hidden="true"><i className="fas fa-lock"></i></span>
                <span>Secure & Private</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon" aria-hidden="true"><i className="fas fa-bolt"></i></span>
                <span>Instant Connect</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon" aria-hidden="true"><i className="fas fa-mobile-alt"></i></span>
                <span>Cross Platform</span>
              </div>
            </div>
        </div>
      </div>

      <div className="dashboard-right">
          <div className="illustration-container">
        <img src={illustration} alt="Video Call Illustration" />
            <div className="floating-elements" aria-hidden="true">
              <div className="floating-dot dot-1"></div>
              <div className="floating-dot dot-2"></div>
              <div className="floating-dot dot-3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
