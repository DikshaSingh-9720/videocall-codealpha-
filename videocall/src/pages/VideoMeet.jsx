/**
 * Updated VideoMeetComponent for:
 * - Horizontal, wrapping flex video grid with participant names
 * - Unified chat input for text and file
 * - Sender's messages left, receiver's right
 */
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { useParams } from "react-router-dom";
import styles from "../styles/VideoMeet.module.css";
import Whiteboard from "../components/whiteboard";

const server_url = import.meta.env.VITE_API_URL || "http://localhost:5000";
const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const connections = {};
const iceCandidatesQueue = {};

// Helper to create a blank video track
function createBlankVideoTrack() {
  console.log("[DEBUG] Creating blank video track");
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const stream = canvas.captureStream(5); // 5 fps is enough for a blank track
  return stream.getVideoTracks()[0];
}

export default function VideoMeetComponent() {
  const { meetingId } = useParams();
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const chatMessagesRef = useRef();

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [screen, setScreen] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [file, setFile] = useState(null);
  const [newMessages, setNewMessages] = useState(0);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  // Remove window.localStream and window.blankVideoTrack usage
  // Use refs for local stream and blank track
  const localStreamRef = useRef(null);
  const blankVideoTrackRef = useRef(null);

  // Main logic for toggling video/whiteboard (remove audio from dependency)
  useEffect(() => {
    // Helper to update all peer connections with a new video track
    const updatePeerVideoTracks = (track) => {
      Object.values(connections).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender && track) {
          sender.replaceTrack(track);
        }
      });
    };
    // Main logic for toggling video/whiteboard
    const setupStream = async () => {
      if (video) {
        // Get real camera stream
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          // Set audio tracks to match current audio state
          stream.getAudioTracks().forEach(track => {
            track.enabled = audio;
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          // Replace video tracks for peers
          const videoTrack = stream.getVideoTracks()[0];
          updatePeerVideoTracks(videoTrack);
          // Clean up blank track if it exists
          if (blankVideoTrackRef.current) {
            blankVideoTrackRef.current.stop();
            blankVideoTrackRef.current = null;
          }
        } catch (err) {
          // Handle error (e.g., permissions denied)
        }
      } else {
        // Use blank video track for peers and local preview
        const blankTrack = createBlankVideoTrack();
        blankVideoTrackRef.current = blankTrack;
        updatePeerVideoTracks(blankTrack);
        // Set local preview to blank
        const blankStream = new MediaStream([blankTrack]);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = blankStream;
        }
      }
    };
    setupStream();
  }, [video, showWhiteboard]);

  // Audio toggle effect: only enable/disable the existing audio track
  useEffect(() => {
    if (!localStreamRef.current) return;
    // Ensure all audio tracks are set to the correct enabled state
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = audio;
    });
  }, [audio]);

  // Enter to send, Shift+Enter for newline
  const clearChat = () => {
    setMessages([]);
    setInputValue("");
    setFile(null);
    setNewMessages(0); // Always reset unread count
  };

  const getPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // Set audio tracks to match current audio state
      stream.getAudioTracks().forEach(track => {
        track.enabled = audio;
      });
      setVideoAvailable(true);
      setAudioAvailable(true);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      setVideoAvailable(false);
      setAudioAvailable(false);
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  const connectToSocketServer = () => {
    socketRef.current = io(server_url);
    socketRef.current.on("signal", gotMessageFromServer);
    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", meetingId);
      socketRef.current.on("chat-message", (...args) => {
        console.log("Received chat-message event:", args);
        addMessage(...args);
      });
      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((v) => v.socketId !== id));
      });
      socketRef.current.on("user-joined", (id, clients) => {
        console.log("User joined event:", id, clients);
        clients.forEach((socketListId) => {
          if (connections[socketListId]) return;
          const pc = new RTCPeerConnection(peerConfigConnections);
          connections[socketListId] = pc;
          // Add local tracks
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
              pc.addTrack(track, localStreamRef.current);
            });
          }
          // Handle remote tracks
          pc.ontrack = (event) => {
            setVideos((prev) => {
              // Avoid duplicates
              const already = prev.find(v => v.socketId === socketListId);
              if (already) return prev;
              return [
                ...prev,
                { socketId: socketListId, stream: event.streams[0], name: "Participant" },
              ];
            });
          };
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit("signal", socketListId, JSON.stringify({ ice: event.candidate }));
            }
          };
        });
        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;
            const pc = connections[id2];
            pc.createOffer().then((description) => {
              pc.setLocalDescription(description).then(() => {
                socketRef.current.emit("signal", id2, JSON.stringify({ sdp: description }));
              });
            });
          }
        }
      });
      // Listen for call-ended event
      socketRef.current.on("call-ended", () => {
        const tracks = localVideoRef.current?.srcObject?.getTracks() || [];
        tracks.forEach((track) => track.stop());
        clearChat();
        window.location.href = "/";
      });
    });
  };

  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);
    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        if (!connections[fromId]) {
          const pc = new RTCPeerConnection(peerConfigConnections);
          connections[fromId] = pc;
          // Add local tracks
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
              pc.addTrack(track, localStreamRef.current);
            });
          }
          pc.ontrack = (event) => {
            setVideos((prev) => {
              const already = prev.find(v => v.socketId === fromId);
              if (already) return prev;
              return [
                ...prev,
                { socketId: fromId, stream: event.streams[0], name: "Participant" },
              ];
            });
          };
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit("signal", fromId, JSON.stringify({ ice: event.candidate }));
            }
          };
        }
        // Only set remote description if not already stable
        if (connections[fromId].signalingState !== "stable") {
          connections[fromId]
            .setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(() => {
              if (signal.sdp.type === "offer") {
                connections[fromId].createAnswer().then((description) => {
                  connections[fromId].setLocalDescription(description).then(() => {
                    socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: description }));
                  });
                });
              }
            });
        }
      }
      if (signal.ice) {
        if (connections[fromId]) {
          connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice));
        } else {
          iceCandidatesQueue[fromId] = iceCandidatesQueue[fromId] || [];
          iceCandidatesQueue[fromId].push(signal.ice);
        }
      }
      if (iceCandidatesQueue[fromId]) {
        iceCandidatesQueue[fromId].forEach((ice) => {
          connections[fromId].addIceCandidate(new RTCIceCandidate(ice));
        });
        delete iceCandidatesQueue[fromId];
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!screen) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        localVideoRef.current.srcObject = screenStream;
        Object.values(connections).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });
        screenTrack.onended = () => {
          stopScreenShare();
        };
        setScreen(true);
      } catch (err) { }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
    // Set audio tracks to match current audio state
    stream.getAudioTracks().forEach(track => {
      track.enabled = audio;
    });
    const videoTrack = stream.getVideoTracks()[0];
    Object.values(connections).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track.kind === "video");
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    });
    localVideoRef.current.srcObject = stream;
    localStreamRef.current = stream;
    setScreen(false);
  };

  const connect = async () => {
    setAskForUsername(false);
    await getPermissions();
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  const handleEndCall = () => {
    socketRef.current.emit("end-call", meetingId);
    const tracks = localVideoRef.current?.srcObject?.getTracks() || [];
    tracks.forEach((track) => track.stop());
    clearChat();
    window.location.href = "/";
  };

  // Add timestamp to each message
  const addMessage = (data, sender, socketIdSender, type = "text", filename = "", timestamp = null) => {
    setMessages((prev) => {
      const updated = [
        ...prev,
        {
          sender,
          data,
          type: type || "text",
          filename: filename || "",
          timestamp: timestamp || new Date().toISOString(),
          sending: false,
        },
      ];
      console.log("Updated messages array:", updated);
      return updated;
    });
    if (socketIdSender !== socketIdRef.current && !showModal) setNewMessages((prev) => prev + 1);
    if ((type || "text") === "file" && sender === username) {
      setFile(null);
    }
  };

  // Enter to send, Shift+Enter for newline
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format timestamp
  const formatTime = (iso) => {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- Chatbox State and Socket Setup ---
  useEffect(() => {
    if (!socketRef.current) return;
    // Listen for incoming chat messages
    socketRef.current.on("chat-message", (data, sender, socketIdSender, type = "text", filename = "", timestamp = null) => {
      setMessages(prev => [
        ...prev,
        {
          sender,
          data,
          type: type || "text",
          filename: filename || "",
          timestamp: timestamp || new Date().toISOString(),
        }
      ]);
    });
    // Cleanup on unmount
    return () => {
      socketRef.current.off("chat-message");
    };
  }, []);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!socketRef.current) return;
    // Send text if present
    if (inputValue.trim()) {
      socketRef.current.emit("chat-message", inputValue, username, "text", "", new Date().toISOString());
      setInputValue("");
    }
    // Send file if present
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socketRef.current.emit("chat-message", reader.result, username, "file", file.name, new Date().toISOString());
        setFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset unread count when opening the chat modal
  useEffect(() => {
    if (showModal) setNewMessages(0);
  }, [showModal]);

  return (
    <div className={styles.container}>
      {askForUsername ? (
        <div className={styles.videomeet}>
          <video className={styles.myvideo} ref={localVideoRef} autoPlay muted />
          <div className={styles.connect}>
            <h2>Enter your name</h2>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
            <button onClick={connect}>Connect</button>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          <div className={styles.buttonContainers}>
            <button onClick={() => setVideo(!video)}>
              {video ? <i className="fas fa-video"></i> : <i className="fas fa-video-slash"></i>} {video ? "On" : "Off"}
            </button>
            <button onClick={() => setAudio(!audio)}>
              {audio ? <i className="fas fa-microphone"></i> : <i className="fas fa-microphone-slash"></i>} On
            </button>
            {screenAvailable && (
              <button onClick={() => toggleScreenShare()}>
                {screen ? <i className="fas fa-stop"></i> : <i className="fas fa-desktop"></i>} {screen ? "Stop" : "Share"}
              </button>
            )}
            <button onClick={handleEndCall} style={{ color: "red" }}>
              <i className="fas fa-phone-slash"></i> End Call
            </button>
            <button onClick={() => setShowModal(!showModal)}>
              <i className="fas fa-comment-dots"></i> Chat ({newMessages})
            </button>
            <button onClick={() => setShowWhiteboard((prev) => !prev)}>
              <i className="fas fa-chalkboard"></i> Whiteboard
            </button>
          </div>

          {/* Video grid: horizontal, wrapping flex */}
          <div className={styles.videoGrid}>
            {/* Local video */}
            <div className={`${styles.conferenceView} ${styles.localVideoHighlight}`}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className={styles.videoElement}
              />
              <div className={styles.participantName}>{username || "You"}</div>
            </div>
            {/* Remote videos */}
            {videos.map((video) => (
              <div className={styles.conferenceView} key={video.socketId}>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className={styles.videoElement}
                />
                <div className={styles.participantName}>{video.name || "Participant"}</div>
              </div>
            ))}
          </div>

          {showModal && (
            <div className={styles.chatRoom}>
              <div className={styles.chatContainer}>
                <div className={styles.chatHeader}>
                  <h2>Chat</h2>
                  <button className={styles.closeButton} onClick={() => setShowModal(false)} title="Close chat">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className={styles.chatMessages} ref={chatMessagesRef}>
                  {messages.map((msg, idx) => {
                    const isSender = msg.sender === username;
                    const msgType = msg.type || "text";
                    const msgFilename = msg.filename || "";
                    const msgTimestamp = msg.timestamp || new Date().toISOString();
                    return (
                      <div
                        key={idx}
                        className={`${styles.messageBubble} ${isSender ? styles.senderMessage : styles.receiverMessage}`}
                      >
                        <div className={styles.messageHeader}>
                          <strong>{msg.sender}</strong>
                          <span className={styles.messageTime}>{formatTime(msgTimestamp)}</span>
                        </div>
                        {msgType === "file" ? (
                          msg.data && msg.data.startsWith("data:image") ? (
                            <a href={msg.data} download={msgFilename} className={styles.fileLink} target="_blank" rel="noopener noreferrer">
                              <img src={msg.data} alt={msgFilename} className={styles.chatImagePreview} />
                              <span>{msgFilename}</span>
                            </a>
                          ) : (
                            <a href={msg.data} download={msgFilename} className={styles.fileLink} target="_blank" rel="noopener noreferrer">
                              <span className={styles.fileIcon}>📄</span> {msgFilename}
                            </a>
                          )
                        ) : (
                          // Preserve message formatting
                          <span className={styles.messageText} style={{whiteSpace: 'pre-wrap'}}>{msg.data}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className={styles.chatInput}>
                  <div className={styles.inputWrapper}>
                    <textarea
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      className={styles.chatTextarea}
                    />
                    {file && (
                      <span className={styles.selectedFileInline}>
                        {file.type.startsWith('image') ? (
                          <img src={URL.createObjectURL(file)} alt={file.name} className={styles.filePreviewImg} />
                        ) : (
                          <span className={styles.fileName}>{file.name}</span>
                        )}
                        <button
                          type="button"
                          className={styles.removeFileBtn}
                          onClick={() => setFile(null)}
                          title="Remove file"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    style={{ display: "none" }}
                    onChange={e => setFile(e.target.files[0])}
                  />
                  <label htmlFor="file-upload" className={styles.attachButton} title="Attach File">
                    📎
                  </label>
                  <button className={styles.sendButton} onClick={handleSend} disabled={!inputValue.trim() && !file}>Send</button>
                </div>
              </div>
            </div>
          )}
          {/* Whiteboard overlay */}
          <Whiteboard
            socket={socketRef.current}
            roomId={meetingId}
            visible={showWhiteboard}
            onClose={() => setShowWhiteboard(false)}
          />
        </div>
      )}
    </div>
  );
}