"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleText } from "@/features/generator/components/collapsible-text";
import { SectionCard } from "@/features/generator/components/section-card";
import {
  copyToClipboard,
  exportAsJson,
  getAllSectionsText,
  getSectionText,
} from "@/features/generator/lib/export";
import {
  loadLatestResult,
  saveLatestResult,
} from "@/features/generator/lib/storage";
import type {
  GenerateApiResponse,
  RegenerateSection,
  SessionRunBundle,
} from "@/features/generator/types";

export default function ResultPage() {
  const [bundle, setBundle] = useState<SessionRunBundle | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    setBundle(loadLatestResult());
  }, []);

  const hasErrorViolation = useMemo(() => {
    return (
      bundle?.violations.some((violation) => violation.severity === "error") ??
      false
    );
  }, [bundle]);

  const handleCopy = async (text: string, label: string) => {
    const copied = await copyToClipboard(text);
    setFeedback(
      copied
        ? { type: "success", text: `${label} 복사되었습니다.` }
        : { type: "error", text: "클립보드 복사에 실패했습니다." }
    );
    setTimeout(() => setFeedback(null), 3000);
  };

  const regenerate = async (section: RegenerateSection) => {
    if (!bundle) return;

    setIsRegenerating(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          section,
          input: bundle.input,
          current: bundle.data,
        }),
      });

      const payload = (await response.json()) as GenerateApiResponse;
      if (!payload.ok || !payload.data) {
        setFeedback({
          type: "error",
          text: payload.message ?? "재생성에 실패했습니다.",
        });
        return;
      }

      const next: SessionRunBundle = {
        ...bundle,
        data: payload.data,
        violations: payload.violations,
        autoRegenerated: payload.autoRegenerated,
        generatedAt: new Date().toISOString(),
      };

      setBundle(next);
      saveLatestResult(next);
    } catch {
      setFeedback({ type: "error", text: "재생성 중 오류가 발생했습니다." });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!bundle) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          결과가 아직 없습니다.
        </h1>
        <p className="text-sm text-slate-600">
          먼저 /create에서 생성을 실행해 주세요.
        </p>
        <Button asChild>
          <Link href="/create">/create로 이동</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <Badge variant="secondary">MVP / Result</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          결과 카드
        </h1>
      </header>

      <div className="sticky top-3 z-20 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              handleCopy(getAllSectionsText(bundle.data), "전체 내용이")
            }
            className="font-semibold"
          >
            전체 복사
          </Button>
          <div className="h-9 w-px bg-slate-200 mx-1 hidden sm:block" />
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              handleCopy(
                getSectionText(bundle.data, "reading"),
                "Reading 파트가"
              )
            }
          >
            Reading
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              handleCopy(
                getSectionText(bundle.data, "solution"),
                "Solution 파트가"
              )
            }
          >
            Solution
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              handleCopy(
                getSectionText(bundle.data, "choices"),
                "Choices 파트가"
              )
            }
          >
            Choices
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              handleCopy(getSectionText(bundle.data, "vocab"), "Vocab 파트가")
            }
          >
            Vocab
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              handleCopy(getSectionText(bundle.data, "one_liner"), "한줄요약이")
            }
          >
            One-liner
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAsJson(bundle.data)}
          >
            JSON 내보내기
          </Button>
          <div className="h-9 w-px bg-slate-200 mx-1 hidden sm:block" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => regenerate("all")}
            disabled={isRegenerating}
            className="text-slate-600 hover:text-indigo-600"
          >
            전체 재생성
          </Button>
          <Button
            asChild
            variant="default"
            size="sm"
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            <Link href="/create">새로 만들기</Link>
          </Button>
        </div>
      </div>

      {/* Feedback Message Area */}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      >
        {feedback ? (
          <div
            className={`rounded-full px-4 py-2 text-sm font-medium shadow-lg backdrop-blur ${
              feedback.type === "error"
                ? "bg-rose-600 text-white"
                : "bg-slate-900/90 text-white"
            }`}
          >
            {feedback.text}
          </div>
        ) : null}
      </div>

      {bundle.autoRegenerated ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          자동 재생성이 1회 수행되었습니다.
        </p>
      ) : null}

      {hasErrorViolation ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardHeader>
            <CardTitle className="text-rose-700">Rule-check 경고</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.violations.map((violation, index) => (
              <p key={index} className="text-sm text-rose-700">
                - {violation.message}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {feedback?.type === "error" ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {feedback.text}
        </p>
      ) : null}

      <SectionCard
        title="Reading"
        description="문장별 끊어읽기 + 해석 + 논리 포인트"
        onCopy={() =>
          handleCopy(getSectionText(bundle.data, "reading"), "Reading 파트가")
        }
      >
        <div className="space-y-4">
          {bundle.data.reading_blocks.map((block) => (
            <Card key={block.sentenceNo} className="border-slate-200">
              <CardContent className="space-y-2 pt-4">
                <p className="text-sm font-semibold text-slate-800">
                  문장 {block.sentenceNo}
                </p>
                <p className="text-sm text-slate-700">
                  {block.chunks.join(" | ")}
                </p>
                <CollapsibleText text={`해석: ${block.ko}`} />
                <p className="text-xs text-slate-500">
                  논리 포인트: {block.logicPoints.join(", ")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Solution"
        description="정답 + 근거 요약"
        onCopy={() =>
          handleCopy(getSectionText(bundle.data, "solution"), "Solution 파트가")
        }
      >
        <p className="text-sm font-semibold text-slate-800">
          {bundle.data.solution_logic.final}
        </p>
        <CollapsibleText text={bundle.data.solution_logic.rationale} />
      </SectionCard>

      <SectionCard
        title="Choices"
        description="①~⑤ O/X/N/A 판정 + 이유"
        onCopy={() =>
          handleCopy(getSectionText(bundle.data, "choices"), "Choices 파트가")
        }
      >
        <div className="space-y-3">
          {bundle.data.choice_analysis.length ? (
            bundle.data.choice_analysis.map((choice) => (
              <Card key={choice.no} className="border-slate-200">
                <CardContent className="space-y-2 pt-4">
                  <p className="text-sm font-medium text-slate-800">
                    {choice.no}. [{choice.verdict}] {choice.text}
                  </p>
                  <CollapsibleText text={choice.reason} />
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              선지 분석이 비활성화되었습니다.
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Vocab"
        description="핵심 어휘 5개 + 유의어 3개"
        onCopy={() =>
          handleCopy(getSectionText(bundle.data, "vocab"), "Vocab 파트가")
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {bundle.data.vocab.map((item) => (
            <Card key={item.word} className="border-slate-200">
              <CardContent className="space-y-2 pt-4">
                <p className="text-sm font-semibold text-slate-800">
                  {item.word} - {item.koMeaning}
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.synonyms.map((synonym) => (
                    <Badge key={`${item.word}-${synonym.w}`} variant="outline">
                      {synonym.w}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="One-liner"
        description="수업용 한 줄 요약"
        onCopy={() =>
          handleCopy(getSectionText(bundle.data, "one_liner"), "한줄요약이")
        }
      >
        <CollapsibleText text={bundle.data.one_liner} />
      </SectionCard>
    </main>
  );
}
