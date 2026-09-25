import { useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { Bot, MessageCircle, X } from "lucide-react";

type VerbaGuideContext = {
  term: string;
  definition: string;
  mode: "Revuelto" | "Definiciones" | "Completa";
  difficulty: "Principiante" | "Intermedio" | "Experto";
};

type PlayerMessage = { role: "user" | "assistant"; content: string };

const suggestedPrompts = [
  "Dame una pista para este reto",
  "¿Qué significa este término?",
  "¿Cómo funciona mi racha?",
];

function friendlyError(code?: string) {
  if (code === "TOO_MANY_REQUESTS") {
    return "He alcanzado mi límite temporal de mensajes. Espera unos minutos y seguimos.";
  }
  if (code === "SERVICE_UNAVAILABLE") {
    return "Mi guía aún no está conectada. Vuelve a intentarlo más tarde.";
  }
  return "No pude responder ahora. Inténtalo de nuevo en un momento.";
}

export function VerbaGuide({ context }: { context: VerbaGuideContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const reply = trpc.aiTutor.reply.useMutation();

  const sendMessage = (content: string) => {
    if (reply.isPending) return;
    const previousMessages = messages.reduce<PlayerMessage[]>((all, message) => {
      if (message.role !== "system") all.push({ role: message.role, content: message.content });
      return all;
    }, []);
    const conversation: PlayerMessage[] = [
      ...previousMessages,
      { role: "user" as const, content },
    ].slice(-8);
    setMessages(conversation);

    reply.mutate(
      { messages: conversation, context },
      {
        onSuccess: (response) => {
          setMessages((previous) => [...previous, { role: "assistant" as const, content: response }].slice(-12));
        },
        onError: (error) => {
          setMessages((previous) => [
            ...previous,
            { role: "assistant" as const, content: friendlyError(error.data?.code) },
          ].slice(-12));
        },
      },
    );
  };

  return (
    <div className={`verba-guide ${isOpen ? "verba-guide-open" : ""}`}>
      {isOpen && (
        <section className="verba-guide-panel" aria-label="Guía de aprendizaje Vera">
          <header className="verba-guide-header">
            <span className="verba-guide-avatar"><Bot size={17} /></span>
            <span className="verba-guide-heading">
              <strong>Vera <i>GUÍA DE VERBALOOP</i></strong>
              <small><span className="verba-guide-status" /> Aquí para ayudarte</small>
            </span>
            <button className="verba-guide-close" type="button" aria-label="Cerrar guía" onClick={() => setIsOpen(false)}>
              <X size={17} />
            </button>
          </header>
          <AIChatBox
            className="verba-guide-chat"
            height="100%"
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={reply.isPending}
            placeholder="Pregunta por VerbaLoop o sus términos…"
            emptyStateMessage="Hola, soy Vera. Te doy una pista o te explico cómo aprender en VerbaLoop."
            suggestedPrompts={suggestedPrompts}
          />
          <p className="verba-guide-privacy">
            Al enviar, tu mensaje, el historial reciente y el término actual se procesan con Groq. No incluyas datos confidenciales.
          </p>
        </section>
      )}
      <button
        className="verba-guide-launcher"
        type="button"
        aria-label={isOpen ? "Cerrar guía Vera" : "Abrir guía Vera"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && <span>Pregunta a Vera</span>}
      </button>
    </div>
  );
}
