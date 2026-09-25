import { TRPCError } from "@trpc/server";
import { generateTutorReply, TutorRateLimiter, TutorServiceError, tutorRequestSchema } from "./aiTutor";
import { publicProcedure, router } from "./_core/trpc";

const rateLimiter = new TutorRateLimiter(12, 10 * 60 * 1000);

export const aiTutorRouter = router({
  reply: publicProcedure.input(tutorRequestSchema).mutation(async ({ ctx, input }) => {
    const clientKey = ctx.user?.openId || ctx.req.ip || ctx.req.socket.remoteAddress || "anonymous";
    if (!rateLimiter.allow(clientKey)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Has enviado varios mensajes. Espera unos minutos y vuelve a intentarlo.",
      });
    }

    try {
      return await generateTutorReply(input);
    } catch (error) {
      if (error instanceof TutorServiceError) {
        const code = error.status === 400
          ? "BAD_REQUEST"
          : error.status === 429
            ? "TOO_MANY_REQUESTS"
            : error.status === 503
              ? "SERVICE_UNAVAILABLE"
              : "INTERNAL_SERVER_ERROR";
        throw new TRPCError({ code, message: error.message });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No se pudo completar la respuesta del guía.",
      });
    }
  }),
});
