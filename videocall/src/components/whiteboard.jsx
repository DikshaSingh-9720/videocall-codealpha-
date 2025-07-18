import React, { useRef, useEffect, useState } from "react";
import "./whiteboard.css";

const COLORS = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FFFFFF"];
const DEFAULT_THICKNESS = 3;

export default function Whiteboard({ socket, roomId, visible, onClose }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [thickness, setThickness] = useState(DEFAULT_THICKNESS);
  const [tool, setTool] = useState("pen");
  const [lastPoint, setLastPoint] = useState(null);
  const [show, setShow] = useState(visible);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const colorDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!colorDropdownOpen) return;
    function handleClick(e) {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target)) {
        setColorDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [colorDropdownOpen]);

  // Broadcast whiteboard open/close
  useEffect(() => {
    if (socket && roomId) {
      socket.emit("whiteboard-toggle", { roomId, show: visible });
    }
    setShow(visible);
  }, [visible, socket, roomId]);

  // Listen for whiteboard toggle from others
  useEffect(() => {
    if (!socket) return;
    const handleToggle = ({ roomId: remoteRoom, show: remoteShow }) => {
      if (remoteRoom === roomId) setShow(remoteShow);
    };
    socket.on("whiteboard-toggle", handleToggle);
    return () => socket.off("whiteboard-toggle", handleToggle);
  }, [socket, roomId]);

  // Drawing logic
  useEffect(() => {
    if (!canvasRef.current) return;
    ctxRef.current = canvasRef.current.getContext("2d");
  }, [show]);

  // Drawing event handlers
  const getPointer = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDraw = (e) => {
    setDrawing(true);
    setLastPoint(getPointer(e));
  };

  const draw = (e, emit = true) => {
    if (!drawing) return;
    const newPoint = getPointer(e);
    const ctx = ctxRef.current;
    if (!ctx || !lastPoint) return;
    ctx.strokeStyle = tool === "pen" ? color : "#fff";
    ctx.lineWidth = tool === "pen" ? thickness : 20;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(newPoint.x, newPoint.y);
    ctx.stroke();
    ctx.closePath();
    if (emit && socket && roomId) {
      socket.emit("drawing", {
        roomId,
        tool,
        color,
        thickness,
        from: lastPoint,
        to: newPoint,
      });
    }
    setLastPoint(newPoint);
  };

  const endDraw = () => {
    setDrawing(false);
    setLastPoint(null);
  };

  // Listen for remote drawing events
  useEffect(() => {
    if (!socket) return;
    const handleDrawing = ({ roomId: remoteRoom, tool: remoteTool, color: remoteColor, thickness: remoteThickness, from, to }) => {
      if (remoteRoom !== roomId) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.strokeStyle = remoteTool === "pen" ? remoteColor : "#fff";
      ctx.lineWidth = remoteTool === "pen" ? remoteThickness : 20;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.closePath();
    };
    socket.on("drawing", handleDrawing);
    return () => socket.off("drawing", handleDrawing);
  }, [socket, roomId]);

  // Clear board
  const handleClear = () => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (socket && roomId) {
      socket.emit("whiteboard-clear", { roomId });
    }
  };

  // Listen for remote clear events
  useEffect(() => {
    if (!socket) return;
    const handleRemoteClear = ({ roomId: remoteRoom }) => {
      if (remoteRoom !== roomId) return;
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    socket.on("whiteboard-clear", handleRemoteClear);
    return () => socket.off("whiteboard-clear", handleRemoteClear);
  }, [socket, roomId]);

  // Resize canvas to fit parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const { width, height } = canvas.parentElement.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [show]);

  if (!show) return null;

  return (
    <div className="whiteboard-modern-overlay">
      <aside className="whiteboard-modern-toolbar">
        <div className="toolbar-group">
          <button
            className="toolbar-btn"
            title="Pen"
            aria-label="Pen"
            onClick={() => setTool("pen")}
            data-active={tool === "pen"}
          >
            {/* Pen SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 21v-3.75l12.06-12.06a2.12 2.12 0 013 3L6 20.25H3z" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="toolbar-color-picker" ref={colorDropdownRef}>
            <button
              className="toolbar-btn color-toggle"
              style={{ background: color }}
              onClick={() => setColorDropdownOpen((open) => !open)}
              aria-label="Select color"
              data-active={colorDropdownOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="#fff" strokeWidth="2" fill="none"/></svg>
            </button>
            {colorDropdownOpen && (
              <div className="color-popover">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={"color-bar" + (color === c ? " selected" : "")}
                    style={{ background: c }}
                    onClick={() => { setColor(c); setTool("pen"); setColorDropdownOpen(false); }}
                    aria-label={c}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="toolbar-thickness">
            <input
              type="range"
              min={1}
              max={20}
              value={thickness}
              onChange={e => { setThickness(Number(e.target.value)); setTool("pen"); }}
              orient="vertical"
            />
            <div className="thickness-preview" style={{ height: thickness, background: color }} />
          </div>
        </div>
        <div className="toolbar-group">
          <button
            className="toolbar-btn"
            title="Eraser"
            aria-label="Eraser"
            onClick={() => setTool("eraser")}
            data-active={tool === "eraser"}
          >
            {/* Eraser SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="17" width="18" height="4" rx="2" fill="#e0e7ff"/><rect x="7" y="3" width="10" height="14" rx="2" stroke="#667eea" strokeWidth="2"/></svg>
          </button>
          <button className="toolbar-btn" title="Clear" aria-label="Clear" onClick={handleClear}>
            {/* Clear SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="14" height="14" rx="2" stroke="#e53e3e" strokeWidth="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="#e53e3e" strokeWidth="2"/></svg>
          </button>
          <button className="toolbar-btn" title="Close" aria-label="Close" onClick={onClose}>
            {/* Close SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#667eea" strokeWidth="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="#667eea" strokeWidth="2"/></svg>
          </button>
        </div>
      </aside>
      <main className="whiteboard-modern-canvas-container">
        <canvas
          ref={canvasRef}
          className="whiteboard-modern-canvas"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </main>
    </div>
  );
}
