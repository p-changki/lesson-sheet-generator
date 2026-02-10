import type {
  ChoiceAnalysis,
  GenerateInput,
  GenerateResponse,
  RegenerateSection,
  VocabItem,
} from "@/features/generator/types";

const vocabSeed = [
  {
    word: "inference",
    koMeaning: "추론",
    synonyms: ["deduction", "reasoning", "logic"],
  },
  {
    word: "contrast",
    koMeaning: "대조",
    synonyms: ["difference", "distinction", "opposition"],
  },
  {
    word: "cohesion",
    koMeaning: "결속",
    synonyms: ["unity", "bonding", "coherence"],
  },
  {
    word: "relevance",
    koMeaning: "관련성",
    synonyms: ["relation", "connection", "pertinence"],
  },
  {
    word: "validity",
    koMeaning: "타당성",
    synonyms: ["soundness", "accuracy", "legitimacy"],
  },
];

function splitSentences(passage: string): string[] {
  const normalized = passage.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length) return parts;
  return normalized ? [normalized] : [];
}

function sentenceToChunks(
  sentence: string,
  density: GenerateInput["options"]["density"]
): string[] {
  const words = sentence.split(" ").filter(Boolean);
  const chunkSize = density === "low" ? 7 : density === "high" ? 3 : 5;
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  return chunks.length ? chunks : [sentence];
}

function buildChoiceAnalysis(input: GenerateInput): ChoiceAnalysis[] {
  const fallbackChoices = ["A", "B", "C", "D", "E"];
  const source = input.choices.length ? input.choices : fallbackChoices;

  const list = Array.from({ length: 5 }, (_, index) => {
    const choiceText = source[index] ?? fallbackChoices[index];
    const verdict =
      input.questionType === "passage_explain"
        ? "N/A"
        : input.answer && input.answer.trim() === `${index + 1}`
          ? "O"
          : "X";

    return {
      no: index + 1,
      text: choiceText,
      verdict,
      reason:
        verdict === "N/A"
          ? "지문 해설 유형에서는 선지 채점이 필수가 아닙니다."
          : verdict === "O"
            ? "지문 근거와 문항 의도를 일치시킵니다."
            : "핵심 근거와 충돌하거나 문맥상 부적절합니다.",
    } as ChoiceAnalysis;
  });

  return input.options.includeChoiceAnalysis ? list : [];
}

function buildVocab(): VocabItem[] {
  return vocabSeed.map((item) => ({
    word: item.word,
    koMeaning: item.koMeaning,
    synonyms: item.synonyms.map((w) => ({
      w,
      ko: `${item.koMeaning} 관련`,
    })),
  }));
}

function buildMockResponse(input: GenerateInput): GenerateResponse {
  const sentences = splitSentences(input.passage).slice(0, 8);
  const readingBlocks = sentences.map((sentence, index) => ({
    sentenceNo: index + 1,
    chunks: sentenceToChunks(sentence, input.options.density),
    ko: `문장 ${index + 1}의 핵심 의미를 한국어로 정리한 해석입니다.`,
    logicPoints: [
      "핵심 주장과 근거를 연결",
      "접속사/지시어로 문장 간 논리 추적",
    ],
  }));

  return {
    reading_blocks: readingBlocks,
    solution_logic: {
      final: "정답은 지문 핵심 논리와 일치하는 선택지입니다.",
      rationale:
        "지문의 핵심 주장-근거 구조를 기준으로 오답 선지를 제거하고 정답 선지를 확정합니다.",
    },
    choice_analysis: buildChoiceAnalysis(input),
    vocab: buildVocab(),
    one_liner: "핵심은 지문 논리 흐름을 먼저 잡고 선지를 대조하는 것입니다.",
  };
}

export async function mockGenerate(input: GenerateInput): Promise<string> {
  const result = buildMockResponse(input);
  return JSON.stringify(result);
}

export async function mockRegenerate(
  input: GenerateInput,
  current: GenerateResponse,
  section: RegenerateSection
): Promise<string> {
  const next = { ...current };

  if (section === "all") {
    return JSON.stringify(buildMockResponse(input));
  }

  if (section === "vocab") {
    next.vocab = buildVocab();
  }

  if (section === "choices") {
    next.choice_analysis = buildChoiceAnalysis(input);
  }

  if (section === "reading") {
    next.reading_blocks = buildMockResponse(input).reading_blocks;
  }

  return JSON.stringify(next);
}
