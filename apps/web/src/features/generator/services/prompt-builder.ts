import type { GenerateInput } from "@/features/generator/types";

function formatChoices(choices: string[]): string {
  if (!choices.length) return "(선지 없음)";
  return choices.map((choice, index) => `${index + 1}. ${choice}`).join("\n");
}

export function buildPromptOnly(input: GenerateInput): string {
  return [
    "Return JSON only.",
    "No markdown. No prose outside JSON.",
    "Use only fields from the response schema.",
    "Generate a classroom explanation set from the input passage/question.",
    "",
    "[INPUT]",
    `Passage:\n${input.passage}`,
    `QuestionType: ${input.questionType}`,
    `Choices:\n${formatChoices(input.choices)}`,
    `Answer(optional): ${input.answer ?? ""}`,
    `Density: ${input.options.density}`,
    `IncludeChoiceAnalysis: ${String(input.options.includeChoiceAnalysis)}`,
    "Rules: vocab must be exactly 5 items.",
    "Rules: each vocab.synonyms must be exactly 3 items.",
    "Rules: vocab.word and synonyms.w must be single-word (no spaces).",
  ].join("\n");
}
