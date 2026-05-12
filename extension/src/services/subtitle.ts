import { API_ENDPOINTS } from "../shared/constants/bilibili";
import { getWbiKeys, signWbi, BROWSER_HEADERS } from "./wbi";

export interface SubtitleSegment {
  from: number;
  to: number;
  content: string;
}

export interface SubtitleResult {
  subtitleUrl: string | null;
  segments: SubtitleSegment[];
  totalSegments: number;
  totalDuration: number;
  textContent: string;
}

const LANG_PRIORITY_1 = ["zh-cn", "zh-hans", "zh"];
const LANG_PRIORITY_2 = ["ai-zh", "ai-cn"];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function selectSubtitle(
  subtitles: Array<{ lan: string; subtitle_url: string }>
): { lan: string; subtitle_url: string } | null {
  if (!subtitles || subtitles.length === 0) return null;

  for (const sub of subtitles) {
    if (LANG_PRIORITY_1.includes(sub.lan.toLowerCase())) return sub;
  }
  for (const sub of subtitles) {
    if (LANG_PRIORITY_2.includes(sub.lan.toLowerCase())) return sub;
  }
  return subtitles[0];
}

export async function getCid(bvid: string): Promise<number | null> {
  try {
    const resp = await fetch(
      `${API_ENDPOINTS.PAGELIST}?bvid=${encodeURIComponent(bvid)}`,
      { headers: BROWSER_HEADERS, credentials: "include" }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.code === 0 && data?.data?.length > 0) {
      return data.data[0].cid;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchSubtitles(
  bvid: string,
  cid?: number
): Promise<SubtitleResult | null> {
  if (!cid) {
    cid = (await getCid(bvid)) || undefined;
    if (!cid) return null;
  }

  // Try WBI-signed endpoint
  let subtitles: Array<{ lan: string; subtitle_url: string }> = [];
  try {
    const [imgKey, subKey] = await getWbiKeys();
    const signed = signWbi({ bvid, cid }, imgKey, subKey);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(signed)) {
      params.set(k, String(v));
    }
    const resp = await fetch(
      `${API_ENDPOINTS.PLAYER_WBI_V2}?${params.toString()}`,
      { headers: BROWSER_HEADERS, credentials: "include" }
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data?.code === 0) {
        subtitles = data?.data?.subtitle?.subtitles || [];
      }
    }
  } catch {}

  // Fallback to unsigned endpoint
  if (subtitles.length === 0) {
    try {
      const resp = await fetch(
        `${API_ENDPOINTS.SUBTITLE_GET}?bvid=${encodeURIComponent(bvid)}&cid=${cid}`,
        { headers: BROWSER_HEADERS, credentials: "include" }
      );
      if (resp.ok) {
        const data = await resp.json();
        subtitles = data?.data?.subtitle?.subtitles || [];
      }
    } catch {}
  }

  if (subtitles.length === 0) return null;

  const selected = selectSubtitle(subtitles);
  if (!selected) return null;

  // Download subtitle JSON
  let url = selected.subtitle_url;
  if (url.startsWith("//")) url = "https:" + url;

  const subResp = await fetch(url);
  if (!subResp.ok) return null;
  const subData = await subResp.json();

  const rawSegments: Array<{ from: number; to: number; content: string }> =
    subData?.body || [];

  const segments: SubtitleSegment[] = rawSegments
    .filter((s) => s.content?.trim())
    .map((s) => ({ from: s.from, to: s.to, content: s.content.trim() }));

  if (segments.length === 0) return null;

  const textContent = segments
    .map((s) => `[${formatTime(s.from)}] ${s.content}`)
    .join("\n");

  return {
    subtitleUrl: url,
    segments,
    totalSegments: segments.length,
    totalDuration: segments[segments.length - 1].to,
    textContent,
  };
}
