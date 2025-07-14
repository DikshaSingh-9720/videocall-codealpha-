import React, { useRef, useEffect, useState } from "react";

const COLORS = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FFFFFF"];

export default function Whiteboard({ socket, roomId, visible, onClose }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [tool, setTool] = useState("pen"); // 'pen' or 'eraser'
  const [lastPoint, setLastPoint] = useState(null);

  // Draw a line on the canvas
  const drawLine = (ctx, x0, y0, x1, y1, color, width, emit) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.closePath();
    if (!emit) return;
    if (socket && roomId) {
      socket.emit("whiteboard-draw", { x0, y0, x1, y1, color, width, roomId });
    }
  };

  // Mouse/touch event handlers
  const handlePointerDown = (e) => {
    setDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    setLastPoint({ x, y });
  };

  const handlePointerMove = (e) => {
    if (!drawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    if (lastPoint) {
      const ctx = canvasRef.current.getContext("2d");
      const drawColor = tool === "pen" ? color : "#FFFFFF";
      const width = tool === "pen" ? 2 : 16;
      drawLine(ctx, lastPoint.x, lastPoint.y, x, y, drawColor, width, true);
      setLastPoint({ x, y });
    }
  };

  const handlePointerUp = () => {
    setDrawing(false);
    setLastPoint(null);
  };

  // Listen for remote draw events
  useEffect(() => {
    if (!socket) return;
    const handleRemoteDraw = ({ x0, y0, x1, y1, color: remoteColor, width, roomId: remoteRoom }) => {
      if (remoteRoom !== roomId) return;
      const ctx = canvasRef.current.getContext("2d");
      drawLine(ctx, x0, y0, x1, y1, remoteColor, width, false);
    };
    socket.on("whiteboard-draw", handleRemoteDraw);
    return () => socket.off("whiteboard-draw", handleRemoteDraw);
  }, [socket, roomId]);

  // Clear board
  const handleClear = () => {
    const ctx = canvasRef.current.getContext("2d");
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
      const ctx = canvasRef.current.getContext("2d");
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
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#fff", zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "center", padding: 8, background: "#eee", borderBottom: "1px solid #ccc" }}>
        <span style={{ marginRight: 8 }}>Color:</span>
        {COLORS.map((c) => (
          <button key={c} onClick={() => { setColor(c); setTool("pen"); }} style={{ background: c, width: 24, height: 24, border: color === c && tool === "pen" ? "2px solid #333" : "1px solid #ccc", marginRight: 4 }} />
        ))}
        <button onClick={() => setTool("eraser")}
          style={{ marginLeft: 8, border: tool === "eraser" ? "2px solid #333" : "1px solid #ccc" }}>
          Eraser
        </button>
        <button onClick={handleClear} style={{ marginLeft: 16 }}>Clear</button>
        <button onClick={onClose} style={{ marginLeft: 16 }}>Close</button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "calc(100% - 40px)", touchAction: "none", cursor: tool === "eraser" ? "cell" : "crosshair" }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
    </div>
  );
}
