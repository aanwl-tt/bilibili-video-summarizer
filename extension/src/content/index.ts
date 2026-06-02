import type { VideoMetadata } from "../shared/types/video";

console.log("[Bilibili Summarizer] Content script loaded");

let currentMeta: VideoMetadata | null = null;

// Retry control
const RETRY_MAX = 5;
const RETRY_DELAY = 2000;
let initDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let initPromise: Promise<void> | null = null;

// Fallback: extract BVID and page from URL if __INITIAL_STATE__ is not available
function getBvidFromUrl(): { bvid: string; page: number } | null {
  const m = location.pathname.match(/\/video\/(BV\w+)/);
  if (!m) return null;
  const params = new URLSearchParams(location.search);
  const page = parseInt(params.get("p") || "1", 10);
  return { bvid: m[1], page };
}

function getInitialState(): Record<string, unknown> | null {
  // Try 1: global window variable (Bilibili new SPA)
  try {
    const g = (window as unknown as Record<string, unknown>).__INITIAL_STATE__;
    if (g && typeof g === "object") return g as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  // Try 2: script tag with id="__INITIAL_STATE__"
  try {
    const el = document.getElementById("__INITIAL_STATE__");
    if (el?.textContent) return JSON.parse(el.textContent);
  } catch {
    /* ignore */
  }

  // Try 3: script tag whose textContent contains __INITIAL_STATE__ assignment
  try {
    const scripts = document.querySelectorAll("script");
    for (const s of scripts) {
      const t = s.textContent || "";
      const m = t.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*[<\n]/);
      if (m) return JSON.parse(m[1]);
    }
  } catch {
    /* ignore */
  }

  return null;
}

function extractVideoMetadata(state: Record<string, unknown>, page: number): VideoMetadata | null {
  // Bilibili stores video data under different keys depending on version
  const vd = (state.videoData as Record<string, unknown> | undefined) ||
    (state.videoInfo as Record<string, unknown> | undefined) ||
    (state.initState as Record<string, unknown> | undefined) ||
    state;

  const bvid = (vd.bvid as string) || "";
  const cid = (vd.cid as number) || 0;
  if (!bvid || !cid) return null;

  return {
    bvid,
    cid,
    page,
    aid: (vd.aid as number) || 0,
    title: (vd.title as string) || document.title.replace("_哔哩哔哩_bilibili", "").trim(),
    author: (vd.owner as Record<string, string>)?.name || (vd.author as string) || "",
    duration: (vd.duration as number) || 0,
    coverUrl: (vd.pic as string) || "",
    hasSubtitles: !!((vd.subtitle as Record<string, unknown>)?.subtitles as unknown[] | undefined)?.length,
  };
}

function injectSummarizeButton() {
  const existing = document.getElementById("bili-summarizer-btn");
  if (existing) return;

  const btn = document.createElement("button");
  btn.id = "bili-summarizer-btn";
  btn.textContent = "📝 总结";
  btn.style.cssText = `
    margin: 8px auto;
    padding: 8px 24px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #fb7299, #fc8b9f);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    z-index: 9999;
    display: block;
    width: fit-content;
  `;
  btn.onmouseenter = () => (btn.style.opacity = "0.85");
  btn.onmouseleave = () => (btn.style.opacity = "1");
  btn.onclick = () => {
    if (currentMeta) {
      chrome.storage.local.set({ currentVideo: currentMeta }).catch(() => {});
    }
    // Open floating panel directly
    window.dispatchEvent(new CustomEvent("bili-summarizer-open"));
    // Also notify background (for side panel fallback)
    try {
      chrome.runtime.sendMessage({ type: "OPEN_SUMMARIZE" });
    } catch {
      setTimeout(() => {
        try { chrome.runtime.sendMessage({ type: "OPEN_SUMMARIZE" }); } catch {}
      }, 500);
    }
  };

  // Strategy 1: Insert after the player container (outside overflow: hidden)
  const video = document.querySelector("video");
  if (video) {
    const playerContainer = video.closest('.bpx-player-container') ||
                            video.closest('.player-wrap') ||
                            video.closest('[class*="player"]');
    if (playerContainer) {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display:flex;justify-content:center;padding:8px 0;clear:both;";
      wrapper.id = "bili-summarizer-wrapper";
      wrapper.appendChild(btn);
      playerContainer.insertAdjacentElement("afterend", wrapper);
      console.log("[Bilibili Summarizer] Button injected after player container");
      return;
    }
    // Fallback: fixed position if no container found
    btn.style.position = "fixed";
    btn.style.bottom = "20px";
    btn.style.right = "20px";
    btn.style.zIndex = "99999";
    document.body.appendChild(btn);
    console.log("[Bilibili Summarizer] Button injected as floating button");
    return;
  }

  // Strategy 2: Try to insert into Bilibili's video-info area
  const infoArea = document.querySelector(".video-info-container") ||
    document.querySelector(".video-data") ||
    document.querySelector("#viewbox_report") ||
    document.querySelector(".video-title-container") ||
    document.querySelector('[class*="video-title"]') ||
    document.querySelector('[class*="VideoTitle"]');
  if (infoArea) {
    infoArea.appendChild(btn);
    console.log("[Bilibili Summarizer] Button injected into info area");
    return;
  }

  // Strategy 3: Append to body as floating button
  btn.style.position = "fixed";
  btn.style.top = "60px";
  btn.style.right = "20px";
  btn.style.zIndex = "99999";
  document.body.appendChild(btn);
  console.log("[Bilibili Summarizer] Button injected as floating button");
}

