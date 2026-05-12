import type { VideoMetadata } from "../shared/types/video";

console.log("[Bilibili Summarizer] Content script loaded");

let currentMeta: VideoMetadata | null = null;

// Fallback: extract BVID from URL if __INITIAL_STATE__ is not available
function getBvidFromUrl(): string | null {
  const m = location.pathname.match(/\/video\/(BV\w+)/);
  return m ? m[1] : null;
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
      const m = t.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});\s*</);
      if (m) return JSON.parse(m[1]);
    }
  } catch {
    /* ignore */
  }

  return null;
}

function extractVideoMetadata(state: Record<string, unknown>): VideoMetadata | null {
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

async function init() {
  // Try to get metadata from __INITIAL_STATE__
  const state = getInitialState();
  if (state) {
    currentMeta = extractVideoMetadata(state);
    if (currentMeta) {
      console.log("[Bilibili Summarizer] Video detected:", currentMeta.bvid);
      chrome.runtime.sendMessage({ type: "VIDEO_DETECTED", payload: currentMeta }).catch(() => {});
      chrome.storage.local.set({ currentVideo: currentMeta }).catch(() => {});
      setTimeout(injectSummarizeButton, 1000);
      return;
    }
  }

  // Fallback: extract bvid from URL
  const bvid = getBvidFromUrl();
  if (bvid) {
    console.log("[Bilibili Summarizer] Video detected from URL:", bvid);
    currentMeta = {
      bvid,
      cid: 0,
      aid: 0,
      title: document.title.replace("_哔哩哔哩_bilibili", "").trim(),
      author: "",
      duration: 0,
      coverUrl: "",
      hasSubtitles: false,
    };
    chrome.runtime.sendMessage({ type: "VIDEO_DETECTED", payload: currentMeta }).catch(() => {});
    setTimeout(injectSummarizeButton, 1000);
    return;
  }

  // Retry for async-loaded pages
  setTimeout(init, 2000);
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
});

// Run on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Watch for SPA navigation (Bilibili uses vue-router)
let lastUrl = location.href;
new MutationObserver(() => {
  // Re-inject button if it was removed by SPA re-render
  if (!document.getElementById("bili-summarizer-btn") && !!getBvidFromUrl()) {
    injectSummarizeButton();
  }
  // Re-init on URL change
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(init, 1000);
  }
}).observe(document.body, { childList: true, subtree: true, attributes: false });
