import React, { useState } from "react";
import type { HistoryEntry, SummaryResult } from "../../shared/types/api";
import SummaryView from "./SummaryView";
import { formatTime } from "../utils/formatTime";

interface Props {
  history: HistoryEntry[];
  onBack: () => void;
  onDelete: (ids: string[]) => void;
  showToast: (msg: string) => void;
}

export default function HistoryPanel({ history, onBack, onDelete, showToast }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<HistoryEntry | null>(null);
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === history.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(history.map((h) => h.id)));
    }
  };

  const handleExport = (entries: HistoryEntry[]) => {
    const data = JSON.stringify(entries, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = entries.length === 1
      ? `${entries[0].title || "summary"}.json`
      : `bilibili-summaries-${entries.length}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已导出 ${entries.length} 条记录`);
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selected.size} 条记录吗？此操作不可撤销。`)) return;
    onDelete(Array.from(selected));
    setSelected(new Set());
    setShowCheckboxes(false);
    showToast(`已删除 ${selected.size} 条记录`);
  };

  const handleSeek = (timestamp: number) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "SEEK_VIDEO",
          payload: { time: timestamp },
        }).catch(() => {});
      }
    });
  };

  // Viewing detail
  if (viewing) {
    return (
      <div className="animate-slide-up">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setViewing(null)}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            &#8592; 返回
          </button>
          <a
            href={`https://www.bilibili.com/video/${viewing.bvid}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              color: "var(--primary)",
              textDecoration: "none",
            }}
            title="在 Bilibili 打开"
          >
            &#128279; 打开视频
          </a>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {new Date(viewing.timestamp).toLocaleString("zh-CN")}
          </span>
        </div>
        <SummaryView result={viewing.result} onSeek={handleSeek} showToast={showToast} />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onBack}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            &#8592; 返回
          </button>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>历史记录 ({history.length}/500)</h3>
        </div>
        <button
          onClick={() => {
            setShowCheckboxes(!showCheckboxes);
            setSelected(new Set());
          }}
          style={{
            background: showCheckboxes ? "var(--primary-light)" : "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "4px 10px",
            fontSize: 12,
            color: showCheckboxes ? "var(--primary)" : "var(--text-secondary)",
          }}
        >
          {showCheckboxes ? "取消" : "选择"}
        </button>
      </div>

      {/* Batch actions */}
      {showCheckboxes && (
        <div style={{
          display: "flex",
          gap: 6,
          marginBottom: 10,
          padding: "8px 10px",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-sm)",
        }}>
          <button
            onClick={toggleAll}
            style={{
              flex: 1,
              padding: "5px 0",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "var(--text)",
            }}
          >
            {selected.size === history.length ? "取消全选" : "全选"}
          </button>
          <button
            onClick={() => {
              const entries = history.filter((h) => selected.has(h.id));
              if (entries.length > 0) handleExport(entries);
            }}
            style={{
              flex: 1,
              padding: "5px 0",
              background: "var(--primary)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "#fff",
              fontWeight: 500,
            }}
          >
            导出选中 ({selected.size})
          </button>
          <button
            onClick={handleDeleteSelected}
            style={{
              flex: 1,
              padding: "5px 0",
              background: "var(--error)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "#fff",
              fontWeight: 500,
            }}
          >
            删除选中
          </button>
        </div>
      )}

      {/* Export all button */}
      {!showCheckboxes && history.length > 0 && (
        <button
          onClick={() => handleExport(history)}
          style={{
            width: "100%",
            padding: "6px 0",
            marginBottom: 10,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          &#128229; 导出全部历史 ({history.length} 条)
        </button>
      )}

      {/* History list */}
      {history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
          <p>暂无历史记录</p>
        </div>
      ) : (
        <div>
          {history.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                marginBottom: 6,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
              }}
              onClick={() => {
                if (showCheckboxes) {
                  toggleSelect(entry.id);
                } else {
                  setViewing(entry);
                }
              }}
            >
              {showCheckboxes && (
                <input
                  type="checkbox"
                  checked={selected.has(entry.id)}
                  onChange={() => toggleSelect(entry.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{entry.title}</span>
                  <a
                    href={`https://www.bilibili.com/video/${entry.bvid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "var(--primary)", fontSize: 12, flexShrink: 0, textDecoration: "none" }}
                    title="在 Bilibili 打开"
                  >
                    &#128279;
                  </a>
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {entry.author && `${entry.author} · `}
                  {entry.page > 1 && `P${entry.page} · `}
                  {new Date(entry.timestamp).toLocaleString("zh-CN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
