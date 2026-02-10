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
  };

  const handleGeneratePromptOnly = async () => {
    const prompt = buildPromptOnly(input);
    setPromptPreview(prompt);
    await copyToClipboard(prompt);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage("");

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
        setErrorMessage(payload.message ?? "생성에 실패했습니다.");
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
      setErrorMessage("요청 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <Badge variant="secondary">MVP / Create</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          수업용 해설지 자동 생성기
        </h1>
        <p className="text-sm text-slate-600">
          지문/문항 입력 → 생성 → 결과 카드 복사/내보내기 흐름으로 바로 사용
          가능합니다.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/templates">템플릿 열기</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/result">최근 결과 보기</Link>
          </Button>
        </div>
      </header>

      <Card>
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

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleGeneratePromptOnly}
            >
              Generate Prompt Only
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Reset
            </Button>
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
