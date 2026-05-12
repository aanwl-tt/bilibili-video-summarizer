import React, { useState } from "react";
import type { ExtensionSettings, ProviderConfig } from "../../shared/types/settings";
import { BUILTIN_PROVIDERS } from "../../shared/constants/providers";

interface Props {
  settings: ExtensionSettings;
  onSave: (settings: ExtensionSettings) => void;
}

const DEPTH_OPTIONS = [
  { value: "full_notes" as const, label: "完整笔记" },
  { value: "brief" as const, label: "简洁摘要" },
  { value: "key_points" as const, label: "关键点" },
];

export default function SettingsPanel({ settings, onSave }: Props) {
  const [local, setLocal] = useState<ExtensionSettings>({ ...settings });

  const updateProvider = (name: string, partial: Partial<ProviderConfig>) => {
    setLocal({
      ...local,
      providers: {
        ...local.providers,
        [name]: { ...local.providers[name], ...partial },
      },
    });
  };

  return (
    <div className="animate-slide-up" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>&#9881; 设置</h3>

      {/* LLM Providers */}
      <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
        LLM 提供商
      </h4>

      {BUILTIN_PROVIDERS.map((provider) => {
        const config = local.providers[provider.name] || {
          apiKey: "",
          baseUrl: undefined,
          defaultModel: provider.models[0] || "",
          enabled: false,
        };
        const isActive = local.activeProvider === provider.name;

        return (
          <div
            key={provider.name}
            style={{
              padding: "10px 14px",
              border: `1px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
              borderRadius: "var(--radius-md)",
              marginBottom: 8,
              cursor: "pointer",
              background: isActive ? "var(--primary-light)" : "var(--bg-card)",
              transition: "all 0.2s ease",
            }}
            onClick={() => {
              const targetConfig = local.providers[provider.name];
              setLocal({
                ...local,
                activeProvider: provider.name,
                activeModel: targetConfig?.defaultModel || provider.models[0] || "",
              });
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: `2px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {isActive && (
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--primary)",
                  }} />
                )}
              </div>
              <span style={{ fontWeight: 500, fontSize: 13 }}>{provider.displayName}</span>
            </div>

            {isActive && (
              <div style={{ paddingLeft: 24, marginTop: 8 }}>
                {provider.needsApiKey && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => updateProvider(provider.name, { apiKey: e.target.value })}
                      placeholder="sk-..."
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12,
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                )}

                {provider.needsBaseUrl && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={config.baseUrl || ""}
                      onChange={(e) => updateProvider(provider.name, { baseUrl: e.target.value })}
                      placeholder={provider.name === "ollama" ? "http://localhost:11434" : "https://..."}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12,
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 6 }}>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                    模型
                  </label>
                  {provider.models.length > 0 ? (
                    <select
                      value={config.defaultModel}
                      onChange={(e) => {
                        updateProvider(provider.name, { defaultModel: e.target.value });
                        setLocal((prev) => ({ ...prev, activeModel: e.target.value }));
                      }}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12,
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                    >
                      {provider.models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={config.defaultModel}
                      onChange={(e) => {
                        updateProvider(provider.name, { defaultModel: e.target.value });
                        setLocal((prev) => ({ ...prev, activeModel: e.target.value }));
                      }}
                      placeholder="输入模型名称（如 qwen3:14b）"
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12,
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Default Depth */}
      <div style={{ marginTop: 16, marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
          默认总结深度
        </label>
        <select
          value={local.defaultDepth}
          onChange={(e) =>
            setLocal({
              ...local,
              defaultDepth: e.target.value as "full_notes" | "brief" | "key_points",
            })
          }
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg)",
            color: "var(--text)",
          }}
        >
          {DEPTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Save Button */}
      <button
        onClick={() => onSave(local)}
        style={{
          width: "100%",
          padding: "10px 0",
          background: "var(--primary)",
          border: "none",
          borderRadius: "var(--radius-md)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          boxShadow: "0 4px 12px rgba(251, 114, 153, 0.25)",
        }}
      >
        &#128190; 保存设置
      </button>
    </div>
  );
}
