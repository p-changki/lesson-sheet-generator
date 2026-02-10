import { NextResponse } from "next/server";

import {
  runRuleCheck,
  parseGenerateResponse,
} from "@/features/generator/rules/check";
import { generateApiRequestSchema } from "@/features/generator/schemas";
import { getLlmClient } from "@/features/generator/services/llm-client";
import { buildUnhandledApiErrorResponse } from "@/app/api/shared/error-response";
import type {
  GenerateApiResponse,
  GenerateInput,
  GenerateResponse,
  RuleViolation,
} from "@/features/generator/types";

function validateInput(input: GenerateInput): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (!input.passage.trim()) {
    violations.push({
      code: "PASSAGE_REQUIRED",
      message: "Passage는 필수입니다.",
      path: "input.passage",
      severity: "error",
    });
  }

  if (input.choices.length > 0 && input.choices.length !== 5) {
    violations.push({
      code: "CHOICES_COUNT_INVALID",
      message: "Choices는 5개 기준으로 입력하세요.",
      path: "input.choices",
      severity: "warning",
    });
  }

  return violations;
}

function parseErrorViolation(message: string): RuleViolation {
  return {
    code: "JSON_PARSE_FAILED",
    message,
    path: "response",
    severity: "error",
  };
}

function parseBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsedBody = generateApiRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json<GenerateApiResponse>(
        {
          ok: false,
          violations: [
            {
              code: "INPUT_INVALID",
              message: "입력 스키마가 올바르지 않습니다.",
              severity: "error",
              path: "input",
            },
          ],
          autoRegenerated: false,
          message: "Invalid input",
        },
        { status: 400 }
      );
    }

    const { input } = parsedBody.data;

    const inputViolations = validateInput(input);
    if (inputViolations.some((violation) => violation.severity === "error")) {
      return NextResponse.json<GenerateApiResponse>(
        {
          ok: false,
          violations: inputViolations,
          autoRegenerated: false,
          message: "Input validation failed",
        },
        { status: 400 }
      );
    }

    const llmClient = getLlmClient();
    const enableParseRetry = parseBooleanEnv(
      "GENERATOR_AUTO_RETRY_PARSE",
      true
    );
    const enableRuleRegenerate = parseBooleanEnv(
      "GENERATOR_AUTO_REGENERATE_RULE_ERRORS",
      true
    );
    let autoRegenerated = false;

    let raw = await llmClient.generate(input);
    let parsed = parseGenerateResponse(raw);
    let data: GenerateResponse | undefined = parsed.data;

    if (!data && enableParseRetry) {
      autoRegenerated = true;
      raw = await llmClient.generate(input);
      parsed = parseGenerateResponse(raw);
      data = parsed.data;
    }

    if (!data) {
      return NextResponse.json<GenerateApiResponse>(
        {
          ok: false,
          violations: [
            ...inputViolations,
            parseErrorViolation(parsed.parseError ?? "JSON parse failed."),
          ],
          autoRegenerated,
          message: "Failed to parse model output",
        },
        { status: 422 }
      );
    }

    let violations = [...inputViolations, ...runRuleCheck(data)];

    if (
      violations.some((violation) => violation.severity === "error") &&
      !autoRegenerated &&
      enableRuleRegenerate
    ) {
      const regenerated = await llmClient.regenerate(input, data, "all");
      autoRegenerated = true;
      const reparsed = parseGenerateResponse(regenerated);
      if (reparsed.data) {
        data = reparsed.data;
        violations = [...inputViolations, ...runRuleCheck(data)];
      } else {
        violations.push(
          parseErrorViolation(
            reparsed.parseError ?? "JSON parse failed after regeneration."
          )
        );
      }
    }

    return NextResponse.json<GenerateApiResponse>(
      {
        ok: true,
        data,
        violations,
        autoRegenerated,
      },
      { status: 200 }
    );
  } catch (error) {
    return buildUnhandledApiErrorResponse(error);
  }
}
