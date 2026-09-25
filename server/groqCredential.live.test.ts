import { describe, expect, it } from "vitest";

const groqKey = process.env.GROQ_API_KEY;

// Uses the project secret at runtime. It performs only a read-only models-list request.
// The key is never printed, included in assertion output, or sent to browser code.
describe.skipIf(!groqKey)("Groq server credential", () => {
  it("authenticates with Groq using the backend secret", async () => {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${groqKey}` },
      signal: AbortSignal.timeout(12_000),
    });
    expect(response.status, `Groq models API returned HTTP ${response.status}`).toBe(200);
    const payload: unknown = await response.json();
    expect(payload).toEqual(expect.objectContaining({ data: expect.any(Array) }));
  }, 15_000);
});
