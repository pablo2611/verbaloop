import { TRPCError } from "@trpc/server";
import { generateTutorReply, TutorRateLimiter, TutorServiceError, tutorRequestSchema } from "./aiTutor";
import { generateMiniLesson, miniLessonRequestSchema } from "./microLesson";
import { publicProcedure, router } from "./_core/trpc";

const rateLimiter = new TutorRateLimiter(12, 10 * 60 * 1000);

function clientKeyFor(ctx: { user?: { openId?: string } | null; req: { ip?: string; socket?: { remoteAddress?: string } } }) {
  return ctx.user?.openId || ctx.req.ip || ctx.req.socket?.remoteAddress || "anonymous";
}

function limitOrThrow(key: string) {
  if (rateLimiter.allow(key)) return;
  throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Has enviado varias solicitudes. Espera unos minutos y vuelve a intentarlo." });
}

function safeTutorError(error: unknown): never {
  if (error instanceof TutorServiceError) {
    const code = error.status === 400 ? "BAD_REQUEST"
      : error.status === 429 ? "TOO_MANY_REQUESTS"
        : error.status === 503 ? "SERVICE_UNAVAILABLE"
          : "INTERNAL_SERVER_ERROR";
    throw new TRPCError({ code, message: error.message });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo completar la solicitud de aprendizaje." });
}

export const aiTutorRouter = router({
  reply: publicProcedure.input(tutorRequestSchema).mutation(async ({ ctx, input }) => {
    limitOrThrow(clientKeyFor(ctx));
    try {
      return await generateTutorReply(input);
    } catch (error) {
      safeTutorError(error);
    }
  }),
  lesson: publicProcedure.input(miniLessonRequestSchema).mutation(async ({ ctx, input }) => {
    limitOrThrow(clientKeyFor(ctx));
    try {
      return await generateMiniLesson(input);
    } catch (error) {
      safeTutorError(error);
    }
  }),
});
