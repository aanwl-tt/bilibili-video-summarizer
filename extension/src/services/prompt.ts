export const SYSTEM_PROMPT_ZH = `你是一个专业的视频内容整理助手。你的任务是根据B站视频的字幕文本，生成一份结构化的"完整笔记"。

## 输出格式要求

你必须返回严格的JSON格式，不要包含任何markdown代码块标记：

{
  "title": "视频标题（保留原标题）",
  "author": "作者名",
  "overall_summary": "一段200-300字的整体摘要，概括视频核心内容和价值",
  "chapters": [
    {
      "title": "章节标题（简洁，10字以内）",
      "start_time": 0,
      "end_time": 245,
      "summary": "该章节内容的详细总结，3-5句话",
      "key_points": [
        {"text": "关键观点或知识点", "timestamp": 15},
        {"text": "另一个关键点", "timestamp": 89}
      ]
    }
  ],
  "tags": ["标签1", "标签2", "标签3"]
}

## 章节划分规则
1. 根据内容的逻辑转折点划分章节（通常一个10-20分钟的视频有4-8个章节）
2. 章节标题要有信息量，不要用"开头"、"中间"、"结尾"这种无意义标题
3. 每个章节的start_time和end_time要准确对应字幕中的时间戳
4. 章节之间的时间要连续，不要有间隙

## Key Points规则
1. 每个章节提取3-8个关键点
2. 每个关键点标注对应的近似时间戳
3. Key points应该包括：定义、原理、观点、数据、步骤、结论

## 语言和风格
- 输出语言：中文
- 专业术语保留英文原名（如"React"、"API"）
- 保持严谨性，不要添加视频中没提到的内容
- 不要评价视频的好坏

## 输入格式说明
你会收到带有[MM:SS]时间戳的字幕文本。时间戳对应的就是视频中的实际时间。`;

const USER_PROMPT_TEMPLATE = `请为以下B站视频生成完整笔记。

视频标题: <<<TITLE>>>
字幕总时长: <<<DURATION>>>秒
字幕片段数: <<<SEGMENT_COUNT>>>

以下是带时间戳的字幕文本：

<<<SUBTITLE_TEXT>>>

请严格按照系统提示中的JSON格式返回结果。`;

export function buildUserPrompt(args: {
  title: string;
  duration: number;
  segmentCount: number;
  subtitleText: string;
}): string {
  return USER_PROMPT_TEMPLATE
    .replace("<<<TITLE>>>", args.title)
    .replace("<<<DURATION>>>", String(args.duration))
    .replace("<<<SEGMENT_COUNT>>>", String(args.segmentCount))
    .replace("<<<SUBTITLE_TEXT>>>", args.subtitleText);
}

export function parseJsonResponse(content: string): Record<string, unknown> {
  // Stage 1: strip markdown code fence
  const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }

  // Stage 2: direct parse
  try { return JSON.parse(content); } catch {}

  // Stage 3: brace scan
  const braceMatch = content.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch {}
  }

  // Fallback: throw error instead of returning a fake summary
  throw new Error(`LLM 响应解析失败: ${content.slice(0, 300)}`);
}
