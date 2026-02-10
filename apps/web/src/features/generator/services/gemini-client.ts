import type {
  GenerateInput,
  GenerateResponse,
  RegenerateSection,
} from "@/features/generator/types";
import { LlmUpstreamError } from "@/features/generator/services/errors";
import { buildPromptOnly } from "@/features/generator/services/prompt-builder";

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
  finishReason?: string;
}

interface GeminiApiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    thoughtsTokenCount?: number;
    cachedContentTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 700;
const DEFAULT_THINKING_BUDGET = 0;

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

class GeminiRequestError extends LlmUpstreamError {
  status?: number;
  retryable: boolean;

  constructor(
    message: string,
    options?: { status?: number; retryable?: boolean }
  ) {
    super(message);
    this.name = "GeminiRequestError";
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
  }
}

function parseNumberEnv(
  name: string,
  fallback: number,
  options?: { min?: number }
): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;

  const integer = Math.floor(value);
  const min = options?.min ?? 1;
  if (integer < min) return fallback;

  return integer;
}

function parseOptionalNumberEnv(
  name: string,
  options?: { min?: number }
): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;

  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;

  const integer = Math.floor(value);
  const min = options?.min ?? 1;
  if (integer < min) return undefined;

  return integer;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, baseDelay: number): number {
  const jitter = Math.floor(Math.random() * 250);
  return baseDelay * 2 ** attempt + jitter;
}

function shouldLogUsage(): boolean {
  if (process.env.GEMINI_LOG_USAGE === "true") return true;
  if (process.env.GEMINI_LOG_USAGE === "false") return false;
  return process.env.NODE_ENV === "development";
}

function logUsageMetadata(payload: GeminiApiResponse, model: string): void {
  if (!shouldLogUsage()) return;

  const usage = payload.usageMetadata;
  const finishReason = payload.candidates?.[0]?.finishReason ?? "UNKNOWN";

  if (!usage) {
    console.info(
      `[gemini-usage] model=${model} finishReason=${finishReason} usageMetadata=unavailable`
    );
    return;
  }

  console.info(
    [
      "[gemini-usage]",
      `model=${model}`,
      `finishReason=${finishReason}`,
      `prompt=${usage.promptTokenCount ?? 0}`,
      `candidate=${usage.candidatesTokenCount ?? 0}`,
      `total=${usage.totalTokenCount ?? 0}`,
      `thoughts=${usage.thoughtsTokenCount ?? 0}`,
      `cached=${usage.cachedContentTokenCount ?? 0}`,
    ].join(" ")
  );
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const baseUrl = process.env.GEMINI_API_BASE_URL ?? DEFAULT_BASE_URL;
  const timeoutMs = parseNumberEnv("GEMINI_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, {
    min: 1,
  });
  const maxRetries = parseNumberEnv("GEMINI_MAX_RETRIES", DEFAULT_MAX_RETRIES, {
    min: 0,
  });
  const retryBaseDelayMs = parseNumberEnv(
    "GEMINI_RETRY_BASE_DELAY_MS",
    DEFAULT_RETRY_BASE_DELAY_MS,
    { min: 1 }
  );
  const thinkingBudget = parseNumberEnv(
    "GEMINI_THINKING_BUDGET",
    DEFAULT_THINKING_BUDGET,
    { min: 0 }
  );
  const maxOutputTokens = parseOptionalNumberEnv("GEMINI_MAX_OUTPUT_TOKENS", {
    min: 1,
  });

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  return {
    apiKey,
    model,
    baseUrl,
    timeoutMs,
    maxRetries,
    retryBaseDelayMs,
    thinkingBudget,
    maxOutputTokens,
  };
}

