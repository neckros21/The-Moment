(() => {
  // ====== Core tuning ======
  const PERFECT_TIME = 37.428;     // seconds (secret: do not display)
  const WINDOW = 0.140;           // +/- seconds
  const MESSAGE_EVERY = 3.2;       // seconds
  const FAIL_COOLDOWN = 0.6;       // seconds

  // ====== UI refs ======
  const storyEl = document.getElementById("story");
  const feedbackEl = document.getElementById("feedbackBox");
  const mainBtn = document.getElementById("mainBtn");
  const howBtn = document.getElementById("howBtn");
  const resetBtn = document.getElementById("resetBtn");
  const modePill = document.getElementById("modePill");
  const attemptsEl = document.getElementById("attempts");
  const bestEl = document.getElementById("best");
  const copyLink = document.getElementById("copyLink");
  const toast = document.getElementById("toast");

  // ✅ Share buttons
  const shareButtons = document.getElementById("shareButtons");
  const shareXBtn = document.getElementById("shareXBtn");
  const shareTikTokBtn = document.getElementById("shareTikTokBtn");
  const shareInstaBtn = document.getElementById("shareInstaBtn");

  // ====== State ======
  const MODE = { INTRO:"INTRO", PLAY:"PLAY", OVER:"OVER", WIN:"WIN", HOW:"HOW" };
  let mode = MODE.INTRO;

  let startMs = 0;
  let rafId = 0;
  let lastMsgAt = 0;
  let currentMsg = "";
  let locked = false;

  let attempts = Number(localStorage.getItem("tm_attempts") || 0);
  let best = Number(localStorage.getItem("tm_best") || Infinity);

  // ====== Copy ======
  const introLines = [
    "There is a moment.",
    "Everyone misses it the first time.",
    "It never moves.",
    "Some say it shows what’s behind this place.",
    "Find the moment.",
    "Don’t trust your instincts."
  ];

  const howText = [
    "Click when you think it’s right.",
    "You’ll know if you’re close.",
    "",
    "One moment is correct.",
    "It does not change."
  ].join("\n");

  const msgEarly = [
    "Not too early.",
    "Most people overthink it.",
    "You don’t need luck.",
    "Listen to the pauses.",
    "This place rewards patience."
  ];
  const msgMid = [
    "Most clicks happen late.",
    "It’s closer than it feels.",
    "You won’t see it coming.",
    "The moment doesn’t move.",
    "Try the same idea twice."
  ];
  const msgLate = [
    "If you’re still here, you’re learning.",
    "The difference is smaller than you think.",
    "Breathe. Then decide.",
    "A fraction matters.",
    "Some never reach this far."
  ];


  const CLOSENESS_STEPS = [
  { t: 25.0, texts: ["You didn’t wait.", "Instant click.", "No patience."] },
  { t: 18.0, texts: ["Too soon to decide.", "You rushed it.", "Not even close."] },
  { t: 12.0, texts: ["Still far.", "You’re not there yet.", "Keep waiting."] },
  { t: 8.0,  texts: ["Better. Still far.", "You’re starting to wait.", "Not close."] },
  { t: 5.0,  texts: ["There’s a rhythm.", "A pattern exists.", "It’s not random."] },
  { t: 3.0,  texts: ["You’re getting closer.", "That felt closer.", "Improving."] },
  { t: 2.0,  texts: ["Close.", "You’re in range.", "Now it’s about focus."] },
  { t: 1.2,  texts: ["Very close.", "Small difference.", "Don’t rush it."] },
  { t: 0.8,  texts: ["Almost.", "Painfully close.", "Again."] },
  { t: 0.4,  texts: ["You felt it.", "That instinct was right.", "So close."] },
  { t: 0.2,  texts: ["A fraction away.", "One breath away.", "Micro-timing."] },
  { t: 0.0,  texts: ["You shouldn’t see this."] }
  ];


  function closenessText(diff){
    for (const step of CLOSENESS_STEPS){
      if (diff >= step.t){
        const pool = step.texts;
        return pool[Math.floor(Math.random() * pool.length)];
      }
    }
    return "";
  }

  function setShareVisible(visible){
    shareButtons.style.display = visible ? "flex" : "none";
  }

  function setMode(m){
    mode = m;
    modePill.textContent = m;

    if(m === MODE.INTRO){
      mainBtn.textContent = "BEGIN";
      feedbackEl.textContent = "Waiting.";
      renderIntro();
      locked = false;
      mainBtn.disabled = false;
      setShareVisible(false);
    }
    if(m === MODE.PLAY){
      mainBtn.textContent = "CLICK";
      feedbackEl.textContent = "…";
      storyEl.textContent = "";
      mainBtn.classList.add("breathe");
      locked = false;
      mainBtn.disabled = false;
      setShareVisible(false);
    }
    else mainBtn.classList.remove("breathe");
    if(m === MODE.OVER){
      mainBtn.textContent = "TRY AGAIN";
      locked = false;
      mainBtn.disabled = false;
      setShareVisible(false);
    }
    if(m === MODE.WIN){
      mainBtn.textContent = "PLAY AGAIN";
      locked = false;
      mainBtn.disabled = false;
      setShareVisible(true); // ✅ show after WIN
    }
    if(m === MODE.HOW){
      mainBtn.textContent = "BEGIN";
      feedbackEl.textContent = "Read it. Then try.";
      storyEl.textContent = howText;
      locked = false;
      mainBtn.disabled = false;
      setShareVisible(false);
    }
  }

  function renderIntro(){
    storyEl.textContent = "";
    let i = 0;
    const tick = () => {
      if(mode !== MODE.INTRO) return;
      storyEl.textContent += (i===0 ? "" : "\n") + introLines[i];
      i++;
      if(i < introLines.length) setTimeout(tick, 550);
    };
    tick();
  }

  function nowMs(){ return performance.now(); }
  function elapsedS(){ return (nowMs() - startMs) / 1000; }

  function pickMessage(t){
    const pool = t < 15 ? msgEarly : (t < 35 ? msgMid : msgLate);
    let m = pool[Math.floor(Math.random()*pool.length)];
    if(m === currentMsg && pool.length > 1){
      m = pool[(pool.indexOf(m)+1) % pool.length];
    }
    return m;
  }

  function loop(){
    if(mode !== MODE.PLAY) return;
    const t = elapsedS();
    if(t - lastMsgAt >= MESSAGE_EVERY){
      lastMsgAt = t;
      currentMsg = pickMessage(t);
      feedbackEl.textContent = currentMsg;
    }
    rafId = requestAnimationFrame(loop);
  }

  function startPlay(){
    cancelAnimationFrame(rafId);
    startMs = nowMs();
    lastMsgAt = 0;
    const stage = document.querySelector(".stage");
    stage.classList.add("fade");
    setTimeout(() => stage.classList.remove("fade"), 300);
    currentMsg = "…";
    feedbackEl.textContent = "…";
    setMode(MODE.PLAY);
    rafId = requestAnimationFrame(loop);
  }

  function setAttempts(n){
    attempts = n;
    localStorage.setItem("tm_attempts", String(attempts));
    attemptsEl.textContent = String(attempts);
  }
  function setBestClosest(diff){
    if(diff < best){
      best = diff;
      localStorage.setItem("tm_best", String(best));
    }
    bestEl.textContent = isFinite(best) ? (best.toFixed(3) + "s") : "—";
  }

  function fail(diff){
    cancelAnimationFrame(rafId);
    setAttempts(attempts + 1);
    setBestClosest(diff);
    const t = elapsedS();
    const sign = (t < PERFECT_TIME) ? "early" : "late";
    const closeness = closenessText(diff);
    feedbackEl.textContent =`${closeness}\nYou were off by ${diff.toFixed(3)} seconds.`;
    setMode(MODE.OVER);

    locked = true;
    mainBtn.disabled = true;
    setTimeout(() => { locked = false; mainBtn.disabled = false; }, FAIL_COOLDOWN * 1000);
  }

  function win(){
    cancelAnimationFrame(rafId);
    setAttempts(attempts + 1);
    feedbackEl.textContent = "You found it.";

    const reveal = [
      "You found the moment.",
      "",
      "It was always here.",
      "It never moved.",
      "",
      "Look closer next time."
    ].join("\n");
    document.querySelector(".stage").classList.add("win");
    storyEl.textContent = reveal;
    setMode(MODE.WIN);
    updateShareText(true);
  }

  function clickAction(){
    if(locked) return;

    if(mode === MODE.INTRO || mode === MODE.HOW){
      startPlay();
      updateShareText(false);
      return;
    }
    if(mode === MODE.OVER || mode === MODE.WIN){
      startPlay();
      updateShareText(false);
      return;
    }
    if(mode === MODE.PLAY){
      const t = elapsedS();
      const diff = Math.abs(t - PERFECT_TIME);
      if(diff <= WINDOW) win();
      else fail(diff);
    }
  }

  function updateShareText(didWin){
    const closest = isFinite(best) ? best.toFixed(3) : "—";
    const base = didWin
      ? `I found THE MOMENT.\nThere is only one correct second.`
      : `This game has only one correct second.\nMy closest attempt: ${closest}s off.`;
    copyLink.dataset.text = base + `\n\n${location.href}`;
  }

  function showToast(text){
    toast.textContent = text;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 900);
  }

  function copyText(txt){
    return navigator.clipboard?.writeText(txt)
      .then(() => true)
      .catch(() => false);
  }

  function copyShare(){
    const txt = copyLink.dataset.text || "There is only one correct second.";
    copyText(txt).then(ok => showToast(ok ? "Copied." : "Copy failed."));
  }

  // ====== Share actions ======
  function shareTwitter(){
    const text = encodeURIComponent(
      "I found THE MOMENT.\nThere is only ONE correct second.\nCan you find it?"
    );
    const url = encodeURIComponent(location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  }

  
 

  // ====== Events ======
  mainBtn.addEventListener("click", clickAction);
  howBtn.addEventListener("click", () => setMode(MODE.HOW));
  resetBtn.addEventListener("click", () => {
    localStorage.removeItem("tm_attempts");
    localStorage.removeItem("tm_best");
    attempts = 0; best = Infinity;
    attemptsEl.textContent = "0";
    bestEl.textContent = "—";
    setMode(MODE.INTRO);
  });
  copyLink.addEventListener("click", (e) => { e.preventDefault(); copyShare(); });

  // Share buttons
  shareXBtn.addEventListener("click", shareTwitter);

  window.addEventListener("keydown", (e) => {
    if(e.code === "Space"){
      e.preventDefault();
      clickAction();
    }
  });

  // ====== Init ======
  attemptsEl.textContent = String(attempts);
  bestEl.textContent = isFinite(best) ? (best.toFixed(3) + "s") : "—";
  updateShareText(false);

  // ====== Intro modal ======
const introModal = document.getElementById("introModal");
const modalOkBtn = document.getElementById("modalOkBtn");
const modalMaybeBtn = document.getElementById("modalMaybeBtn");

function openModal(){
  // n'affiche qu'une fois par session (tu peux changer en localStorage si tu veux)
  if (sessionStorage.getItem("tm_seen_modal") === "1") return;
  sessionStorage.setItem("tm_seen_modal", "1");
  introModal.classList.add("show");
  introModal.setAttribute("aria-hidden", "false");
}

function closeModal(){
  introModal.classList.remove("show");
  introModal.setAttribute("aria-hidden", "true");
}

modalOkBtn?.addEventListener("click", closeModal);
modalMaybeBtn?.addEventListener("click", closeModal);

// click sur backdrop pour fermer
introModal?.addEventListener("click", (e) => {
  if (e.target && e.target.matches("[data-close]")) closeModal();
});


  setMode(MODE.INTRO);
  openModal();
})();
