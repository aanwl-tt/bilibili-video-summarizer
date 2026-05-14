export interface KeyPoint {
  text: string;
  timestamp: number;
}

export interface Chapter {
  title: string;
  start_time: number;
  end_time: number;
  summary: string;
  key_points: KeyPoint[];
  sub_chapters?: Chapter[];
}

export interface SummaryResult {
  bvid: string;
  title: string;
  author: string;
  chapters: Chapter[];
  overall_summary: string;
  tags: string[];
  source_subtitles_count: number;
  processing_time_ms: number;
  provider_used: string;
  input_tokens?: number;
  output_tokens?: number;
}

export interface SummarizeRequest {
  bvid: string;
  cid: number;
  provider: string;
  model: string;
  options: SummarizeOptions;
  subtitle_content?: string;
  api_key?: string;
  base_url?: string;
}

export interface SummarizeOptions {
  depth: "full_notes" | "brief" | "key_points";
  language: string;
  max_tokens?: number;
  temperature?: number;
}

export interface SummarizeResponse {
  bvid: string;
  title: string;
  author: string;
  chapters: Chapter[];
  overall_summary: string;
  tags: string[];
  source_subtitles_count: number;
  processing_time_ms: number;
  provider_used: string;
}

export interface BatchJobStatus {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  total_videos: number;
  completed: number;
  failed: number;
  current_video?: { bvid: string; title: string };
  results_so_far: SummarizeResponse[];
}

export interface ProviderInfo {
  name: string;
  displayName: string;
  models: string[];
  needsBaseUrl: boolean;
  needsApiKey: boolean;
  apiFormat?: "openai" | "anthropic";
  isCustom?: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  bvid: string;
  page: number;
  title: string;
  author: string;
  result: SummaryResult;
}
