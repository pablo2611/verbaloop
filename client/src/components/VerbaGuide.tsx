import { useEffect, useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import type { Language } from "@/lib/i18n";
import { Bot, MessageCircle, X } from "lucide-react";

type VerbaGuideContext = {
  term: string;
  definition: string;
  mode: "shuffle" | "match" | "fill";
  difficulty: "Principiante" | "Intermedio" | "Experto";
};

type PlayerMessage = { role: "user" | "assistant"; content: string };

const copy = {
  es: {
    suggestions: ["Dame una pista para este reto", "¿Qué significa este término?", "¿Cómo funciona mi racha?"],
    rateLimit: "He alcanzado mi límite temporal de mensajes. Espera unos minutos y seguimos.",
    offline: "Mi guía aún no está conectada. Vuelve a intentarlo más tarde.",
    retry: "No pude responder ahora. Inténtalo de nuevo en un momento.",
    aria: "Guía de aprendizaje Vera", label: "GUÍA DE VERBALOOP", status: "Aquí para ayudarte", close: "Cerrar guía",
    placeholder: "Pregunta por VerbaLoop o sus términos…",
    welcome: "Hola, soy Vera. Te doy una pista o te explico cómo aprender en VerbaLoop.",
    privacy: "Tu mensaje y el reto activo se usan para preparar una respuesta. No compartas información personal ni confidencial.",
    ask: "Pregunta a Vera", open: "Abrir guía Vera", send: "Enviar mensaje a Vera",
  },
  en: {
    suggestions: ["Give me a hint for this challenge", "What does this term mean?", "How does my streak work?"],
    rateLimit: "I've reached my temporary message limit. Wait a few minutes and we'll continue.",
    offline: "Your guide isn't connected right now. Please try again later.",
    retry: "I couldn't respond right now. Please try again in a moment.",
    aria: "Vera learning guide", label: "VERBALOOP GUIDE", status: "Here to help", close: "Close guide",
    placeholder: "Ask about VerbaLoop or its terms…",
    welcome: "Hi, I'm Vera. I can offer a hint or explain how to learn with VerbaLoop.",
    privacy: "Your message and active challenge are used to prepare a reply. Don't share personal or confidential information.",
    ask: "Ask Vera", open: "Open Vera guide", send: "Send message to Vera",
  },
} as const;

export function VerbaGuide({ context, language }: { context: VerbaGuideContext; language: Language }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const reply = trpc.aiTutor.reply.useMutation();
  const text = copy[language];

  useEffect(() => {
    setMessages([]);
  }, [language]);

  const sendMessage = (content: string) => {
    if (reply.isPending) return;
    const previousMessages = messages.reduce<PlayerMessage[]>((all, message) => {
      if (message.role !== "system") all.push({ role: message.role, content: message.content });
      return all;
    }, []);
    const conversation: PlayerMessage[] = [...previousMessages, { role: "user" as const, content }].slice(-8);
    setMessages(conversation);

    reply.mutate(
      { messages: conversation, context, language },
      {
        onSuccess: (response) => {
          setMessages((previous) => [...previous, { role: "assistant" as const, content: response }].slice(-12));
        },
        onError: (error) => {
          const message = error.data?.code === "TOO_MANY_REQUESTS" ? text.rateLimit
            : error.data?.code === "SERVICE_UNAVAILABLE" ? text.offline
              : text.retry;
          setMessages((previous) => [...previous, { role: "assistant" as const, content: message }].slice(-12));
        },
      },
    );
  };

  return (
    <div className={`verba-guide ${isOpen ? "verba-guide-open" : ""}`}>
      {isOpen && (
        <section className="verba-guide-panel" aria-label={text.aria}>
          <header className="verba-guide-header">
            <span className="verba-guide-avatar"><Bot size={17} /></span>
            <span className="verba-guide-heading">
              <strong>Vera <i>{text.label}</i></strong>
              <small><span className="verba-guide-status" /> {text.status}</small>
            </span>
            <button className="verba-guide-close" type="button" aria-label={text.close} onClick={() => setIsOpen(false)}>
              <X size={17} />
            </button>
          </header>
          <AIChatBox
            className="verba-guide-chat"
            height="100%"
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={reply.isPending}
            placeholder={text.placeholder}
            emptyStateMessage={text.welcome}
            suggestedPrompts={[...text.suggestions]}
            sendButtonLabel={text.send}
          />
          <p className="verba-guide-privacy">{text.privacy}</p>
        </section>
      )}
      <button
        className="verba-guide-launcher"
        type="button"
        aria-label={isOpen ? text.close : text.open}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && <span>{text.ask}</span>}
      </button>
    </div>
  );
}
