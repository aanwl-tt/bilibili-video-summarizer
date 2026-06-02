import React, { useState, useRef, useCallback, useEffect } from "react";

interface Props {
  children: React.ReactNode;
  onMinimize: () => void;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onRefresh: () => void;
}

interface PanelState {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STORAGE_KEY = "floatingPanelState";
const MIN_WIDTH = 340;
const MIN_HEIGHT = 300;
const HEADER_HEIGHT = 40;

function getDefaultState(): PanelState {
  const w = 400;
  const h = 600;
  return {
    x: window.innerWidth - w - 20,
    y: window.innerHeight - h - 20,
    width: w,
    height: h,
  };
}

export default function FloatingPanel({ children, onMinimize, onClose, isDark, onToggleTheme, onRefresh }: Props) {
  const [state, setState] = useState<PanelState>(getDefaultState);
  const [loaded, setLoaded] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startState: PanelState } | null>(null);
  const resizeRef = useRef<{ dir: string; startX: number; startY: number; startState: PanelState } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  // Keep stateRef in sync with state
  stateRef.current = state;

  // Load saved position/size
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      if (data[STORAGE_KEY]) {
        const s = data[STORAGE_KEY] as PanelState;
        // Clamp to viewport
        s.x = Math.min(s.x, window.innerWidth - 100);
        s.y = Math.min(s.y, window.innerHeight - 100);
        s.x = Math.max(s.x, -s.width + 100);
        s.y = Math.max(s.y, 0);
        setState(s);
      }
      setLoaded(true);
    });
  }, []);

  // Save position/size on change
  const saveState = useCallback((s: PanelState) => {
    chrome.storage.local.set({ [STORAGE_KEY]: s }).catch(() => {});
  }, []);

  // --- Drag ---
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startState: { ...stateRef.current } };
    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const newX = Math.max(-stateRef.current.width + 40, Math.min(window.innerWidth - 40, dragRef.current.startState.x + dx));
      const newY = Math.max(0, dragRef.current.startState.y + dy);
      setState((prev) => ({ ...prev, x: newX, y: newY }));
    };
    const handleUp = () => {
      if (dragRef.current) {
        saveState(stateRef.current);
      }
      dragRef.current = null;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, [saveState]);

  // --- Resize ---
  const handleResizeStart = useCallback((e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { dir, startX: e.clientX, startY: e.clientY, startState: { ...stateRef.current } };
    const handleMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const dy = ev.clientY - resizeRef.current.startY;
      const s = resizeRef.current.startState;
      let newX = s.x, newY = s.y, newW = s.width, newH = s.height;

      if (resizeRef.current.dir.includes("e")) newW = Math.max(MIN_WIDTH, s.width + dx);
      if (resizeRef.current.dir.includes("s")) newH = Math.max(MIN_HEIGHT, s.height + dy);
      if (resizeRef.current.dir.includes("w")) {
        newW = Math.max(MIN_WIDTH, s.width - dx);
        newX = s.x + s.width - newW;
      }
      if (resizeRef.current.dir.includes("n")) {
        newH = Math.max(MIN_HEIGHT, s.height - dy);
        newY = Math.max(0, s.y + s.height - newH);
      }

      setState({ x: newX, y: newY, width: newW, height: newH });
    };
    const handleUp = () => {
      if (resizeRef.current) {
        saveState(stateRef.current);
      }
      resizeRef.current = null;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, [saveState]);

  if (!loaded) return null;

  const resizeHandles = [
    { dir: "n", style: { top: -3, left: 10, right: 10, height: 6, cursor: "n-resize" } },
    { dir: "s", style: { bottom: -3, left: 10, right: 10, height: 6, cursor: "s-resize" } },
    { dir: "w", style: { top: 10, bottom: 10, left: -3, width: 6, cursor: "w-resize" } },
    { dir: "e", style: { top: 10, bottom: 10, right: -3, width: 6, cursor: "e-resize" } },
    { dir: "nw", style: { top: -3, left: -3, width: 12, height: 12, cursor: "nw-resize" } },
    { dir: "ne", style: { top: -3, right: -3, width: 12, height: 12, cursor: "ne-resize" } },
    { dir: "sw", style: { bottom: -3, left: -3, width: 12, height: 12, cursor: "sw-resize" } },
    { dir: "se", style: { bottom: -3, right: -3, width: 12, height: 12, cursor: "se-resize" } },
  ];

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: state.x,
        top: state.y,
        width: state.width,
        height: state.height,
        background: "var(--bg)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 2147483646,
        border: "1px solid var(--border)",
        animation: "bs-fadeIn 0.25s ease",
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleDragStart}
        style={{
          height: HEADER_HEIGHT,
          minHeight: HEADER_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          cursor: "grab",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>&#128221;</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            Bilibili Summarizer
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            title="刷新页面检测"
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 14,
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            &#8635;
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleTheme(); }}
            title={isDark ? "切换到亮色模式" : "切换到暗色模式"}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 15,
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
            title="最小化"
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 14,
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            &#9472;
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="关闭"
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 14,
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--error)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: 16, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif", fontSize: 14, lineHeight: 1.6 }}>
        {children}
      </div>

      {/* Resize handles */}
      {resizeHandles.map(({ dir, style }) => (
        <div
          key={dir}
          onMouseDown={(e) => handleResizeStart(e, dir)}
          style={{ position: "absolute", ...style, zIndex: 10 }}
        />
      ))}
    </div>
  );
}
