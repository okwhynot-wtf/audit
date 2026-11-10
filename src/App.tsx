import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Download, FileText, Info, Leaf, LockKeyhole, RotateCcw, Share2, ShieldCheck, X } from "lucide-react";
import { Answers, FORMS, Option, Selection, formIds, questionsFor, reportSummary, setAnswer, total } from "./instruments";
import { createReport, loadPdf } from "./report";

export default function Home() {
  const [selection, setSelection] = useState<Selection>("both");
  const [stage, setStage] = useState<"start" | "questions" | "review">("start");
  const [reference, setReference] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"privacy" | "drinks" | "drugs" | "sources" | "reset" | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questions = useMemo(() => questionsFor(selection), [selection]);
  const q = questions[index];
  const completed = questions.filter(item => answers[item.id]).length;
  const activeIds = formIds(selection);
  const summary = date ? reportSummary(selection, answers, reference, date) : "";

  useEffect(() => {
    const form = new URLSearchParams(window.location.search).get("forms");
    if (form === "audit" || form === "dudit" || form === "both") setSelection(form);
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, []);
  useEffect(() => { if (stage !== "start") heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "instant" }); }, [index, stage]);
  useEffect(() => { if (modal) dialog.current?.showModal(); else dialog.current?.close(); }, [modal]);
  useEffect(() => {
    if (stage !== "questions") return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [stage]);
  useEffect(() => {
    if (stage !== "review" || !date) return;
    let cancelled = false;
    setFile(null);
    loadPdf().then(lib => createReport({ selection, answers, reference, date }, lib)).then(bytes => {
      if (!cancelled) setFile(new File([new Uint8Array(bytes)], `AOD-check-in-${date.slice(0, 10)}.pdf`, { type: "application/pdf" }));
    }).catch(error => { if (!cancelled) setNotice(error instanceof Error ? error.message : "PDF creation failed. Please try again."); });
    return () => { cancelled = true; };
  }, [stage, selection, answers, reference, date]);

  function next(nextAnswers = answers, from = index) {
    const nextIndex = questions.findIndex((item, i) => i > from && !nextAnswers[item.id]?.skipped);
    if (nextIndex >= 0) setIndex(nextIndex);
    else { setDate(new Date().toISOString()); setStage("review"); }
  }
  function choose(option: Option) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    const updated = setAnswer(answers, q, option);
    setAnswers(updated);
    advanceTimer.current = setTimeout(() => {
      const incomplete = questions.findIndex(item => !updated[item.id]);
      if (editing && incomplete === -1) { setDate(new Date().toISOString()); setStage("review"); setEditing(false); }
      else { setEditing(false); next(updated); }
      setBusy(false); busyRef.current = false;
    }, 260);
  }
  function back() {
    if (busyRef.current) return;
    if (editing) { setEditing(false); setStage("review"); return; }
    const previous = questions.map((item, i) => ({ item, i })).filter(({ item, i }) => i < index && !answers[item.id]?.skipped).at(-1);
    if (previous) setIndex(previous.i); else setStage("start");
  }
  function start() {
    const firstMissing = questions.findIndex(item => !answers[item.id]);
    if (firstMissing === -1) { setStage("review"); return; }
    setIndex(firstMissing); setStage("questions"); setNotice("");
  }
  function reset() {
    setAnswers({}); setReference(""); setIndex(0); setStage("start"); setFile(null); setDate(""); setNotice(""); setEditing(false); setModal(null);
  }
  function download() {
    if (!file) return;
    const url = URL.createObjectURL(file), a = document.createElement("a");
    a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    setNotice("PDF download started. It has not been emailed. Check your downloads if it does not open.");
  }
  async function share() {
    if (!file) return;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "AOD check-in report" });
        setNotice("Report handed to your chosen app. Complete sending there; this page cannot confirm email delivery.");
      } else {
        download(); setNotice("File sharing is not available in this browser. Your PDF has been downloaded; attach it in your email app.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setNotice("Sharing could not open. Use Download PDF, then attach it in your email app.");
    }
  }
  async function copySummary() {
    try { await navigator.clipboard.writeText(summary); setNotice("Summary copied. It has not been sent or filed in a clinical record."); }
    catch { setNotice("Copy is unavailable in this browser. Select the summary text below to copy it."); }
  }

  return <div className="app-shell">
    <header className="site-header"><a href="/" className="brand" aria-label="Check-in home" onClick={event => { event.preventDefault(); if (Object.keys(answers).length) setModal("reset"); else setStage("start"); }}><span className="brand-mark"><Leaf size={23} strokeWidth={1.7}/></span>check-in<span className="brand-dot">.</span></a><span className="prototype"><span/>Working prototype</span></header>
    <main className={`main ${stage}`}>
      {stage === "start" && <>
        <div className="start-card">
          <h1 className="card-label">What are we checking in on?</h1>
          <div className="form-choices" role="group" aria-label="Choose questionnaires">{([
            ["audit", "Alcohol", "AUDIT · 10 questions"], ["dudit", "Other drugs", "DUDIT · 11 questions"], ["both", "Both", "AUDIT + DUDIT"],
          ] as const).map(([id, title, detail]) => <button key={id} aria-pressed={selection === id} className={`form-choice ${selection === id ? "selected" : ""}`} onClick={() => { if (selection !== id) { setAnswers({}); setDate(""); } setSelection(id); }}><span className="choice-circle">{selection === id && <Check size={13}/>}</span><span><strong>{title}</strong><small>{detail}</small></span></button>)}</div>
          <details className="reference"><summary>Add a session reference <span>optional</span><ChevronDown size={14}/></summary><label htmlFor="reference">Use a sample code for this prototype</label><input id="reference" value={reference} maxLength={60} autoComplete="off" placeholder="e.g. DEMO-104" onChange={e => setReference(e.target.value)}/></details>
          <button className="primary start-button" onClick={start}>Let’s begin <ArrowRight size={19}/></button>
          <p className="time-note">{selection === "both" ? "21 questions" : selection === "audit" ? "10 questions" : "11 questions"} · No account needed</p>
        </div>
        <div className="reassurance"><span><Check size={15}/>Tap an answer to move on</span><span><RotateCcw size={14}/>Go back any time</span></div>
        <div className="preview-note"><Info size={17}/><p><strong>Try it with sample responses.</strong> This prototype creates a PDF on your device. Nothing is emailed automatically.</p></div>
      </>}

      {stage === "questions" && <section className="question-flow" aria-label="Questionnaire">
        <div className="flow-top"><button className="text-button" disabled={busy} onClick={back}><ArrowLeft size={17}/>{editing ? "Review" : "Back"}</button><span>{FORMS[q.form].name}<span className="flow-dot">·</span>{q.number} of {FORMS[q.form].questions.length}</span><button className="icon-button" aria-label="About your responses" onClick={() => setModal("privacy")}><LockKeyhole size={16}/></button></div>
        <div className="progress-track" role="progressbar" aria-label="Questionnaire progress" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={completed}><div style={{ width: `${completed / questions.length * 100}%` }}/></div>
        <div className="section-label"><span className="section-dot"/>{q.form === "audit" ? "ALCOHOL CHECK-IN" : "OTHER DRUGS CHECK-IN"}</div>
        <p className="timeframe">Think about the past year, unless the question says otherwise.</p>
        <h1 ref={heading} tabIndex={-1} className="question-title">{q.text}</h1>
        {q.form === "audit" && q.number <= 3 && <button className="help-link" onClick={() => setModal("drinks")}><Info size={15}/>What counts as a standard drink?</button>}
        {q.form === "dudit" && q.number === 1 && <><p className="drug-note">Do not count alcohol or medicines taken as prescribed.</p><button className="help-link" onClick={() => setModal("drugs")}><Info size={15}/>Which drugs should I include?</button></>}
        <div className="answers" role="group" aria-label="Choose your answer">{q.options.map(option => <button key={`${q.id}-${option.score}`} disabled={busy} className={`answer ${answers[q.id]?.score === option.score ? "chosen" : ""}`} aria-pressed={answers[q.id]?.score === option.score} onClick={() => choose(option)}><span>{option.label}</span><span className="answer-indicator">{answers[q.id]?.score === option.score ? <Check size={17}/> : <ArrowRight size={16}/>}</span></button>)}</div>
        <div className="flow-footer"><span><Check size={14}/>Your answer takes you to the next question</span>{answers[q.id] && !busy && <button className="text-button" onClick={() => next()}>Next<ArrowRight size={15}/></button>}</div>
        {selection === "both" && <div className="form-stepper"><span className={q.form === "audit" ? "active" : "done"}>{q.form === "dudit" ? <Check size={12}/> : "1"} Alcohol</span><span className="step-line"/><span className={q.form === "dudit" ? "active" : ""}>2 Other drugs</span></div>}
      </section>}

      {stage === "review" && <section className="review-flow">
        <div className="complete-icon"><Check size={30} strokeWidth={1.7}/></div><p className="eyebrow">CHECK-IN COMPLETE</p><h1 ref={heading} tabIndex={-1}>Thanks for checking in.</h1><p className="intro-copy">Your responses are ready to review together.<br/>Download or share a copy with your clinician.</p>
        <div className="score-grid">{activeIds.map(id => <div className="score-card" key={id}><span>{FORMS[id].name}</span><strong>{total(id, answers)}<small> / {FORMS[id].max}</small></strong><p>{id === "audit" ? "Alcohol screening" : "Other drugs screening"}</p></div>)}</div><p className="score-note">Screening scores support a conversation with your clinician. They do not establish a diagnosis.</p>
        <div className="export-card"><div className="export-heading"><FileText size={22}/><div><h2>Your report</h2><p>All responses, scores and completion date</p></div><span className="pdf-badge">PDF</span></div><button className="primary" disabled={!file} onClick={share}><Share2 size={18}/>{file ? "Share PDF" : "Preparing your PDF…"}</button><button className="secondary" disabled={!file} onClick={download}><Download size={17}/>Download PDF</button><p className="export-note">Choose your email app from the share menu, then send.<br/>Automatic email delivery is not connected.</p></div>
        {notice && <p className="notice" role="status">{notice}</p>}
        <details className="review-answers"><summary>Review or change your answers <ChevronDown size={17}/></summary>{activeIds.map(id => <div key={id} className="answer-section"><h3>{FORMS[id].name}</h3>{FORMS[id].questions.map(item => <div className="review-row" key={item.id}><div><p>{item.number}. {item.text}</p><strong>{answers[item.id]?.label ?? "Not answered"}</strong></div>{!answers[item.id]?.skipped && <button className="edit-button" aria-label={`Change ${FORMS[id].name} question ${item.number}`} onClick={() => { setIndex(questions.findIndex(x => x.id === item.id)); setEditing(true); setStage("questions"); setNotice(""); }}>Change</button>}</div>)}</div>)}</details>
        <details className="summary-details"><summary>Clinical summary <ChevronDown size={17}/></summary><p>{summary}</p><button className="text-button" onClick={copySummary}>Copy summary</button></details>
        <button className="restart-button" onClick={() => setModal("reset")}><RotateCcw size={15}/>Clear responses & start again</button>
      </section>}
    </main>
    <footer className="site-footer"><span><ShieldCheck size={14}/>Responses stay on this page until you share</span><div><button onClick={() => setModal("privacy")}>Privacy</button><span>·</span><button onClick={() => setModal("sources")}>About the tools</button></div></footer>
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); setModal(null); }} onClick={event => { if (event.target === dialog.current) setModal(null); }}><div className="dialog-inner"><button className="dialog-close icon-button" onClick={() => setModal(null)} aria-label="Close"><X size={21}/></button>
      {modal === "privacy" && <><LockKeyhole className="modal-icon"/><h2>Your responses, your choice.</h2><p>This prototype holds your answers in this open page only. It does not save answers to a database, browser storage or an email service.</p><p>Refreshing or closing the page clears your answers. Downloading or sharing creates a separate PDF copy that may remain on your device or in the app you choose.</p><p>No automatic email is sent. Use sample responses while the service’s privacy and clinical arrangements are being established.</p></>}
      {modal === "drinks" && <><Info className="modal-icon"/><h2>Count standard drinks.</h2><p>In Australia, one standard drink contains 10 grams of alcohol. A glass, can or bottle can contain more than one standard drink.</p><p>Check the “standard drinks” number on the label. Use that number when answering the alcohol questions.</p><p>If you’re unsure, your clinician can help you estimate it.</p></>}
      {modal === "drugs" && <><Info className="modal-icon"/><h2>Drugs other than alcohol.</h2><p>This includes cannabis, amphetamines, methamphetamine, cocaine, heroin and other opioids, ecstasy/MDMA, hallucinogens, GHB and inhalants.</p><p>Include medicines taken without a prescription or in a greater amount or more often than prescribed. Do not count medicines you take exactly as prescribed.</p><p>The original DUDIT drug list is available under “About the tools”. Ask your clinician if you are unsure what to include.</p></>}
      {modal === "sources" && <><Leaf className="modal-icon"/><h2>About the questionnaires.</h2><h3>AUDIT</h3><p>World Health Organization, 2001. Standard 10-question English version, score 0–40. If “Never” is selected in question 1, questions 2–8 are routed past and scored zero; that routing is recorded in the report.</p><a href="https://www.who.int/publications/i/item/WHO-MSD-MSB-01.6a" target="_blank" rel="noreferrer">WHO instrument and manual ↗</a><h3>DUDIT</h3><p>Europe English version 1. © 2002 Anne H. Berman, Hans Bergman, Tom Palmstierna & Frans Schlyter, Karolinska Institutet. 11 questions, score 0–44. No questions are automatically skipped.</p><a href="https://www.euda.europa.eu/system/files/media/attachments/documents/12173/DUDIT-English-version.pdf" target="_blank" rel="noreferrer">Original form and drug list ↗</a><p className="small">The app is an interface prototype, not an approved NSW Health system. Local instrument versions, reproduction permissions, clinical use and data handling need confirmation before patient use.</p></>}
      {modal === "reset" && <><RotateCcw className="modal-icon"/><h2>Clear this check-in?</h2><p>This will remove your answers from the page. Any PDF you already downloaded or shared will remain in its destination.</p><button className="primary" onClick={reset}>Clear & start again</button><button className="secondary" onClick={() => setModal(null)}>Keep my responses</button></>}
      {modal !== "reset" && <button className="primary modal-done" onClick={() => setModal(null)}>Got it</button>}
    </div></dialog>
  </div>;
}
