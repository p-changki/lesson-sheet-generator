import { NextResponse } from "next/server";

import { LlmUpstreamError } from "@/features/generator/services/errors";
import type { GenerateApiResponse } from "@/features/generator/types";

export function buildUnhandledApiErrorResponse(error: unknown) {
  if (error instanceof LlmUpstreamError) {
    console.error("[api] LLM upstream error", error);
    return NextResponse.json<GenerateApiResponse>(
      {
        ok: false,
        violations: [
          {
            code: "LLM_UPSTREAM_ERROR",
            message: "LLM 호출 중 오류가 발생했습니다.",
            severity: "error",
          },
        ],
        autoRegenerated: false,
        message: "LLM upstream error",
      },
      { status: 502 }
    );
  }

  console.error("[api] Unhandled server error", error);
  return NextResponse.json<GenerateApiResponse>(
    {
      ok: false,
      violations: [
        {
          code: "SERVER_ERROR",
          message: "서버 오류가 발생했습니다.",
          severity: "error",
        },
      ],
      autoRegenerated: false,
      message: "Server error",
    },
    { status: 500 }
  );
}
