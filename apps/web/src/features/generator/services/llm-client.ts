import type {
  GenerateInput,
  GenerateResponse,
  RegenerateSection,
} from "@/features/generator/types";
import {
  mockGenerate,
  mockRegenerate,
} from "@/features/generator/services/mock-client";
import {
  geminiGenerate,
  geminiRegenerate,
} from "@/features/generator/services/gemini-client";

export interface LlmClient {
  generate(input: GenerateInput): Promise<string>;
  regenerate(
    input: GenerateInput,
    current: GenerateResponse,
    section: RegenerateSection
  ): Promise<string>;
}

const mockClient: LlmClient = {
  generate: mockGenerate,
  regenerate: mockRegenerate,
};

const geminiClient: LlmClient = {
  generate: geminiGenerate,
  regenerate: geminiRegenerate,
};

export function getLlmClient(): LlmClient {
  if (process.env.GEMINI_API_KEY) {
    return geminiClient;
  }

  return mockClient;
}
