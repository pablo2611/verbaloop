import { afterEach, describe, expect, it, vi } from "vitest";
import { generateMiniLesson, miniLessonRequestSchema } from "./microLesson";

const request = {
  language: "es" as const,
  term: "Trazabilidad",
  definition: "Seguimiento del recorrido de un producto en la cadena de suministro.",
  difficulty: "Intermedio" as const,
};
const validLesson = {
  example: "Un lote de piezas puede rastrearse desde el proveedor hasta el almacén.",
  question: "¿Qué permite identificar la trazabilidad?",
  choices: ["El recorrido de un producto", "El color de una máquina", "El horario del equipo"],
  correctAnswer: "El recorrido de un producto",
  explanation: "La trazabilidad permite seguir el historial del producto.",
};
function response(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.unstubAllEnvs());

const liveKey = process.env.GROQ_API_KEY;

describe("VerbaLoop micro-lessons", () => {
  it("accepts bounded bilingual term context and rejects extra data", () => {
    expect(miniLessonRequestSchema.safeParse(request).success).toBe(true);
    expect(miniLessonRequestSchema.safeParse({ ...request, privateNotes: "not allowed" }).success).toBe(false);
    expect(miniLessonRequestSchema.safeParse({ ...request, term: "x".repeat(81) }).success).toBe(false);
  });

  it("returns a validated interactive lesson and sends only the active term to the server model", async () => {
    const fetchImpl = vi.fn(async () => response(JSON.stringify(validLesson)));
    const lesson = await generateMiniLesson(request, { apiKey: "server-test-key", fetchImpl });
    expect(lesson).toEqual(validLesson);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain("/chat/completions");
    expect(new Headers(options?.headers).get("authorization")).toBe("Bearer server-test-key");
    const body = JSON.parse(String(options?.body));
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[1].content).toContain("Trazabilidad");
    expect(JSON.stringify(body)).not.toContain("server-test-key");
    expect(JSON.stringify(lesson)).not.toContain("server-test-key");
  });

  it("uses the selected language in the system instruction", async () => {
    const fetchImpl = vi.fn(async () => response(JSON.stringify({ ...validLesson, example: "A tagged batch can be traced from its supplier to storage." })));
    await generateMiniLesson({ ...request, language: "en" }, { apiKey: "test", fetchImpl });
    const [, options] = fetchImpl.mock.calls[0];
    const body = JSON.parse(String(options?.body));
    expect(body.messages[0].content).toContain("Create a short English micro-lesson");
  });

  it("rejects malformed model output and mismatched answer choices", async () => {
    await expect(generateMiniLesson(request, { apiKey: "test", fetchImpl: vi.fn(async () => response("not json")) })).rejects.toMatchObject({ status: 502 });
    const wrongAnswer = { ...validLesson, correctAnswer: "A missing option" };
    await expect(generateMiniLesson(request, { apiKey: "test", fetchImpl: vi.fn(async () => response(JSON.stringify(wrongAnswer))) })).rejects.toMatchObject({ status: 502 });
    const duplicateChoices = { ...validLesson, choices: [validLesson.correctAnswer, validLesson.correctAnswer, "Otra opción"] };
    await expect(generateMiniLesson(request, { apiKey: "test", fetchImpl: vi.fn(async () => response(JSON.stringify(duplicateChoices))) })).rejects.toMatchObject({ status: 502 });
  });

  it("does not call the service without a server key and handles provider limits neutrally", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const fetchImpl = vi.fn();
    await expect(generateMiniLesson(request, { fetchImpl })).rejects.toMatchObject({ status: 503 });
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(generateMiniLesson(request, { apiKey: "test", fetchImpl: vi.fn(async () => response("", 429)) })).rejects.toMatchObject({ status: 429 });
  });

  it.skipIf(!liveKey)("creates a short real micro-lesson from only the current glossary term", async () => {
    const lesson = await generateMiniLesson(request, { apiKey: liveKey });
    expect(lesson.example.length).toBeGreaterThan(10);
    expect(lesson.choices).toHaveLength(3);
    expect(lesson.choices).toContain(lesson.correctAnswer);
    expect(lesson.explanation.length).toBeGreaterThan(10);
  }, 25_000);
});
