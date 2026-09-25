import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { VerbaGuide } from "@/components/VerbaGuide";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Flame,
  Grid2X2,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  Settings2,
  Shuffle,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

type Section = "home" | "glossary" | "teams";
type GameType = "shuffle" | "match" | "fill";
type Difficulty = "Principiante" | "Intermedio" | "Experto";
type Term = { word: string; definition: string; category: string };
type Progress = { xp: number; streak: number; lastDay: string; solved: number };

const starterTerms: Term[] = [
  { word: "Calidad", definition: "Capacidad de un producto para cumplir requisitos y expectativas sin errores.", category: "Operaciones" },
  { word: "Trazabilidad", definition: "Seguimiento del recorrido y el historial de un producto a lo largo de la cadena de suministro.", category: "Cadena de suministro" },
  { word: "Latencia", definition: "Tiempo que tarda un sistema en responder a una solicitud.", category: "Tecnología" },
  { word: "Rendimiento", definition: "Cantidad de solicitudes o unidades procesadas en un periodo de tiempo.", category: "Tecnología" },
  { word: "Escalabilidad", definition: "Capacidad de un sistema para crecer sin perder rendimiento.", category: "Producto" },
  { word: "Interoperabilidad", definition: "Capacidad de distintos sistemas para intercambiar y utilizar datos.", category: "Tecnología" },
];

const dailyByDifficulty: Record<Difficulty, { term: Term; fill: string; choices: string[] }> = {
  Principiante: {
    term: starterTerms[0],
    fill: "El atributo que asegura que un producto cumple sus especificaciones es la ____.",
    choices: ["Calidad", "Latencia", "Rendimiento", "Trazabilidad"],
  },
  Intermedio: {
    term: starterTerms[1],
    fill: "El seguimiento del historial de un producto en la cadena de suministro se llama ____.",
    choices: ["Escalabilidad", "Trazabilidad", "Latencia", "Rendimiento"],
  },
  Experto: {
    term: starterTerms[5],
    fill: "La capacidad de dos sistemas para intercambiar y utilizar información se denomina ____.",
    choices: ["Calidad", "Trazabilidad", "Interoperabilidad", "Rendimiento"],
  },
};

const matchChoices: Record<Difficulty, string[]> = {
  Principiante: ["Calidad", "Rendimiento", "Latencia", "Escalabilidad"],
  Intermedio: ["Escalabilidad", "Trazabilidad", "Calidad", "Latencia"],
  Experto: ["Latencia", "Interoperabilidad", "Calidad", "Rendimiento"],
};

const initialProgress: Progress = { xp: 1280, streak: 6, lastDay: "", solved: 12 };

function getStoredProgress(): Progress {
  try {
    const stored = localStorage.getItem("lexiloops-progress");
    return stored ? { ...initialProgress, ...JSON.parse(stored) } : initialProgress;
  } catch {
    return initialProgress;
  }
}

function getStoredTerms(): Term[] {
  try {
    const stored = localStorage.getItem("lexiloops-terms");
    return stored ? [...starterTerms, ...JSON.parse(stored)] : starterTerms;
  } catch {
    return starterTerms;
  }
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function shuffleWord(word: string) {
  const letters = word.toUpperCase().replace(/\s/g, "").split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  if (letters.join("").toLowerCase() === word.replace(/\s/g, "").toLowerCase() && letters.length > 1) {
    [letters[0], letters[1]] = [letters[1], letters[0]];
  }
  return letters;
}

function Logo() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark" aria-hidden="true">
        <span>V</span><i /><b />
      </div>
      <span className="brand-name">verba<span>loop</span><sup>®</sup></span>
    </div>
  );
}

function Avatar({ initials, color = "sage", size = "normal" }: { initials: string; color?: string; size?: string }) {
  return <span className={`avatar avatar-${color} avatar-${size}`}>{initials}</span>;
}

