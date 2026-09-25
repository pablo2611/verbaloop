import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { VerbaGuide } from "@/components/VerbaGuide";
import { MiniLessonCard } from "@/components/MiniLessonCard";
import { dailyChallenges, detectLanguage, matchChoices, sampleTerms, translate, type GlossaryTerm, type Language, type TranslationKey } from "@/lib/i18n";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronDown,
  ChevronRight, CircleHelp, Flame, Grid2X2, Lightbulb, ListChecks, LockKeyhole, Menu,
  Plus, Search, Settings2, Shuffle, Sparkles, Target, Trophy, UsersRound, X, Zap,
} from "lucide-react";

type Section = "home" | "glossary" | "teams";
type GameType = "shuffle" | "match" | "fill";
type Difficulty = "Principiante" | "Intermedio" | "Experto";
type Progress = { xp: number; streak: number; lastDay: string; solved: number };

const initialProgress: Progress = { xp: 1280, streak: 6, lastDay: "", solved: 12 };

function getStoredProgress(): Progress {
  try {
    const stored = localStorage.getItem("verbaloop-progress") || localStorage.getItem("lexiloops-progress");
    return stored ? { ...initialProgress, ...JSON.parse(stored) } : initialProgress;
  } catch {
    return initialProgress;
  }
}

