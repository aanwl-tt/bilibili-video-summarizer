import type { ProviderInfo } from "../types/api";

export const BUILTIN_PROVIDERS: ProviderInfo[] = [
  {
    name: "claude",
    displayName: "Claude (Anthropic)",
    models: ["claude-sonnet-4-6", "claude-haiku-4-5", "claude-opus-4-7"],
    needsBaseUrl: false,
    needsApiKey: true,
  },
  {
    name: "openai",
    displayName: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"],
    needsBaseUrl: false,
    needsApiKey: true,
  },
  {
    name: "deepseek",
    displayName: "DeepSeek",
    models: ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-pro"],
    needsBaseUrl: false,
    needsApiKey: true,
  },
  {
    name: "ollama",
    displayName: "Ollama (本地)",
    models: [],
    needsBaseUrl: true,
    needsApiKey: false,
  },
  {
    name: "openai_compat",
    displayName: "自定义 OpenAI 兼容",
    models: [],
    needsBaseUrl: true,
    needsApiKey: true,
  },
];
