import type { TemplatePreset } from "@/features/generator/types";

export const defaultPresets: TemplatePreset[] = [
  {
    id: "school-blank-logic",
    name: "내신 빈칸(논리 중심)",
    description: "지문 논리 흐름 기반 빈칸 해설 생성",
    defaultQuestionType: "blank",
    defaultDensity: "base",
    includeChoiceAnalysis: true,
  },
  {
    id: "vocab-ox",
    name: "어휘 부적절(O/X)",
    description: "문맥상 어휘 적절성 판정 중심",
    defaultQuestionType: "vocab_inappropriate",
    defaultDensity: "base",
    includeChoiceAnalysis: true,
  },
  {
    id: "grammar",
    name: "어법",
    description: "문법/어법 포인트 중심 해설",
    defaultQuestionType: "grammar",
    defaultDensity: "low",
    includeChoiceAnalysis: true,
  },
  {
    id: "passage-commentary",
    name: "지문 해설",
    description: "문제 없는 지문 해설 중심",
    defaultQuestionType: "passage_explain",
    defaultDensity: "high",
    includeChoiceAnalysis: false,
  },
];