export default function Home() {
  const [section, setSection] = useState<Section>("home");
  const [gameType, setGameType] = useState<GameType>("shuffle");
  const [difficulty, setDifficulty] = useState<Difficulty>("Intermedio");
  const [progress, setProgress] = useState<Progress>(getStoredProgress);
  const [terms, setTerms] = useState<Term[]>(getStoredTerms);
  const [customWord, setCustomWord] = useState("");
  const [customDefinition, setCustomDefinition] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [complete, setComplete] = useState(false);
  const [selected, setSelected] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [customTerm, setCustomTerm] = useState<Term | null>(null);
  const [scramble, setScramble] = useState<string[]>(() => shuffleWord(dailyByDifficulty.Intermedio.term.word));
  const [toast, setToast] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const glossarySearchRef = useRef<HTMLInputElement>(null);

  const daily = dailyByDifficulty[difficulty];
  const activeTerm = customTerm || daily.term;
  const guideContext = {
    term: activeTerm.word,
    definition: activeTerm.definition,
    mode: gameType === "shuffle" ? "Revuelto" as const : gameType === "match" ? "Definiciones" as const : "Completa" as const,
    difficulty,
  };
  const today = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const filteredTerms = useMemo(() => terms.filter((term) => `${term.word} ${term.definition} ${term.category}`.toLowerCase().includes(query.toLowerCase())), [terms, query]);

  useEffect(() => {
    localStorage.setItem("lexiloops-progress", JSON.stringify(progress));
  }, [progress]);
  useEffect(() => {
    localStorage.setItem("lexiloops-terms", JSON.stringify(terms.slice(starterTerms.length)));
  }, [terms]);
  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(""), 2800);
      return () => window.clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    if (searchOpen && section === "glossary") glossarySearchRef.current?.focus();
  }, [searchOpen, section]);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setSection("glossary");
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  useEffect(() => {
    setScramble(shuffleWord(customTerm?.word || daily.term.word));
  }, [difficulty, customTerm, gameType]);

  const resetRound = () => {
    setHintVisible(false);
    setRevealed(false);
    setComplete(false);
    setSelected("");
    setTypedAnswer("");
    setScramble(shuffleWord(customTerm?.word || daily.term.word));
  };

  const switchDifficulty = (value: Difficulty) => {
    setDifficulty(value);
    setCustomTerm(null);
    setSection("home");
    setHintVisible(false);
    setRevealed(false);
    setComplete(false);
    setSelected("");
    setTypedAnswer("");
    setScramble(shuffleWord(dailyByDifficulty[value].term.word));
  };

  const solveRound = () => {
    if (complete || revealed) return;
    const expected = normalize(activeTerm.word);
    let answer = "";
    if (gameType === "shuffle") answer = typedAnswer;
    if (gameType === "match") answer = selected;
    if (gameType === "fill") answer = selected;
    if (!answer) {
      setToast(gameType === "shuffle" ? "Escribe el término antes de comprobar." : "Elige una respuesta para continuar.");
      return;
    }
    if (normalize(answer) === expected) {
      setComplete(true);
      const key = new Date().toLocaleDateString("en-CA");
      setProgress((prev) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toLocaleDateString("en-CA");
        let streak = prev.streak;
        if (prev.lastDay !== key) streak = prev.lastDay === yesterdayKey ? prev.streak + 1 : 1;
        return { ...prev, xp: prev.xp + (difficulty === "Experto" ? 80 : difficulty === "Intermedio" ? 60 : 40), solved: prev.solved + 1, streak, lastDay: key };
      });
      setToast("¡Eso es! Has dominado un nuevo término.");
    } else {
      setToast("Casi. Revisa el término y prueba de nuevo.");
    }
  };

  const revealAnswer = () => {
    setRevealed(true);
    setHintVisible(false);
  };

  const showNewDailyChallenge = () => {
    const types: GameType[] = ["shuffle", "match", "fill"];
    const nextType = types[(types.indexOf(gameType) + 1) % types.length];
    setCustomTerm(null);
    setGameType(nextType);
    setSection("home");
    setHintVisible(false);
    setRevealed(false);
    setComplete(false);
    setSelected("");
    setTypedAnswer("");
  };

  const addGlossaryTerm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customWord.trim() || !customDefinition.trim()) {
      setToast("Añade un término y su definición para guardar.");
      return;
    }
    const term = { word: customWord.trim(), definition: customDefinition.trim(), category: customCategory.trim() || "Glosario del equipo" };
    setTerms((prev) => [...prev, term]);
    setCustomWord("");
    setCustomDefinition("");
    setCustomCategory("");
    setToast("Término añadido al glosario del equipo.");
  };

  const playCustomTerm = (term: Term) => {
    setCustomTerm(term);
    setGameType("shuffle");
    setSection("home");
    setHintVisible(false);
    setRevealed(false);
    setComplete(false);
    setTypedAnswer("");
    setScramble(shuffleWord(term.word));
  };

  const navItems: { id: Section; label: string; icon: typeof Grid2X2 }[] = [
    { id: "home", label: "Inicio", icon: Grid2X2 },
    { id: "glossary", label: "Mi glosario", icon: BookOpen },
    { id: "teams", label: "Clasificación", icon: Trophy },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <Logo />
        <div className="workspace-chip"><span className="workspace-dot">N</span><span><strong>Northstar Labs</strong><small>Espacio de trabajo</small></span><ChevronDown size={15} /></div>
        <div className="nav-label">APRENDIZAJE</div>
        <nav className="side-nav" aria-label="Navegación principal">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${section === id ? "active" : ""}`} onClick={() => { setSection(id); setMobileMenu(false); }}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === "glossary" && <span className="nav-count">{terms.length}</span>}</button>)}
        </nav>
        <div className="side-divider" />
        <div className="nav-label">TUS RUTINAS</div>
        <div className="routine-card"><span className="routine-icon"><Flame size={16} /></span><span><strong>Racha diaria</strong><small>{progress.streak} días seguidos</small></span><ArrowUpRight size={14} className="routine-arrow" /></div>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-orbit orbit-one"/><div className="help-orbit orbit-two"/><CircleHelp size={19} /><strong>¿Primera vuelta?</strong><p>Una palabra al día es todo lo que necesitas.</p><button onClick={() => setToast("Tip: usa una pista si te atascas; tu racha sigue a salvo.")}>Ver cómo funciona <ArrowRight size={13} /></button></div>
          <button className="profile-row" onClick={() => setToast("Tu progreso se guarda en este navegador.")}><Avatar initials="AM" color="peach" /><span><strong>Alex Morgan</strong><small>Especialista de producto</small></span><Settings2 size={17} /></button>
          <div className="sidebar-note">Hecho para aprender en bucle <span>✳</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMobileMenu((open) => !open)} aria-label="Abrir menú">{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="breadcrumb"><span>Aprendizaje</span><ChevronRight size={14} /><strong>{section === "home" ? "Inicio" : section === "glossary" ? "Mi glosario" : "Clasificación"}</strong></div>
          <div className="topbar-actions">
            <button className={`search-button ${searchOpen ? "search-active" : ""}`} onClick={() => { setSearchOpen(true); setSection("glossary"); }} aria-label="Buscar glosario"><Search size={16} /><span>Buscar en tu glosario</span><kbd>⌘ K</kbd></button>
            <button className="topbar-icon" aria-label="Notificaciones" onClick={() => setToast("Estás al día. El reto de hoy ya está listo.")}><span className="notification-dot"/><Sparkles size={18} /></button>
            <div className="topbar-user"><Avatar initials="AM" color="peach" size="small" /><ChevronDown size={14} /></div>
          </div>
        </header>
        <div className="page-content">
          {section === "home" && (
            <>
              <div className="welcome-line"><div><div className="eyebrow"><span className="eyebrow-line"/> {today}</div><h1>Un poco mejor,<br className="mobile-break"/> cada <em>día.</em></h1><p className="welcome-sub">Cinco minutos hoy. Un vocabulario más afilado mañana.</p></div><div className="weekly-label"><span className="weekly-spark">✳</span><div><strong>Semana 24</strong><small>Tu mejor racha: 9 días</small></div></div></div>
              <div className="dashboard-grid">
                <section className="center-column">
                  <div className="section-heading"><div><span className="section-kicker"><span className="live-dot"/> TU PRÁCTICA DE HOY</span><h2>Ritual diario</h2></div><span className="daily-count"><CheckCircle2 size={14}/> {progress.solved} retos resueltos</span></div>
                  <div className="game-card">
                    <div className="game-card-top"><div><span className="mini-date"><span className="orange-dot"/> RETO DEL DÍA <span className="mini-divider">/</span> 01</span><h3>{customTerm ? "Tu término, en juego" : "Pon las letras en su sitio."}</h3><p>{customTerm ? `Una práctica rápida de “${customTerm.word}”.` : "¿Puedes descifrar el término de hoy?"}</p></div><div className="puzzle-stamp"><div className="stamp-tile stamp-a">L</div><div className="stamp-tile stamp-b">↗</div><span>DAILY<br/>LOOP</span></div></div>
                    <div className="challenge-controls"><div className="challenge-tabs" role="tablist" aria-label="Tipo de acertijo">
                      <button className={gameType === "shuffle" ? "selected" : ""} onClick={() => { setGameType("shuffle"); setCustomTerm(null); resetRound(); }}><Shuffle size={14}/> Revuelto</button>
                      <button className={gameType === "match" ? "selected" : ""} onClick={() => { setGameType("match"); setCustomTerm(null); resetRound(); }}><ListChecks size={14}/> Definiciones</button>
                      <button className={gameType === "fill" ? "selected" : ""} onClick={() => { setGameType("fill"); setCustomTerm(null); resetRound(); }}><span className="fill-icon">···</span> Completa</button>
                    </div><div className="difficulty-select"><span>Dificultad</span><select value={difficulty} onChange={(e) => switchDifficulty(e.target.value as Difficulty)} aria-label="Seleccionar dificultad"><option>Principiante</option><option>Intermedio</option><option>Experto</option></select><ChevronDown size={13}/></div></div>
                    <div className="puzzle-body">
                      {gameType === "shuffle" && <>
                        <div className="scramble-label"><span>ORDENA LAS LETRAS</span><span className="letter-count">{activeTerm.word.replace(/\s/g, "").length} LETRAS</span></div>
                        <div className={`tile-tray ${scramble.length > 14 ? "long-word" : ""}`} aria-label="Letras mezcladas">{scramble.map((letter, i) => <button key={`${letter}-${i}`} className={`letter-tile tile-tone-${i % 5}`} onClick={() => setTypedAnswer((prev) => prev + letter.toLowerCase())} aria-label={`Añadir letra ${letter}`}>{letter}</button>)}</div>
                        <div className="answer-entry"><input value={typedAnswer} onChange={(e) => setTypedAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && solveRound()} placeholder="Escribe tu respuesta aquí…" aria-label="Tu respuesta" disabled={complete || revealed}/><button className="clear-answer" onClick={() => setTypedAnswer("")} aria-label="Borrar respuesta"><X size={15}/></button><span className="answer-shortcut">↵</span></div>
                        <div className="answer-note">Toca las fichas para añadir letras o escribe tu respuesta.</div>
                      </>}
                      {gameType === "match" && <>
                        <div className="scramble-label"><span>¿QUÉ TÉRMINO ES?</span><span className="letter-count">EMPAREJAR</span></div>
                        <div className="definition-prompt"><span className="quote-mark">“</span>{activeTerm.definition}<span className="quote-mark end">”</span></div>
                        <div className="option-list">{(customTerm ? [customTerm.word, ...starterTerms.filter(t => normalize(t.word) !== normalize(customTerm.word)).slice(0,3).map(t=>t.word)].sort((a,b)=>a.localeCompare(b)) : matchChoices[difficulty]).map((choice, i) => <button key={choice} className={`option-row ${selected === choice ? "option-selected" : ""} ${complete && normalize(choice) === normalize(activeTerm.word) ? "option-correct" : ""}`} onClick={() => setSelected(choice)} disabled={complete || revealed}><span className="option-key">{String.fromCharCode(65+i)}</span>{choice}<span className="option-check">{selected === choice ? <Check size={15}/> : <ArrowRight size={14}/>}</span></button>)}</div>
                      </>}
                      {gameType === "fill" && <>
                        <div className="scramble-label"><span>COMPLETA LA FRASE</span><span className="letter-count">EN CONTEXTO</span></div>
                        <div className="fill-sentence">{customTerm ? `El término que describe ${customTerm.definition.charAt(0).toLowerCase()}${customTerm.definition.slice(1).replace(/[.]$/, "")} es _____.` : daily.fill.replace("____", "___________")}</div>
                        <div className="option-list fill-options">{(customTerm ? [customTerm.word, ...starterTerms.filter(t => normalize(t.word) !== normalize(customTerm.word)).slice(0,3).map(t=>t.word)].sort((a,b)=>a.localeCompare(b)) : daily.choices).map((choice, i) => <button key={choice} className={`option-row ${selected === choice ? "option-selected" : ""} ${complete && normalize(choice) === normalize(activeTerm.word) ? "option-correct" : ""}`} onClick={() => setSelected(choice)} disabled={complete || revealed}><span className="option-key">{String.fromCharCode(65+i)}</span>{choice}<span className="option-check">{selected === choice ? <Check size={15}/> : <ArrowRight size={14}/>}</span></button>)}</div>
                      </>}
                      {hintVisible && <div className="hint-box"><Lightbulb size={15}/><span>{gameType === "shuffle" ? `Pista: ${activeTerm.definition}` : gameType === "match" ? `Empieza con “${activeTerm.word[0].toUpperCase()}”.` : `Pista: empieza por ${activeTerm.word[0].toUpperCase()} y tiene ${activeTerm.word.length} letras.`}</span></div>}
                      {revealed && <div className="reveal-box"><BookOpen size={16}/><span>La respuesta es <strong>{activeTerm.word}</strong> — {activeTerm.definition}</span></div>}
                      {complete && <div className="success-box"><span className="success-icon"><Check size={17}/></span><span><strong>¡Excelente, palabra dominada!</strong><small>+{difficulty === "Experto" ? 80 : difficulty === "Intermedio" ? 60 : 40} XP añadidos a tu recorrido.</small></span><span className="success-confetti">✳</span></div>}
                    </div>
                    <div className="game-footer"><button className="hint-button" onClick={() => setHintVisible((v) => !v)} disabled={complete || revealed}><Lightbulb size={16}/>{hintVisible ? "Ocultar pista" : "Dame una pista"}<span className="hint-cost">GRATIS</span></button><div className="game-footer-actions">{!complete && !revealed ? <><button className="reveal-button" onClick={revealAnswer}><span>Ver respuesta</span></button><button className="check-button" onClick={solveRound}>Comprobar <ArrowRight size={15}/></button></> : <button className="check-button next-button" onClick={showNewDailyChallenge}>{complete ? "Siguiente reto" : "Intentar otro reto"}<ArrowRight size={15}/></button>}</div></div>
                  </div>

                  <div className="bottom-grid">
                    <section className="week-card"><div className="card-title-row"><div><span className="section-kicker">CONSTANCIA</span><h3>Tu ritmo semanal</h3></div><button className="small-more" onClick={() => setSection("teams")}>Ver progreso <ArrowRight size={13}/></button></div><div className="week-bars" aria-label="Progreso de la semana">{[{day:"L",height:30,done:true},{day:"M",height:58,done:true},{day:"M",height:44,done:true},{day:"J",height:70,today:true},{day:"V",height:20},{day:"S",height:20},{day:"D",height:20}].map((d,i)=><div className="week-day" key={i}><span className={`week-bar ${d.done?"bar-done":""} ${d.today?"bar-today":""}`} style={{height:`${d.height}px`}}>{d.today&&<span className="bar-spark">✳</span>}</span><small className={d.today?"today-label":""}>{d.day}</small></div>)}</div><div className="week-foot"><span><b>4</b> de 7 días activos</span><span className="week-leg"><i/> Objetivo diario: 1 reto</span></div></section>
                    <section className="glossary-preview"><div className="card-title-row"><div><span className="section-kicker">VOCABULARIO</span><h3>De tu glosario</h3></div><button className="circle-arrow" onClick={() => setSection("glossary")} aria-label="Abrir glosario"><ArrowRight size={16}/></button></div><div className="preview-word"><span className="word-index">01</span><span><strong>Trazabilidad</strong><small>Cadena de suministro</small></span><span className="word-chip">12 letras</span></div><div className="preview-word"><span className="word-index">02</span><span><strong>Rendimiento</strong><small>Tecnología</small></span><span className="word-chip">11 letras</span></div><button className="create-puzzle-link" onClick={() => setSection("glossary")}><Plus size={14}/> Crear un reto desde el glosario</button></section>
                  </div>
                </section>

                <aside className="right-column">
                  <div className="streak-card"><div className="streak-top"><span className="streak-icon"><Flame size={19} fill="currentColor"/></span><span className="streak-label">RACHA ACTUAL</span><span className="streak-menu">•••</span></div><div className="streak-number">{progress.streak}<span>días</span></div><p>Estás construyendo algo bueno. Sigue el ritmo.</p><div className="streak-dots"><div className="streak-day done"><Check size={12}/></div><div className="streak-day done"><Check size={12}/></div><div className="streak-day done"><Check size={12}/></div><div className="streak-day done"><Check size={12}/></div><div className="streak-day today-streak"><Flame size={12}/></div><div className="streak-day"/><div className="streak-day"/></div><div className="streak-day-labels"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div></div>
                  <div className="points-card"><div className="points-icon"><Zap size={16} fill="currentColor"/></div><div><span className="section-kicker">TUS PUNTOS</span><strong>{progress.xp.toLocaleString("es-MX")} <small>XP</small></strong></div><span className="points-gain"><ArrowUpRight size={13}/>12%</span><div className="points-progress"><i style={{width:`${Math.min(90, 40 + (progress.xp % 400) / 10)}%`}}/></div><span className="points-caption">Nivel 4 <span>·</span> Apasionado por las palabras</span></div>
                  <div className="leader-card"><div className="leader-head"><div><span className="section-kicker">TU EQUIPO</span><h3>En la cima</h3></div><button className="leader-period" onClick={() => setSection("teams")}>Esta semana <ChevronDown size={12}/></button></div><div className="team-rank"><span className="rank-number">01</span><Avatar initials="SK" color="blue" size="small"/><span className="team-name"><strong>Strategy & Ops</strong><small>8 personas</small></span><span className="team-score">2,840</span></div><div className="team-rank team-you"><span className="rank-number">02</span><Avatar initials="AM" color="peach" size="small"/><span className="team-name"><strong>Tu progreso</strong><small>¡Vas genial!</small></span><span className="team-score">{progress.xp.toLocaleString("es-MX")}</span></div><div className="team-rank"><span className="rank-number">03</span><Avatar initials="PD" color="lilac" size="small"/><span className="team-name"><strong>Product Design</strong><small>6 personas</small></span><span className="team-score">1,920</span></div><button className="leaderboard-link" onClick={() => setSection("teams")}>Ver clasificación completa <ArrowRight size={14}/></button></div>
                  <div className="team-nudge"><div className="nudge-icon"><UsersRound size={16}/></div><p><strong>Aprender en equipo</strong><br/>Invita a tu equipo y aprended juntos.</p><button aria-label="Invitar a mi equipo" onClick={() => setToast("La invitación de equipo estará disponible en una próxima versión.")}><ArrowUpRight size={15}/></button></div>
                </aside>
              </div>
            </>
          )}

          {section === "glossary" && (
            <div className="secondary-page"><div className="secondary-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> TU ESPACIO DE APRENDIZAJE</div><h1>Tu glosario,<br/><em>hecho juego.</em></h1><p>Guarda la terminología de tu equipo y conviértela en práctica que se queda.</p></div><div className="glossary-count-card"><BookOpen size={20}/><strong>{terms.length}</strong><span>términos<br/>en tu biblioteca</span></div></div>
              <div className="glossary-layout"><section className="glossary-main"><div className="glossary-toolbar"><div><h2>Biblioteca de términos</h2><span>{filteredTerms.length} palabras listas para aprender</span></div><div className="glossary-search"><Search size={15}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar un término..." aria-label="Buscar término"/>{query&&<button onClick={()=>setQuery("")} aria-label="Limpiar"><X size={14}/></button>}</div></div><div className="term-list">{filteredTerms.map((term,i)=><article className="term-row" key={`${term.word}-${i}`}><div className={`term-letter tile-tone-${i%5}`}>{term.word[0].toUpperCase()}</div><div className="term-content"><div className="term-title-line"><h3>{term.word}</h3><span className="term-category">{term.category}</span></div><p>{term.definition}</p></div><button className="practice-term" onClick={()=>playCustomTerm(term)}><Shuffle size={14}/> Practicar</button></article>)}{filteredTerms.length===0&&<div className="no-results">No encontramos ese término. Añádelo a tu glosario y crea un reto.</div>}</div></section>
                <aside className="glossary-side"><div className="add-term-card"><div className="add-card-icon"><Plus size={18}/></div><h3>Tu vocabulario, tus reglas.</h3><p>Convierte la jerga de tu equipo en un pequeño reto diario.</p><form onSubmit={addGlossaryTerm}><label htmlFor="new-word">TÉRMINO</label><input id="new-word" value={customWord} onChange={(e)=>setCustomWord(e.target.value)} placeholder="Ej. Ciclo de vida"/><label htmlFor="new-definition">DEFINICIÓN</label><textarea id="new-definition" value={customDefinition} onChange={(e)=>setCustomDefinition(e.target.value)} placeholder="¿Qué significa para tu equipo?" rows={3}/><label htmlFor="new-category">CATEGORÍA <span>(OPCIONAL)</span></label><input id="new-category" value={customCategory} onChange={(e)=>setCustomCategory(e.target.value)} placeholder="Ej. Producto"/><button className="add-term-button" type="submit"><Plus size={15}/> Añadir término</button></form><div className="privacy-note"><LockKeyhole size={13}/> El glosario queda en este navegador; Vera envía el término activo si usas su chat.</div></div><div className="how-it-works"><span className="section-kicker">UN CICLO SENCILLO</span><div className="loop-step"><span>01</span><p><strong>Añade</strong> una palabra de tu equipo.</p></div><div className="loop-connector"/><div className="loop-step"><span>02</span><p><strong>Practica</strong> con un reto de letras.</p></div><div className="loop-connector"/><div className="loop-step"><span>03</span><p><strong>Recuérdala</strong> cuando la necesites.</p></div></div></aside></div>
            </div>
          )}

          {section === "teams" && (
            <div className="secondary-page teams-page"><div className="secondary-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> APRENDER ES MEJOR JUNTOS</div><h1>La práctica<br/><em>hace al equipo.</em></h1><p>Pequeños retos, conocimiento que circula por todo Northstar Labs.</p></div><div className="team-trophy-art"><Trophy size={28}/><span>SEMANA<br/><b>24</b></span></div></div>
              <div className="team-overview"><div className="overview-stat"><span className="stat-icon sage-icon"><UsersRound size={17}/></span><div><small>EQUIPOS ACTIVOS</small><strong>6 <em>equipos</em></strong></div></div><div className="overview-stat"><span className="stat-icon orange-icon"><Zap size={17}/></span><div><small>XP DE LA SEMANA</small><strong>12,480 <em>puntos</em></strong></div></div><div className="overview-stat"><span className="stat-icon lilac-icon"><Target size={17}/></span><div><small>RACHA DEL EQUIPO</small><strong>8.4 <em>días de media</em></strong></div></div></div>
              <div className="leaderboard-full"><div className="full-leader-header"><div><span className="section-kicker">CLASIFICACIÓN GENERAL</span><h2>Las palabras se comparten.</h2></div><span className="week-pill"><span className="live-dot"/> Semana actual <ChevronDown size={13}/></span></div><div className="table-head"><span>PUESTO</span><span>EQUIPO</span><span>MIEMBROS</span><span>RACHA</span><span>PUNTOS</span></div>{[{rank:"01",team:"Strategy & Ops",initials:"SK",color:"blue",people:8,streak:"12.4 días",score:"2,840",trend:"up"},{rank:"02",team:"Tu progreso",initials:"AM",color:"peach",people:1,streak:`${progress.streak} días`,score:progress.xp.toLocaleString("es-MX"),trend:"up",you:true},{rank:"03",team:"Product Design",initials:"PD",color:"lilac",people:6,streak:"7.2 días",score:"1,920",trend:"up"},{rank:"04",team:"Customer Success",initials:"CS",color:"sage",people:11,streak:"5.8 días",score:"1,640",trend:"down"},{rank:"05",team:"Engineering",initials:"EN",color:"gold",people:14,streak:"4.1 días",score:"1,280",trend:"up"}].map((team)=><div className={`leader-table-row ${team.you?"leader-you":""}`} key={team.rank}><span className={`table-rank ${team.rank==="01"?"top-rank":""}`}>{team.rank==="01"?<Trophy size={15}/>:team.rank}</span><span className="table-team"><Avatar initials={team.initials} color={team.color} size="small"/><strong>{team.team}{team.you&&<i>ESTE ERES TÚ</i>}</strong></span><span className="table-muted">{team.people} personas</span><span className="table-streak"><Flame size={13}/>{team.streak}</span><span className="table-score">{team.score} XP {team.trend==="up"?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>}</span></div>)}<div className="leaderboard-foot"><span>Los puntos se actualizan al completar un reto.</span><button onClick={()=>setToast("¡Vas muy bien! Tu actividad se refleja aquí.")}>¿Cómo se calculan los puntos? <CircleHelp size={14}/></button></div></div>
            </div>
          )}
          <footer className="page-footer"><Logo/><span>Un bucle pequeño. Un vocabulario enorme.</span><span>© {new Date().getFullYear()} VerbaLoop <span className="footer-sep">·</span> Desarrollado por Pablo Sánchez</span></footer>
        </div>
      </main>
      {toast && <div className="toast-message" role="status"><span className="toast-mark"><Check size={14}/></span>{toast}<button onClick={()=>setToast("")} aria-label="Cerrar aviso"><X size={14}/></button></div>}
      <VerbaGuide context={guideContext} />
    </div>
  );
}
