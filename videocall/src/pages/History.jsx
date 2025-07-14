import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Authcontext } from '../context/Authcontext';
import '../styles/History.css';

export default function History() {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { getHistory, logout } = useContext(Authcontext);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    loadHistory();
  }, [navigate]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await getHistory();
      setMeetings(data.meetings || data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load meeting history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinMeeting = (meetingCode) => {
    navigate(`/${meetingCode}`);
  };

  const handleLogout = () => {
    logout();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="history-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your meeting history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="header-content">
          <h1>Meeting History</h1>
          <p>Your recent video meetings and calls</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={loadHistory}>
            <span className="icon"><i className="fas fa-sync-alt"></i></span>
            Refresh
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="icon"><i className="fas fa-sign-out-alt"></i></span>
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="icon"><i className="fas fa-exclamation-triangle"></i></span>
          {error}
          <button onClick={loadHistory} className="retry-btn">Try Again</button>
        </div>
      )}

      <div className="history-content">
        {meetings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><i className="fas fa-video"></i></div>
            <h3>No meetings yet</h3>
            <p>Start your first video meeting to see it here</p>
            <button 
              className="create-meeting-btn"
              onClick={() => navigate('/dashboard')}
            >
              <span className="icon"><i className="fas fa-plus"></i></span>
              Create Meeting
            </button>
          </div>
        ) : (
          <div className="meetings-grid">
            {meetings.map((meeting, index) => (
              <div key={index} className="meeting-card">
                <div className="meeting-info">
                  <div className="meeting-code">
                    <span className="code-label">Meeting ID:</span>
                    <span className="code-value">{meeting.meeting_code || meeting.code}</span>
                  </div>
                  <div className="meeting-time">
                    <span className="time-label">Joined:</span>
                    <span className="time-value">
                      {formatDate(meeting.created_at || meeting.timestamp || Date.now())}
                    </span>
                  </div>
                </div>
                <div className="meeting-actions">
                  <button 
                    className="join-meeting-btn"
                    onClick={() => handleJoinMeeting(meeting.meeting_code || meeting.code)}
                  >
                    <span className="icon"><i className="fas fa-play"></i></span>
                    Join Again
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}