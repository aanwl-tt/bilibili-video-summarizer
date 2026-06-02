import React, { useState } from "react";
import type { ExtensionSettings, ProviderConfig } from "../../shared/types/settings";
import type { ProviderInfo } from "../../shared/types/api";
import { BUILTIN_PROVIDERS } from "../../shared/constants/providers";

interface Props {
  settings: ExtensionSettings;
  onSave: (settings: ExtensionSettings) => void;
  showToast?: (msg: string) => void;
}

const DEPTH_OPTIONS = [
  { value: "full_notes" as const, label: "完整笔记" },
  { value: "brief" as const, label: "简洁摘要" },
  { value: "key_points" as const, label: "关键点" },
];

type ValidateStatus = "idle" | "validating" | "success" | "error";

export default function SettingsPanel({ settings, onSave, showToast }: Props) {
  const [local, setLocal] = useState<ExtensionSettings>({ ...settings, customProviders: settings.customProviders || [] });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: "",
    apiFormat: "openai" as "openai" | "anthropic",
    baseUrl: "",
    apiKey: "",
    model: "",
  });
  const [validateStatus, setValidateStatus] = useState<ValidateStatus>("idle");
  const [validateError, setValidateError] = useState("");

  const allProviders: ProviderInfo[] = [
    ...BUILTIN_PROVIDERS,
    ...(local.customProviders || []),
  ];

  const updateProvider = (name: string, partial: Partial<ProviderConfig>) => {
    setLocal({
      ...local,
      providers: {
        ...local.providers,
        [name]: { ...local.providers[name], ...partial },
      },
    });
  };

  const handleValidate = () => {
    setValidateStatus("validating");
    setValidateError("");
    chrome.runtime.sendMessage(
      {
        type: "VALIDATE_PROVIDER",
        payload: {
          apiFormat: newProvider.apiFormat,
          apiKey: newProvider.apiKey,
          baseUrl: newProvider.baseUrl,
          model: newProvider.model,
        },
      },
      (response: { ok: boolean; error?: string }) => {
        if (chrome.runtime.lastError) {
          setValidateStatus("error");
          setValidateError("验证请求失败");
          return;
        }
        if (response.ok) {
          setValidateStatus("success");
        } else {
          setValidateStatus("error");
          setValidateError(response.error || "验证失败");
        }
      }
    );
  };

  const handleAddProvider = () => {
    if (!newProvider.name || !newProvider.baseUrl || !newProvider.model) return;

    const id = `custom_${Date.now()}`;
    const providerInfo: ProviderInfo = {
      name: id,
      displayName: newProvider.name,
      models: [newProvider.model],
      needsBaseUrl: true,
      needsApiKey: true,
      apiFormat: newProvider.apiFormat,
      isCustom: true,
    };

    const updatedSettings: ExtensionSettings = {
      ...local,
      customProviders: [...(local.customProviders || []), providerInfo],
      providers: {
        ...local.providers,
        [id]: {
          apiKey: newProvider.apiKey,
          baseUrl: newProvider.baseUrl,
          defaultModel: newProvider.model,
          enabled: true,
        },
      },
    };

    setLocal(updatedSettings);
    setShowAddForm(false);
    setNewProvider({ name: "", apiFormat: "openai", baseUrl: "", apiKey: "", model: "" });
    setValidateStatus("idle");
    setValidateError("");
    showToast?.("自定义提供商已添加");
  };

  const handleDeleteProvider = (name: string) => {
    const updatedCustom = (local.customProviders || []).filter((p) => p.name !== name);
    const { [name]: _, ...restProviders } = local.providers;
    setLocal({
      ...local,
      customProviders: updatedCustom,
      providers: restProviders,
      activeProvider: local.activeProvider === name ? "claude" : local.activeProvider,
    });
    showToast?.("已删除自定义提供商");
  };

  return (
    <div className="animate-slide-up" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>&#9881; 设置</h3>

      {/* LLM Providers */}
      <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
        LLM 提供商
      </h4>

      {allProviders.map((provider) => {
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
              setLocal({
                ...local,
                activeProvider: provider.name,
                activeModel: config.defaultModel || provider.models[0] || "",
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
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />
                )}
              </div>
              <span style={{ fontWeight: 500, fontSize: 13, flex: 1 }}>{provider.displayName}</span>
              {provider.isCustom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProvider(provider.name);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--error)",
                    fontSize: 16,
                    padding: "0 4px",
                    cursor: "pointer",
                  }}
                  title="删除"
                >
                  &#10005;
                </button>
              )}
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
                  {provider.models.length > 0 && !provider.isCustom ? (
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
                      placeholder="输入模型名称"
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

      {/* Add Custom Provider */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            width: "100%",
            padding: "8px 0",
            background: "var(--bg-secondary)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 16,
          }}
        >
          + 添加自定义提供商
        </button>
      ) : (
        <div style={{
          padding: "12px 14px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          marginBottom: 16,
          background: "var(--bg-secondary)",
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>添加自定义提供商</h4>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>名称</label>
            <input
              type="text"
              value={newProvider.name}
              onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
              placeholder="我的 LLM 服务"
              style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12, background: "var(--bg)", color: "var(--text)" }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>API 格式</label>
            <select
              value={newProvider.apiFormat}
              onChange={(e) => setNewProvider({ ...newProvider, apiFormat: e.target.value as "openai" | "anthropic" })}
              style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12, background: "var(--bg)", color: "var(--text)" }}
            >
              <option value="openai">OpenAI 兼容</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Base URL</label>
            <input
              type="text"
              value={newProvider.baseUrl}
              onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
              placeholder="https://api.example.com"
              style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12, background: "var(--bg)", color: "var(--text)" }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>API Key</label>
            <input
              type="password"
              value={newProvider.apiKey}
              onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
              placeholder="sk-..."
              style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12, background: "var(--bg)", color: "var(--text)" }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>模型名称</label>
            <input
              type="text"
              value={newProvider.model}
              onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
              placeholder="gpt-4o"
              style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12, background: "var(--bg)", color: "var(--text)" }}
            />
          </div>

          {/* Validate button & status */}
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={handleValidate}
              disabled={validateStatus === "validating" || !newProvider.baseUrl || !newProvider.apiKey || !newProvider.model}
              style={{
                padding: "5px 16px",
                background: validateStatus === "success" ? "var(--success)" : validateStatus === "error" ? "var(--error)" : "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
                color: validateStatus === "idle" ? "var(--text)" : "#fff",
                fontWeight: 500,
                cursor: validateStatus === "validating" ? "wait" : "pointer",
              }}
            >
              {validateStatus === "idle" && "验证配置"}
              {validateStatus === "validating" && "验证中..."}
              {validateStatus === "success" && "验证通过"}
              {validateStatus === "error" && "验证失败"}
            </button>
            {validateStatus === "error" && validateError && (
              <p style={{ fontSize: 11, color: "var(--error)", marginTop: 6, wordBreak: "break-all" }}>
                {validateError}
              </p>
            )}
            {validateStatus === "success" && (
              <p style={{ fontSize: 11, color: "var(--success)", marginTop: 6 }}>
                配置正确，可以正常使用
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleAddProvider}
              disabled={!newProvider.name || !newProvider.baseUrl || !newProvider.model || !newProvider.apiKey}
              style={{
                flex: 1,
                padding: "7px 0",
                background: "var(--primary)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                color: "#fff",
                fontWeight: 500,
              }}
            >
              添加
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewProvider({ name: "", apiFormat: "openai", baseUrl: "", apiKey: "", model: "" });
                setValidateStatus("idle");
                setValidateError("");
              }}
              style={{
                flex: 1,
                padding: "7px 0",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Auto Summarize */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>自动总结</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              打开视频 5 秒后自动开始总结
            </div>
          </div>
          <div
            onClick={() => setLocal({ ...local, autoSummarize: !local.autoSummarize })}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: local.autoSummarize ? "var(--primary)" : "var(--border)",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s ease",
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 2,
                left: local.autoSummarize ? 22 : 2,
                transition: "left 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Default Depth */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
          默认总结深度
        </label>
        <select
          value={local.defaultDepth}
          onChange={(e) =>
            setLocal({ ...local, defaultDepth: e.target.value as "full_notes" | "brief" | "key_points" })
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
            <option key={opt.value} value={opt.value}>{opt.label}</option>
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
