import { z } from "zod";

export const questionTypeSchema = z.enum([
  "blank",
  "vocab_inappropriate",
  "grammar",
  "passage_explain",
]);

export const densitySchema = z.enum(["low", "base", "high"]);

export const verdictSchema = z.enum(["O", "X", "N/A"]);

export const regenerateSectionSchema = z.enum([
  "all",
  "vocab",
  "choices",
  "reading",
]);

export const generateOptionsSchema = z
  .object({
    density: densitySchema,
    includeChoiceAnalysis: z.boolean(),
    fixedVocabFive: z.literal(true),
    fixedSynonymsThree: z.literal(true),
    enforceSingleWord: z.literal(true),
  })
  .strict();

export const generateInputSchema = z
  .object({
    passage: z.string(),
    questionType: questionTypeSchema,
    choices: z.array(z.string()),
    answer: z.string().optional(),
    options: generateOptionsSchema,
  })
  .strict();

const readingBlockSchema = z
  .object({
    sentenceNo: z.number(),
    chunks: z.array(z.string()),
    ko: z.string(),
    logicPoints: z.array(z.string()),
  })
  .strict();

const solutionLogicSchema = z
  .object({
    final: z.string(),
    rationale: z.string(),
  })
  .strict();

const choiceAnalysisSchema = z
  .object({
    no: z.number(),
    text: z.string(),
    verdict: verdictSchema,
    reason: z.string(),
  })
  .strict();

const synonymSchema = z
  .object({
    w: z.string(),
    ko: z.string(),
  })
  .strict();

const vocabItemSchema = z
  .object({
    word: z.string(),
    koMeaning: z.string(),
    synonyms: z.array(synonymSchema),
  })
  .strict();

export const generateResponseSchema = z
  .object({
    reading_blocks: z.array(readingBlockSchema),
    solution_logic: solutionLogicSchema,
    choice_analysis: z.array(choiceAnalysisSchema),
    vocab: z.array(vocabItemSchema),
    one_liner: z.string(),
  })
  .strict();

export const generateApiRequestSchema = z
  .object({
    input: generateInputSchema,
  })
  .strict();

export const regenerateApiRequestSchema = z
  .object({
    section: regenerateSectionSchema,
    input: generateInputSchema,
    current: generateResponseSchema,
  })
  .strict();

export type GenerateApiRequestInput = z.infer<typeof generateApiRequestSchema>;
export type RegenerateApiRequestInput = z.infer<
  typeof regenerateApiRequestSchema
>;
