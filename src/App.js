import { useState, useEffect, useRef } from "react";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

const CURRICULUM = {
  A1: [
    { id:"a1-1", title:"Greetings & Introductions", icon:"👋", desc:"Hallo, Guten Morgen, names" },
    { id:"a1-2", title:"Numbers & Dates", icon:"🔢", desc:"1–100, days, months" },
    { id:"a1-3", title:"Basic Nouns & Articles", icon:"📖", desc:"der/die/das, plural forms" },
    { id:"a1-4", title:"Colours & Objects", icon:"🎨", desc:"Hospital objects vocabulary" },
    { id:"a1-5", title:"Simple Sentences", icon:"💬", desc:"Subject + verb structure" },
  ],
  A2: [
    { id:"a2-1", title:"Present Tense Verbs", icon:"⚡", desc:"Regular & irregular verbs" },
    { id:"a2-2", title:"Questions & Answers", icon:"❓", desc:"W-questions, yes/no" },
    { id:"a2-3", title:"Directions & Locations", icon:"🗺️", desc:"Hospital navigation" },
    { id:"a2-4", title:"Daily Routines", icon:"🕐", desc:"Telling time, schedules" },
    { id:"a2-5", title:"Basic Medical Vocab", icon:"🏥", desc:"Body parts, symptoms" },
  ],
  B1: [
    { id:"b1-1", title:"Past Tense (Perfekt)", icon:"⏪", desc:"haben/sein + Partizip II" },
    { id:"b1-2", title:"Modal Verbs", icon:"🎯", desc:"müssen, können, dürfen" },
    { id:"b1-3", title:"Patient Communication", icon:"🤝", desc:"Explaining procedures" },
    { id:"b1-4", title:"Medical Documentation", icon:"📋", desc:"Writing patient notes" },
    { id:"b1-5", title:"Healthcare System", icon:"🏛️", desc:"German hospital structure" },
  ],
  B2: [
    { id:"b2-1", title:"Subjunctive Mood", icon:"🧩", desc:"Konjunktiv II usage" },
    { id:"b2-2", title:"Complex Sentences", icon:"🔗", desc:"Subordinate clauses" },
    { id:"b2-3", title:"Professional Discussions", icon:"💼", desc:"Team meetings, handovers" },
    { id:"b2-4", title:"Emergency Language", icon:"🚨", desc:"Critical care communication" },
    { id:"b2-5", title:"Interview Preparation", icon:"🎤", desc:"German hospital interviews" },
  ],
};

const LEVELS = ["A1","A2","B1","B2"];

// 10 questions — scored out of 10
// 9–10 correct → B1 | 7–8 → A2 | 5–6 → A1 | <5 → Beginner
const PLACEMENT_QS = [
  { q:"What does 'Guten Morgen' mean?", opts:["Good night","Good morning","Good evening","Goodbye"], ans:"Good morning" },
  { q:"Which article goes with 'Krankenhaus' (hospital)?", opts:["der","die","das","den"], ans:"das" },
  { q:"Complete: Ich ___ Krankenschwester. (I am a nurse)", opts:["bin","bist","ist","sind"], ans:"bin" },
  { q:"What does 'Bitte' mean?", opts:["Thank you","Sorry","Please","Goodbye"], ans:"Please" },
  { q:"What is 'Wie geht es Ihnen?' in English?", opts:["Where are you?","How are you?","Who are you?","What do you want?"], ans:"How are you?" },
  { q:"Choose the correct word: Die Patientin hat ___. (headache)", opts:["Fieber","Kopfschmerzen","Husten","Schwindel"], ans:"Kopfschmerzen" },
  { q:"Which sentence uses correct word order?", opts:["Ich arbeite heute im Krankenhaus","Ich heute arbeite im Krankenhaus","Heute ich arbeite im Krankenhaus","Im Krankenhaus ich arbeite heute"], ans:"Ich arbeite heute im Krankenhaus" },
  { q:"Which sentence is in the correct Perfekt (past) tense?", opts:["Ich habe gegessen","Ich bin gegessen","Ich hatte essen","Ich habe essen"], ans:"Ich habe gegessen" },
  { q:"'Der Patient klagt über Schmerzen' means:", opts:["The patient has no pain","The patient complains of pain","The patient is sleeping","The patient is discharged"], ans:"The patient complains of pain" },
  { q:"Correct modal verb — Der Arzt ___ das Rezept ausstellen. (must)", opts:["kann","darf","muss","soll"], ans:"muss" },
];

async function callClaude(messages, system, maxTokens = 2000) {
  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("API error:", res.status, err);
      return "Sorry, there was an error connecting to the AI. Please try again.";
    }
    const data = await res.json();
    return data.content?.map(b => b.text || "").join("") || "Sorry, could not respond.";
  } catch (e) {
    console.error("Fetch error:", e);
    return "Sorry, could not connect. Please check your internet connection.";
  }
}

  return `You are "Luca", a warm German tutor for Global Careers by Testbook. Student: ${user.name}, a nurse learning German to work in Germany. Level: ${user.level}.${topic ? ` Current topic: ${topic}.` : ""}

Formatting rules — follow these strictly:
- Use ## for section headings (e.g. ## Basic Greetings)
- Use **word** to highlight German words or key terms
- Use _text_ for grammar notes or translations in italics
- Use bullet points (- item) for vocabulary lists
- Use numbered lists (1. item) for step-by-step instructions
- Keep paragraphs short — max 3 sentences each
- Never use raw # or ## as the very first character of a message — always add a line break before headings
- Do NOT write headings and content all in one run-on paragraph

Teach step by step. Relate all examples to hospital/nursing context. Be warm and encouraging.`;
}

