import { describe, expect, it } from "vitest";
import { dailyChallenges, detectLanguage, matchChoices, sampleTerms, translate, translations } from "../client/src/lib/i18n";

describe("VerbaLoop bilingual content", () => {
  it("keeps the English and Spanish translation catalogs complete and non-empty", () => {
    const spanishKeys = Object.keys(translations.es).sort();
    const englishKeys = Object.keys(translations.en).sort();
    expect(englishKeys).toEqual(spanishKeys);
    for (const language of ["es", "en"] as const) {
      for (const [key, value] of Object.entries(translations[language])) {
        expect(value.trim(), `${language}.${key}`).not.toBe("");
      }
    }
  });

  it("interpolates translated values without changing the selected language", () => {
    expect(translate("es", "solvedCount", { count: 5 })).toBe("5 retos resueltos");
    expect(translate("en", "solvedCount", { count: 5 })).toBe("5 challenges solved");
  });

  it("supports language-specific links", () => {
    expect(detectLanguage("?lang=es")).toBe("es");
    expect(detectLanguage("?lang=en")).toBe("en");
  });

  it.each(["es", "en"] as const)("provides answer-consistent daily games for %s", (language) => {
    const levels = Object.keys(dailyChallenges[language]) as (keyof typeof dailyChallenges.es)[];
    for (const level of levels) {
      const daily = dailyChallenges[language][level];
      expect(daily.choices).toContain(daily.term.word);
      expect(matchChoices[language][level]).toContain(daily.term.word);
      expect(sampleTerms[language]).toContain(daily.term);
      expect(daily.term.definition).not.toBe("");
    }
  });
});
