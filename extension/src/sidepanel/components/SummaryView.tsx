import React from "react";
import type { SummaryResult, KeyPoint, Chapter } from "../../shared/types/api";
import { formatTime } from "../utils/formatTime";

interface Props {
  result: SummaryResult;
  onSeek: (timestamp: number) => void;
  showToast: (msg: string) => void;
}

function ChapterCard({ chapter, onSeek, depth = 0 }: { chapter: Chapter; onSeek: (t: number) => void; depth?: number }) {
  const [expanded, setExpanded] = React.useState(true);
  const MAX_DEPTH = 3;

  return (
    <div
      className="animate-slide-up"
      style={{
        marginBottom: 10,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "var(--bg-card)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Chapter Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "var(--bg-secondary)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-muted)", transition: "transform 0.2s", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
          &#9660;
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onSeek(chapter.start_time);
          }}
          style={{
            color: "var(--primary)",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 600,
            minWidth: 40,
          }}
        >
          {formatTime(chapter.start_time)}
        </span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{chapter.title}</span>
      </div>

      {/* Chapter Content */}
      {expanded && (
        <div style={{ padding: "10px 14px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8, lineHeight: 1.7 }}>
            {chapter.summary}
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {chapter.key_points.map((kp, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "5px 0",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <span
                  onClick={() => onSeek(kp.timestamp)}
                  style={{
                    color: "var(--primary)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    fontWeight: 500,
                    minWidth: 36,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {formatTime(kp.timestamp)}
                </span>
                <span>{kp.text}</span>
              </li>
            ))}
          </ul>

          {/* Sub-chapters */}
          {depth < MAX_DEPTH && chapter.sub_chapters?.map((sc, i) => (
            <ChapterCard key={`${sc.title}-${sc.start_time}-${i}`} chapter={sc} onSeek={onSeek} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SummaryView({ result, onSeek, showToast }: Props) {
  const handleCopy = () => {
    const text = generateMarkdown(result);
    navigator.clipboard.writeText(text).then(() => {
      showToast("已复制到剪贴板");
    }).catch(() => {
      showToast("复制失败");
    });
  };

  const handleDownload = () => {
    const text = generateMarkdown(result);
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title || "summary"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("已下载 Markdown 文件");
  };

  return (
    <div className="animate-slide-up">
      {/* Overall Summary */}
      <div
        style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          padding: 14,
          marginBottom: 16,
          border: "1px solid var(--border)",
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>
          &#128203; 总体摘要
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>{result.overall_summary}</p>
      </div>

      {/* Chapters */}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text)" }}>
        &#128209; 章节笔记 ({result.chapters.length})
      </h3>
      {result.chapters.map((ch, i) => (
        <ChapterCard key={i} chapter={ch} onSeek={onSeek} />
      ))}

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
        {result.tags.map((tag, i) => (
          <span
            key={i}
            style={{
              background: "var(--tag-bg)",
              color: "var(--tag-text)",
              padding: "3px 12px",
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        <span>{result.source_subtitles_count} 条字幕</span>
        <span>{(result.processing_time_ms / 1000).toFixed(1)}s</span>
        <span>{result.provider_used}</span>
        {(result.input_tokens != null || result.output_tokens != null) && (
          <span>{result.input_tokens ?? 0} / {result.output_tokens ?? 0} tokens</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1,
            padding: "8px 0",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            color: "var(--text)",
          }}
        >
          &#128203; 复制 Markdown
        </button>
        <button
          onClick={handleDownload}
          style={{
            flex: 1,
            padding: "8px 0",
            background: "var(--primary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            color: "#fff",
            fontWeight: 500,
          }}
        >
          &#128190; 下载文件
        </button>
      </div>
    </div>
  );
}

function generateMarkdown(result: SummaryResult): string {
  let md = `# ${result.title}\n\n`;
  md += `> ${result.overall_summary}\n\n`;
  md += `---\n\n`;

  for (const ch of result.chapters) {
    const start = formatTime(ch.start_time);
    const end = formatTime(ch.end_time);
    md += `## [${start} - ${end}] ${ch.title}\n\n`;
    md += `${ch.summary}\n\n`;
    for (const kp of ch.key_points) {
      md += `- [${formatTime(kp.timestamp)}] ${kp.text}\n`;
    }
    md += "\n";
  }

  if (result.tags.length) {
    md += `---\n\n标签: ${result.tags.join(", ")}\n`;
  }

  return md;
}
