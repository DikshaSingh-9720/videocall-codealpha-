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
  const [tool, setTool] = useState("pen"); // 'pen' or 'eraser'
  const [lastPoint, setLastPoint] = useState(null);
  const [show, setShow] = useState(visible);

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
    <div className="whiteboard-overlay">
      <div className="whiteboard-toolbar">
        <span>Color:</span>
        {COLORS.map((c) => (
          <button
            key={c}
            className={"color-btn" + (color === c && tool === "pen" ? " selected" : "")}
            style={{ background: c }}
            onClick={() => { setColor(c); setTool("pen"); }}
          />
        ))}
        <span>Thickness:</span>
        <input
          type="range"
          min={1}
          max={20}
          value={thickness}
          onChange={e => { setThickness(Number(e.target.value)); setTool("pen"); }}
        />
        <button
          className={"tool-btn" + (tool === "eraser" ? " selected" : "")}
          onClick={() => setTool("eraser")}
        >
          Eraser
        </button>
        <button className="tool-btn" onClick={handleClear}>Clear</button>
        <button className="tool-btn" onClick={onClose}>Close</button>
      </div>
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
    </div>
  );
}
