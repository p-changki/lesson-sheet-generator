import { NextResponse } from "next/server";

import {
  parseGenerateResponse,
  runRuleCheck,
} from "@/features/generator/rules/check";
import { regenerateApiRequestSchema } from "@/features/generator/schemas";
import { getLlmClient } from "@/features/generator/services/llm-client";
import type { GenerateApiResponse } from "@/features/generator/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsedBody = regenerateApiRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json<GenerateApiResponse>(
        {
          ok: false,
          violations: [
            {
              code: "REGENERATE_INPUT_INVALID",
              message: "재생성 입력 스키마가 올바르지 않습니다.",
              severity: "error",
            },
          ],
          autoRegenerated: false,
          message: "Invalid regenerate request",
        },
        { status: 400 }
      );
    }

    const { input, current, section } = parsedBody.data;

    const llmClient = getLlmClient();
    const raw = await llmClient.regenerate(input, current, section);
    const parsed = parseGenerateResponse(raw);

    if (!parsed.data) {
      return NextResponse.json<GenerateApiResponse>(
        {
          ok: false,
          violations: [
            {
              code: "JSON_PARSE_FAILED",
              message: parsed.parseError ?? "JSON parse failed.",
              severity: "error",
              path: "response",
            },
          ],
          autoRegenerated: false,
          message: "Failed to parse regenerated output",
        },
        { status: 422 }
      );
    }

    const violations = runRuleCheck(parsed.data);

    return NextResponse.json<GenerateApiResponse>(
      {
        ok: true,
        data: parsed.data,
        violations,
        autoRegenerated: false,
      },
      { status: 200 }
    );
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : "알 수 없는 서버 오류가 발생했습니다.";
    const isUpstream = /gemini/i.test(reason);

    return NextResponse.json<GenerateApiResponse>(
      {
        ok: false,
        violations: [
          {
            code: isUpstream ? "LLM_UPSTREAM_ERROR" : "SERVER_ERROR",
            message: isUpstream
              ? `LLM 호출 실패: ${reason}`
              : "서버 오류가 발생했습니다.",
            severity: "error",
          },
        ],
        autoRegenerated: false,
        message: isUpstream ? reason : "Server error",
      },
      { status: isUpstream ? 502 : 500 }
    );
  }
}
