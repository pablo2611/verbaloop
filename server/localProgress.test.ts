import { describe, expect, it } from "vitest";
import { initialProgress, readStoredProgress, readStoredTerms } from "../client/src/lib/localProgress";

describe("saved browser data", () => {
  it("recovers from corrupted data and falls back to legacy data", () => {
    expect(readStoredProgress("{", JSON.stringify({ xp: 42, streak: 2, solved: 3, lastDay: "2026-01-01" })).xp).toBe(42);
    expect(readStoredProgress("[]", null)).toEqual(initialProgress);
  });
  it("rejects invalid progress without losing valid values", () => {
    expect(readStoredProgress(JSON.stringify({ xp: "bad", streak: -1, solved: 5, lastDay: null }), null)).toEqual({ ...initialProgress, solved: 5 });
  });
  it("keeps valid glossary entries and filters malformed ones", () => {
    const term = { word: "Valve", definition: "Controls flow", category: "Equipment" };
    expect(readStoredTerms(JSON.stringify([term, null, { word: "" }, { word: "Bad" }]), null)).toEqual([term]);
    expect(readStoredTerms("{}", null)).toEqual([]);
    expect(readStoredTerms("invalid", JSON.stringify([term]))).toEqual([term]);
  });
});
