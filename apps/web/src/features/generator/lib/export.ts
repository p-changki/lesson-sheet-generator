import type {
  GenerateResponse,
  RegenerateSection,
} from "@/features/generator/types";

function createDownload(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportAsJson(data: GenerateResponse): void {
  createDownload(
    `lesson-solution-${Date.now()}.json`,
    JSON.stringify(data, null, 2),
    "application/json"
  );
}

export function getSectionText(
  data: GenerateResponse,
  section: RegenerateSection | "solution" | "one_liner"
): string {
  if (section === "reading") {
    return data.reading_blocks
      .map((block) => {
        const chunks = block.chunks.join(" | ");
        const logic = block.logicPoints.join(", ");
        return `${block.sentenceNo}. ${chunks}\n해석: ${block.ko}\n논리: ${logic}`;
      })
      .join("\n\n");
  }

  if (section === "solution") {
    return `정답: ${data.solution_logic.final}\n근거: ${data.solution_logic.rationale}`;
  }

  if (section === "choices") {
    return data.choice_analysis
      .map(
        (choice) =>
          `${choice.no}. [${choice.verdict}] ${choice.text}\n- ${choice.reason}`
      )
      .join("\n\n");
  }

  if (section === "vocab") {
    return data.vocab
      .map(
        (item) =>
          `${item.word} (${item.koMeaning})\n- ${item.synonyms
            .map((synonym) => `${synonym.w}(${synonym.ko})`)
            .join(", ")}`
      )
      .join("\n\n");
  }

  return data.one_liner;
}

export function getAllSectionsText(data: GenerateResponse): string {
  return [
    "[Reading]",
    getSectionText(data, "reading"),
    "",
    "[Solution]",
    getSectionText(data, "solution"),
    "",
    "[Choices]",
    getSectionText(data, "choices"),
    "",
    "[Vocab]",
    getSectionText(data, "vocab"),
    "",
    "[One-liner]",
    getSectionText(data, "one_liner"),
  ].join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
