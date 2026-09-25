import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { DifficultyKey, Language } from "@/lib/i18n";
import { ArrowRight, Check, Loader2, RotateCw, Sparkles, X } from "lucide-react";

export function MiniLessonCard({
  language,
  term,
  definition,
  difficulty,
}: {
  language: Language;
  term: string;
  definition: string;
  difficulty: DifficultyKey;
}) {
  const [lesson, setLesson] = useState<{
    example: string;
    question: string;
    choices: string[];
    correctAnswer: string;
    explanation: string;
  } | null>(null);
  const [selected, setSelected] = useState("");
  const generate = trpc.aiTutor.lesson.useMutation();
  const copy = language === "es" ? {
    eyebrow: "MICROLECCIÓN PERSONALIZADA",
    title: "Aprende el término de hoy",
    intro: "Un ejemplo sencillo, una pregunta y una explicación para fijar la idea.",
    create: "Crear mi microlección",
    again: "Otra práctica",
    example: "EN EL TRABAJO",
    question: "Comprueba lo que entendiste",
    correct: "¡Eso es!",
    incorrect: "Casi. Mira la respuesta y repasa la idea.",
    answer: "Respuesta",
    privacy: "Solo se usa el término y su definición para crear esta práctica.",
    error: "No se pudo preparar la microlección. Vuelve a intentarlo.",
    loading: "Preparando tu ejemplo y pregunta…",
  } : {
    eyebrow: "PERSONALIZED MINI-LESSON",
    title: "Learn today's term",
    intro: "A simple example, one question, and an explanation to make it stick.",
    create: "Create my mini-lesson",
    again: "Try another",
    example: "AT WORK",
    question: "Check what you learned",
    correct: "That's right!",
    incorrect: "Not quite. Review the answer and key idea.",
    answer: "Answer",
    privacy: "Only the term and its definition are used to create this practice.",
    error: "We couldn't prepare the mini-lesson. Please try again.",
    loading: "Preparing your example and question…",
  };

  useEffect(() => {
    setLesson(null);
    setSelected("");
    generate.reset();
  }, [language, term, definition, difficulty]);

  const handleGenerate = () => {
    setSelected("");
    generate.mutate({ language, term, definition, difficulty }, {
      onSuccess: (result) => setLesson(result),
    });
  };

  return (
    <section className={`mini-lesson-card ${lesson ? "mini-lesson-ready" : ""}`} aria-labelledby="mini-lesson-title">
      <div className="mini-lesson-main">
        <span className="mini-lesson-icon"><Sparkles size={17} /></span>
        <div className="mini-lesson-copy">
          <span className="section-kicker">{copy.eyebrow}</span>
          <h3 id="mini-lesson-title">{copy.title}<span>{term}</span></h3>
          {!lesson && <p>{copy.intro}</p>}
        </div>
        <button className="mini-lesson-action" type="button" onClick={handleGenerate} disabled={generate.isPending}>
          {generate.isPending ? <Loader2 size={15} className="spin" /> : lesson ? <RotateCw size={15} /> : <Sparkles size={15} />}
          <span>{generate.isPending ? copy.loading : lesson ? copy.again : copy.create}</span>
          {!lesson && !generate.isPending && <ArrowRight size={14} />}
        </button>
      </div>
      {generate.isError && <p className="mini-lesson-error" role="alert">{copy.error}</p>}
      {lesson && (
        <div className="mini-lesson-content">
          <div className="mini-lesson-example"><span>{copy.example}</span><p>{lesson.example}</p></div>
          <div className="mini-lesson-quiz">
            <span className="mini-lesson-label">{copy.question}</span>
            <p>{lesson.question}</p>
            <div className="mini-lesson-choices">
              {lesson.choices.map((choice) => {
                const isCorrect = selected !== "" && choice.toLocaleLowerCase() === lesson.correctAnswer.toLocaleLowerCase();
                const isSelected = selected === choice;
                return (
                  <button
                    key={choice}
                    type="button"
                    className={`mini-lesson-choice ${isSelected ? "choice-selected" : ""} ${isCorrect ? "choice-correct" : selected === choice ? "choice-incorrect" : ""}`}
                    onClick={() => setSelected(choice)}
                    disabled={selected !== ""}
                  >
                    <span className="mini-choice-mark">{isCorrect ? <Check size={14} /> : isSelected ? <X size={14} /> : null}</span>
                    {choice}
                  </button>
                );
              })}
            </div>
            {selected && (
              <p className={`mini-lesson-feedback ${selected.toLocaleLowerCase() === lesson.correctAnswer.toLocaleLowerCase() ? "feedback-good" : "feedback-review"}`} role="status">
                <strong>{selected.toLocaleLowerCase() === lesson.correctAnswer.toLocaleLowerCase() ? copy.correct : copy.incorrect}</strong> {lesson.explanation}
              </p>
            )}
          </div>
          <small className="mini-lesson-privacy">{copy.privacy}</small>
        </div>
      )}
    </section>
  );
}
