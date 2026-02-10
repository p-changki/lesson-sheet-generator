"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
import { defaultPresets } from "@/features/generator/templates/presets";
import {
  saveCustomTemplates,
  loadCustomTemplates,
} from "@/features/generator/lib/storage";
import { questionTypeLabels } from "@/features/generator/lib/defaults";
import type {
  Density,
  QuestionType,
  TemplatePreset,
} from "@/features/generator/types";

function mergeTemplates(customTemplates: TemplatePreset[]): TemplatePreset[] {
  return [...defaultPresets, ...customTemplates];
}

export default function TemplatesPage() {
  const [customTemplates, setCustomTemplates] = useState<TemplatePreset[]>(() =>
    loadCustomTemplates()
  );
  const [name, setName] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("blank");
  const [density, setDensity] = useState<Density>("base");
  const [includeChoiceAnalysis, setIncludeChoiceAnalysis] = useState(true);

  const templates = useMemo(
    () => mergeTemplates(customTemplates),
    [customTemplates]
  );

  const addCustomTemplate = () => {
    if (!name.trim()) return;

    const nextTemplate: TemplatePreset = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: "사용자 저장 템플릿",
      defaultQuestionType: questionType,
      defaultDensity: density,
      includeChoiceAnalysis,
    };

    const nextTemplates = [...customTemplates, nextTemplate];
    setCustomTemplates(nextTemplates);
    saveCustomTemplates(nextTemplates);
    setName("");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <Badge variant="secondary">MVP / Templates</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          템플릿
        </h1>
        <p className="text-sm text-slate-600">
          기본 프리셋 + LocalStorage 저장 템플릿을 불러와 /create에 적용할 수
          있습니다.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>템플릿 저장</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="template-name">템플릿 이름</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 중간고사 빈칸"
            />
          </div>

          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select
              value={questionType}
              onValueChange={(value: string) =>
                setQuestionType(value as QuestionType)
              }
            >
              <SelectTrigger>
                <SelectValue />
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
            <Label>끊어읽기 밀도</Label>
            <Select
              value={density}
              onValueChange={(value: string) => setDensity(value as Density)}
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

          <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
            <Label htmlFor="include-choice-analysis">선지 분석 포함</Label>
            <Switch
              id="include-choice-analysis"
              checked={includeChoiceAnalysis}
              onCheckedChange={setIncludeChoiceAnalysis}
            />
          </div>

          <div className="md:col-span-2">
            <Button type="button" onClick={addCustomTemplate}>
              LocalStorage에 저장
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <p className="text-sm text-slate-500">{template.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {questionTypeLabels[template.defaultQuestionType]}
                </Badge>
                <Badge variant="outline">
                  density: {template.defaultDensity}
                </Badge>
                <Badge variant="outline">
                  choice-analysis:{" "}
                  {template.includeChoiceAnalysis ? "on" : "off"}
                </Badge>
              </div>
              <Button asChild>
                <Link href={`/create?templateId=${template.id}`}>
                  이 템플릿으로 시작
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
