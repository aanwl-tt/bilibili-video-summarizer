export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
  finishReason: string;
}

// --- Claude (Anthropic Messages API) ---
async function callClaude(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: config.maxTokens,
    messages: chatMessages,
    temperature: config.temperature,
  };
  if (systemMsg) body.system = systemMsg.content;

  const baseUrl = (config.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");
  const resp = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const textParts = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text);

  return {
    content: textParts.join(""),
    model: data.model || config.model,
    usage: {
      input_tokens: data.usage?.input_tokens || 0,
      output_tokens: data.usage?.output_tokens || 0,
    },
    finishReason: data.stop_reason || "",
  };
}

// --- OpenAI (Chat Completions API) ---
async function callOpenAI(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const baseUrl = (config.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const chatMessages = messages.map((m) => ({ role: m.role, content: m.content }));

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: chatMessages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content || "",
    model: data.model || config.model,
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
    },
    finishReason: choice?.finish_reason || "",
  };
}

// --- DeepSeek (OpenAI-compatible) ---
async function callDeepSeek(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  return callOpenAI(messages, {
    ...config,
    baseUrl: config.baseUrl || "https://api.deepseek.com/v1",
  });
}

// --- Ollama (native HTTP API) ---
async function callOllama(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const baseUrl = (config.baseUrl || "http://localhost:11434").replace(/\/+$/, "");
  const chatMessages = messages.map((m) => ({ role: m.role, content: m.content }));

  const resp = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      messages: chatMessages,
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      },
    }),
    signal: AbortSignal.timeout(300_000),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Ollama API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  return {
    content: data?.message?.content || "",
    model: config.model,
    usage: {
      input_tokens: data?.prompt_eval_count || 0,
      output_tokens: data?.eval_count || 0,
    },
    finishReason: "stop",
  };
}

// --- Dispatcher ---
const PROVIDER_MAP: Record<string, (m: LLMMessage[], c: LLMConfig) => Promise<LLMResponse>> = {
  claude: callClaude,
  openai: callOpenAI,
  deepseek: callDeepSeek,
  ollama: callOllama,
  openai_compat: callOpenAI,
};

export async function callLLM(
  provider: string,
  messages: LLMMessage[],
  config: LLMConfig,
  apiFormat?: "openai" | "anthropic"
): Promise<LLMResponse> {
  // Custom provider uses explicit apiFormat
  if (apiFormat) {
    const fn = apiFormat === "anthropic" ? callClaude : callOpenAI;
    return fn(messages, config);
  }
  const fn = PROVIDER_MAP[provider];
  if (!fn) {
    throw new Error(`Unknown LLM provider: ${provider}. Supported: ${Object.keys(PROVIDER_MAP).join(", ")}`);
  }
  return fn(messages, config);
}

export async function validateProvider(
  apiFormat: "openai" | "anthropic",
  config: LLMConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    const testMessages: LLMMessage[] = [{ role: "user", content: "Hi" }];
    const fn = apiFormat === "anthropic" ? callClaude : callOpenAI;
    await fn(testMessages, { ...config, maxTokens: 10, temperature: 0 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