const S = {
  root: { fontFamily:"'DM Sans',sans-serif", height:"100vh", maxHeight:"100vh", display:"flex", flexDirection:"column", background:"#f5f0e8", color:"#1a1a2e", overflow:"hidden", position:"fixed", top:0, left:0, right:0, bottom:0 },
  header: { padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #e8d5a3", background:"rgba(245,240,232,0.95)", position:"sticky", top:0, zIndex:100 },
  logoMark: { width:32, height:32, borderRadius:8, background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", color:"#c9a84c", fontWeight:700, fontSize:16 },
  logoText: { fontWeight:700, fontSize:15, color:"#1a1a2e", lineHeight:1.1 },
  logoSub: { fontSize:9, color:"#8fa3b1", letterSpacing:"0.08em", textTransform:"uppercase" },
  card: { background:"#fff", borderRadius:20, padding:40, maxWidth:460, width:"100%", boxShadow:"0 8px 40px rgba(26,26,46,0.12)", border:"1px solid #e8d5a3" },
  badge: { display:"inline-flex", alignItems:"center", gap:6, background:"#1a1a2e", color:"#c9a84c", borderRadius:20, padding:"5px 13px", fontSize:11, fontWeight:500, marginBottom:16 },
  h1: { fontWeight:700, fontSize:26, lineHeight:1.2, color:"#1a1a2e", marginBottom:8 },
  sub: { fontSize:13, color:"#8fa3b1", lineHeight:1.6, marginBottom:24 },
  label: { display:"block", fontSize:10, fontWeight:500, color:"#8fa3b1", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5 },
  input: { width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #ede8db", background:"#f5f0e8", fontSize:14, color:"#1a1a2e", outline:"none", fontFamily:"inherit", marginBottom:14 },
  btnPrimary: { width:"100%", padding:13, borderRadius:12, background:"#1a1a2e", color:"#c9a84c", fontSize:15, fontWeight:700, border:"none", cursor:"pointer" },
  btnGold: { padding:"10px 22px", borderRadius:10, background:"#1a1a2e", color:"#c9a84c", fontSize:14, fontWeight:700, border:"none", cursor:"pointer", marginTop:14 },
  navPill: (active) => ({ padding:"6px 12px", borderRadius:20, fontSize:12, fontWeight:500, border:`1px solid ${active?"#1a1a2e":"transparent"}`, cursor:"pointer", background:active?"#1a1a2e":"transparent", color:active?"#c9a84c":"#8fa3b1" }),
  chip: { display:"flex", alignItems:"center", gap:7, background:"#ede8db", borderRadius:20, padding:"4px 11px 4px 4px", fontSize:12, fontWeight:500 },
  avatar: { width:24, height:24, borderRadius:"50%", background:"#c9a84c", color:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 },
  main: { flex:1, display:"grid", gridTemplateColumns:"256px 1fr", overflow:"hidden", minHeight:0, height:0 },
  sidebar: { background:"#fff", borderRight:"1px solid #e8d5a3", padding:"16px 14px", overflowY:"auto", overflowX:"hidden", display:"flex", flexDirection:"column", gap:14, minHeight:0 },
  secTitle: { fontSize:9, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:"#8fa3b1", marginBottom:6 },
  statGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 },
  statCard: { background:"#f5f0e8", borderRadius:10, padding:10, border:"1px solid #ede8db" },
  statNum: { fontWeight:700, fontSize:18, color:"#1a1a2e" },
  statLbl: { fontSize:10, color:"#8fa3b1", marginTop:2 },
  pOption: (state) => ({
    padding:"11px 14px", borderRadius:10, border:`1.5px solid ${state==="correct"?"#6b8f71":state==="wrong"?"#c45c3a":"#ede8db"}`,
    background:state==="correct"?"#e8f5ea":state==="wrong"?"#fde8e3":"#f5f0e8",
    color:state==="correct"?"#2d5a32":state==="wrong"?"#7a2a1a":"#1a1a2e",
    fontSize:13.5, cursor:state?"default":"pointer", textAlign:"left", fontFamily:"inherit", width:"100%", marginBottom:7
  }),
  msgBubble: (isUser) => ({
    maxWidth:"68%", padding:"10px 14px", borderRadius:14,
    borderTopLeftRadius:isUser?14:4, borderTopRightRadius:isUser?4:14,
    background:isUser?"#1a1a2e":"#fff", color:isUser?"#e8d5a3":"#1a1a2e",
    border:isUser?"none":"1px solid #ede8db", fontSize:13, lineHeight:1.65
  }),
};

function ProgressRing({ pct }) {
  const r=34, c=2*Math.PI*r;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r={r} fill="none" stroke="#ede8db" strokeWidth="6"/>
      <circle cx="42" cy="42" r={r} fill="none" stroke="#c9a84c" strokeWidth="6"
        strokeDasharray={`${c*(pct/100)} ${c}`} strokeLinecap="round" transform="rotate(-90 42 42)"
        style={{transition:"stroke-dasharray 0.5s"}}/>
      <text x="42" y="47" textAnchor="middle" fill="#1a1a2e" style={{fontSize:15,fontWeight:700}}>{pct}%</text>
    </svg>
  );
}

const TIMER_SECONDS = 7;

function PlacementTest({ user, onComplete }) {
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef(null);

  // Start/reset timer whenever question changes
  useEffect(() => {
    if (result) return;
    setTimeLeft(TIMER_SECONDS);
    setTimedOut(false);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setTimedOut(true);
          setRevealed(true); // auto-reveal with no answer
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qi, result]);

  // Stop timer when answered
  useEffect(() => {
    if (sel) clearInterval(timerRef.current);
  }, [sel]);

  function pick(opt) {
    if (revealed) return;
    clearInterval(timerRef.current);
    setSel(opt);
    setRevealed(true);
  }

  function next() {
    const q = PLACEMENT_QS[qi];
    const newCount = correctCount + (sel === q.ans ? 1 : 0);
    const isLast = qi === PLACEMENT_QS.length - 1;
    if (isLast) {
      let level;
      if (newCount >= 9)      level = "B1";
      else if (newCount >= 7) level = "A2";
      else if (newCount >= 5) level = "A1";
      else                    level = "Beginner";
      setResult({ level, score: newCount });
    } else {
      setCorrectCount(newCount);
      setQi(qi+1);
      setSel(null);
      setRevealed(false);
    }
  }

  const pct = Math.round((qi / PLACEMENT_QS.length) * 100);
  const q = PLACEMENT_QS[qi];
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft <= 2 ? "#c45c3a" : timeLeft <= 4 ? "#c9a84c" : "#6b8f71";

  if (result) {
    const { level, score } = result;
    const isBegineer = level === "Beginner";
    const levelColor = level==="B1"?"#8fa3b1":level==="A2"?"#c9a84c":level==="A1"?"#6b8f71":"#c45c3a";
    const levelDesc = level==="B1"?"Intermediate — great foundation!":level==="A2"?"Elementary — you know the basics!":level==="A1"?"Beginner — let's build from here!":"Complete Beginner — we'll start from scratch!";
    return (
    <div style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:32,overflowY:"auto"}}>
      <div style={{...S.card, textAlign:"center", maxWidth:480}}>
        <div style={{fontSize:12,color:"#8fa3b1",marginBottom:12}}>Placement Test Complete</div>
        {/* Score pill */}
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#f5f0e8",borderRadius:30,padding:"8px 20px",marginBottom:16}}>
          <span style={{fontWeight:700,fontSize:22,color:"#1a1a2e"}}>{score}</span>
          <span style={{fontSize:14,color:"#8fa3b1"}}>/10 correct</span>
        </div>
        {/* Score bar */}
        <div style={{height:6,background:"#ede8db",borderRadius:4,marginBottom:20,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${score*10}%`,background:`linear-gradient(90deg,${levelColor},#c9a84c)`,borderRadius:4,transition:"width 0.6s"}}/>
        </div>
        {/* Level badge */}
        <div style={{fontSize:52,fontWeight:700,color:levelColor,lineHeight:1,marginBottom:6}}>{level}</div>
        <div style={{fontSize:13,color:"#8fa3b1",marginBottom:16}}>{levelDesc}</div>
        {/* Scoring key */}
        <div style={{background:"#f5f0e8",borderRadius:12,padding:"12px 16px",marginBottom:22,textAlign:"left"}}>
          <div style={{fontSize:10,fontWeight:600,color:"#8fa3b1",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>Scoring Guide</div>
          {[["9–10","B1","Intermediate"],["7–8","A2","Elementary"],["5–6","A1","Beginner"],["0–4","Beginner","Complete Beginner"]].map(([range, lv, lbl])=>(
            <div key={lv+range} style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
              <span style={{width:34,fontSize:11,fontWeight:700,color:lv===level?"#1a1a2e":"#c4b99a"}}>{range}</span>
              <span style={{fontSize:11,fontWeight:700,color:lv===level?levelColor:"#c4b99a",background:lv===level?"#fff":"transparent",borderRadius:5,padding:lv===level?"2px 7px":"0",border:lv===level?`1px solid ${levelColor}`:"none"}}>{lv}</span>
              <span style={{fontSize:11,color:lv===level?"#1a1a2e":"#c4b99a"}}>{lbl}</span>
              {lv===level && <span style={{marginLeft:"auto",fontSize:10,color:levelColor,fontWeight:600}}>← You</span>}
            </div>
          ))}
        </div>
        <div style={{fontSize:13,color:"#1a1a2e",lineHeight:1.65,marginBottom:22}}>
          You scored <strong>{score}/10</strong>. Your starting level is set to <strong style={{color:levelColor}}>{level}</strong>.<br/>
          Luca will personalise every lesson from here on.
        </div>
        <button style={S.btnPrimary} onClick={() => onComplete(isBegineer ? "A1" : level)}>
          Start Learning with Luca →
        </button>
      </div>
    </div>
  );}

  return (
    <div style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:32,overflowY:"auto"}}>
      <div style={{...S.card, maxWidth:540}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div style={{fontSize:10,color:"#8fa3b1",letterSpacing:"0.08em",textTransform:"uppercase"}}>
            Placement Test · {qi+1} of {PLACEMENT_QS.length}
          </div>
          {/* Timer circle */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{position:"relative",width:40,height:40}}>
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#ede8db" strokeWidth="4"/>
                <circle cx="20" cy="20" r="16" fill="none" stroke={timerColor} strokeWidth="4"
                  strokeDasharray={`${2*Math.PI*16*(timerPct/100)} ${2*Math.PI*16}`}
                  strokeLinecap="round" transform="rotate(-90 20 20)"
                  style={{transition:"stroke-dasharray 0.9s linear, stroke 0.3s"}}/>
              </svg>
              <div style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:timerColor}}>
                {timeLeft}
              </div>
            </div>
            {timedOut && !sel && (
              <span style={{fontSize:11,color:"#c45c3a",fontWeight:600}}>Time's up!</span>
            )}
          </div>
        </div>

        <div style={{fontWeight:700,fontSize:20,color:"#1a1a2e",marginBottom:4}}>Let's find your level</div>
        <div style={{fontSize:12,color:"#8fa3b1",marginBottom:14}}>Answer honestly — 7 seconds per question</div>

        {/* Progress bar */}
        <div style={{height:4,background:"#ede8db",borderRadius:4,marginBottom:6,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#c9a84c,#6b8f71)",borderRadius:4,transition:"width 0.4s"}}/>
        </div>
        {/* Timer bar */}
        <div style={{height:3,background:"#ede8db",borderRadius:4,marginBottom:18,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${timerPct}%`,background:timerColor,borderRadius:4,transition:"width 0.9s linear"}}/>
        </div>

        <div style={{fontSize:15,fontWeight:500,color:"#1a1a2e",marginBottom:14,lineHeight:1.5}}>{q.q}</div>
        {q.opts.map(opt => {
          const state = revealed ? (opt===q.ans?"correct":opt===sel?"wrong":null) : null;
          return (
            <button key={opt} style={S.pOption(state)} disabled={revealed} onClick={() => pick(opt)}>{opt}</button>
          );
        })}
        {revealed && (
          <>
            {timedOut && !sel && (
              <div style={{padding:"8px 12px",borderRadius:8,background:"#fde8e3",color:"#7a2a1a",fontSize:12,marginBottom:8}}>
                ⏰ Time's up! The correct answer was: <strong>{q.ans}</strong>
              </div>
            )}
            <button style={S.btnGold} onClick={next}>
              {qi < PLACEMENT_QS.length-1 ? "Next →" : "See my level →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}



const LEVEL_INFO = {
  A1: { label:"Complete Beginner", color:"#6b8f71", bg:"#e8f5ea" },
  A2: { label:"Elementary", color:"#c9a84c", bg:"rgba(201,168,76,0.12)" },
  B1: { label:"Intermediate", color:"#8fa3b1", bg:"rgba(143,163,177,0.12)" },
  B2: { label:"Upper Intermediate", color:"#c45c3a", bg:"#fde8e3" },
};

function ExercisePanel({ user, history, onBack, onDone, exerciseDoneAt }) {
  const [step, setStep] = useState("level");
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [exercises, setExercises] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [score, setScore] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  function speakText(text) {
    if (!text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE"; u.rate = 0.82;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  function pickLevel(lvl) { setSelectedLevel(lvl); setStep("topic"); }

  async function pickTopic(topic) {
    setSelectedTopic(topic);
    setStep("loading");
    setExercises(null); setAnswers({}); setRevealed({}); setCurrent(0); setScore(null);

    const prompt = `Generate exactly 20 German language exercises for nurses learning German to work in Germany.
Level: ${selectedLevel} | Topic: "${topic.title}" (${topic.desc})

IMPORTANT rules:
- ALL questions must use nursing/medical/hospital context
- Mix of question types: vocabulary, fill-in-blank, listening comprehension, patient dialogue, medical terms
- For LISTENING type questions: set "type":"listen" and put the German sentence/word to be spoken in "audioText" field
- For MCQ: set "type":"mcq"
- Make questions progressively harder (questions 1-7 easy, 8-14 medium, 15-20 hard)
- All 4 options must be plausible medical/nursing terms

Return ONLY a valid JSON array of exactly 20 objects, no markdown:
[
  {"type":"mcq","question":"What does 'die Spritze' mean?","options":["The bandage","The syringe","The tablet","The drip"],"answer":"The syringe","explanation":"Die Spritze = syringe, used for injections."},
  {"type":"listen","question":"Listen and choose what the nurse is saying to the patient:","audioText":"Bitte atmen Sie tief ein und aus.","options":["Please breathe deeply in and out.","Please open your mouth wide.","Please lie still on your back.","Please press the call button."],"answer":"Please breathe deeply in and out.","explanation":"Einatmen = breathe in, ausatmen = breathe out."}
]`;

    const raw = await callClaude([{role:"user",content:prompt}], "Return only valid JSON arrays of exactly 20 items. No markdown. No explanation.", 3000);
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setExercises(Array.isArray(parsed) ? parsed.slice(0,20) : parsed);
    } catch {
      setExercises([
        {type:"mcq",question:"What does 'der Blutdruck' mean?",options:["Heart rate","Blood pressure","Body temperature","Oxygen level"],answer:"Blood pressure",explanation:"Blutdruck = blood pressure. Blut = blood, Druck = pressure."},
        {type:"listen",question:"Listen and choose what the doctor is saying:",audioText:"Der Patient hat hohes Fieber.",options:["The patient has high fever.","The patient has low blood pressure.","The patient needs surgery.","The patient is discharged."],answer:"The patient has high fever.",explanation:"Hohes Fieber = high fever. A common phrase in hospital settings."}
      ]);
    }
    setStep("questions");
  }

  function answer(idx, opt) {
    if (revealed[idx]) return;
    setAnswers(a => ({...a,[idx]:opt}));
    setRevealed(r => ({...r,[idx]:true}));
  }

  function finish() {
    let c = 0;
    exercises.forEach((ex,i) => { if (answers[i] === ex.answer) c++; });
    const s = Math.round((c/exercises.length)*100);
    setScore({ pct: s, correct: c, total: exercises.length });
    onDone(s);
    setStep("score");
  }

  const wrap = (children) => (
    <div style={{flex:1,padding:26,overflowY:"auto",overflowX:"hidden",background:"#f5f0e8",minHeight:0}}>
      {children}
    </div>
  );

  // ── Step 1: Level ──
  if (step === "level") return wrap(<>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
      <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#8fa3b1"}}>←</button>
      <div style={{fontWeight:700,fontSize:21,color:"#1a1a2e"}}>Daily Exercise</div>
    </div>
    <div style={{fontSize:13,color:"#8fa3b1",marginBottom:20}}>Choose a level — you can practise any level, not just your current one</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {LEVELS.map(lvl => {
        const info = LEVEL_INFO[lvl];
        const isCurrent = lvl === user.level;
        return (
          <button key={lvl} onClick={() => pickLevel(lvl)}
            style={{background:"#fff",borderRadius:14,padding:18,border:`2px solid ${isCurrent?"#c9a84c":"#e8d5a3"}`,cursor:"pointer",textAlign:"left",boxShadow:isCurrent?"0 4px 16px rgba(201,168,76,0.15)":"0 2px 8px rgba(26,26,46,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontWeight:700,fontSize:26,color:info.color}}>{lvl}</div>
              {isCurrent && <span style={{fontSize:10,background:info.bg,color:info.color,padding:"3px 8px",borderRadius:6,fontWeight:600}}>Your Level</span>}
            </div>
            <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e",marginBottom:6}}>{info.label}</div>
            <div style={{fontSize:11,color:"#8fa3b1"}}>{CURRICULUM[lvl].map(t=>t.title).join(" · ")}</div>
            <div style={{marginTop:12,padding:"7px 0",borderTop:"1px solid #ede8db",fontSize:12,color:info.color,fontWeight:600}}>Select →</div>
          </button>
        );
      })}
    </div>
  </>);

  // ── Step 2: Topic ──
  if (step === "topic") return wrap(<>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
      <button onClick={() => setStep("level")} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#8fa3b1"}}>←</button>
      <div style={{fontWeight:700,fontSize:21,color:"#1a1a2e"}}>Choose a Topic</div>
      <span style={{fontSize:11,background:LEVEL_INFO[selectedLevel].bg,color:LEVEL_INFO[selectedLevel].color,padding:"3px 9px",borderRadius:7,fontWeight:600}}>{selectedLevel}</span>
    </div>
    <div style={{fontSize:13,color:"#8fa3b1",marginBottom:20}}>20 nursing-focused questions per topic · Mix of MCQ + Listening</div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {CURRICULUM[selectedLevel].map(topic => (
        <button key={topic.id} onClick={() => pickTopic(topic)}
          style={{background:"#fff",borderRadius:13,padding:"15px 16px",border:"1.5px solid #ede8db",display:"flex",alignItems:"center",gap:14,cursor:"pointer",textAlign:"left"}}>
          <div style={{width:42,height:42,borderRadius:10,background:LEVEL_INFO[selectedLevel].bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{topic.icon}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:"#1a1a2e",marginBottom:2}}>{topic.title}</div>
            <div style={{fontSize:11,color:"#8fa3b1"}}>{topic.desc}</div>
          </div>
          <div style={{fontSize:18,color:LEVEL_INFO[selectedLevel].color}}>→</div>
        </button>
      ))}
    </div>
  </>);

  // ── Loading ──
  if (step === "loading") return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",minHeight:0}}>
      <div style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:36,marginBottom:12}}>✨</div>
        <div style={{fontWeight:700,fontSize:17,color:"#1a1a2e"}}>Building your exercise set…</div>
        <div style={{fontSize:12,color:"#8fa3b1",marginTop:6}}>{selectedLevel} · {selectedTopic?.title}</div>
        <div style={{fontSize:11,color:"#8fa3b1",marginTop:4}}>Generating 20 nursing-focused questions</div>
      </div>
    </div>
  );

  // ── Score ──
  if (step === "score") return wrap(
    <div style={{background:"linear-gradient(135deg,#1a1a2e,#2d2d4e)",borderRadius:16,padding:30,textAlign:"center",color:"white"}}>
      <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:4}}>{selectedLevel} · {selectedTopic?.title}</div>
      <div style={{fontWeight:700,fontSize:52,color:"#c9a84c",lineHeight:1,marginTop:4}}>{score.pct}%</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginTop:4}}>{score.correct} / {score.total} correct</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.75)",marginTop:14,lineHeight:1.6}}>
        {score.pct>=80?"🎉 Ausgezeichnet! You've mastered this topic!":score.pct>=50?"👏 Gut gemacht! A bit more practice and you'll nail it.":"💪 Keep going! Revisit with Luca for extra help."}
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:22}}>
        <button style={{padding:"9px 18px",borderRadius:9,background:"#c9a84c",color:"#1a1a2e",fontWeight:700,fontSize:13,border:"none",cursor:"pointer"}}
          onClick={() => { setStep("level"); setSelectedLevel(null); setSelectedTopic(null); }}>Try Another Topic</button>
        <button style={{padding:"9px 18px",borderRadius:9,background:"rgba(255,255,255,0.1)",color:"white",fontWeight:700,fontSize:13,border:"1px solid rgba(255,255,255,0.2)",cursor:"pointer"}}
          onClick={onBack}>Chat with Luca</button>
      </div>
    </div>
  );

  // ── Questions ──
  if (step !== "questions" || !exercises) return null;
  const ex = exercises[current];
  const isAnswered = revealed[current];
  const isCorrect = answers[current] === ex?.answer;
  const progress = Math.round((Object.keys(revealed).length / exercises.length) * 100);
  const allDone = Object.keys(revealed).length === exercises.length;

  return wrap(<>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
      <button onClick={() => setStep("topic")} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#8fa3b1"}}>←</button>
      <div style={{fontWeight:700,fontSize:18,color:"#1a1a2e"}}>{selectedTopic?.icon} {selectedTopic?.title}</div>
      <span style={{fontSize:11,background:LEVEL_INFO[selectedLevel].bg,color:LEVEL_INFO[selectedLevel].color,padding:"3px 8px",borderRadius:7,fontWeight:600,marginLeft:"auto"}}>{selectedLevel}</span>
    </div>

    {/* Progress */}
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
      <div style={{height:5,flex:1,background:"#ede8db",borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#c9a84c,#6b8f71)",borderRadius:4,transition:"width 0.4s"}}/>
      </div>
      <span style={{fontSize:12,color:"#8fa3b1",whiteSpace:"nowrap"}}>{current+1} / {exercises.length}</span>
    </div>

    {/* Question card */}
    {ex && (
      <div style={{background:"#fff",borderRadius:14,padding:20,border:"1px solid #e8d5a3",marginBottom:12,boxShadow:"0 2px 10px rgba(26,26,46,0.08)"}}>
        {/* Listening badge */}
        {ex.type === "listen" && (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{fontSize:10,background:"#e3f2fd",color:"#1565c0",padding:"3px 10px",borderRadius:6,fontWeight:600,letterSpacing:"0.05em"}}>🎧 LISTENING</span>
            <button onClick={() => speakText(ex.audioText)}
              style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,background:speaking?"#1a1a2e":"#c9a84c",color:speaking?"#c9a84c":"#1a1a2e",fontWeight:700,fontSize:12,border:"none",cursor:"pointer"}}>
              {speaking ? "🔊 Playing…" : "▶ Play Audio"}
            </button>
          </div>
        )}
        <div style={{fontSize:14,fontWeight:500,color:"#1a1a2e",marginBottom:14,lineHeight:1.6}}>
          Q{current+1}. {ex.question}
        </div>
        {ex.options.map(opt => {
          const state = isAnswered ? (opt===ex.answer?"correct":opt===answers[current]?"wrong":null) : null;
          return (
            <button key={opt} style={S.pOption(state)} disabled={isAnswered}
              onClick={() => answer(current, opt)}>{opt}</button>
          );
        })}
        {isAnswered && (
          <div style={{marginTop:10,padding:"10px 14px",borderRadius:9,background:isCorrect?"#e8f5ea":"#fde8e3",color:isCorrect?"#2d5a32":"#7a2a1a",fontSize:12,lineHeight:1.6}}>
            {isCorrect ? "✓ Correct! " : `✗ Answer: ${ex.answer}. `}{ex.explanation}
          </div>
        )}
      </div>
    )}

    {/* Navigation */}
    <div style={{display:"flex",gap:10,marginTop:8}}>
      {current > 0 && (
        <button onClick={() => setCurrent(c => c-1)}
          style={{padding:"10px 18px",borderRadius:10,background:"#fff",border:"1.5px solid #e8d5a3",color:"#8fa3b1",fontWeight:600,fontSize:13,cursor:"pointer"}}>← Prev</button>
      )}
      {current < exercises.length-1 && (
        <button onClick={() => setCurrent(c => c+1)}
          style={{flex:1,padding:"10px 18px",borderRadius:10,background:"#1a1a2e",color:"#c9a84c",fontWeight:700,fontSize:13,border:"none",cursor:"pointer"}}>Next →</button>
      )}
      {allDone && current === exercises.length-1 && (
        <button onClick={finish}
          style={{flex:1,padding:"10px 18px",borderRadius:10,background:"linear-gradient(90deg,#c9a84c,#6b8f71)",color:"#1a1a2e",fontWeight:700,fontSize:13,border:"none",cursor:"pointer"}}>See my score →</button>
      )}
    </div>

    {/* Question dots */}
    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:16}}>
      {exercises.map((_,i) => (
        <button key={i} onClick={() => setCurrent(i)}
          style={{width:26,height:26,borderRadius:6,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",
            background: i===current?"#1a1a2e": revealed[i]?(answers[i]===exercises[i].answer?"#6b8f71":"#c45c3a"):"#ede8db",
            color: i===current?"#c9a84c": revealed[i]?"#fff":"#8a8a9a"}}>
          {i+1}
        </button>
      ))}
    </div>
  </>);
}

function Dashboard({ user, progress, messages, completedTopics, onStartLesson, onGoToChat, onGoToExercise, exerciseReady }) {
  const total = Object.values(CURRICULUM).flat().length;
  const pct = Math.round((completedTopics.length/total)*100);
  let next = null;
  for (const lvl of LEVELS) {
    for (const t of CURRICULUM[lvl]) {
      if (!completedTopics.includes(t.id)) { next={...t,lvl}; break; }
    }
    if (next) break;
  }
  return (
    <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:26,minHeight:0}}>
      <div style={{fontWeight:700,fontSize:23,color:"#1a1a2e",marginBottom:4}}>
        Willkommen, <span style={{color:"#c9a84c",fontStyle:"italic"}}>{user.name.split(" ")[0]}</span> 👋
      </div>
      <div style={{fontSize:12,color:"#8fa3b1",marginBottom:20}}>Roll No: {user.rollNumber} · Level {user.level} · Keep going, Germany awaits!</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[["🔥",progress.streak,"Day streak"],["📚",`${completedTopics.length}/${total}`,"Topics done"],["🎯",progress.avgScore?`${progress.avgScore}%`:"—","Avg score"]].map(([icon,val,lbl]) => (
          <div key={lbl} style={{background:"#fff",borderRadius:14,padding:15,border:"1px solid #e8d5a3",boxShadow:"0 2px 8px rgba(26,26,46,0.08)"}}>
            <div style={{fontSize:20,marginBottom:6}}>{icon}</div>
            <div style={{fontWeight:700,fontSize:24,color:"#1a1a2e"}}>{val}</div>
            <div style={{fontSize:10,color:"#8fa3b1",marginTop:2}}>{lbl}</div>
          </div>
        ))}
      </div>

      {next && (
        <button style={{background:"linear-gradient(135deg,#1a1a2e,#2d2d4e)",borderRadius:14,padding:"18px 20px",color:"white",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,border:"none",cursor:"pointer",width:"100%",textAlign:"left"}}
          onClick={() => onStartLesson(next)}>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:4}}>Continue Learning</div>
            <div style={{fontWeight:700,fontSize:16,color:"#c9a84c",marginBottom:3}}>{next.icon} {next.title}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.55)"}}>{next.lvl} · {next.desc}</div>
          </div>
          <div style={{fontSize:24,color:"#c9a84c"}}>→</div>
        </button>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <div style={{background:"#fff",borderRadius:14,padding:15,border:"1px solid #e8d5a3",cursor:"pointer"}} onClick={onGoToChat}>
          <div style={{fontSize:20,marginBottom:6}}>💬</div>
          <div style={{fontSize:13,fontWeight:500,color:"#1a1a2e"}}>Chat with Luca</div>
          <div style={{fontSize:10,color:"#8fa3b1",marginTop:2}}>{messages.filter(m=>m.role==="user").length} messages sent</div>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:15,border:"1px solid #e8d5a3",cursor:exerciseReady?"pointer":"default",opacity:exerciseReady?1:0.6}}
          onClick={exerciseReady?onGoToExercise:undefined}>
          <div style={{fontSize:20,marginBottom:6}}>{exerciseReady?"🎯":"✅"}</div>
          <div style={{fontSize:13,fontWeight:500,color:"#1a1a2e"}}>{exerciseReady?"Daily Exercise":"Exercise Done"}</div>
          <div style={{fontSize:10,color:"#8fa3b1",marginTop:2}}>{exerciseReady?"Ready to attempt!":"Come back tomorrow"}</div>
        </div>
      </div>

      <div style={{fontWeight:700,fontSize:15,color:"#1a1a2e",marginBottom:10}}>Overall Progress</div>
      <div style={{background:"#fff",borderRadius:12,padding:"14px 16px",border:"1px solid #e8d5a3"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,color:"#8fa3b1"}}>A1 → B2 Journey</span>
          <span style={{fontWeight:700,fontSize:14,color:"#c9a84c"}}>{pct}%</span>
        </div>
        <div style={{height:6,background:"#ede8db",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#c9a84c,#6b8f71)",borderRadius:4,transition:"width 0.5s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
          {LEVELS.map(l=><span key={l} style={{fontSize:10,fontWeight:600,color:l===user.level?"#c9a84c":"#8fa3b1"}}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}

function CurriculumMap({ user, completedTopics, onStartLesson }) {
  const [activeLvl, setActiveLvl] = useState(user.level);
  const userLvlIdx = LEVELS.indexOf(user.level);
  return (
    <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:26,minHeight:0}}>
      <div style={{fontWeight:700,fontSize:19,color:"#1a1a2e",marginBottom:3}}>Curriculum Map</div>
      <div style={{fontSize:12,color:"#8fa3b1",marginBottom:16}}>Your structured A1 → B2 learning path</div>
      <div style={{display:"flex",gap:6,marginBottom:18}}>
        {LEVELS.map(lvl => (
          <button key={lvl} onClick={() => setActiveLvl(lvl)}
            style={{padding:"6px 15px",borderRadius:20,fontSize:12,fontWeight:500,border:`1.5px solid ${activeLvl===lvl?"#1a1a2e":"#ede8db"}`,cursor:"pointer",background:activeLvl===lvl?"#1a1a2e":"#f5f0e8",color:activeLvl===lvl?"#c9a84c":"#8fa3b1"}}>
            {lvl}
          </button>
        ))}
      </div>
      {CURRICULUM[activeLvl].map(topic => {
        const done = completedTopics.includes(topic.id);
        const locked = LEVELS.indexOf(activeLvl) > userLvlIdx;
        return (
          <div key={topic.id}
            style={{background:"#fff",borderRadius:12,padding:"13px 15px",border:`1.5px solid ${done?"#6b8f71":"#ede8db"}`,display:"flex",alignItems:"center",gap:12,marginBottom:8,cursor:locked?"not-allowed":"pointer",opacity:locked?0.4:1}}
            onClick={() => !locked && onStartLesson({...topic,lvl:activeLvl})}>
            <div style={{fontSize:20}}>{topic.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:"#1a1a2e"}}>{topic.title}</div>
              <div style={{fontSize:11,color:"#8fa3b1",marginTop:2}}>{topic.desc}</div>
            </div>
            <span style={{fontSize:11,padding:"3px 8px",borderRadius:7,fontWeight:500,background:done?"#e8f5ea":locked?"#ede8db":"rgba(201,168,76,0.15)",color:done?"#6b8f71":locked?"#8fa3b1":"#c9a84c"}}>
              {done?"✓ Done":locked?"🔒 Locked":"→ Start"}
            </span>
          </div>
        );
      })}
    </div>
  );
}


function TranslationPanel() {
  const [word, setWord] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  async function lookup() {
    const w = word.trim();
    if (!w) return;
    setLoading(true);
    setResult(null);
    setError(null);
    const prompt = `You are a German language dictionary. The user typed: "${w}"

Return ONLY a valid JSON object with no markdown, no extra text, just the JSON:
{"word":"${w}","meaning_english":"meaning in English","meaning_hindi":"meaning in Hindi using Devanagari script","pronunciation_guide":"syllable-by-syllable phonetic guide e.g. KRAN-ken-house","example_sentence":"short German example sentence using this word in a hospital or nursing context","example_translation":"English translation of the example","part_of_speech":"noun or verb or adjective or phrase","gender":"der or die or das — only if it is a noun, otherwise write N/A"}

If the input is not German, still attempt a translation from English/Hindi to German and fill all fields.`;

    const raw = await callClaude(
      [{role:"user", content: prompt}],
      "You are a German dictionary. Always return only valid JSON. Never add markdown or explanation.",
      800
    );
    try {
      const cleaned = raw.replace(/```json/g,"").replace(/```/g,"").trim();
      const data = JSON.parse(cleaned);
      setResult(data);
      setHistory(h => [data, ...h.filter(x => x.word.toLowerCase() !== data.word.toLowerCase())].slice(0,10));
    } catch(e) {
      setError("Could not parse the result. Please try again.");
      console.error("Parse error:", e, "Raw:", raw);
    }
    setLoading(false);
  }

  function speak(text, lang="de-DE", rate=0.85) {
    if (speaking) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  return (
    <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:26,minHeight:0,background:"#f5f0e8"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:21,color:"#1a1a2e",marginBottom:3}}>🔤 Translations</div>
        <div style={{fontSize:12,color:"#8fa3b1"}}>Type any German word — get pronunciation, Hindi & English meaning instantly</div>
      </div>

      {/* Search */}
      <div style={{background:"#fff",borderRadius:16,padding:20,border:"1px solid #e8d5a3",marginBottom:20,boxShadow:"0 2px 10px rgba(26,26,46,0.07)"}}>
        <div style={{fontSize:10,fontWeight:600,color:"#8fa3b1",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>German Word or Phrase</div>
        <div style={{display:"flex",gap:10}}>
          <input value={word} onChange={e=>setWord(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookup()}
            placeholder="e.g. Krankenhaus, Blutdruck, Guten Morgen…"
            style={{flex:1,padding:"11px 14px",borderRadius:11,border:"1.5px solid #ede8db",background:"#f5f0e8",fontSize:14,color:"#1a1a2e",outline:"none",fontFamily:"inherit"}}/>
          <button onClick={lookup} disabled={!word.trim()||loading}
            style={{padding:"11px 22px",borderRadius:11,background:word.trim()&&!loading?"#1a1a2e":"#ede8db",color:word.trim()&&!loading?"#c9a84c":"#8fa3b1",fontWeight:700,fontSize:14,border:"none",cursor:word.trim()&&!loading?"pointer":"not-allowed",whiteSpace:"nowrap"}}>
            {loading?"Looking up…":"Translate →"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{textAlign:"center",padding:"32px 0"}}>
          <div style={{fontSize:32,marginBottom:10}}>🔍</div>
          <div style={{fontWeight:600,fontSize:15,color:"#1a1a2e"}}>Looking up "{word}"…</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{background:"#fde8e3",border:"1px solid #f5c0b0",borderRadius:12,padding:"14px 16px",marginBottom:16,color:"#7a2a1a",fontSize:13}}>
          ⚠️ {error}
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div style={{background:"#fff",borderRadius:16,border:"1px solid #e8d5a3",overflow:"hidden",marginBottom:20,boxShadow:"0 4px 18px rgba(26,26,46,0.09)"}}>
          {/* Word header */}
          <div style={{background:"linear-gradient(135deg,#1a1a2e,#2d2d4e)",padding:"20px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:700,fontSize:28,color:"#c9a84c"}}>{result.word}</div>
              <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                {result.part_of_speech && <span style={{fontSize:11,background:"rgba(201,168,76,0.2)",color:"#c9a84c",padding:"2px 9px",borderRadius:6,fontWeight:600}}>{result.part_of_speech}</span>}
                {result.gender && result.gender!=="N/A" && result.gender!=="" && <span style={{fontSize:11,background:"rgba(143,163,177,0.2)",color:"#8fa3b1",padding:"2px 9px",borderRadius:6,fontWeight:600}}>{result.gender}</span>}
              </div>
            </div>
            <button onClick={() => speak(result.word)} disabled={speaking}
              style={{width:52,height:52,borderRadius:"50%",background:speaking?"rgba(201,168,76,0.3)":"rgba(201,168,76,0.15)",border:"2px solid rgba(201,168,76,0.4)",cursor:speaking?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}
              title="Hear pronunciation">
              {speaking?"🔊":"🔈"}
            </button>
          </div>

          <div style={{padding:"18px 22px",display:"flex",flexDirection:"column",gap:14}}>
            {/* Pronunciation */}
            {result.pronunciation_guide && (
              <div style={{background:"#f5f0e8",borderRadius:11,padding:"12px 15px",border:"1px solid #e8d5a3"}}>
                <div style={{fontSize:10,fontWeight:600,color:"#8fa3b1",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>🗣 Pronunciation Guide</div>
                <div style={{fontWeight:700,fontSize:18,color:"#1a1a2e",letterSpacing:"0.04em",fontFamily:"monospace"}}>{result.pronunciation_guide}</div>
                <div style={{fontSize:11,color:"#8fa3b1",marginTop:4}}>Press 🔈 above to hear it spoken in German</div>
              </div>
            )}

            {/* Meanings */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{background:"#f5f0e8",borderRadius:11,padding:"13px 15px",border:"1px solid #e8d5a3"}}>
                <div style={{fontSize:10,fontWeight:600,color:"#8fa3b1",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>🇬🇧 English Meaning</div>
                <div style={{fontWeight:600,fontSize:15,color:"#1a1a2e",lineHeight:1.4}}>{result.meaning_english || "—"}</div>
              </div>
              <div style={{background:"#f5f0e8",borderRadius:11,padding:"13px 15px",border:"1px solid #e8d5a3"}}>
                <div style={{fontSize:10,fontWeight:600,color:"#8fa3b1",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>🇮🇳 Hindi Meaning</div>
                <div style={{fontWeight:600,fontSize:15,color:"#1a1a2e",lineHeight:1.4}}>{result.meaning_hindi || "—"}</div>
              </div>
            </div>

            {/* Example */}
            {result.example_sentence && (
              <div style={{background:"rgba(107,143,113,0.08)",borderRadius:11,padding:"13px 15px",border:"1px solid rgba(107,143,113,0.2)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:10,fontWeight:600,color:"#6b8f71",letterSpacing:"0.07em",textTransform:"uppercase"}}>📝 Example (Hospital Context)</div>
                  <button onClick={() => speak(result.example_sentence)}
                    style={{fontSize:12,background:"none",border:"1px solid rgba(107,143,113,0.3)",borderRadius:6,padding:"2px 8px",cursor:"pointer",color:"#6b8f71",fontWeight:600}}>
                    🔈 Hear
                  </button>
                </div>
                <div style={{fontWeight:600,fontSize:14,color:"#1a1a2e",marginBottom:4,fontStyle:"italic"}}>{result.example_sentence}</div>
                <div style={{fontSize:12,color:"#6b8f71"}}>{result.example_translation}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent lookups */}
      {history.length > 0 && (
        <div>
          <div style={{fontSize:10,fontWeight:600,color:"#8fa3b1",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Recent Lookups</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {history.map((h,i) => (
              <button key={i} onClick={() => { setWord(h.word); setResult(h); }}
                style={{padding:"6px 13px",borderRadius:20,background:"#fff",border:"1px solid #e8d5a3",fontSize:13,color:"#1a1a2e",cursor:"pointer",fontWeight:500,display:"flex",gap:6,alignItems:"center"}}>
                <span style={{color:"#c9a84c"}}>🇩🇪</span>{h.word}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


const MEDIA = {
  A1: {
    movies: [
      { title:"Nicos Weg (Episodes 1–25)", type:"Series", platform:"DW Learn German (Free)", why:"Made for A1 learners — slow, clear German with subtitles", link:"https://learngerman.dw.com/en/nicos-weg/c-36519687" },
      { title:"Peppa Wutz", type:"Kids Show", platform:"YouTube (Free)", why:"Simple vocabulary, slow speech — perfect for beginners", link:"https://www.youtube.com/@PeppaWutzDeutsch" },
      { title:"Sesame Street (Sesamstraße)", type:"Kids Show", platform:"YouTube (Free)", why:"Fun, repetitive vocabulary — ideal to build basic words", link:"https://www.youtube.com/results?search_query=Sesamstra%C3%9Fe" },
    ],
    songs: [
      { title:"Kopf, Schulter, Knie und Fuß", artist:"German Children's Song", why:"Teaches body parts — very useful for nurses! (Head, shoulders, knees and toes)", link:"https://www.youtube.com/results?search_query=Kopf+Schulter+Knie+und+Fu%C3%9F" },
      { title:"Alle meine Entchen", artist:"Traditional", why:"Classic A1 German song — simple words and rhythm", link:"https://www.youtube.com/results?search_query=Alle+meine+Entchen" },
      { title:"Ein Männlein steht im Walde", artist:"Traditional", why:"Slow, clear pronunciation — great listening practice", link:"https://www.youtube.com/results?search_query=Ein+M%C3%A4nnlein+steht+im+Walde" },
    ],
    shows: [
      { title:"Nicos Weg", platform:"DW Learn German", why:"A story-based series following Nico — built for absolute beginners", link:"https://learngerman.dw.com" },
      { title:"Learn German with Anja", platform:"YouTube", why:"Friendly teacher explains basics in English + German", link:"https://www.youtube.com/@LearnGermanwithAnja" },
    ],
  },
  A2: {
    movies: [
      { title:"Nicos Weg (Episodes 26–65)", type:"Series", platform:"DW Learn German (Free)", why:"Continues into A2 — dialogues get more complex", link:"https://learngerman.dw.com/en/nicos-weg/c-36519687" },
      { title:"Das Sams", type:"Movie", platform:"Amazon Prime", why:"Funny German children's movie — clear dialogue, great for A2", link:"https://www.amazon.com" },
      { title:"Shaun das Schaf", type:"Kids Show", platform:"YouTube (Free)", why:"Almost no dialogue — you learn from context. Very fun!", link:"https://www.youtube.com/results?search_query=Shaun+das+Schaf+Deutsch" },
    ],
    songs: [
      { title:"Atemlos durch die Nacht", artist:"Helene Fischer", why:"Clear pronunciation, modern German — great for listening practice", link:"https://www.youtube.com/results?search_query=Helene+Fischer+Atemlos" },
      { title:"99 Luftballons", artist:"Nena", why:"Classic German pop — many learners know it, good vocabulary", link:"https://www.youtube.com/results?search_query=99+Luftballons" },
      { title:"Warum", artist:"Silbermond", why:"Emotional, slow German — great for understanding sentence structure", link:"https://www.youtube.com/results?search_query=Silbermond+Warum" },
    ],
    shows: [
      { title:"Extra auf Deutsch", platform:"YouTube (Free)", why:"Comedy series made for language learners — hilarious and educational", link:"https://www.youtube.com/results?search_query=Extra+auf+Deutsch" },
      { title:"Janoschs Traumstunde", platform:"YouTube", why:"Animated show with simple, clear German — great A2 listening", link:"https://www.youtube.com/results?search_query=Janoschs+Traumstunde" },
    ],
  },
  B1: {
    movies: [
      { title:"Good Bye Lenin!", type:"Movie", platform:"Netflix / Amazon", why:"East German story — rich vocabulary, real spoken German dialogs", link:"https://www.netflix.com" },
      { title:"Das Leben der Anderen", type:"Movie", platform:"Amazon Prime", why:"Award-winning — formal German, great for professional vocabulary", link:"https://www.amazon.com" },
      { title:"Türkisch für Anfänger", type:"Series", platform:"ARD Mediathek (Free)", why:"Comedy about integration in Germany — natural spoken German", link:"https://www.ardmediathek.de" },
    ],
    songs: [
      { title:"Wir sind wir", artist:"Paul van Dyk & Peter Heppner", why:"Thoughtful German — complex sentences at natural speed", link:"https://www.youtube.com/results?search_query=Wir+sind+wir+Paul+van+Dyk" },
      { title:"An Tagen wie diesen", artist:"Toten Hosen", why:"Powerful German rock — listen and follow along with lyrics", link:"https://www.youtube.com/results?search_query=An+Tagen+wie+diesen+Toten+Hosen" },
      { title:"Ich bin aus Wien", artist:"Rainhard Fendrich", why:"Austrian German — useful since many German nurses work near Austria", link:"https://www.youtube.com/results?search_query=Ich+bin+aus+Wien+Fendrich" },
    ],
    shows: [
      { title:"Dark (Season 1)", platform:"Netflix", why:"Complex German drama — challenging but excellent for B1/B2 listening", link:"https://www.netflix.com" },
      { title:"Tatort", platform:"ARD Mediathek (Free)", why:"Germany's most famous detective show — real spoken German", link:"https://www.ardmediathek.de/tatort" },
    ],
  },
  B2: {
    movies: [
      { title:"Der Baader Meinhof Komplex", type:"Movie", platform:"Amazon Prime", why:"Fast, authentic German speech — challenges your listening at B2", link:"https://www.amazon.com" },
      { title:"Lola rennt (Run Lola Run)", type:"Movie", platform:"Netflix", why:"Fast-paced, modern German — great for natural conversational speed", link:"https://www.netflix.com" },
      { title:"Das Boot", type:"Series", platform:"Sky / Amazon", why:"Intense German drama — advanced vocabulary and sentence structures", link:"https://www.amazon.com" },
    ],
    songs: [
      { title:"Auszug aus der Hölle", artist:"Rammstein", why:"Powerful German — complex metaphors and advanced vocabulary", link:"https://www.youtube.com/results?search_query=Rammstein" },
      { title:"Mutter", artist:"Rammstein", why:"Poetic German lyrics — excellent for B2 vocabulary expansion", link:"https://www.youtube.com/results?search_query=Rammstein+Mutter" },
      { title:"Irgendwie, irgendwo, irgendwann", artist:"Nena", why:"Deep German lyrics — complex grammar structures in natural flow", link:"https://www.youtube.com/results?search_query=Nena+Irgendwie+irgendwo" },
    ],
    shows: [
      { title:"Dark (All Seasons)", platform:"Netflix", why:"Mind-bending German — you'll hear complex grammar and old-style German", link:"https://www.netflix.com" },
      { title:"Babylon Berlin", platform:"Netflix / Sky", why:"1920s German — rich vocabulary, historical and medical terms", link:"https://www.netflix.com" },
    ],
  },
};

function MediaPanel({ user }) {
  const [activeLevel, setActiveLevel] = useState(user?.level || "A1");
  const [activeTab, setActiveTab] = useState("movies");

  const media = MEDIA[activeLevel];
  const items = media[activeTab];

  const tabIcon = { movies:"🎬", songs:"🎵", shows:"📺" };
  const tabLabel = { movies:"Movies", songs:"Songs", shows:"Web Shows" };

  return (
    <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:26,minHeight:0,background:"#f5f0e8"}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:21,color:"#1a1a2e",marginBottom:3}}>🎬 Learn Through Media</div>
        <div style={{fontSize:12,color:"#8fa3b1"}}>Watch, listen & enjoy German — handpicked for your level to make learning fun</div>
      </div>

      {/* Level selector */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {LEVELS.map(lvl => (
          <button key={lvl} onClick={() => setActiveLevel(lvl)}
            style={{padding:"7px 18px",borderRadius:20,fontSize:13,fontWeight:600,border:`1.5px solid ${activeLevel===lvl?"#1a1a2e":"#e8d5a3"}`,cursor:"pointer",background:activeLevel===lvl?"#1a1a2e":"#fff",color:activeLevel===lvl?"#c9a84c":"#8fa3b1",display:"flex",alignItems:"center",gap:6}}>
            {lvl}
            {lvl === user?.level && <span style={{fontSize:9,background:"rgba(201,168,76,0.2)",color:"#c9a84c",padding:"1px 6px",borderRadius:4}}>You</span>}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {["movies","songs","shows"].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{flex:1,padding:"10px 8px",borderRadius:12,fontSize:13,fontWeight:600,border:`1.5px solid ${activeTab===t?"#c9a84c":"#e8d5a3"}`,cursor:"pointer",background:activeTab===t?"#fff":"#f5f0e8",color:activeTab===t?"#1a1a2e":"#8fa3b1",boxShadow:activeTab===t?"0 2px 10px rgba(201,168,76,0.15)":"none"}}>
            {tabIcon[t]} {tabLabel[t]}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {items.map((item, i) => (
          <div key={i} style={{background:"#fff",borderRadius:14,padding:18,border:"1px solid #e8d5a3",boxShadow:"0 2px 8px rgba(26,26,46,0.06)"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#1a1a2e"}}>{item.title}</div>
                  {item.type && <span style={{fontSize:10,background:"#f5f0e8",color:"#8fa3b1",padding:"2px 8px",borderRadius:6,fontWeight:600,flexShrink:0}}>{item.type}</span>}
                  {item.artist && <span style={{fontSize:11,color:"#8fa3b1",flexShrink:0}}>by {item.artist}</span>}
                </div>
                <div style={{fontSize:12,color:"#6b8f71",fontWeight:500,marginBottom:6}}>📍 {item.platform}</div>
                <div style={{fontSize:13,color:"#555",lineHeight:1.5}}>💡 {item.why}</div>
              </div>
            </div>
            <a href={item.link} target="_blank" rel="noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:12,padding:"7px 16px",borderRadius:9,background:"#1a1a2e",color:"#c9a84c",fontSize:12,fontWeight:700,textDecoration:"none"}}>
              {activeTab==="songs"?"🎵 Find on YouTube":activeTab==="movies"?"▶ Watch Now":"📺 Watch Now"}
            </a>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div style={{background:"rgba(107,143,113,0.1)",border:"1px solid rgba(107,143,113,0.25)",borderRadius:12,padding:"14px 16px",marginTop:20}}>
        <div style={{fontWeight:600,fontSize:13,color:"#2d5a32",marginBottom:4}}>💡 Pro Tip for Level {activeLevel}</div>
        <div style={{fontSize:12,color:"#555",lineHeight:1.6}}>
          {activeLevel==="A1" && "Start with subtitles in your native language. Don't worry about understanding everything — just get used to the sounds and rhythm of German."}
          {activeLevel==="A2" && "Switch to German subtitles when you can. Pause and repeat sentences you hear used in hospital/daily settings."}
          {activeLevel==="B1" && "Watch without subtitles for 5 minutes first, then turn them on. Try to write down 5 new medical or everyday words per episode."}
          {activeLevel==="B2" && "Watch without subtitles entirely. After each episode, try to summarise what happened in German — even a few sentences helps a lot."}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("onboard");
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roll, setRoll] = useState("");
  const [formError, setFormError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [completedTopics, setCompletedTopics] = useState([]);
  const [progress, setProgress] = useState({streak:0,sessions:0,avgScore:0});
  const [exerciseDoneAt, setExerciseDoneAt] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, typing]);

  const exerciseReady = !exerciseDoneAt || Date.now()-exerciseDoneAt >= 86400000;
  const levelPct = {A1:5,A2:22,B1:48,B2:78}[user?.level] || 5;
  const initials = user ? user.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "";

  function handleStart() {
    if (!name.trim() || !email.trim() || !roll.trim()) {
      setFormError("Please fill in all fields.");
      return;
    }
    setFormError("");
    setUser({ name: name.trim(), email: email.trim(), rollNumber: roll.trim(), level:"A1" });
    setScreen("placement-intro");
  }

  async function handlePlacementDone(level) {
    // "Beginner" maps to A1 in the curriculum system
    const curriculumLevel = level === "Beginner" ? "A1" : level;
    const u = { name, email, rollNumber: roll.trim(), level: curriculumLevel, placementLabel: level };
    setUser(u);
    setScreen("app");
    setTab("dashboard");
    setTyping(true);
    const welcome = await callClaude(
      [{role:"user", content:`Hi! My name is ${u.name}, I'm a nurse from India learning German to work in Germany. My placement test result was "${level}". Please welcome me warmly and kick off my first mini-lesson appropriate for this level!`}],
      sysPrompt(u, null)
    );
    setMessages([{role:"assistant", content:welcome}]);
    setTyping(false);
  }

  async function startLesson(topic) {
    setCurrentTopic(topic);
    setTab("chat");
    setTyping(true);
    const userMsg = {role:"user", content:`Teach me: "${topic.title}" (${topic.desc}). Level: ${user.level}.`};
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    const reply = await callClaude(newMsgs.map(m=>({role:m.role,content:m.content})), sysPrompt(user, topic.title));
    setMessages([...newMsgs, {role:"assistant",content:reply}]);
    setTyping(false);
  }

  async function send() {
    if (!input.trim() || typing) return;
    const userMsg = {role:"user", content:input.trim()};
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setTyping(true);
    const reply = await callClaude(newMsgs.map(m=>({role:m.role,content:m.content})), sysPrompt(user, currentTopic?.title));
    setMessages([...newMsgs, {role:"assistant",content:reply}]);
    setTyping(false);
  }

  function onKey(e) { if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }

  function handleExDone(score) {
    setExerciseDoneAt(Date.now());
    setProgress(p => {
      const s = p.sessions+1;
      return {streak:p.streak+1, sessions:s, avgScore:Math.round((p.avgScore*p.sessions+score)/s)};
    });
  }

  function renderBubble(text) {
    return text
      // H1 — # Title
      .replace(/^# (.+)$/gm, "<div style='font-weight:700;font-size:16px;color:#1a1a2e;margin:14px 0 6px'>$1</div>")
      // H2 — ## Title
      .replace(/^## (.+)$/gm, "<div style='font-weight:700;font-size:14px;color:#1a1a2e;margin:12px 0 5px;border-bottom:1px solid #ede8db;padding-bottom:4px'>$1</div>")
      // H3 — ### Title
      .replace(/^### (.+)$/gm, "<div style='font-weight:600;font-size:13px;color:#1a1a2e;margin:10px 0 4px'>$1</div>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong style='color:#c9a84c;font-weight:700'>$1</strong>")
      // Italic
      .replace(/_(.*?)_/g, "<em style='color:#6b8f71;font-style:italic'>$1</em>")
      // Bullet points — lines starting with - or *
      .replace(/^[-•] (.+)$/gm, "<div style='display:flex;gap:7px;margin:3px 0'><span style='color:#c9a84c;margin-top:1px;flex-shrink:0'>•</span><span>$1</span></div>")
      // Numbered list
      .replace(/^(\d+)\. (.+)$/gm, "<div style='display:flex;gap:7px;margin:3px 0'><span style='color:#c9a84c;font-weight:600;flex-shrink:0;min-width:16px'>$1.</span><span>$2</span></div>")
      // Horizontal rule ---
      .replace(/^---+$/gm, "<hr style='border:none;border-top:1px solid #ede8db;margin:10px 0'/>")
      // Line breaks — double newline = paragraph gap
      .replace(/\n\n/g, "<div style='margin-bottom:8px'></div>")
      // Single newline
      .replace(/\n/g, "<br/>");
  }

  // ── ONBOARD ──
  if (screen === "onboard") return (
    <div style={S.root}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');"}</style>
      <header style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={S.logoMark}>G</div>
          <div><div style={S.logoText}>Your GC Buddy</div><div style={S.logoSub}>by Testbook</div></div>
        </div>
      </header>
      <div style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:36,overflowY:"auto"}}>
        <div style={S.card}>
          <div style={S.badge}>🇩🇪 German Language Buddy</div>
          <h1 style={S.h1}>Learn German.<br/><span style={{color:"#c9a84c",fontStyle:"italic"}}>Work in Germany.</span></h1>
          <p style={S.sub}>Your personal AI tutor — structured lessons, daily exercises, and full guidance to help you work as a nurse in Germany.</p>

          <label style={S.label}>Your Name</label>
          <input style={S.input} placeholder="e.g. Priya Sharma" value={name} onChange={e=>setName(e.target.value)}/>

          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="priya@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>

          <label style={S.label}>Roll Number</label>
          <input style={S.input} placeholder="e.g. GCT-2025-00142" value={roll} onChange={e=>setRoll(e.target.value)}/>

          {formError && <div style={{color:"#c45c3a",fontSize:12,marginBottom:10}}>{formError}</div>}

          <button style={S.btnPrimary} onClick={handleStart}>Continue to Placement Test →</button>
        </div>
      </div>
    </div>
  );


  // ── PLACEMENT INTRO ──
  if (screen === "placement-intro") return (
    <div style={{...S.root,display:"flex",flexDirection:"column"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');"}</style>
      <header style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={S.logoMark}>G</div>
          <div><div style={S.logoText}>Your GC Buddy</div><div style={S.logoSub}>by Testbook</div></div>
        </div>
        <div style={S.chip}><div style={S.avatar}>{initials}</div>{user.name.split(" ")[0]}</div>
      </header>
      <div style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:36,overflowY:"auto"}}>
        <div style={{...S.card, maxWidth:500, textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:16}}>🎯</div>
          <div style={{fontWeight:700,fontSize:24,color:"#1a1a2e",marginBottom:8}}>
            Welcome, {user.name.split(" ")[0]}!
          </div>
          <div style={{fontSize:14,color:"#8fa3b1",lineHeight:1.7,marginBottom:26}}>
            Before we begin, we'd like to run a quick <strong style={{color:"#1a1a2e"}}>Placement Test</strong> to detect your current German level.<br/><br/>
            It's <strong style={{color:"#1a1a2e"}}>10 short questions</strong>, takes about <strong style={{color:"#1a1a2e"}}>3 minutes</strong>, and helps Luca personalise every lesson just for you.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:26}}>
            {[["⏱️","~3 minutes","Quick & easy"],["🎓","10 questions","A1 to B2 range"],["🤖","AI personalised","Lessons adapt to you"],["✅","No pressure","Just answer honestly"]].map(([icon,title,sub])=>(
              <div key={title} style={{background:"#f5f0e8",borderRadius:11,padding:"12px 14px",textAlign:"left"}}>
                <div style={{fontSize:18,marginBottom:4}}>{icon}</div>
                <div style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>{title}</div>
                <div style={{fontSize:11,color:"#8fa3b1",marginTop:2}}>{sub}</div>
              </div>
            ))}
          </div>
          <button style={S.btnPrimary} onClick={() => setScreen("placement")}>Start Placement Test →</button>
          <div style={{marginTop:14,fontSize:12,color:"#8fa3b1",cursor:"pointer",textDecoration:"underline"}}
            onClick={() => handlePlacementDone("A1")}>
            Skip — I'm a complete beginner (A1)
          </div>
        </div>
      </div>
    </div>
  );

  // ── PLACEMENT ──
  if (screen === "placement") return (
    <div style={{...S.root,display:"flex",flexDirection:"column"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');"}</style>
      <header style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={S.logoMark}>G</div>
          <div><div style={S.logoText}>Your GC Buddy</div><div style={S.logoSub}>by Testbook</div></div>
        </div>
        <div style={S.chip}><div style={S.avatar}>{initials}</div>{user.name.split(" ")[0]}</div>
      </header>
      <PlacementTest user={user} onComplete={handlePlacementDone}/>
    </div>
  );

  // ── MAIN APP ──
  return (
    <div style={{...S.root,display:"flex",flexDirection:"column"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');"}</style>
      <header style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={S.logoMark}>G</div>
          <div><div style={S.logoText}>Your GC Buddy</div><div style={S.logoSub}>by Testbook</div></div>
        </div>
        <nav style={{display:"flex",gap:3}}>
          {["dashboard","curriculum","chat","exercise","translations","media"].map(t => (
            <button key={t} style={S.navPill(tab===t)} onClick={()=>setTab(t)}>
              {t==="dashboard"?"Dashboard":t==="curriculum"?"Curriculum":t==="chat"?"Chat with Luca":t==="exercise"?"Daily Exercise":t==="translations"?"Translations":"Media"}
            </button>
          ))}
        </nav>
        <div style={S.chip}><div style={S.avatar}>{initials}</div>{user.name.split(" ")[0]}</div>
      </header>

      <div style={{...S.main,display:"grid"}}>
        {/* Sidebar */}
        <aside style={S.sidebar}>
          <div>
            <div style={S.secTitle}>Your Progress</div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 0"}}>
              <ProgressRing pct={levelPct}/>
              <div style={{fontWeight:700,fontSize:22,color:"#1a1a2e",marginTop:6}}>{user.level}</div>
              <div style={{fontSize:11,color:"#8fa3b1",marginTop:2}}>Current Level</div>
            </div>
          </div>
          <div>
            <div style={S.secTitle}>Stats</div>
            <div style={S.statGrid}>
              {[[progress.sessions,"Sessions"],[`${progress.streak}🔥`,"Streak"],[progress.avgScore?`${progress.avgScore}%`:"—","Avg score"],[messages.filter(m=>m.role==="user").length,"Messages"]].map(([v,l])=>(
                <div key={l} style={S.statCard}><div style={S.statNum}>{v}</div><div style={S.statLbl}>{l}</div></div>
              ))}
            </div>
          </div>
          <div>
            <div style={S.secTitle}>Level Path</div>
            {LEVELS.map(lvl=>(
              <div key={lvl} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                <div style={{width:22,fontSize:10,fontWeight:600,color:lvl===user.level?"#c9a84c":"#8fa3b1"}}>{lvl}</div>
                <div style={{flex:1,height:5,background:"#ede8db",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",background:"linear-gradient(90deg,#c9a84c,#6b8f71)",borderRadius:4,width:lvl===user.level?"40%":LEVELS.indexOf(lvl)<LEVELS.indexOf(user.level)?"100%":"0%",transition:"width 0.5s"}}/>
                </div>
              </div>
            ))}
          </div>
          {exerciseReady && (
            <div style={{background:"linear-gradient(135deg,#1a1a2e,#2d2d4e)",borderRadius:11,padding:12,color:"white"}}>
              <div style={{fontWeight:700,fontSize:13,color:"#c9a84c",marginBottom:3}}>🎯 Exercise Ready!</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",lineHeight:1.5}}>Your daily exercise is waiting!</div>
              <button style={{marginTop:8,width:"100%",padding:"7px",borderRadius:7,background:"#c9a84c",color:"#1a1a2e",fontWeight:700,fontSize:12,border:"none",cursor:"pointer"}}
                onClick={()=>setTab("exercise")}>Start Exercise →</button>
            </div>
          )}
          {currentTopic && (
            <div style={{background:"#f5f0e8",borderRadius:10,padding:10,border:"1px solid #e8d5a3"}}>
              <div style={{fontSize:9,color:"#8fa3b1",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:3}}>Current Topic</div>
              <div style={{fontSize:12,fontWeight:500,color:"#1a1a2e"}}>{currentTopic.icon} {currentTopic.title}</div>
              <div style={{fontSize:10,color:"#8fa3b1",marginTop:2}}>{currentTopic.lvl} · {currentTopic.desc}</div>
            </div>
          )}
        </aside>

        {/* Content */}
        {tab==="dashboard" && <Dashboard user={user} progress={progress} messages={messages} completedTopics={completedTopics} onStartLesson={startLesson} onGoToChat={()=>setTab("chat")} onGoToExercise={()=>setTab("exercise")} exerciseReady={exerciseReady}/>}
        {tab==="curriculum" && <CurriculumMap user={user} completedTopics={completedTopics} onStartLesson={startLesson}/>}

        {tab==="chat" && (
          <div style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"12px 20px",borderBottom:"1px solid #e8d5a3",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>
                  Luca — Your German Tutor
                  {currentTopic && <span style={{color:"#c9a84c",fontSize:12,marginLeft:8}}>· {currentTopic.title}</span>}
                </div>
                <div style={{fontSize:10,color:"#8fa3b1",marginTop:2}}>Personalised for {user.name} · Level {user.level}</div>
              </div>
              <div style={{display:"flex",gap:7,alignItems:"center"}}>
                <span style={{background:"#f5f0e8",border:"1px solid #e8d5a3",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#1a1a2e"}}>🇩🇪 German for Nurses</span>
                <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#6b8f71"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#6b8f71",display:"inline-block"}}/>Online
                </span>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:18,display:"flex",flexDirection:"column",gap:12,minHeight:0}}>
              {messages.length===0 && (
                <div style={{textAlign:"center",padding:"32px 20px"}}>
                  <div style={{fontSize:30,marginBottom:10}}>👋</div>
                  <div style={{fontWeight:700,fontSize:16,color:"#1a1a2e",marginBottom:4}}>Start chatting with Luca</div>
                  <div style={{fontSize:12,color:"#8fa3b1"}}>Pick a topic from Curriculum, or just say Hallo!</div>
                </div>
              )}
              {messages.map((msg,i) => (
                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:msg.role==="user"?"row-reverse":"row"}}>
                  <div style={{width:28,height:28,borderRadius:8,background:msg.role==="user"?"#c9a84c":"#1a1a2e",color:msg.role==="user"?"#1a1a2e":"#c9a84c",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>
                    {msg.role==="user"?initials:"L"}
                  </div>
                  <div style={S.msgBubble(msg.role==="user")} dangerouslySetInnerHTML={{__html:renderBubble(msg.content)}}/>
                </div>
              ))}
              {typing && (
                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{width:28,height:28,borderRadius:8,background:"#1a1a2e",color:"#c9a84c",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>L</div>
                  <div style={{padding:"10px 14px",background:"#fff",border:"1px solid #ede8db",borderRadius:14,borderTopLeftRadius:4}}>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      {[0,0.2,0.4].map((d,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#8fa3b1",animation:`bounce 1.2s ${d}s infinite`}}/>)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e8d5a3",background:"#fff",display:"flex",gap:8,alignItems:"flex-end"}}>
              <textarea style={{flex:1,padding:"10px 13px",borderRadius:11,border:"1.5px solid #ede8db",background:"#f5f0e8",fontSize:13,color:"#1a1a2e",resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5,maxHeight:96}}
                placeholder="Ask Luca anything in English or German… (Enter to send)"
                value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey} rows={1}/>
              <button style={{width:40,height:40,borderRadius:10,background:"#1a1a2e",color:"#c9a84c",border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:!input.trim()||typing?0.4:1}}
                onClick={send} disabled={!input.trim()||typing}>→</button>
            </div>
          </div>
        )}

        {tab==="exercise" && <ExercisePanel user={user} history={messages} onBack={()=>setTab("chat")} onDone={handleExDone} exerciseDoneAt={exerciseDoneAt}/>}
        {tab==="translations" && <TranslationPanel/>}
        {tab==="media" && <MediaPanel user={user}/>}
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}
