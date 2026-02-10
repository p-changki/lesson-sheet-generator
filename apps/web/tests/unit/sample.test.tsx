import {
  parseGenerateResponse,
  runRuleCheck,
} from "@/features/generator/rules/check";
import type { GenerateResponse } from "@/features/generator/types";

describe("runRuleCheck", () => {
  it("passes with valid vocab constraints", () => {
    const payload: GenerateResponse = {
      reading_blocks: [
        {
          sentenceNo: 1,
          chunks: ["A", "B"],
          ko: "해석",
          logicPoints: ["포인트"],
        },
      ],
      solution_logic: {
        final: "정답",
        rationale: "근거",
      },
      choice_analysis: [],
      vocab: [
        {
          word: "inference",
          koMeaning: "추론",
          synonyms: [
            { w: "logic", ko: "논리" },
            { w: "reasoning", ko: "추론" },
            { w: "deduction", ko: "연역" },
          ],
        },
        {
          word: "contrast",
          koMeaning: "대조",
          synonyms: [
            { w: "difference", ko: "차이" },
            { w: "distinction", ko: "구별" },
            { w: "opposition", ko: "반대" },
          ],
        },
        {
          word: "cohesion",
          koMeaning: "결속",
          synonyms: [
            { w: "unity", ko: "통일" },
            { w: "bonding", ko: "결합" },
            { w: "coherence", ko: "일관성" },
          ],
        },
        {
          word: "relevance",
          koMeaning: "관련성",
          synonyms: [
            { w: "relation", ko: "관계" },
            { w: "connection", ko: "연결" },
            { w: "pertinence", ko: "타당성" },
          ],
        },
        {
          word: "validity",
          koMeaning: "타당성",
          synonyms: [
            { w: "accuracy", ko: "정확성" },
            { w: "soundness", ko: "건전성" },
            { w: "legitimacy", ko: "정당성" },
          ],
        },
      ],
      one_liner: "요약",
    };

    expect(runRuleCheck(payload)).toEqual([]);
  });

  it("fails parse when JSON schema is invalid", () => {
    const invalid = JSON.stringify({ foo: "bar" });
    const parsed = parseGenerateResponse(invalid);

    expect(parsed.data).toBeUndefined();
    expect(parsed.parseError).toContain("JSON schema validation failed");
  });
});