function getStoredCustomTerms(): GlossaryTerm[] {
  try {
    const stored = localStorage.getItem("verbaloop-terms") || localStorage.getItem("lexiloops-terms");
    return stored ? JSON.parse(stored) as GlossaryTerm[] : [];
  } catch {
    return [];
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
  return <div className="brand-lockup"><div className="brand-mark" aria-hidden="true"><span>V</span><i /><b /></div><span className="brand-name">verba<span>loop</span><sup>®</sup></span></div>;
}

function Avatar({ initials, color = "sage", size = "normal" }: { initials: string; color?: string; size?: string }) {
  return <span className={`avatar avatar-${color} avatar-${size}`}>{initials}</span>;
}

const difficultyKeys: Difficulty[] = ["Principiante", "Intermedio", "Experto"];

export default function Home() {
  const [language, setLanguage] = useState<Language>(detectLanguage);
  const t = (key: TranslationKey, variables?: Record<string, string | number>) => translate(language, key, variables);
  const [section, setSection] = useState<Section>(() => {
    const view = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("view") : null;
    return view === "glossary" || view === "teams" ? view : "home";
  });
  const [gameType, setGameType] = useState<GameType>("shuffle");
  const [difficulty, setDifficulty] = useState<Difficulty>("Intermedio");
  const [progress, setProgress] = useState<Progress>(getStoredProgress);
  const [customTerms, setCustomTerms] = useState<GlossaryTerm[]>(getStoredCustomTerms);
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
  const [customTerm, setCustomTerm] = useState<GlossaryTerm | null>(null);
  const [scramble, setScramble] = useState<string[]>(() => shuffleWord(dailyChallenges[detectLanguage()].Intermedio.term.word));
  const [toast, setToast] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const glossarySearchRef = useRef<HTMLInputElement>(null);
  const [howOpen, setHowOpen] = useState(false);
  const howCloseRef = useRef<HTMLButtonElement>(null);

  const daily = dailyChallenges[language][difficulty];
  const starterTerms = sampleTerms[language];
  const terms = useMemo(() => [...starterTerms, ...customTerms], [starterTerms, customTerms]);
  const activeTerm = customTerm || daily.term;
  const guideContext = { term: activeTerm.word, definition: activeTerm.definition, mode: gameType, difficulty };
  const today = new Date().toLocaleDateString(language === "es" ? "es-MX" : "en-US", { weekday: "long", day: "numeric", month: "long" });
  const formattedXp = progress.xp.toLocaleString(language === "es" ? "es-MX" : "en-US");
  const filteredTerms = useMemo(() => terms.filter((term) => `${term.word} ${term.definition} ${term.category}`.toLowerCase().includes(query.toLowerCase())), [terms, query]);
  const weekDays = language === "es" ? ["L", "M", "M", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"];
  const difficultyText: Record<Difficulty, string> = { Principiante: t("beginner"), Intermedio: t("intermediate"), Experto: t("expert") };

  useEffect(() => {
    try { localStorage.setItem("verbaloop-language", language); } catch { /* Language still works without storage. */ }
    document.documentElement.lang = language;
    document.title = language === "es" ? "VerbaLoop — Un poco mejor, cada día" : "VerbaLoop — A little better, every day";
    document.querySelector('meta[name="description"]')?.setAttribute("content", language === "es"
      ? "VerbaLoop: practica vocabulario industrial y términos de producto con retos diarios y pistas de Vera."
      : "VerbaLoop: practice industrial and product vocabulary with daily challenges and hints from Vera.");
  }, [language]);
  useEffect(() => {
    try { localStorage.setItem("verbaloop-progress", JSON.stringify(progress)); } catch { /* Progress remains available for this session. */ }
  }, [progress]);
  useEffect(() => {
    try { localStorage.setItem("verbaloop-terms", JSON.stringify(customTerms)); } catch { /* Glossary remains available for this session. */ }
  }, [customTerms]);
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
    if (howOpen) howCloseRef.current?.focus();
  }, [howOpen]);
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
  }, [language, difficulty, customTerm, gameType]);

  const resetRound = () => {
    setHintVisible(false); setRevealed(false); setComplete(false); setSelected(""); setTypedAnswer("");
    setScramble(shuffleWord(customTerm?.word || daily.term.word));
  };

  const switchDifficulty = (value: Difficulty) => {
    setDifficulty(value); setCustomTerm(null); setSection("home"); setHintVisible(false); setRevealed(false); setComplete(false); setSelected(""); setTypedAnswer("");
    setScramble(shuffleWord(dailyChallenges[language][value].term.word));
  };

  const solveRound = () => {
    if (complete || revealed) return;
    const expected = normalize(activeTerm.word);
    const answer = gameType === "shuffle" ? typedAnswer : selected;
    if (!answer) { setToast(t(gameType === "shuffle" ? "typeBeforeCheck" : "chooseAnswer")); return; }
    if (normalize(answer) === expected) {
      setComplete(true);
      const key = new Date().toLocaleDateString("en-CA");
      setProgress((prev) => {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toLocaleDateString("en-CA");
        const streak = prev.lastDay !== key ? (prev.lastDay === yesterdayKey ? prev.streak + 1 : 1) : prev.streak;
        const xp = difficulty === "Experto" ? 80 : difficulty === "Intermedio" ? 60 : 40;
        return { ...prev, xp: prev.xp + xp, solved: prev.solved + 1, streak, lastDay: key };
      });
      setToast(t("solvedToast"));
    } else setToast(t("tryAgain"));
  };

  const revealAnswer = () => { setRevealed(true); setHintVisible(false); };

  const showNewDailyChallenge = () => {
    const types: GameType[] = ["shuffle", "match", "fill"];
    const nextType = types[(types.indexOf(gameType) + 1) % types.length];
    setCustomTerm(null); setGameType(nextType); setSection("home"); setHintVisible(false); setRevealed(false); setComplete(false); setSelected(""); setTypedAnswer("");
  };

  const addGlossaryTerm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customWord.trim() || !customDefinition.trim()) { setToast(t("addTermRequired")); return; }
    const term = { word: customWord.trim(), definition: customDefinition.trim(), category: customCategory.trim() || t("teamGlossary") };
    setCustomTerms((prev) => [...prev, term]);
    setCustomWord(""); setCustomDefinition(""); setCustomCategory(""); setToast(t("termAdded"));
  };

  const playCustomTerm = (term: GlossaryTerm) => {
    setCustomTerm(term); setGameType("shuffle"); setSection("home"); setHintVisible(false); setRevealed(false); setComplete(false); setTypedAnswer(""); setScramble(shuffleWord(term.word));
  };

  const navItems: { id: Section; key: TranslationKey; icon: typeof Grid2X2 }[] = [
    { id: "home", key: "home", icon: Grid2X2 },
    { id: "glossary", key: "glossary", icon: BookOpen },
    { id: "teams", key: "leaderboard", icon: Trophy },
  ];
  const sectionLabel = t(section === "home" ? "home" : section === "glossary" ? "glossary" : "leaderboard");

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <Logo />
        <div className="workspace-chip"><span className="workspace-dot">N</span><span><strong>Northstar Labs</strong><small>{t("yourWorkspace")}</small></span><ChevronDown size={15} /></div>
        <div className="nav-label">{t("learning").toLocaleUpperCase(language)}</div>
        <nav className="side-nav" aria-label={t("learning")}>
          {navItems.map(({ id, key, icon: Icon }) => <button key={id} className={`nav-link ${section === id ? "active" : ""}`} onClick={() => { setSection(id); setMobileMenu(false); }}><Icon size={18} strokeWidth={1.8} /><span>{t(key)}</span>{id === "glossary" && <span className="nav-count">{terms.length}</span>}</button>)}
        </nav>
        <div className="side-divider" />
        <div className="nav-label">{t("routines").toLocaleUpperCase(language)}</div>
        <div className="routine-card"><span className="routine-icon"><Flame size={16} /></span><span><strong>{t("dailyStreak")}</strong><small>{progress.streak} {t("daysInRow")}</small></span><ArrowUpRight size={14} className="routine-arrow" /></div>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-orbit orbit-one"/><div className="help-orbit orbit-two"/><CircleHelp size={19} /><strong>{t("firstLap")}</strong><p>{t("oneWordADay")}</p><button onClick={() => setHowOpen(true)}>{t("seeHowItWorks")} <ArrowRight size={13} /></button></div>
          <button className="profile-row" onClick={() => setToast(t("localProgress"))}><Avatar initials="AM" color="peach" /><span><strong>Alex Morgan</strong><small>{t("productSpecialist")}</small></span><Settings2 size={17} /></button>
          <div className="sidebar-note">{t("madeToLearn")} <span>✳</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMobileMenu((open) => !open)} aria-label={mobileMenu ? t("closeMenu") : t("openMenu")}>{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="breadcrumb"><span>{t("learning")}</span><ChevronRight size={14} /><strong>{sectionLabel}</strong></div>
          <div className="topbar-actions">
            <button className={`search-button ${searchOpen ? "search-active" : ""}`} onClick={() => { setSearchOpen(true); setSection("glossary"); }} aria-label={t("searchGlossaryAria")}><Search size={16} /><span>{t("searchGlossary")}</span><kbd>⌘ K</kbd></button>
            <div className="language-switch" role="group" aria-label={language === "es" ? "Seleccionar idioma / Choose language" : "Choose language / Seleccionar idioma"}>
              <button type="button" className={language === "es" ? "language-active" : ""} aria-pressed={language === "es"} onClick={() => setLanguage("es")}>ES</button>
              <button type="button" className={language === "en" ? "language-active" : ""} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
            </div>
            <button className="topbar-icon" aria-label={t("notifications")} onClick={() => setToast(t("upToDate"))}><span className="notification-dot"/><Sparkles size={18} /></button>
            <div className="topbar-user"><Avatar initials="AM" color="peach" size="small" /><ChevronDown size={14} /></div>
          </div>
        </header>
        <div className="page-content">
          {section === "home" && (
            <>
              <div className="welcome-line"><div><div className="eyebrow"><span className="eyebrow-line"/> {today}</div><h1>{t("aLittleBetter")}<br className="mobile-break"/> <em>{t("everyDay")}</em></h1><p className="welcome-sub">{t("fiveMinutes")}</p></div><div className="weekly-label"><span className="weekly-spark">✳</span><div><strong>{t("week")} 24</strong><small>{t("bestStreak")}</small></div></div></div>
              <div className="dashboard-grid">
                <section className="center-column">
                  <div className="section-heading"><div><span className="section-kicker"><span className="live-dot"/> {t("todayPractice")}</span><h2>{t("dailyRitual")}</h2></div><span className="daily-count"><CheckCircle2 size={14}/> {t("solvedCount", { count: progress.solved })}</span></div>
                  <div className="game-card">
                    <div className="game-card-top"><div><span className="mini-date"><span className="orange-dot"/> {t("challengeOfDay")} <span className="mini-divider">/</span> 01</span><h3>{customTerm ? t("yourTermInPlay") : language === "es" ? "Pon las letras en su sitio." : "Put the letters in order."}</h3><p>{customTerm ? `${t("quickPractice")} “${customTerm.word}”.` : t("canYouSolve")}</p></div><div className="puzzle-stamp" aria-hidden="true"><div className="stamp-tile stamp-a">L</div><div className="stamp-tile stamp-b">↗</div></div></div>
                    <div className="challenge-controls"><div className="challenge-tabs" role="tablist" aria-label={t("puzzleType")}>
                      <button className={gameType === "shuffle" ? "selected" : ""} onClick={() => { setGameType("shuffle"); setCustomTerm(null); resetRound(); }}><Shuffle size={14}/> {t("shuffle")}</button>
                      <button className={gameType === "match" ? "selected" : ""} onClick={() => { setGameType("match"); setCustomTerm(null); resetRound(); }}><ListChecks size={14}/> {t("match")}</button>
                      <button className={gameType === "fill" ? "selected" : ""} onClick={() => { setGameType("fill"); setCustomTerm(null); resetRound(); }}><span className="fill-icon">···</span> {t("fill")}</button>
                    </div><div className="difficulty-select"><span>{t("difficulty")}</span><select value={difficulty} onChange={(e) => switchDifficulty(e.target.value as Difficulty)} aria-label={t("selectDifficulty")}>{difficultyKeys.map((key) => <option key={key} value={key}>{difficultyText[key]}</option>)}</select><ChevronDown size={13}/></div></div>
                    <div className="puzzle-body">
                      {gameType === "shuffle" && <>
                        <div className="scramble-label"><span>{t("arrangeLetters")}</span><span className="letter-count">{t("letters", { count: activeTerm.word.replace(/\s/g, "").length })}</span></div>
                        <div className={`tile-tray ${scramble.length > 14 ? "long-word" : ""}`} aria-label={t("arrangeLetters")}>{scramble.map((letter, i) => <button key={`${letter}-${i}`} className={`letter-tile tile-tone-${i % 5}`} onClick={() => setTypedAnswer((prev) => prev + letter.toLowerCase())} aria-label={t("addLetter", { letter })}>{letter}</button>)}</div>
                        <div className="answer-entry"><input value={typedAnswer} onChange={(e) => setTypedAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && solveRound()} placeholder={t("answerPlaceholder")} aria-label={t("yourAnswer")} disabled={complete || revealed}/><button className="clear-answer" onClick={() => setTypedAnswer("")} aria-label={t("clearAnswer")}><X size={15}/></button><span className="answer-shortcut">↵</span></div>
                        <div className="answer-note">{t("tileInstructions")}</div>
                      </>}
                      {gameType === "match" && <>
                        <div className="scramble-label"><span>{t("whichTerm")}</span><span className="letter-count">{t("pairTerms")}</span></div>
                        <div className="definition-prompt"><span className="quote-mark">“</span>{activeTerm.definition}<span className="quote-mark end">”</span></div>
                        <div className="option-list">{(customTerm ? [customTerm.word, ...starterTerms.filter((term) => normalize(term.word) !== normalize(customTerm.word)).slice(0, 3).map((term) => term.word)].sort((a, b) => a.localeCompare(b)) : matchChoices[language][difficulty]).map((choice, i) => <button key={choice} className={`option-row ${selected === choice ? "option-selected" : ""} ${complete && normalize(choice) === normalize(activeTerm.word) ? "option-correct" : ""}`} onClick={() => setSelected(choice)} disabled={complete || revealed}><span className="option-key">{String.fromCharCode(65 + i)}</span>{choice}<span className="option-check">{selected === choice ? <Check size={15}/> : <ArrowRight size={14}/>}</span></button>)}</div>
                      </>}
                      {gameType === "fill" && <>
                        <div className="scramble-label"><span>{t("completeSentence")}</span><span className="letter-count">{t("inContext")}</span></div>
                        <div className="fill-sentence">{customTerm ? (language === "es" ? `El término que describe ${customTerm.definition.charAt(0).toLowerCase()}${customTerm.definition.slice(1).replace(/[.]$/, "")} es _____.` : `The term describing ${customTerm.definition.charAt(0).toLowerCase()}${customTerm.definition.slice(1).replace(/[.]$/, "")} is _____.`) : daily.fill.replace("____", "___________")}</div>
                        <div className="option-list fill-options">{(customTerm ? [customTerm.word, ...starterTerms.filter((term) => normalize(term.word) !== normalize(customTerm.word)).slice(0, 3).map((term) => term.word)].sort((a, b) => a.localeCompare(b)) : daily.choices).map((choice, i) => <button key={choice} className={`option-row ${selected === choice ? "option-selected" : ""} ${complete && normalize(choice) === normalize(activeTerm.word) ? "option-correct" : ""}`} onClick={() => setSelected(choice)} disabled={complete || revealed}><span className="option-key">{String.fromCharCode(65 + i)}</span>{choice}<span className="option-check">{selected === choice ? <Check size={15}/> : <ArrowRight size={14}/>}</span></button>)}</div>
                      </>}
                      {hintVisible && <div className="hint-box"><Lightbulb size={15}/><span>{gameType === "shuffle" ? `${t("hint")}: ${activeTerm.definition}` : gameType === "fill" ? t("startsWithLength", { letter: activeTerm.word[0].toLocaleUpperCase(language), count: activeTerm.word.length }) : t("startsWith", { letter: activeTerm.word[0].toLocaleUpperCase(language) })}</span></div>}
                      {revealed && <div className="reveal-box"><BookOpen size={16}/><span>{t("revealPrefix")} <strong>{activeTerm.word}</strong> — {activeTerm.definition}</span></div>}
                      {complete && <div className="success-box"><span className="success-icon"><Check size={17}/></span><span><strong>{t("excellent")}</strong><small>{t("xpAdded", { xp: difficulty === "Experto" ? 80 : difficulty === "Intermedio" ? 60 : 40 })}</small></span><span className="success-confetti">✳</span></div>}
                    </div>
                    <div className="game-footer"><button className="hint-button" onClick={() => setHintVisible((value) => !value)} disabled={complete || revealed}><Lightbulb size={16}/>{hintVisible ? t("hideHint") : t("giveHint")}<span className="hint-cost">{t("free")}</span></button><div className="game-footer-actions">{!complete && !revealed ? <><button className="reveal-button" onClick={revealAnswer}><span>{t("seeAnswer")}</span></button><button className="check-button" onClick={solveRound}>{t("check")} <ArrowRight size={15}/></button></> : <button className="check-button next-button" onClick={showNewDailyChallenge}>{complete ? t("nextChallenge") : t("tryAnother")}<ArrowRight size={15}/></button>}</div></div>
                  </div>

                  <MiniLessonCard language={language} term={activeTerm.word} definition={activeTerm.definition} difficulty={difficulty} />
                  <div className="bottom-grid">
                    <section className="week-card"><div className="card-title-row"><div><span className="section-kicker">{t("consistency")}</span><h3>{t("weeklyRhythm")}</h3></div><button className="small-more" onClick={() => setSection("teams")}>{t("viewProgress")} <ArrowRight size={13}/></button></div><div className="week-bars" aria-label={t("weeklyProgress")}>{[{height:30,done:true},{height:58,done:true},{height:44,done:true},{height:70,today:true},{height:20},{height:20},{height:20}].map((day,i)=><div className="week-day" key={i}><span className={`week-bar ${day.done?"bar-done":""} ${day.today?"bar-today":""}`} style={{height:`${day.height}px`}}>{day.today&&<span className="bar-spark">✳</span>}</span><small className={day.today?"today-label":""}>{weekDays[i]}</small></div>)}</div><div className="week-foot"><span>{t("activeDays", { count: 4 })}</span><span className="week-leg"><i/> {t("dailyGoal")}</span></div></section>
                    <section className="glossary-preview"><div className="card-title-row"><div><span className="section-kicker">{t("vocabulary")}</span><h3>{t("fromGlossary")}</h3></div><button className="circle-arrow" onClick={() => setSection("glossary")} aria-label={t("openGlossary")}><ArrowRight size={16}/></button></div>{starterTerms.slice(1, 3).map((term, index)=><div className="preview-word" key={term.word}><span className="word-index">0{index + 1}</span><span><strong>{term.word}</strong><small>{term.category}</small></span><span className="word-chip">{t("lettersCount", { count: term.word.replace(/\s/g, "").length })}</span></div>)}<button className="create-puzzle-link" onClick={() => setSection("glossary")}><Plus size={14}/> {t("createFromGlossary")}</button></section>
                  </div>
                </section>

                <aside className="right-column">
                  <div className="streak-card"><div className="streak-top"><span className="streak-icon"><Flame size={19} fill="currentColor"/></span><span className="streak-label">{t("currentStreak")}</span><span className="streak-menu">•••</span></div><div className="streak-number">{progress.streak}<span>{t("days")}</span></div><p>{t("keepItUp")}</p><div className="streak-dots"><div className="streak-day done"><Check size={12}/></div><div className="streak-day done"><Check size={12}/></div><div className="streak-day done"><Check size={12}/></div><div className="streak-day done"><Check size={12}/></div><div className="streak-day today-streak"><Flame size={12}/></div><div className="streak-day"/><div className="streak-day"/></div><div className="streak-day-labels">{weekDays.map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}</div></div>
                  <div className="points-card"><div className="points-icon"><Zap size={16} fill="currentColor"/></div><div><span className="section-kicker">{t("yourPoints")}</span><strong>{formattedXp} <small>XP</small></strong></div><span className="points-gain"><ArrowUpRight size={13}/>12%</span><div className="points-progress"><i style={{width:`${Math.min(90, 40 + (progress.xp % 400) / 10)}%`}}/></div><span className="points-caption">{language === "es" ? "Nivel" : "Level"} 4 <span>·</span> {t("levelPassionate")}</span></div>
                  <div className="leader-card"><div className="leader-head"><div><span className="section-kicker">{t("yourTeam")}</span><h3>{t("atTheTop")}</h3></div><button className="leader-period" onClick={() => setSection("teams")}>{t("thisWeek")} <ChevronDown size={12}/></button></div><div className="team-rank"><span className="rank-number">01</span><Avatar initials="SK" color="blue" size="small"/><span className="team-name"><strong>Strategy & Ops</strong><small>{t("people", { count: 8 })}</small></span><span className="team-score">2,840</span></div><div className="team-rank team-you"><span className="rank-number">02</span><Avatar initials="AM" color="peach" size="small"/><span className="team-name"><strong>{t("yourProgress")}</strong><small>{t("doingGreat")}</small></span><span className="team-score">{formattedXp}</span></div><div className="team-rank"><span className="rank-number">03</span><Avatar initials="PD" color="lilac" size="small"/><span className="team-name"><strong>Product Design</strong><small>{t("people", { count: 6 })}</small></span><span className="team-score">1,920</span></div><button className="leaderboard-link" onClick={() => setSection("teams")}>{t("viewFullLeaderboard")} <ArrowRight size={14}/></button></div>
                  <div className="team-nudge"><div className="nudge-icon"><UsersRound size={16}/></div><p><strong>{t("learnAsTeam")}</strong><br/>{t("inviteTeam")}</p><button aria-label={t("inviteTeamAria")} onClick={() => setToast(t("inviteComingSoon"))}><ArrowUpRight size={15}/></button></div>
                </aside>
              </div>
            </>
          )}

          {section === "glossary" && (
            <div className="secondary-page"><div className="secondary-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> {t("yourLearningSpace")}</div><h1>{t("glossaryTitle")}<br/><em>{t("madeGame")}</em></h1><p>{t("glossaryIntro")}</p></div><div className="glossary-count-card"><BookOpen size={20}/><strong>{terms.length}</strong><span>{t("termsInLibrary")}</span></div></div>
              <div className="glossary-layout"><section className="glossary-main"><div className="glossary-toolbar"><div><h2>{t("termLibrary")}</h2><span>{t("wordsReady", { count: filteredTerms.length })}</span></div><div className="glossary-search"><Search size={15}/><input ref={glossarySearchRef} value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={t("searchTerm")} aria-label={t("searchTermAria")}/>{query&&<button onClick={()=>setQuery("")} aria-label={t("clear")}><X size={14}/></button>}</div></div><div className="term-list">{filteredTerms.map((term,i)=><article className="term-row" key={`${term.word}-${i}`}><div className={`term-letter tile-tone-${i%5}`}>{term.word[0].toUpperCase()}</div><div className="term-content"><div className="term-title-line"><h3>{term.word}</h3><span className="term-category">{term.category}</span></div><p>{term.definition}</p></div><button className="practice-term" onClick={()=>playCustomTerm(term)}><Shuffle size={14}/> {t("practice")}</button></article>)}{filteredTerms.length===0&&<div className="no-results">{t("noResults")}</div>}</div></section>
                <aside className="glossary-side"><div className="add-term-card"><div className="add-card-icon"><Plus size={18}/></div><h3>{t("vocabYourRules")}</h3><p>{t("teamJargon")}</p><form onSubmit={addGlossaryTerm}><label htmlFor="new-word">{t("termLabel")}</label><input id="new-word" value={customWord} onChange={(e)=>setCustomWord(e.target.value)} placeholder={t("termExample")}/><label htmlFor="new-definition">{t("definitionLabel")}</label><textarea id="new-definition" value={customDefinition} onChange={(e)=>setCustomDefinition(e.target.value)} placeholder={t("teamMeaning")} rows={3}/><label htmlFor="new-category">{t("categoryLabel")} <span>({t("optional")})</span></label><input id="new-category" value={customCategory} onChange={(e)=>setCustomCategory(e.target.value)} placeholder={t("categoryExample")}/><button className="add-term-button" type="submit"><Plus size={15}/> {t("addTerm")}</button></form><div className="privacy-note"><LockKeyhole size={13}/> {t("glossaryPrivacy")}</div></div><div className="how-it-works"><span className="section-kicker">{t("simpleLoop")}</span><div className="loop-step"><span>01</span><p><strong>{t("add")}</strong> {t("teamWord")}</p></div><div className="loop-connector"/><div className="loop-step"><span>02</span><p><strong>{t("practiceStep")}</strong> {t("letterChallenge")}</p></div><div className="loop-connector"/><div className="loop-step"><span>03</span><p><strong>{t("remember")}</strong> {t("whenNeeded")}</p></div></div></aside></div>
            </div>
          )}

          {section === "teams" && (
            <div className="secondary-page teams-page"><div className="secondary-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> {t("learnTogether")}</div><h1>{t("practiceMakesTeam")}<br/><em>{t("teamPhrase")}</em></h1><p>{t("teamIntro")}</p></div><div className="team-trophy-art"><Trophy size={28}/><span>{t("week").toLocaleUpperCase(language)}<br/><b>24</b></span></div></div>
              <div className="team-overview"><div className="overview-stat"><span className="stat-icon sage-icon"><UsersRound size={17}/></span><div><small>{t("activeTeams")}</small><strong>6 <em>{t("teams")}</em></strong></div></div><div className="overview-stat"><span className="stat-icon orange-icon"><Zap size={17}/></span><div><small>{t("weeklyXp")}</small><strong>12,480 <em>{t("points")}</em></strong></div></div><div className="overview-stat"><span className="stat-icon lilac-icon"><Target size={17}/></span><div><small>{t("teamStreak")}</small><strong>8.4 <em>{t("avgDays")}</em></strong></div></div></div>
              <div className="leaderboard-full"><div className="full-leader-header"><div><span className="section-kicker">{t("overallLeaderboard")}</span><h2>{t("wordsShared")}</h2></div><span className="week-pill"><span className="live-dot"/> {t("currentWeek")} <ChevronDown size={13}/></span></div><div className="table-head"><span>{t("rank")}</span><span>{t("team")}</span><span>{t("members")}</span><span>{t("streak")}</span><span>{t("score")}</span></div>{[{rank:"01",team:"Strategy & Ops",initials:"SK",color:"blue",people:8,streak:language === "es" ? "12.4 días" : "12.4 days",score:"2,840",trend:"up"},{rank:"02",team:t("yourProgress"),initials:"AM",color:"peach",people:1,streak:`${progress.streak} ${t("days")}`,score:formattedXp,trend:"up",you:true},{rank:"03",team:"Product Design",initials:"PD",color:"lilac",people:6,streak:language === "es" ? "7.2 días" : "7.2 days",score:"1,920",trend:"up"},{rank:"04",team:"Customer Success",initials:"CS",color:"sage",people:11,streak:language === "es" ? "5.8 días" : "5.8 days",score:"1,640",trend:"down"},{rank:"05",team:"Engineering",initials:"EN",color:"gold",people:14,streak:language === "es" ? "4.1 días" : "4.1 days",score:"1,280",trend:"up"}].map((team)=><div className={`leader-table-row ${team.you?"leader-you":""}`} key={team.rank}><span className={`table-rank ${team.rank==="01"?"top-rank":""}`}>{team.rank==="01"?<Trophy size={15}/>:team.rank}</span><span className="table-team"><Avatar initials={team.initials} color={team.color} size="small"/><strong>{team.team}{team.you&&<i>{t("you")}</i>}</strong></span><span className="table-muted">{t("people", { count: team.people })}</span><span className="table-streak"><Flame size={13}/>{team.streak}</span><span className="table-score">{team.score} XP {team.trend==="up"?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>}</span></div>)}<div className="leaderboard-foot"><span>{t("howPointsCalculated")}</span><button onClick={()=>setToast(t("pointsToast"))}>{t("howPoints")} <CircleHelp size={14}/></button></div></div>
            </div>
          )}
          <footer className="page-footer"><Logo/><span>{t("footerTagline")}</span><span>{t("footerMadeBy", { year: new Date().getFullYear() })}</span></footer>
        </div>
      </main>
      {howOpen && (
        <div className="quick-guide-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setHowOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setHowOpen(false); }}>
          <section className="quick-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-guide-title">
            <header className="quick-guide-heading"><span className="mini-lesson-icon"><BookOpen size={18} /></span><div><span className="section-kicker">VERBALOOP · 01</span><h2 id="quick-guide-title">{t("guideTitle")}</h2><p>{t("guideIntro")}</p></div><button ref={howCloseRef} className="verba-guide-close" type="button" aria-label={t("guideClose")} onClick={() => setHowOpen(false)}><X size={18}/></button></header>
            <div className="quick-guide-steps">
              <article><span className="quick-guide-number">01</span><div><h3>{t("guideShuffleTitle")}</h3><p>{t("guideShuffleText")}</p></div></article>
              <article><span className="quick-guide-number">02</span><div><h3>{t("guideMatchTitle")}</h3><p>{t("guideMatchText")}</p></div></article>
              <article><span className="quick-guide-number">03</span><div><h3>{t("guideFillTitle")}</h3><p>{t("guideFillText")}</p></div></article>
              <article><span className="quick-guide-number">04</span><div><h3>{t("guideStepTitle")}</h3><p>{t("guideStepText")}</p></div></article>
              <article><span className="quick-guide-number"><Lightbulb size={15}/></span><div><h3>{t("guideHintTitle")}</h3><p>{t("guideHintText")}</p></div></article>
            </div>
            <button className="quick-guide-start" type="button" onClick={() => setHowOpen(false)}>{t("check")} <ArrowRight size={15}/></button>
          </section>
        </div>
      )}
      {toast && <div className="toast-message" role="status"><span className="toast-mark"><Check size={14}/></span>{toast}<button onClick={()=>setToast("")} aria-label={t("closeMenu")}><X size={14}/></button></div>}
      <VerbaGuide context={guideContext} language={language} />
    </div>
  );
}
