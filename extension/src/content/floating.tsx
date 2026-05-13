import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import FloatingPanel from "./components/FloatingPanel";
import MinimizedButton from "./components/MinimizedButton";
import App from "../sidepanel/App";

const HOST_ID = "bili-summarizer-floating";
const STYLE_ID = "bili-summarizer-styles";
const THEME_KEY = "floatingTheme";

// CSS variables for light/dark themes
const CSS_VARS_LIGHT: Record<string, string> = {
  "--primary": "#fb7299",
  "--primary-dark": "#e55c7f",
  "--primary-light": "#fff0f3",
  "--bg": "#ffffff",
  "--bg-secondary": "#f7f8fa",
  "--bg-card": "#ffffff",
  "--text": "#1a1a1a",
  "--text-secondary": "#666666",
  "--text-muted": "#999999",
  "--border": "#e8e8e8",
  "--tag-bg": "#fff0f3",
  "--tag-text": "#fb7299",
  "--success": "#52c41a",
  "--warning": "#faad14",
  "--error": "#ff4d4f",
  "--shadow-sm": "0 1px 3px rgba(0,0,0,0.06)",
  "--shadow-md": "0 4px 12px rgba(0,0,0,0.08)",
  "--radius-sm": "6px",
  "--radius-md": "10px",
  "--radius-lg": "14px",
};

const CSS_VARS_DARK: Record<string, string> = {
  "--primary": "#ff85a6",
  "--primary-dark": "#fb7299",
  "--primary-light": "#2a1a1f",
  "--bg": "#1a1a1a",
  "--bg-secondary": "#242424",
  "--bg-card": "#2a2a2a",
  "--text": "#e8e8e8",
  "--text-secondary": "#a0a0a0",
  "--text-muted": "#666666",
  "--border": "#3a3a3a",
  "--tag-bg": "#2a1a1f",
  "--tag-text": "#ff85a6",
  "--shadow-sm": "0 1px 3px rgba(0,0,0,0.2)",
  "--shadow-md": "0 4px 12px rgba(0,0,0,0.3)",
};

function applyVars(el: HTMLElement, vars: Record<string, string>, dark: boolean) {
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  // color-scheme tells the browser to render scrollbars in the correct theme
  el.style.setProperty("color-scheme", dark ? "dark" : "light");
}

function FloatingApp() {
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [isDark, setIsDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [videoKey, setVideoKey] = useState(0);

  // Load saved theme preference + listen for messages
  useEffect(() => {
    chrome.storage.local.get([THEME_KEY, "lastSummary"], (data) => {
      if (data[THEME_KEY] !== undefined) {
        const dark = data[THEME_KEY] === "dark";
        setIsDark(dark);
        const host = document.getElementById(HOST_ID);
        if (host) applyVars(host, dark ? CSS_VARS_DARK : CSS_VARS_LIGHT, dark);
      }
      if (data.lastSummary) setHasResult(true);
    });

    const listener = (message: unknown) => {
      const msg = message as Record<string, unknown>;
      if (msg.type === "OPEN_FLOATING_PANEL") {
        setVisible(true);
        setMinimized(false);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    // Listen for video change from content script (direct DOM event, more reliable)
    const handleVideoChanged = () => {
      // Force App to re-mount (re-reads video + summary from storage)
      setVideoKey((k) => k + 1);
    };
    window.addEventListener("bili-summarizer-video-changed", handleVideoChanged);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      window.removeEventListener("bili-summarizer-video-changed", handleVideoChanged);
    };
  }, []);

  useEffect(() => {
    const handleOpen = () => {
      console.log("[Bilibili Summarizer] Floating panel: open event received");
      setVisible(true);
      setMinimized(false);
    };
    window.addEventListener("bili-summarizer-open", handleOpen);
    return () => window.removeEventListener("bili-summarizer-open", handleOpen);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      const host = document.getElementById(HOST_ID);
      if (host) applyVars(host, next ? CSS_VARS_DARK : CSS_VARS_LIGHT, next);
      chrome.storage.local.set({ [THEME_KEY]: next ? "dark" : "light" }).catch(() => {});
      return next;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "REFRESH_VIDEO" }).catch(() => {});
      }
    });
  }, []);

  if (!visible) return null;

  if (minimized) {
    return (
      <MinimizedButton
        onRestore={() => setMinimized(false)}
        hasResult={hasResult}
      />
    );
  }

  return (
    <FloatingPanel
      onMinimize={() => setMinimized(true)}
      onClose={() => setVisible(false)}
      isDark={isDark}
      onToggleTheme={handleToggleTheme}
      onRefresh={handleRefresh}
    >
      <App key={videoKey} />
    </FloatingPanel>
  );
}

// Inject scoped styles into page head (once)
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${HOST_ID} * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      color: inherit;
    }
    #${HOST_ID} button {
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    #${HOST_ID} button:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    #${HOST_ID} button:active {
      transform: translateY(0);
    }
    #${HOST_ID} input, #${HOST_ID} select {
      font-family: inherit;
      font-size: 13px;
      transition: border-color 0.2s ease;
    }
    #${HOST_ID} input:focus, #${HOST_ID} select:focus {
      outline: none;
      border-color: var(--primary) !important;
    }
    @keyframes bs-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes bs-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes bs-slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    #${HOST_ID} .animate-spin { animation: bs-spin 1s linear infinite; }
    #${HOST_ID} .animate-fade-in { animation: bs-fadeIn 0.3s ease; }
    #${HOST_ID} .animate-slide-up { animation: bs-slideUp 0.4s ease; }
    #${HOST_ID} .toast {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: var(--text); color: var(--bg); padding: 8px 20px;
      border-radius: 20px; font-size: 13px; z-index: 2147483647;
      animation: bs-fadeIn 0.3s ease; box-shadow: var(--shadow-md);
    }
  `;
  document.head.appendChild(style);
}

// Prevent duplicate injection
if (!document.getElementById(HOST_ID)) {
  try {
    injectStyles();

    const host = document.createElement("div");
    host.id = HOST_ID;
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyVars(host, isDark ? CSS_VARS_DARK : CSS_VARS_LIGHT, isDark);
    host.style.cssText = "position:fixed;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;font-size:14px;line-height:1.6;color:var(--text);";
    document.documentElement.appendChild(host);

    const reactRoot = createRoot(host);
    reactRoot.render(<FloatingApp />);
    console.log("[Bilibili Summarizer] Floating panel initialized, theme:", isDark ? "dark" : "light");
  } catch (e) {
    console.error("[Bilibili Summarizer] Floating panel init error:", e);
  }
}

console.log("[Bilibili Summarizer] Floating panel script loaded");