const generateResponseSchemaForGemini = {
  type: "OBJECT",
  required: [
    "reading_blocks",
    "solution_logic",
    "choice_analysis",
    "vocab",
    "one_liner",
  ],
  properties: {
    reading_blocks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["sentenceNo", "chunks", "ko", "logicPoints"],
        properties: {
          sentenceNo: { type: "NUMBER" },
          chunks: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          ko: { type: "STRING" },
          logicPoints: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
      },
    },
    solution_logic: {
      type: "OBJECT",
      required: ["final", "rationale"],
      properties: {
        final: { type: "STRING" },
        rationale: { type: "STRING" },
      },
    },
    choice_analysis: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["no", "text", "verdict", "reason"],
        properties: {
          no: { type: "NUMBER" },
          text: { type: "STRING" },
          verdict: {
            type: "STRING",
            enum: ["O", "X", "N/A"],
          },
          reason: { type: "STRING" },
        },
      },
    },
    vocab: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["word", "koMeaning", "synonyms"],
        properties: {
          word: { type: "STRING" },
          koMeaning: { type: "STRING" },
          synonyms: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              required: ["w", "ko"],
              properties: {
                w: { type: "STRING" },
                ko: { type: "STRING" },
              },
            },
          },
        },
      },
    },
    one_liner: { type: "STRING" },
  },
} as const;

function buildRegeneratePrompt(
  input: GenerateInput,
  current: GenerateResponse,
  section: RegenerateSection
): string {
  return [
    "Return JSON only.",
    "Regenerate the requested section and keep other fields valid.",
    `Requested section: ${section}`,
    "",
    "[ORIGINAL INPUT]",
    buildPromptOnly(input),
    "",
    "[CURRENT JSON]",
    JSON.stringify(current),
    "",
    "Return full GenerateResponse JSON only.",
    "Constraints: vocab exactly 5 items, each vocab must have exactly 3 single-word synonyms.",
  ].join("\n");
}

function extractCandidateText(payload: GeminiApiResponse): string {
  const finishReason = payload.candidates?.[0]?.finishReason;
  if (
    finishReason &&
    ["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "RECITATION"].includes(
      finishReason
    )
  ) {
    throw new GeminiRequestError(
      `Gemini blocked the response (finishReason: ${finishReason}).`,
      { retryable: false }
    );
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiRequestError("Gemini returned empty candidate text.", {
      retryable: false,
    });
  }

  const unfenced = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const firstBrace = unfenced.indexOf("{");
  const lastBrace = unfenced.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return unfenced.slice(firstBrace, lastBrace + 1).trim();
  }

  return unfenced;
}

async function requestGeminiOnce(prompt: string): Promise<string> {
  const { apiKey, model, baseUrl, timeoutMs, thinkingBudget, maxOutputTokens } =
    getGeminiConfig();
  const endpoint = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  let payload: GeminiApiResponse = {};

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: generateResponseSchemaForGemini,
          thinkingConfig: {
            thinkingBudget,
          },
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    payload = (await response.json()) as GeminiApiResponse;
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === "AbortError") {
      throw new GeminiRequestError(
        `Gemini request timed out after ${timeoutMs}ms.`,
        {
          retryable: true,
        }
      );
    }

    throw new GeminiRequestError("Gemini network error.", { retryable: true });
  }

  clearTimeout(timeout);

  if (!response) {
    throw new GeminiRequestError("Gemini response is unavailable.", {
      retryable: true,
    });
  }

  logUsageMetadata(payload, model);

  if (!response.ok) {
    const message =
      payload.error?.message ?? `Gemini request failed (${response.status})`;
    throw new GeminiRequestError(message, {
      status: response.status,
      retryable: RETRYABLE_STATUS.has(response.status),
    });
  }

  return extractCandidateText(payload);
}

async function requestGemini(prompt: string): Promise<string> {
  const { maxRetries, retryBaseDelayMs } = getGeminiConfig();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await requestGeminiOnce(prompt);
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown Gemini error");

      const retryable =
        error instanceof GeminiRequestError ? error.retryable : false;
      const hasNextAttempt = attempt < maxRetries;

      if (!retryable || !hasNextAttempt) {
        throw lastError;
      }

      await wait(backoffDelay(attempt, retryBaseDelayMs));
    }
  }

  throw lastError ?? new Error("Gemini request failed.");
}

export async function geminiGenerate(input: GenerateInput): Promise<string> {
  const prompt = buildPromptOnly(input);
  return requestGemini(prompt);
}

export async function geminiRegenerate(
  input: GenerateInput,
  current: GenerateResponse,
  section: RegenerateSection
): Promise<string> {
  const prompt = buildRegeneratePrompt(input, current, section);
  return requestGemini(prompt);
}
