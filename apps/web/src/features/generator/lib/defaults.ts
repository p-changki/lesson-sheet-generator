import type {
  GenerateInput,
  GenerateOptions,
  QuestionType,
} from "@/features/generator/types";

export const questionTypeLabels: Record<QuestionType, string> = {
  blank: "빈칸",
  vocab_inappropriate: "어휘(문맥상 부적절)",
  grammar: "어법",
  passage_explain: "지문 해설(문제 없음)",
};

export const defaultOptions: GenerateOptions = {
  density: "base",
  includeChoiceAnalysis: true,
  fixedVocabFive: true,
  fixedSynonymsThree: true,
  enforceSingleWord: true,
};

export const defaultInput: GenerateInput = {
  passage: "",
  questionType: "blank",
  choices: ["", "", "", "", ""],
  answer: "",
  options: defaultOptions,
};
