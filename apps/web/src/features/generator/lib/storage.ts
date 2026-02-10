import type {
  SessionRunBundle,
  TemplatePreset,
} from "@/features/generator/types";

const RESULT_KEY = "mvp-generator-result";
const TEMPLATES_KEY = "mvp-generator-templates";

export function saveLatestResult(result: SessionRunBundle): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function loadLatestResult(): SessionRunBundle | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(RESULT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionRunBundle;
  } catch {
    return null;
  }
}

export function clearLatestResult(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(RESULT_KEY);
}

export function loadCustomTemplates(): TemplatePreset[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(TEMPLATES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as TemplatePreset[];
  } catch {
    return [];
  }
}

export function saveCustomTemplates(templates: TemplatePreset[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}
