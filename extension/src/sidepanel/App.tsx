import React, { useState, useEffect, useCallback } from "react";
import type { VideoMetadata } from "../shared/types/video";
import type { SummaryResult, KeyPoint, Chapter } from "../shared/types/api";
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

  useEffect(() => {
    // Load settings
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (s) => {
      if (chrome.runtime.lastError) return;
      if (s) setSettings(s as ExtensionSettings);
    });

    // Get current video
    chrome.runtime.sendMessage({ type: "GET_CURRENT_VIDEO" }, (v) => {
      if (chrome.runtime.lastError) return;
      if (v) setVideo(v as VideoMetadata);
    });
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
      { type: "SUMMARIZE", bvid: video.bvid, cid: video.cid },
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

  if (!settings) return <div className="p-4">加载中...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>
          {video ? video.title : "Bilibili Summarizer"}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setView(view === "settings" ? "idle" : "settings")}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 16,
            }}
            title="设置"
          >
            ⚙️
          </button>
          {view === "summary" && (
            <button
              onClick={handleSummarize}
              style={{
                background: "var(--primary)",
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                color: "#fff",
                fontSize: 13,
              }}
            >
              🔄 重新总结
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {view === "settings" && (
        <SettingsPanel
          settings={settings}
          onSave={(s) => {
            setSettings(s);
            chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", payload: s });
            setView("idle");
          }}
        />
      )}

      {/* Idle State */}
      {view === "idle" && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
            {video
              ? `已检测到视频: ${video.title}`
              : "请打开一个 Bilibili 视频页面"}
          </p>
          {video && (
            <button
              onClick={handleSummarize}
              style={{
                padding: "10px 32px",
                background: "linear-gradient(135deg, var(--primary), #fc8b9f)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              📝 开始总结
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {view === "loading" && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          <p style={{ color: "var(--text-secondary)" }}>
            正在获取字幕并生成总结...
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 8 }}>
            这可能需要 30-60 秒
          </p>
        </div>
      )}

      {/* Error State */}
      {view === "error" && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>❌</div>
          <p style={{ color: "var(--error)", marginBottom: 16 }}>{error}</p>
          <button
            onClick={handleSummarize}
            style={{
              padding: "8px 24px",
              background: "var(--primary)",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontSize: 14,
            }}
          >
            重试
          </button>
        </div>
      )}

      {/* Summary View */}
      {view === "summary" && result && (
        <SummaryView result={result} onSeek={handleSeek} />
      )}
    </div>
  );
}
