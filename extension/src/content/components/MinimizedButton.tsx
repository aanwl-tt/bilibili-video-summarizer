import React, { useState, useRef, useCallback, useEffect } from "react";

interface Props {
  onRestore: () => void;
  hasResult?: boolean;
}

const POS_KEY = "minimizedBtnPos";

export default function MinimizedButton({ onRestore, hasResult }: Props) {
  const [pos, setPos] = useState({ x: window.innerWidth - 70, y: window.innerHeight - 70 });
  const [loaded, setLoaded] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPos: { x: number; y: number }; moved: boolean } | null>(null);

  useEffect(() => {
    chrome.storage.local.get(POS_KEY, (data) => {
      if (data[POS_KEY]) {
        const p = data[POS_KEY];
        setPos({
          x: Math.min(p.x, window.innerWidth - 50),
          y: Math.min(p.y, window.innerHeight - 50),
        });
      }
      setLoaded(true);
    });
  }, []);

  const savePos = useCallback((p: { x: number; y: number }) => {
    chrome.storage.local.set({ [POS_KEY]: p }).catch(() => {});
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPos: { ...pos }, moved: false };
    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 50, dragRef.current.startPos.x + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 50, dragRef.current.startPos.y + dy)),
      });
    };
    const handleUp = () => {
      if (dragRef.current) {
        savePos(pos);
        if (!dragRef.current.moved) {
          onRestore();
        }
      }
      dragRef.current = null;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, [pos, savePos, onRestore]);

  if (!loaded) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #fb7299, #fc8b9f)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(251, 114, 153, 0.4)",
        zIndex: 2147483647,
        userSelect: "none",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        fontSize: 22,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(251, 114, 153, 0.5)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(251, 114, 153, 0.4)";
      }}
    >
      <span style={{ lineHeight: 1 }}>&#128221;</span>
      {hasResult && (
        <div style={{
          position: "absolute",
          top: -2,
          right: -2,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#52c41a",
          border: "2px solid #fff",
        }} />
      )}
    </div>
  );
}
