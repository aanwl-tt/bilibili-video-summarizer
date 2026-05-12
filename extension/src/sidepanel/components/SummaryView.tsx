import React from "react";
import type { SummaryResult, KeyPoint, Chapter } from "../../shared/types/api";
import { formatTime } from "../utils/formatTime";

interface Props {
  result: SummaryResult;
  onSeek: (timestamp: number) => void;
}

function ChapterCard({ chapter, onSeek }: { chapter: Chapter; onSeek: (t: number) => void }) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div
      style={{
        marginBottom: 12,
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Chapter Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          background: "var(--bg-secondary)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 12 }}>{expanded ? "▼" : "▶"}</span>
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
        <div style={{ padding: "8px 12px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>
            {chapter.summary}
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {chapter.key_points.map((kp, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "4px 0",
                  fontSize: 13,
                  lineHeight: 1.5,
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
          {chapter.sub_chapters?.map((sc, i) => (
            <ChapterCard key={i} chapter={sc} onSeek={onSeek} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SummaryView({ result, onSeek }: Props) {
  const handleCopy = () => {
    const text = generateMarkdown(result);
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast
    });
  };

  return (
    <div>
      {/* Overall Summary */}
      <div
        style={{
          background: "var(--bg-secondary)",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
          📋 总体摘要
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>{result.overall_summary}</p>
      </div>

      {/* Chapters */}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        📑 章节笔记 ({result.chapters.length})
      </h3>
      {result.chapters.map((ch, i) => (
        <ChapterCard key={i} chapter={ch} onSeek={onSeek} />
      ))}

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {result.tags.map((tag, i) => (
          <span
            key={i}
            style={{
              background: "var(--tag-bg)",
              color: "var(--tag-text)",
              padding: "2px 10px",
              borderRadius: 12,
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
          color: "var(--text-secondary)",
        }}
      >
        <span>来源: {result.source_subtitles_count} 条字幕</span>
        <span>处理: {(result.processing_time_ms / 1000).toFixed(1)}s</span>
        <span>模型: {result.provider_used}</span>
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
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          📋 复制 Markdown
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

