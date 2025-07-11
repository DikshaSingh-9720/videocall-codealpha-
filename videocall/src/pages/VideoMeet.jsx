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

const server_url = "http://localhost:5000";
const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const connections = {};
const iceCandidatesQueue = {};

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

  useEffect(() => {
    getPermissions();
  }, []);

  // Clear chat messages when call ends
  const clearChat = () => {
    setMessages([]);
    setInputValue("");
    setFile(null);
    setNewMessages(0);
  };

  const getPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setVideoAvailable(true);
      setAudioAvailable(true);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    } catch (err) {
      setVideoAvailable(false);
      setAudioAvailable(false);
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [video, audio]);

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video,
        audio,
      });
      window.localStream = stream;
      localVideoRef.current.srcObject = stream;
      Object.keys(connections).forEach((id) => {
        if (id === socketIdRef.current) return;
        connections[id].addStream(stream);
        connections[id].createOffer().then((description) => {
          connections[id].setLocalDescription(description).then(() => {
            socketRef.current.emit("signal", id, JSON.stringify({ sdp: description }));
          });
        });
      });
    } catch (error) {}
  };

  const connectToSocketServer = () => {
    socketRef.current = io(server_url);
    socketRef.current.on("signal", gotMessageFromServer);
    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", meetingId);
      socketRef.current.on("chat-message", addMessage);
      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((v) => v.socketId !== id));
      });
      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit("signal", socketListId, JSON.stringify({ ice: event.candidate }));
            }
          };
          connections[socketListId].onaddstream = (event) => {
            setVideos((prev) => [
              ...prev.filter((v) => v.socketId !== socketListId),
              { socketId: socketListId, stream: event.stream, name: "Participant" },
            ]);
          };
          if (window.localStream) {
            window.localStream.getTracks().forEach((track) => {
              connections[socketListId].addTrack(track, window.localStream);
            });
          }
        });
        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;
            connections[id2].addStream(window.localStream);
            connections[id2].createOffer().then((description) => {
              connections[id2].setLocalDescription(description).then(() => {
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
      } catch (err) {}
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
    const videoTrack = stream.getVideoTracks()[0];
    Object.values(connections).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track.kind === "video");
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    });
    localVideoRef.current.srcObject = stream;
    window.localStream = stream;
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
  const addMessage = (data, sender, socketIdSender, type = "text", filename = "") => {
    setMessages((prev) => [
      ...prev,
      {
        sender,
        data,
        type,
        filename,
        timestamp: new Date().toISOString(),
        sending: false,
      },
    ]);
    if (socketIdSender !== socketIdRef.current) setNewMessages((prev) => prev + 1);
    if (type === "file" && sender === username) {
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

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, showModal]);

  // Unified send handler for text and file
  const handleSend = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socketRef.current.emit("chat-message", reader.result, username, "file", file.name);
        setFile(null);
      };
      reader.readAsDataURL(file);
    } else if (inputValue.trim()) {
      socketRef.current.emit("chat-message", inputValue, username);
      setInputValue("");
    }
  };

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
              {video ? <i className="fas fa-video"></i> : <i className="fas fa-video-slash"></i>} On
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
                  <button className={styles.closeButton} onClick={() => setShowModal(false)} title="Close chat"><i className="fas fa-times"></i></button>
                </div>
                <div className={styles.chatMessages} ref={chatMessagesRef}>
                  {messages.map((msg, index) => {
                    const isSender = msg.sender === username;
                    return (
                      <div
                        key={index}
                        className={`${styles.messageBubble} ${isSender ? styles.senderMessage : styles.receiverMessage}`}
                      >
                        <div className={styles.messageHeader}>
                          <strong>{msg.sender}</strong>
                          <span className={styles.messageTime}>{formatTime(msg.timestamp)}</span>
                        </div>
                        {msg.type === "file" ? (
                          msg.data.startsWith("data:image") ? (
                            <a href={msg.data} download={msg.filename} className={styles.fileLink} target="_blank" rel="noopener noreferrer">
                              <img src={msg.data} alt={msg.filename} className={styles.chatImagePreview} />
                              <span>{msg.filename}</span>
                            </a>
                          ) : (
                            <a href={msg.data} download={msg.filename} className={styles.fileLink} target="_blank" rel="noopener noreferrer">
                              <span className={styles.fileIcon}>📄</span> {msg.filename}
                            </a>
                          )
                        ) : (
                          <span className={styles.messageText}>{msg.data}</span>
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
                  <button className={styles.sendButton} onClick={handleSend}>Send</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
