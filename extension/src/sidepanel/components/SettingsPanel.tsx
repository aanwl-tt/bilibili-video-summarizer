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
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>⚙️ 设置</h3>

      {/* LLM Providers */}
      <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
        🤖 LLM 提供商
      </h4>

      {BUILTIN_PROVIDERS.map((provider) => {
        const config = local.providers[provider.name] || {
          apiKey: "",
          baseUrl: undefined,
          defaultModel: provider.models[0] || "",
          enabled: false,
        };

        return (
          <div
            key={provider.name}
            style={{
              padding: "10px 12px",
              border: `1px solid ${local.activeProvider === provider.name ? "var(--primary)" : "var(--border)"}`,
              borderRadius: 6,
              marginBottom: 8,
              cursor: "pointer",
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
              <input
                type="radio"
                checked={local.activeProvider === provider.name}
                onChange={() => {
                  const targetConfig = local.providers[provider.name];
                  setLocal({
                    ...local,
                    activeProvider: provider.name,
                    activeModel: targetConfig?.defaultModel || provider.models[0] || "",
                  });
                }}
              />
              <span style={{ fontWeight: 500, fontSize: 13 }}>{provider.displayName}</span>
            </div>

            {local.activeProvider === provider.name && (
              <div style={{ paddingLeft: 24 }}>
                {provider.needsApiKey && (
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => updateProvider(provider.name, { apiKey: e.target.value })}
                      placeholder="sk-..."
                      style={{
                        width: "100%",
                        padding: "4px 8px",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    />
                  </div>
                )}

                {provider.needsBaseUrl && (
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={config.baseUrl || ""}
                      onChange={(e) => updateProvider(provider.name, { baseUrl: e.target.value })}
                      placeholder={provider.name === "ollama" ? "http://localhost:11434" : "https://..."}
                      style={{
                        width: "100%",
                        padding: "4px 8px",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 6 }}>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>
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
                        padding: "4px 8px",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        fontSize: 12,
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
                        padding: "4px 8px",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        fontSize: 12,
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
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
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
            padding: "6px 10px",
            border: "1px solid var(--border)",
            borderRadius: 4,
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
          padding: "8px 0",
          background: "var(--primary)",
          border: "none",
          borderRadius: 6,
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        💾 保存设置
      </button>
    </div>
  );
}
