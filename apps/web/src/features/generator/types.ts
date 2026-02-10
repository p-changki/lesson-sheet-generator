export type QuestionType =
  | "blank"
  | "vocab_inappropriate"
  | "grammar"
  | "passage_explain";

export type Density = "low" | "base" | "high";

export type Verdict = "O" | "X" | "N/A";

export type RegenerateSection = "all" | "vocab" | "choices" | "reading";

export interface GenerateOptions {
  density: Density;
  includeChoiceAnalysis: boolean;
  fixedVocabFive: true;
  fixedSynonymsThree: true;
  enforceSingleWord: true;
}

export interface GenerateInput {
  passage: string;
  questionType: QuestionType;
  choices: string[];
  answer?: string;
  options: GenerateOptions;
}

export interface ReadingBlock {
  sentenceNo: number;
  chunks: string[];
  ko: string;
  logicPoints: string[];
}

export interface SolutionLogic {
  final: string;
  rationale: string;
}

export interface ChoiceAnalysis {
  no: number;
  text: string;
  verdict: Verdict;
  reason: string;
}

export interface SynonymItem {
  w: string;
  ko: string;
}

export interface VocabItem {
  word: string;
  koMeaning: string;
  synonyms: SynonymItem[];
}

export interface GenerateResponse {
  reading_blocks: ReadingBlock[];
  solution_logic: SolutionLogic;
  choice_analysis: ChoiceAnalysis[];
  vocab: VocabItem[];
  one_liner: string;
}

export interface RuleViolation {
  code: string;
  message: string;
  path?: string;
  severity: "error" | "warning";
}

export interface GenerateApiRequest {
  input: GenerateInput;
}

export interface GenerateApiResponse {
  ok: boolean;
  data?: GenerateResponse;
  violations: RuleViolation[];
  autoRegenerated: boolean;
  message?: string;
}

export interface RegenerateApiRequest {
  section: RegenerateSection;
  input: GenerateInput;
  current: GenerateResponse;
}

export interface SessionRunBundle {
  input: GenerateInput;
  data: GenerateResponse;
  violations: RuleViolation[];
  autoRegenerated: boolean;
  generatedAt: string;
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  defaultQuestionType: QuestionType;
  defaultDensity: Density;
  includeChoiceAnalysis: boolean;
}
