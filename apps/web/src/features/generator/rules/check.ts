import { generateResponseSchema } from "@/features/generator/schemas";
import type {
  GenerateResponse,
  RuleViolation,
} from "@/features/generator/types";

function hasWhitespace(value: string): boolean {
  return /\s/.test(value.trim());
}

export function isGenerateResponse(value: unknown): value is GenerateResponse {
  return generateResponseSchema.safeParse(value).success;
}

function buildSchemaErrorMessage(
  issues: { path: PropertyKey[]; message: string }[]
): string {
  if (!issues.length) return "JSON shape does not match GenerateResponse.";

  const formatted = issues
    .slice(0, 3)
    .map((issue) => {
      const path = issue.path.join(".") || "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  return `JSON schema validation failed (${formatted})`;
}

export function parseGenerateResponse(raw: string): {
  data?: GenerateResponse;
  parseError?: string;
} {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const validated = generateResponseSchema.safeParse(parsed);
    if (!validated.success) {
      return { parseError: buildSchemaErrorMessage(validated.error.issues) };
    }
    return { data: validated.data };
  } catch {
    return { parseError: "JSON parse failed." };
  }
}

export function runRuleCheck(data: GenerateResponse): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (data.vocab.length !== 5) {
    violations.push({
      code: "VOCAB_COUNT_MISMATCH",
      message: "어휘 개수는 정확히 5개여야 합니다.",
      path: "vocab",
      severity: "error",
    });
  }

  data.vocab.forEach((item, vocabIndex) => {
    if (hasWhitespace(item.word)) {
      violations.push({
        code: "VOCAB_WORD_NOT_SINGLE",
        message: "핵심 어휘(word)는 single-word여야 합니다.",
        path: `vocab[${vocabIndex}].word`,
        severity: "error",
      });
    }

    if (item.synonyms.length !== 3) {
      violations.push({
        code: "SYNONYM_COUNT_MISMATCH",
        message: "각 어휘의 유의어는 정확히 3개여야 합니다.",
        path: `vocab[${vocabIndex}].synonyms`,
        severity: "error",
      });
    }

    item.synonyms.forEach((synonym, synonymIndex) => {
      if (hasWhitespace(synonym.w)) {
        violations.push({
          code: "SYNONYM_NOT_SINGLE",
          message: "유의어(w)는 single-word여야 합니다.",
          path: `vocab[${vocabIndex}].synonyms[${synonymIndex}].w`,
          severity: "error",
        });
      }
    });
  });

  return violations;
}
