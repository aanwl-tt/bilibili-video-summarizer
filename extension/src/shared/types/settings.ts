import type { ProviderInfo } from "./api";

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  enabled: boolean;
}

export interface ExtensionSettings {
  providers: Record<string, ProviderConfig>;
  activeProvider: string;
  activeModel: string;
  defaultDepth: "full_notes" | "brief" | "key_points";
  customProviders: ProviderInfo[];
  autoSummarize?: boolean;
}
