import type { SummaryResult } from "../shared/types/api";
import { fetchSubtitles } from "./subtitle";
import { callLLM, type LLMMessage, type LLMConfig } from "./llm";
import { SYSTEM_PROMPT_ZH, buildUserPrompt, parseJsonResponse } from "./prompt";

export interface SummarizeInput {
  bvid: string;
  cid: number;
  page?: number;
  title?: string;
  provider: string;
  providerDisplayName?: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  apiFormat?: "openai" | "anthropic";
  options?: {
    maxTokens?: number;
    temperature?: number;
  };
}

export async function summarize(input: SummarizeInput): Promise<SummaryResult> {
  const startTime = Date.now();
  const maxTokens = input.options?.maxTokens ?? 16000;
  const temperature = input.options?.temperature ?? 0.3;

  // 1. Fetch subtitles
  const subResult = await fetchSubtitles(input.bvid, input.cid, input.page);
  if (!subResult || !subResult.textContent) {
    throw new Error("未找到字幕。该视频可能没有 CC 字幕或 AI 字幕。");
  }

  let text = subResult.textContent;

  // 2. Truncate if too long
  const estimatedTokens = Math.floor(text.length / 2);
  if (estimatedTokens > maxTokens * 3) {
    const maxChars = maxTokens * 2 * 3;
    text = text.slice(0, maxChars) + "\n...(文本截断)";
  }

  // 3. Count segments and extract duration
  const lines = text.split("\n");
  const segmentCount = lines.filter((l) => l.trim()).length;

  let duration = 0;
  const lastLines = lines.slice(-10);
  for (const line of lastLines) {
    const match = line.match(/\[(\d+):(\d+)\]/);
    if (match) {
      duration = parseInt(match[1]) * 60 + parseInt(match[2]);
      break;
    }
  }

  // 4. Build prompt
  const title = input.title || `Bilibili Video (${input.bvid})`;
  const userPrompt = buildUserPrompt({
    title,
    duration,
    segmentCount,
    subtitleText: text,
  });

  const messages: LLMMessage[] = [
    { role: "system", content: SYSTEM_PROMPT_ZH },
    { role: "user", content: userPrompt },
  ];

  const config: LLMConfig = {
    apiKey: input.apiKey,
    model: input.model,
    baseUrl: input.baseUrl,
    maxTokens,
    temperature,
  };

  // 5. Call LLM
  const response = await callLLM(input.provider, messages, config, input.apiFormat);

  // 6. Parse response
  const parsed = parseJsonResponse(response.content) as Record<string, unknown>;

  const elapsedMs = Date.now() - startTime;

  return {
    bvid: input.bvid,
    title: (parsed.title as string) || "",
    author: (parsed.author as string) || "",
    chapters: (parsed.chapters as SummaryResult["chapters"]) || [],
    overall_summary: (parsed.overall_summary as string) || "",
    tags: (parsed.tags as string[]) || [],
    source_subtitles_count: subResult.totalSegments,
    processing_time_ms: elapsedMs,
    provider_used: input.providerDisplayName || input.provider,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  };
}
