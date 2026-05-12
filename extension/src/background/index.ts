import type { VideoMetadata } from "../shared/types/video";
import type { ExtensionSettings } from "../shared/types/settings";
import type { SummaryResult, ProviderInfo, HistoryEntry } from "../shared/types/api";
import { BUILTIN_PROVIDERS } from "../shared/constants/providers";
import { summarize } from "../services/summarizer";
import { validateProvider } from "../services/llm";

const DEFAULT_SETTINGS: ExtensionSettings = {
  activeProvider: "claude",
  activeModel: "claude-sonnet-4-6",
  defaultDepth: "full_notes",
  customProviders: [],
  providers: Object.fromEntries(
    BUILTIN_PROVIDERS.map((p) => [
      p.name,
      { apiKey: "", baseUrl: undefined, defaultModel: p.models[0] || "", enabled: p.name === "claude" },
    ])
  ),
};

// Cache for current video metadata
let currentVideo: VideoMetadata | null = null;

// Detect tab switch / navigation → clear video if not on a Bilibili video page
function checkActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "TAB_CHANGED" }, (response) => {
      if (chrome.runtime.lastError || !response?.video) {
        currentVideo = null;
        chrome.storage.local.remove("currentVideo");
        chrome.runtime.sendMessage({ type: "VIDEO_CLEARED" }).catch(() => {});
      }
    });
  });
}

chrome.tabs.onActivated.addListener(checkActiveTab);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    checkActiveTab();
  }
});

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
    const msg = message as Record<string, unknown>;

    switch (msg.type) {
      case "VIDEO_DETECTED":
        currentVideo = msg.payload as VideoMetadata;
        // Notify side panel if open
        chrome.runtime.sendMessage({ type: "VIDEO_UPDATED", payload: currentVideo }).catch(() => {});
        sendResponse({ ok: true });
        break;

      case "OPEN_SUMMARIZE":
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs[0]?.id;
          chrome.sidePanel.open({ tabId: tabId as number } as chrome.sidePanel.OpenOptions).catch(() => {});
        });
        sendResponse({ ok: true });
        break;

      case "GET_CURRENT_VIDEO":
        if (currentVideo) {
          sendResponse(currentVideo);
        } else {
          chrome.storage.local.get("currentVideo", (result) => {
            sendResponse(result.currentVideo || null);
          });
          return true;
        }
        break;

      case "SUMMARIZE":
        handleSummarize(msg as { type: "SUMMARIZE"; bvid: string; cid: number }, sendResponse);
        return true; // Keep channel open for async

      case "GET_SETTINGS":
        getSettings(sendResponse);
        return true;

      case "SAVE_SETTINGS":
        saveSettings(msg.payload as ExtensionSettings, sendResponse);
        return true;

      case "VALIDATE_PROVIDER":
        handleValidateProvider(
          msg.payload as { apiFormat: "openai" | "anthropic"; apiKey: string; baseUrl: string; model: string },
          sendResponse
        );
        return true;
    }
  }
);

async function getSettings(sendResponse: (r: unknown) => void) {
  const result = await chrome.storage.local.get("settings");
  const settings = result.settings || DEFAULT_SETTINGS;
  sendResponse(settings);
}

async function saveSettings(payload: ExtensionSettings, sendResponse: (r: unknown) => void) {
  await chrome.storage.local.set({ settings: payload });
  sendResponse({ ok: true });
}

async function handleValidateProvider(
  payload: { apiFormat: "openai" | "anthropic"; apiKey: string; baseUrl: string; model: string },
  sendResponse: (r: unknown) => void
) {
  const result = await validateProvider(payload.apiFormat, {
    apiKey: payload.apiKey,
    baseUrl: payload.baseUrl,
    model: payload.model,
    maxTokens: 10,
    temperature: 0,
  });
  sendResponse(result);
}

async function handleSummarize(
  msg: { type: "SUMMARIZE"; bvid: string; cid: number; title?: string },
  sendResponse: (r: unknown) => void
) {
  try {
    const result = await chrome.storage.local.get("settings");
    const settings: ExtensionSettings = result.settings || DEFAULT_SETTINGS;

    const providerConfig = settings.providers[settings.activeProvider];
    if (!providerConfig) {
      sendResponse({ error: `Provider "${settings.activeProvider}" not configured` });
      return;
    }

    if (!providerConfig.apiKey && settings.activeProvider !== "ollama") {
      sendResponse({ error: `请先在设置中填写 ${settings.activeProvider} 的 API Key` });
      return;
    }

    // Find apiFormat for custom providers
    const customProvider = (settings.customProviders || []).find(
      (p: ProviderInfo) => p.name === settings.activeProvider
    );

    const data = await summarize({
      bvid: msg.bvid,
      cid: msg.cid,
      title: msg.title,
      provider: settings.activeProvider,
      model: settings.activeModel,
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      apiFormat: customProvider?.apiFormat,
    });

    // Save result to storage (persists even if sidepanel is closed)
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      bvid: msg.bvid,
      title: msg.title || "",
      author: "",
      result: data,
    };
    const historyData = await chrome.storage.local.get("history");
    const history: HistoryEntry[] = historyData.history || [];
    const newHistory = [entry, ...history].slice(0, 100);
    await chrome.storage.local.set({ lastSummary: data, history: newHistory });

    sendResponse({ data });
  } catch (e) {
    sendResponse({ error: `Failed to summarize: ${e instanceof Error ? e.message : String(e)}` });
  }
}
