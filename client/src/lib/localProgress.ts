import type { GlossaryTerm } from "./i18n";

export type Progress = { xp: number; streak: number; lastDay: string; solved: number };
export const initialProgress: Progress = { xp: 1280, streak: 6, lastDay: "", solved: 12 };

function parseObject(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function readStoredProgress(current: string | null, legacy: string | null): Progress {
  const value = parseObject(current) ?? parseObject(legacy);
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...initialProgress };
  const data = value as Record<string, unknown>;
  const count = (key: "xp" | "streak" | "solved") =>
    typeof data[key] === "number" && Number.isSafeInteger(data[key]) && (data[key] as number) >= 0
      ? data[key] as number : initialProgress[key];
  return { xp: count("xp"), streak: count("streak"), solved: count("solved"), lastDay: typeof data.lastDay === "string" ? data.lastDay : "" };
}

export function readStoredTerms(current: string | null, legacy: string | null): GlossaryTerm[] {
  const value = parseObject(current) ?? parseObject(legacy);
  if (!Array.isArray(value)) return [];
  return value.filter((term): term is GlossaryTerm =>
    !!term && typeof term === "object" && typeof term.word === "string" && term.word.trim().length > 0 &&
    typeof term.definition === "string" && typeof term.category === "string");
}
