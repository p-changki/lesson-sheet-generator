"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultInput,
  questionTypeLabels,
} from "@/features/generator/lib/defaults";
import { copyToClipboard } from "@/features/generator/lib/export";
import {
  loadCustomTemplates,
  saveLatestResult,
} from "@/features/generator/lib/storage";
import { buildPromptOnly } from "@/features/generator/services/prompt-builder";
import { defaultPresets } from "@/features/generator/templates/presets";
import type {
  GenerateApiResponse,
  GenerateInput,
  QuestionType,
  SessionRunBundle,
  TemplatePreset,
} from "@/features/generator/types";

function mergeTemplates(customTemplates: TemplatePreset[]): TemplatePreset[] {
  const map = new Map<string, TemplatePreset>();
  defaultPresets.forEach((preset) => map.set(preset.id, preset));
  customTemplates.forEach((preset) => map.set(preset.id, preset));
  return [...map.values()];
}

export default function CreatePage() {
  const router = useRouter();

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [input, setInput] = useState<GenerateInput>(defaultInput);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptPreview, setPromptPreview] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const allTemplates = useMemo(() => {
    return mergeTemplates(loadCustomTemplates());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTemplateId(params.get("templateId"));
  }, []);

  useEffect(() => {
    if (!templateId) return;
    const matched = allTemplates.find((preset) => preset.id === templateId);
    if (!matched) return;

    setInput((previous) => ({
      ...previous,
      questionType: matched.defaultQuestionType,
      options: {
        ...previous.options,
        density: matched.defaultDensity,
        includeChoiceAnalysis: matched.includeChoiceAnalysis,
      },
    }));
  }, [allTemplates, templateId]);

  const showChoices = input.questionType !== "passage_explain";

  const updateChoice = (index: number, value: string) => {
    setInput((previous) => {
      const nextChoices = [...previous.choices];
      nextChoices[index] = value;
      return {
        ...previous,
        choices: nextChoices,
      };
    });
  };

  const resetForm = () => {
    setInput(defaultInput);
    setPromptPreview("");
    setErrorMessage("");
    setStatusMessage({ type: "info", text: "입력 폼이 초기화되었습니다." });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const validateInput = (): boolean => {
    if (!input.passage.trim()) {
      setStatusMessage({
        type: "error",
        text: "지문(Passage)을 입력해주세요.",
      });
      return false;
    }

    if (input.questionType !== "passage_explain") {
      const hasChoice = input.choices.some((c) => c.trim().length > 0);
      if (!hasChoice) {
        setStatusMessage({
          type: "error",
          text: "선지(Choices)를 최소 1개 이상 입력해주세요.",
        });
        return false;
      }
    }
    return true;
  };

  const handleGeneratePromptOnly = async () => {
    if (!validateInput()) return;

    const prompt = buildPromptOnly(input);
    setPromptPreview(prompt);
    const copied = await copyToClipboard(prompt);
    setStatusMessage(
      copied
        ? { type: "success", text: "프롬프트가 복사되었습니다." }
        : { type: "error", text: "클립보드 복사에 실패했습니다." }
    );
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleGenerate = async () => {
    if (!validateInput()) return;

    setIsGenerating(true);
    setErrorMessage("");
    setStatusMessage(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      const payload = (await response.json()) as GenerateApiResponse;
      if (!payload.ok || !payload.data) {
        const msg = payload.message ?? "생성에 실패했습니다.";
        setErrorMessage(msg);
        setStatusMessage({ type: "error", text: msg });
        return;
      }

      const bundle: SessionRunBundle = {
        input,
        data: payload.data,
        violations: payload.violations,
        autoRegenerated: payload.autoRegenerated,
        generatedAt: new Date().toISOString(),
      };

      saveLatestResult(bundle);
      router.push("/result");
    } catch {
      const msg = "요청 중 오류가 발생했습니다.";
      setErrorMessage(msg);
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Status Message Toast Area */}
      <div
        aria-live="polite"
        className="fixed left-1/2 top-4 z-50 -translate-x-1/2 space-y-2"
      >
        {statusMessage ? (
          <div
            className={`rounded-lg border px-4 py-2 text-sm font-medium shadow-lg transition-all ${
              statusMessage.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : statusMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {statusMessage.text}
          </div>
        ) : null}
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">MVP / Create</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            수업용 해설지 생성
          </h1>
          <p className="text-sm text-slate-600">
            지문과 문항을 입력하여 AI 분석 해설지를 생성합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/templates">템플릿 불러오기</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/result">최근 결과</Link>
          </Button>
        </div>
      </header>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>입력 폼</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="passage">Passage (필수)</Label>
            <Textarea
              id="passage"
              value={input.passage}
              onChange={(event) =>
                setInput((previous) => ({
                  ...previous,
                  passage: event.target.value,
                }))
              }
              placeholder="지문을 붙여넣어 주세요."
              className="min-h-44"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={input.questionType}
                onValueChange={(value: string) =>
                  setInput((previous) => ({
                    ...previous,
                    questionType: value as QuestionType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(questionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">Answer (optional)</Label>
              <Input
                id="answer"
                value={input.answer ?? ""}
                onChange={(event) =>
                  setInput((previous) => ({
                    ...previous,
                    answer: event.target.value,
                  }))
                }
                placeholder="예: 3"
              />
            </div>
          </div>

          {showChoices ? (
            <div className="space-y-3">
              <Label>Choices (①~⑤)</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {input.choices.map((choice, index) => (
                  <Input
                    key={index}
                    value={choice}
                    onChange={(event) =>
                      updateChoice(index, event.target.value)
                    }
                    placeholder={`${index + 1}번 선지`}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">옵션</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>끊어읽기 밀도</Label>
                <Select
                  value={input.options.density}
                  onValueChange={(value: string) =>
                    setInput((previous) => ({
                      ...previous,
                      options: {
                        ...previous.options,
                        density: value as GenerateInput["options"]["density"],
                      },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">low</SelectItem>
                    <SelectItem value="base">base</SelectItem>
                    <SelectItem value="high">high</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                <Label htmlFor="choice-analysis">선지 분석 포함</Label>
                <Switch
                  id="choice-analysis"
                  checked={input.options.includeChoiceAnalysis}
                  onCheckedChange={(checked: boolean) =>
                    setInput((previous) => ({
                      ...previous,
                      options: {
                        ...previous.options,
                        includeChoiceAnalysis: checked,
                      },
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                <span className="text-sm text-slate-700">
                  핵심 어휘 5개 고정
                </span>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                <span className="text-sm text-slate-700">유의어 3개 고정</span>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                <span className="text-sm text-slate-700">single-word 강제</span>
                <Switch checked disabled />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              size="lg"
              className="w-full font-semibold sm:w-auto"
            >
              {isGenerating ? "생성 중..." : "해설지 생성하기 (Generate)"}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleGeneratePromptOnly}
                className="flex-1 sm:flex-none"
              >
                프롬프트만 복사
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                className="text-slate-500 hover:text-rose-600"
              >
                초기화
              </Button>
            </div>
          </div>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {errorMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {promptPreview ? (
        <Card>
          <CardHeader>
            <CardTitle>Prompt Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={promptPreview}
              readOnly
              className="min-h-72 font-mono text-xs"
            />
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
