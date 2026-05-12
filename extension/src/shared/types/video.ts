export interface SubtitleSegment {
  from: number;
  to: number;
  content: string;
}

export interface VideoMetadata {
  bvid: string;
  cid: number;
  aid: number;
  title: string;
  author: string;
  duration: number;
  coverUrl: string;
  hasSubtitles: boolean;
}
