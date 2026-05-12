import React, { useState, useEffect, useCallback } from "react";
import type { VideoMetadata } from "../shared/types/video";
import type { SummaryResult } from "../shared/types/api";
import type { ExtensionSettings } from "../shared/types/settings";
import SummaryView from "./components/SummaryView";
import SettingsPanel from "./components/SettingsPanel";

type View = "summary" | "settings" | "idle" | "loading" | "error";

export default function App() {
  const [view, setView] = useState<View>("idle");
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string>("");
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (s) => {
      if (chrome.runtime.lastError) return;
      if (s) setSettings(s as ExtensionSettings);
    });

    chrome.runtime.sendMessage({ type: "GET_CURRENT_VIDEO" }, (v) => {
      if (chrome.runtime.lastError) return;
      if (v) setVideo(v as VideoMetadata);
    });

    const listener = (message: unknown) => {
      const msg = message as Record<string, unknown>;
      if (msg.type === "VIDEO_UPDATED") {
        setVideo(msg.payload as VideoMetadata);
        setView("idle");
        setError("");
      }
      if (msg.type === "VIDEO_CLEARED") {
        setVideo(null);
        setResult(null);
        setView("idle");
        setError("");
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const handleSummarize = useCallback(async () => {
    if (!video) {
      setError("请先打开一个 Bilibili 视频页面");
      setView("error");
      return;
    }

    setView("loading");
    setError("");

    chrome.runtime.sendMessage(
      { type: "SUMMARIZE", bvid: video.bvid, cid: video.cid, title: video.title },
      (response: { data?: SummaryResult; error?: string } | undefined) => {
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message || "消息通道错误");
          setView("error");
          return;
        }
        if (!response) {
          setError("未收到服务器响应");
          setView("error");
          return;
        }
        if (response.error) {
          setError(response.error);
          setView("error");
        } else if (response.data) {
          setResult(response.data);
          setView("summary");
        }
      }
    );
  }, [video]);

  const handleSeek = useCallback((timestamp: number) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "SEEK_VIDEO",
          payload: { time: timestamp },
        }).catch(() => {});
      }
    });
  }, []);

  if (!settings) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
        <div className="animate-spin" style={{ fontSize: 24, marginBottom: 12 }}>&#8635;</div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: "1px solid var(--border)",
      }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
          {video ? video.title : "Bilibili Summarizer"}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setView(view === "settings" ? "idle" : "settings")}
            style={{
              background: view === "settings" ? "var(--primary-light)" : "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
              fontSize: 14,
              color: view === "settings" ? "var(--primary)" : "var(--text-secondary)",
            }}
            title="设置"
          >
            &#9881;
          </button>
          {view === "summary" && (
            <button
              onClick={handleSummarize}
              style={{
                background: "var(--primary)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "6px 14px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              &#8635; 重新总结
            </button>
          )}
        </div>
      </div>

      {/* Video Info Card */}
      {video && view !== "settings" && (
        <div style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          padding: "10px 14px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          {video.coverUrl && (
            <img
              src={video.coverUrl}
              alt=""
              style={{
                width: 80,
                height: 50,
                borderRadius: "var(--radius-sm)",
                objectFit: "cover",
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {video.title}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {video.author && `${video.author} · `}
              {video.duration > 0 && `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, "0")}`}
            </p>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {view === "settings" && (
        <SettingsPanel
          settings={settings}
          onSave={(s) => {
            setSettings(s);
            chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", payload: s });
            setView("idle");
            showToast("设置已保存");
          }}
        />
      )}

      {/* Idle State */}
      {view === "idle" && !video && (
        <div style={{ textAlign: "center", padding: "40px 0" }} className="animate-slide-up">
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#127909;</div>
          <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
            请打开一个 Bilibili 视频页面
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
            支持带有 CC 字幕或 AI 字幕的视频
          </p>
        </div>
      )}

      {/* Idle State with video */}
      {view === "idle" && video && (
        <div style={{ textAlign: "center", padding: "24px 0" }} className="animate-slide-up">
          <button
            onClick={handleSummarize}
            style={{
              padding: "12px 36px",
              background: "linear-gradient(135deg, var(--primary), #fc8b9f)",
              border: "none",
              borderRadius: "var(--radius-lg)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(251, 114, 153, 0.3)",
            }}
          >
            &#128221; 开始总结
          </button>
        </div>
      )}

      {/* Loading State */}
      {view === "loading" && (
        <div style={{ textAlign: "center", padding: "48px 0" }} className="animate-fade-in">
          <div className="animate-spin" style={{ fontSize: 36, marginBottom: 16, color: "var(--primary)" }}>
            &#8635;
          </div>
          <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
            正在获取字幕并生成总结...
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>
            这可能需要 30-60 秒
          </p>
        </div>
      )}

      {/* Error State */}
      {view === "error" && (
        <div style={{ textAlign: "center", padding: "32px 0" }} className="animate-slide-up">
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#10060;</div>
          <p style={{ color: "var(--error)", marginBottom: 16, fontSize: 13 }}>{error}</p>
          <button
            onClick={handleSummarize}
            style={{
              padding: "8px 24px",
              background: "var(--primary)",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            重试
          </button>
        </div>
      )}

      {/* Summary View */}
      {view === "summary" && result && (
        <SummaryView result={result} onSeek={handleSeek} showToast={showToast} />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