function emitVideoDetected(meta: VideoMetadata) {
  currentMeta = meta;
  console.log("[Bilibili Summarizer] Video detected:", meta.bvid, "title:", meta.title);
  chrome.runtime.sendMessage({ type: "VIDEO_DETECTED", payload: meta }).catch(() => {});
  chrome.storage.local.set({ currentVideo: meta }).catch(() => {});
  window.dispatchEvent(new CustomEvent("bili-summarizer-video-changed", { detail: meta }));
  setTimeout(injectSummarizeButton, 1000);
}

async function initWithRetry(retryCount = 0): Promise<void> {
  const urlInfo = getBvidFromUrl();
  const urlBvid = urlInfo?.bvid || null;
  const page = urlInfo?.page || 1;

  // Try to get metadata from __INITIAL_STATE__
  const state = getInitialState();
  if (state) {
    const meta = extractVideoMetadata(state, page);
    if (meta) {
      if (urlBvid && meta.bvid !== urlBvid) {
        // __INITIAL_STATE__ has stale data from previous video
        console.log("[Bilibili Summarizer] Stale state:", meta.bvid, "!== URL:", urlBvid,
          retryCount < RETRY_MAX ? `retry ${retryCount + 1}/${RETRY_MAX}` : "max retries, using URL");
        if (retryCount < RETRY_MAX) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
          return initWithRetry(retryCount + 1);
        }
        // Max retries: fall through to URL fallback
      } else {
        // Happy path: bvid matches URL or no URL to compare
        emitVideoDetected(meta);
        return;
      }
    }
  }

  // Fallback: extract bvid from URL (always correct)
  if (urlBvid) {
    console.log("[Bilibili Summarizer] Using URL bvid:", urlBvid, "page:", page);
    emitVideoDetected({
      bvid: urlBvid,
      cid: 0,
      page,
      aid: 0,
      title: document.title.replace("_哔哩哔哩_bilibili", "").trim(),
      author: "",
      duration: 0,
      coverUrl: "",
      hasSubtitles: false,
    });
    return;
  }

  // No video detected, retry if under limit
  if (retryCount < RETRY_MAX) {
    console.log("[Bilibili Summarizer] No video found, retry", retryCount + 1, "/", RETRY_MAX);
    await new Promise((r) => setTimeout(r, RETRY_DELAY));
    return initWithRetry(retryCount + 1);
  }
  console.log("[Bilibili Summarizer] No video detected after max retries");
}

async function init(): Promise<void> {
  // Cancel any pending debounce
  if (initDebounceTimer) {
    clearTimeout(initDebounceTimer);
    initDebounceTimer = null;
  }

  // Deduplicate: if already running, wait for existing promise
  if (initPromise) return initPromise;

  initPromise = initWithRetry().finally(() => {
    initPromise = null;
  });
  return initPromise;
}

// Listen for messages from side panel and background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const msg = message as Record<string, unknown>;
  if (msg.type === "SEEK_VIDEO") {
    const payload = msg.payload as { time: number };
    const video = document.querySelector("video");
    if (video) {
      video.currentTime = payload.time;
      video.play().catch(() => {});
    }
  }
  if (msg.type === "TAB_CHANGED") {
    sendResponse({ video: currentMeta });
    return true;
  }
  if (msg.type === "REFRESH_VIDEO") {
    init().then(() => sendResponse({ video: currentMeta }));
    return true;
  }
});

// Run on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Watch for SPA navigation (Bilibili uses vue-router + pushState)
let lastUrl = location.href;

function checkUrlChange() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log("[Bilibili Summarizer] URL changed:", location.href);
    // Debounce init to avoid multiple triggers firing at once
    if (initDebounceTimer) clearTimeout(initDebounceTimer);
    initDebounceTimer = setTimeout(init, 1000);
  }
}

// Method 1: MutationObserver for DOM changes (debounced)
let observerDebounceTimer: ReturnType<typeof setTimeout> | null = null;
new MutationObserver(() => {
  if (observerDebounceTimer) return;
  observerDebounceTimer = setTimeout(() => {
    observerDebounceTimer = null;
    if (!document.getElementById("bili-summarizer-btn") && !!getBvidFromUrl()) {
      injectSummarizeButton();
    }
    checkUrlChange();
  }, 500);
}).observe(document.body, { childList: true, subtree: true, attributes: false });

// Method 2: popstate for back/forward navigation
window.addEventListener("popstate", checkUrlChange);

// Method 3: Periodic URL check (catches pushState that doesn't trigger DOM changes)
setInterval(checkUrlChange, 2000);
