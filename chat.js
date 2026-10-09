/* Chat-style contact widget.
   Messages are delivered by email through FormSubmit (https://formsubmit.co).
   The first submission triggers a one-time activation email to the inbox below. */
(() => {
  "use strict";
  const INBOX = "abindas3.2@gmail.com";
  const ENDPOINT = `https://formsubmit.co/ajax/${INBOX}`;
  const RATE = { minGapMs: 60 * 1000, maxPerDay: 3 };
  const MIN_HUMAN_MS = 6000; // a real person can't finish the chat faster than this
  const DISPOSABLE = ["mailinator.com", "tempmail.com", "temp-mail.org", "10minutemail.com", "guerrillamail.com", "yopmail.com", "trashmail.com", "getnada.com", "sharklasers.com", "dispostable.com", "maildrop.cc", "fakeinbox.com", "throwawaymail.com"];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (t) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  /* ---------- Validation ---------- */
  const validators = {
    name(v) {
      if (v.length < 2) return "Could you type your full name?";
      if (v.length > 60) return "That's a bit long. Just your name is fine.";
      if (!/^[\p{L}][\p{L} .'-]*$/u.test(v)) return "Please use letters only for your name.";
      return null;
    },
    email(v) {
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return "That doesn't look like a valid email. Mind checking it?";
      const domain = v.split("@")[1].toLowerCase();
      if (DISPOSABLE.includes(domain)) return "Temporary email addresses can't receive my reply. Please use your regular email.";
      return null;
    },
    short(v) {
      if (v.length < 2) return "Could you add a little more detail?";
      if (v.length > 120) return "Please keep this under 120 characters.";
      return spamCheck(v);
    },
    message(v) {
      if (v.length < 15) return "Could you tell me a bit more? A sentence or two is perfect.";
      if (v.length > 1000) return `That's ${v.length} characters. Please keep it under 1000.`;
      return spamCheck(v);
    },
  };
  function spamCheck(v) {
    if (/<[^>]+>/.test(v)) return "Please remove any HTML from your message.";
    if ((v.match(/https?:\/\/|www\./gi) || []).length > 2) return "Please include no more than 2 links.";
    if (/(.)\1{7,}/.test(v)) return "That looks like a typo. Mind rewriting it?";
    if (/\b(viagra|casino|crypto ?giveaway|seo services|backlinks?|loan offer)\b/i.test(v)) return "Sorry, this message looks like spam and can't be sent.";
    const letters = v.replace(/[^a-z]/gi, "");
    if (letters.length > 20 && letters === letters.toUpperCase()) return "Please don't write in all caps 🙂";
    return null;
  }
  function rateCheck() {
    const log = (store.get("chatSent") || []).filter((t) => Date.now() - t < 864e5);
    if (log.length >= RATE.maxPerDay) return "You've already sent a few messages today. I'll reply soon, or you can email me directly.";
    if (log.length && Date.now() - log[log.length - 1] < RATE.minGapMs) return "Please wait a minute before sending another message.";
    return null;
  }

  /* ---------- Conversation script ---------- */
  const SERVICES = ["Business website", "Web app / dashboard", "Mobile app", "Online store", "Speed-up / redesign", "Something else"];
  const flows = {
    project: [
      { key: "need", ask: "Nice! What do you need built?", chips: SERVICES },
      { key: "timeline", ask: "When would you like it ready?", chips: ["ASAP", "Within a month", "1–3 months", "Flexible"] },
      { key: "message", ask: "Tell me a bit about the project: what it's for and anything important.", input: "message", placeholder: "Describe your project…" },
    ],
    hire: [
      { key: "company", ask: "Great to hear! Which company are you hiring for?", input: "short", placeholder: "Company name" },
      { key: "role", ask: "And what's the role?", chips: ["Frontend Developer", "Full-stack Developer", "React Developer", "Mobile Developer"], input: "short", placeholder: "Or type the role…" },
      { key: "workType", ask: "What kind of position is it?", chips: ["Full-time · on-site", "Full-time · remote", "Hybrid", "Contract"] },
      { key: "message", ask: "Anything else I should know about the role or next steps?", input: "message", placeholder: "Role details, interview steps…" },
    ],
    hello: [
      { key: "message", ask: "Happy to hear from you! What's on your mind?", input: "message", placeholder: "Write your message…" },
    ],
  };

  /* ---------- Markup ---------- */
  const root = document.createElement("div");
  root.className = "chat";
  root.innerHTML = `
    <button class="chat__fab" type="button" aria-label="Open chat" aria-expanded="false" aria-controls="chatPanel">
      <span class="chat__fab-open"><svg class="bot" viewBox="0 0 64 64" aria-hidden="true">
        <line class="bot__ant" x1="32" y1="9" x2="32" y2="15"/><circle class="bot__ant-tip" cx="32" cy="7.5" r="2.6"/>
        <rect class="bot__head" x="11" y="14" width="42" height="30" rx="13"/>
        <rect class="bot__face" x="15.5" y="18.5" width="33" height="21" rx="10"/>
        <g class="bot__eyes">
          <g class="bot__eye"><circle cx="25" cy="29" r="6.2" class="bot__eye-w"/><circle cx="25.6" cy="29.4" r="3.4" class="bot__pupil"/><circle cx="27" cy="27.6" r="1.2" class="bot__shine"/></g>
          <g class="bot__eye"><circle cx="39" cy="29" r="6.2" class="bot__eye-w"/><circle cx="39.6" cy="29.4" r="3.4" class="bot__pupil"/><circle cx="41" cy="27.6" r="1.2" class="bot__shine"/></g>
        </g>
        <ellipse class="bot__blush" cx="19.5" cy="36" rx="2.6" ry="1.4"/><ellipse class="bot__blush" cx="44.5" cy="36" rx="2.6" ry="1.4"/>
        <path class="bot__smile" d="M29 36.2q3 2.4 6 0"/>
        <rect class="bot__neck" x="27" y="44" width="10" height="4" rx="1.5"/>
        <g class="bot__arm bot__arm--l"><rect x="11" y="47.5" width="6.5" height="10" rx="3.25"/></g><g class="bot__arm bot__arm--r"><rect x="46.5" y="47.5" width="6.5" height="10" rx="3.25"/></g>
        <rect class="bot__body" x="18" y="47" width="28" height="12" rx="5"/>
        <circle class="bot__light" cx="32" cy="53" r="2.2"/>
      </svg></span>
      <svg class="chat__fab-close" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      <span class="chat__badge" aria-hidden="true">1</span>
    </button>
    <div class="chat__teaser" role="status"><b>Hi there 👋</b> <span class="chat__teaser-text">Have a project or a role in mind? Let's chat.</span><button type="button" class="chat__teaser-x" aria-label="Dismiss">×</button></div>
    <section class="chat__panel" id="chatPanel" role="dialog" aria-label="Chat with Abin" aria-modal="false" hidden>
      <header class="chat__head">
        <span class="chat__avatar"><svg class="bot bot--sm" viewBox="0 0 64 64" aria-hidden="true">
        <line class="bot__ant" x1="32" y1="9" x2="32" y2="15"/><circle class="bot__ant-tip" cx="32" cy="7.5" r="2.6"/>
        <rect class="bot__head" x="11" y="14" width="42" height="30" rx="13"/>
        <rect class="bot__face" x="15.5" y="18.5" width="33" height="21" rx="10"/>
        <g class="bot__eyes">
          <g class="bot__eye"><circle cx="25" cy="29" r="6.2" class="bot__eye-w"/><circle cx="25.6" cy="29.4" r="3.4" class="bot__pupil"/><circle cx="27" cy="27.6" r="1.2" class="bot__shine"/></g>
          <g class="bot__eye"><circle cx="39" cy="29" r="6.2" class="bot__eye-w"/><circle cx="39.6" cy="29.4" r="3.4" class="bot__pupil"/><circle cx="41" cy="27.6" r="1.2" class="bot__shine"/></g>
        </g>
        <ellipse class="bot__blush" cx="19.5" cy="36" rx="2.6" ry="1.4"/><ellipse class="bot__blush" cx="44.5" cy="36" rx="2.6" ry="1.4"/>
        <path class="bot__smile" d="M29 36.2q3 2.4 6 0"/>
        <rect class="bot__neck" x="27" y="44" width="10" height="4" rx="1.5"/>
        <g class="bot__arm bot__arm--l"><rect x="11" y="47.5" width="6.5" height="10" rx="3.25"/></g><g class="bot__arm bot__arm--r"><rect x="46.5" y="47.5" width="6.5" height="10" rx="3.25"/></g>
        <rect class="bot__body" x="18" y="47" width="28" height="12" rx="5"/>
        <circle class="bot__light" cx="32" cy="53" r="2.2"/>
      </svg></span>
        <div class="chat__who"><b>Abin Das</b><small><span class="chat__live"></span>Online · replies by email</small></div>
        <button class="chat__icon" type="button" data-act="restart" aria-label="Start over" title="Start over"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>
        <button class="chat__icon" type="button" data-act="close" aria-label="Close chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </header>
      <div class="chat__log" role="log" aria-live="polite"></div>
      <div class="chat__chips"></div>
      <form class="chat__bar" novalidate>
        <input type="text" name="company_website" class="chat__hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <textarea class="chat__input" rows="1" placeholder="Type a message…" aria-label="Your reply" maxlength="1000"></textarea>
        <button class="chat__send" type="submit" aria-label="Send"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg></button>
      </form>
      <p class="chat__foot">Protected against spam · Your details are only used to reply</p>
    </section>`;
  document.body.appendChild(root);

  const fab = $(".chat__fab", root), panel = $(".chat__panel", root), log = $(".chat__log", root);
  const chipsEl = $(".chat__chips", root), bar = $(".chat__bar", root), input = $(".chat__input", root), hp = $(".chat__hp", root);
  const teaser = $(".chat__teaser", root);

  /* ---------- State ---------- */
  let data, intent, steps, stepIndex, mode, startedAt, busy = false;

  const scroll = () => log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  const addMsg = (html, who = "bot", extra = "") => {
    const m = document.createElement("div");
    m.className = `msg msg--${who} ${extra}`;
    m.innerHTML = `<div class="msg__bubble">${html}</div>`;
    log.appendChild(m);
    scroll();
    return m;
  };
  const botSay = (html, extra) => new Promise((resolve) => {
    const typing = addMsg('<span class="dots"><i></i><i></i><i></i></span>', "bot", "msg--typing");
    setTimeout(() => { typing.remove(); addMsg(html, "bot", extra); resolve(); }, reduceMotion ? 50 : 650);
  });
  const setChips = (list = []) => {
    chipsEl.innerHTML = list.map((c) => `<button type="button" class="chat__chip" data-val="${esc(c.value || c)}">${esc(c.label || c)}</button>`).join("");
    chipsEl.hidden = !list.length;
  };
  const setInput = (enabled, placeholder = "Type a message…") => {
    input.disabled = !enabled;
    $(".chat__send", root).disabled = !enabled;
    input.placeholder = enabled ? placeholder : "Choose an option above…";
    bar.classList.toggle("is-disabled", !enabled);
    if (enabled && panel.offsetParent) input.focus({ preventScroll: true });
  };

  /* ---------- Flow ---------- */
  async function start() {
    log.innerHTML = "";
    data = {}; intent = null; steps = []; stepIndex = 0; mode = "intent"; startedAt = Date.now();
    setChips(); setInput(false);
    await botSay("Hi! 👋 Thanks for stopping by.");
    await botSay("I'm Abin, a software engineer. What brings you here today?");
    setChips([{ label: "🚀 I have a project", value: "project" }, { label: "💼 I'm hiring", value: "hire" }, { label: "👋 Just saying hi", value: "hello" }]);
  }

  async function handle(raw) {
    if (busy) return;
    const value = raw.trim();
    if (!value) return;
    busy = true;
    try {
      if (mode === "intent") {
        intent = value; steps = flows[intent];
        const label = { project: "I have a project", hire: "I'm hiring", hello: "Just saying hi" }[intent];
        addMsg(esc(label), "me"); setChips();
        mode = "name";
        await botSay("Great! First, what's your name?");
        setInput(true, "Your name");
        return;
      }
      if (mode === "name" || mode === "email") {
        const err = validators[mode](value);
        addMsg(esc(value), "me");
        input.value = ""; autoGrow();
        if (err) { await botSay(err, "msg--warn"); setInput(true, mode === "name" ? "Your name" : "you@company.com"); return; }
        data[mode] = value;
        if (mode === "name") {
          mode = "email";
          await botSay(`Nice to meet you, <b>${esc(value.split(" ")[0])}</b>! What's your email, so I can reply?`);
          setInput(true, "you@company.com");
        } else {
          mode = "step"; stepIndex = 0;
          await askStep();
        }
        return;
      }
      if (mode === "step") {
        const step = steps[stepIndex];
        addMsg(esc(value).replace(/\n/g, "<br>"), "me");
        input.value = ""; autoGrow();
        if (step.input && !(step.chips || []).includes(value)) {
          const err = validators[step.input](value);
          if (err) { await botSay(err, "msg--warn"); setInput(true, step.placeholder); if (step.chips) setChips(step.chips); return; }
        }
        data[step.key] = value;
        setChips();
        stepIndex++;
        if (stepIndex < steps.length) await askStep();
        else await review();
        return;
      }
      if (mode === "review") {
        setChips();
        if (value === "send") { addMsg("Send it ✉️", "me"); await send(); }
        else { addMsg("Start over", "me"); await start(); }
      }
    } finally {
      busy = false;
    }
  }

  async function askStep() {
    const step = steps[stepIndex];
    await botSay(step.ask);
    setChips(step.chips || []);
    setInput(!!step.input, step.placeholder);
  }

  const LABELS = { name: "Name", email: "Email", need: "Project", timeline: "Timeline", company: "Company", role: "Role", workType: "Work type", message: "Message" };
  async function review() {
    mode = "review";
    setInput(false);
    const rows = Object.entries(data).map(([k, v]) => `<div><dt>${LABELS[k] || k}</dt><dd>${esc(v).replace(/\n/g, "<br>")}</dd></div>`).join("");
    await botSay(`Here's what I'll send:<dl class="msg__summary">${rows}</dl>`);
    setChips([{ label: "✉️ Send message", value: "send" }, { label: "↺ Start over", value: "restart" }]);
  }

  async function send() {
    setChips(); setInput(false);
    // Anti-spam gates: honeypot, human timing, rate limit
    if (hp.value) { await botSay("Thanks! Your message has been sent."); return; } // silently drop bots
    if (Date.now() - startedAt < MIN_HUMAN_MS) { await botSay("Whoa, that was fast! Please take a moment and try again.", "msg--warn"); setChips([{ label: "✉️ Send message", value: "send" }]); mode = "review"; return; }
    const limited = rateCheck();
    if (limited) { await botSay(`${limited} <a href="mailto:${INBOX}">${INBOX}</a>`, "msg--warn"); return; }

    if (location.protocol === "file:") {
      await botSay("I can't send messages while this page is opened as a local file. Please open the site from its web address (or a local server like <b>http://localhost:8000</b>) and try again.", "msg--warn");
      console.warn("[chat] FormSubmit does not accept submissions from file:// pages. Serve the site over http(s).");
      setChips([{ label: "↻ Try again", value: "send" }, { label: "↺ Start over", value: "restart" }]);
      mode = "review";
      return;
    }
    const typing = addMsg('<span class="dots"><i></i><i></i><i></i></span>', "bot", "msg--typing");
    const subject = {
      project: `New project enquiry: ${data.need || "Project"} from ${data.name}`,
      hire: `Hiring: ${data.role || "Role"} at ${data.company || "company"} (${data.name})`,
      hello: `New message from ${data.name}`,
    }[intent];
    const payload = {
      _subject: subject,
      _template: "table",
      _captcha: "false",
      _replyto: data.email,
      _honey: hp.value,
      "Enquiry type": { project: "Freelance project", hire: "Hiring", hello: "General" }[intent],
      ...Object.fromEntries(Object.entries(data).map(([k, v]) => [LABELS[k] || k, v])),
      "Sent from": location.href,
    };
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok || json.success === "false" || json.success === false) throw new Error(json.message || `HTTP ${res.status}`);
      store.set("chatSent", [...(store.get("chatSent") || []).filter((t) => Date.now() - t < 864e5), Date.now()]);
      await botSay(`✅ <b>Sent!</b> Thanks, ${esc(data.name.split(" ")[0])}. I'll reply to <b>${esc(data.email)}</b> soon.`, "msg--ok");
      setChips([{ label: "↺ Send another", value: "restart" }]);
      mode = "review";
    } catch (e) {
      typing.remove();
      console.warn("[chat] FormSubmit error:", e.message);
      if (/activation/i.test(e.message)) {
        await botSay("Almost ready! This inbox still needs a one-time activation, so your message couldn't be delivered yet.", "msg--warn");
      }
      const mail = `mailto:${INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(Object.entries(data).map(([k, v]) => `${LABELS[k] || k}: ${v}`).join("\n"))}`;
      await botSay(`Sorry, the message couldn't be sent right now. You can <a href="${mail}">send it by email instead</a>, or try again.`, "msg--warn");
      setChips([{ label: "↻ Try again", value: "send" }, { label: "↺ Start over", value: "restart" }]);
      mode = "review";
    }
  }

  /* ---------- Events ---------- */
  const open = (yes) => {
    panel.hidden = !yes;
    root.classList.toggle("is-open", yes);
    fab.setAttribute("aria-expanded", String(yes));
    fab.setAttribute("aria-label", yes ? "Close chat" : "Open chat");
    teaser.hidden = true;
    $(".chat__badge", root).hidden = true;
    if (yes && !log.children.length) start();
    if (yes && !input.disabled) input.focus({ preventScroll: true });
  };
  fab.addEventListener("click", () => open(panel.hidden));
  teaser.addEventListener("click", (e) => { if (e.target.closest(".chat__teaser-x")) { teaser.hidden = true; e.stopPropagation(); } else open(true); });
  root.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]");
    if (act?.dataset.act === "close") open(false);
    if (act?.dataset.act === "restart") start();
    const chip = e.target.closest(".chat__chip");
    if (chip) chip.dataset.val === "restart" ? start() : handle(chip.dataset.val);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { open(false); fab.focus(); } });
  bar.addEventListener("submit", (e) => { e.preventDefault(); handle(input.value); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handle(input.value); } });
  const autoGrow = () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 120) + "px"; };
  input.addEventListener("input", autoGrow);

  // Any element with [data-chat] opens the widget (optionally pre-selecting an intent)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-chat]");
    if (!t) return;
    e.preventDefault();
    open(true);
  });

  /* ---------- Intro: boot screen → robot waves, iris-reveals the page, flies to its corner ---------- */
  (function intro() {
    const html = document.documentElement;
    const done = () => window.dispatchEvent(new Event("introdone"));
    let seen = false;
    try { seen = !!sessionStorage.getItem("introSeen"); sessionStorage.setItem("introSeen", "1"); } catch { /* storage unavailable */ }
    if (reduceMotion) { html.classList.remove("intro-pending"); done(); return; }

    const full = !seen;
    const SIZE = full ? 150 : 90;
    const flier = document.createElement("div");
    flier.className = "flier is-hovering";
    flier.setAttribute("aria-hidden", "true");
    flier.style.width = flier.style.height = SIZE + "px";
    flier.appendChild($(".chat__fab .bot", root).cloneNode(true));
    flier.insertAdjacentHTML("beforeend", '<span class="flier__flame"><i></i><i></i></span><span class="flier__say"></span>');
    const say = $(".flier__say", flier);
    const place = (x, y) => { flier.style.left = x - SIZE / 2 + "px"; flier.style.top = y - SIZE / 2 + "px"; };

    let overlay = null, skipped = false, skipNow = () => {};
    if (full) {
      overlay = document.createElement("div");
      overlay.className = "intro";
      overlay.setAttribute("role", "status");
      overlay.setAttribute("aria-label", "Loading");
      const streaks = Array.from({ length: 26 }, () => `<i style="left:${Math.random() * 100}%;animation-duration:${0.5 + Math.random() * 0.9}s;animation-delay:${-Math.random()}s;height:${30 + Math.random() * 90}px;opacity:${0.15 + Math.random() * 0.45}"></i>`).join("");
      overlay.innerHTML = `
        <div class="intro__streaks" aria-hidden="true">${streaks}</div>
        <div class="intro__ring" aria-hidden="true"></div>
        <div class="intro__info">
          <p class="intro__name">Abin Das <span>Software Engineer</span></p>
          <ul class="intro__log">
            <li data-at="25">Loading components</li>
            <li data-at="55">Compiling styles</li>
            <li data-at="85">Waking up the robot</li>
          </ul>
          <div class="intro__meter"><div class="intro__bar"><span></span></div><b class="intro__pct">0%</b></div>
        </div>
        <button type="button" class="intro__skip">Skip intro ⏭</button>`;
      document.body.appendChild(overlay);
      html.classList.add("is-locked");
      flier.classList.add("is-asleep");
    }
    document.body.appendChild(flier);
    html.classList.remove("intro-pending");
    root.classList.add("is-landing");

    const startX = full ? innerWidth / 2 : -SIZE, startY = full ? innerHeight / 2 - 70 : innerHeight * 0.25;
    place(startX, startY);

    const wait = (ms) => new Promise((r) => setTimeout(r, skipped ? 0 : ms));
    const loaded = Promise.all([
      new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r, { once: true }))),
      document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve(),
    ]);

    async function bootScreen() {
      const pctEl = $(".intro__pct", overlay), bar = $(".intro__bar span", overlay), lines = [...overlay.querySelectorAll(".intro__log li")];
      const skipBtn = $(".intro__skip", overlay);
      let isLoaded = false, pct = 0;
      loaded.then(() => { isLoaded = true; });
      const skipP = new Promise((r) => { skipNow = () => { skipped = true; r(); }; });
      skipBtn.addEventListener("click", () => skipNow());
      const onKey = (e) => { if (e.key === "Escape") skipNow(); };
      addEventListener("keydown", onKey);

      setTimeout(() => flier.classList.remove("is-asleep"), 650); // eyes open, antenna lights
      const t0 = performance.now();
      await Promise.race([skipP, new Promise((resolve) => {
        const tick = (now) => {
          // ease toward 90% while loading; finish once loaded and a minimum time has passed
          const cap = isLoaded && now - t0 > 1200 ? 100 : 90;
          pct = Math.min(cap, pct + (cap - pct) * 0.08 + 0.35);
          const shown = Math.floor(pct);
          pctEl.textContent = shown + "%";
          bar.style.width = shown + "%";
          lines.forEach((l) => l.classList.toggle("is-done", shown >= +l.dataset.at));
          if (shown >= 100) return resolve();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })]);
      removeEventListener("keydown", onKey);
      pctEl.textContent = "100%"; bar.style.width = "100%";
      lines.forEach((l) => l.classList.add("is-done"));
      flier.classList.remove("is-asleep");
      overlay.classList.add("is-ready");
    }

    async function run() {
      if (full) {
        await bootScreen();
        await wait(250);
        // wave goodbye
        say.textContent = "Let's go! 🚀";
        flier.classList.add("is-waving", "is-saying");
        await wait(850);
        flier.classList.remove("is-saying");
        // iris-close the boot screen onto the robot, revealing the page
        overlay.style.setProperty("--ix", startX + "px");
        overlay.style.setProperty("--iy", startY + "px");
        overlay.classList.add("is-leaving");
        done();
        await wait(380);
      } else {
        await loaded;
        done();
      }
      flier.classList.remove("is-waving");
      await fly();
      if (overlay) { overlay.remove(); html.classList.remove("is-locked"); }
      land();
    }

    function fly() {
      return new Promise((resolve) => {
        const r = fab.getBoundingClientRect();
        const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
        const dx = ex - startX, dy = ey - startY;
        const end = 52 / SIZE;
        const lift = Math.max(140, Math.abs(dy) * 0.6);
        const pts = full
          ? [[0, 0, 1, 0], [0, -0.25, 1.06, -6], [-0.06, -0.5, 1.02, -14], [0.28, -0.62, 0.86, 10], [0.64, -0.25, 0.62, 20], [0.9, 0.5, 0.44, 24], [1, 1, end, 0]]
          : [[0, 0, 1, 0], [0.35, -0.6, 0.95, 14], [0.75, -0.1, 0.75, 20], [1, 1, end, 0]];
        const frames = pts.map(([fx, fy, sc, rot], i) => ({
          offset: i / (pts.length - 1),
          transform: `translate(${dx * fx}px, ${fy < 0 ? fy * lift : dy * fy}px) scale(${sc}) rotate(${rot}deg)`,
        }));
        flier.classList.add("is-flying");
        const anim = flier.animate(frames, { duration: full ? 1400 : 1000, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards" });
        // sparkly smoke trail
        let raf = 0, last = 0;
        const trail = (now) => {
          if (now - last > 22) {
            last = now;
            const b = flier.getBoundingClientRect();
            const puff = document.createElement("i");
            puff.className = "puff" + (Math.random() < 0.3 ? " puff--spark" : "");
            const s = Math.max(4, b.width * (0.06 + Math.random() * 0.07));
            puff.style.cssText = `left:${b.left + b.width / 2 - s / 2 + (Math.random() - 0.5) * b.width * 0.2}px;top:${b.top + b.height * 0.85}px;width:${s}px;height:${s}px`;
            document.body.appendChild(puff);
            setTimeout(() => puff.remove(), 900);
          }
          raf = requestAnimationFrame(trail);
        };
        raf = requestAnimationFrame(trail);
        anim.onfinish = () => { cancelAnimationFrame(raf); flier.remove(); resolve(); };
      });
    }

    function land() {
      root.classList.remove("is-landing");
      root.classList.add("is-landed");
      setTimeout(() => root.classList.remove("is-landed"), 900);
      if (full && panel.hidden) {
        $(".chat__teaser-text", root).textContent = "Need anything? I'm right here.";
        teaser.hidden = false;
        try { sessionStorage.setItem("chatTeased", "1"); } catch { /* storage unavailable */ }
        setTimeout(() => { teaser.hidden = true; $(".chat__teaser-text", root).textContent = "Have a project or a role in mind? Let's chat."; }, 5000);
      }
    }

    run();
  })();

  // The mascot's eyes follow the cursor
  if (window.matchMedia("(pointer: fine)").matches && !reduceMotion) {
    const pupils = root.querySelectorAll(".chat__fab .bot__pupil, .chat__fab .bot__shine");
    window.addEventListener("pointermove", (e) => {
      const r = fab.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300) * 2.2;
      pupils.forEach((p) => { p.style.transform = `translate(${(dx / d) * k}px, ${(dy / d) * k}px)`; });
    }, { passive: true });
  }

  // Gentle teaser after a while, once per session
  teaser.hidden = true;
  try {
    if (!sessionStorage.getItem("chatTeased")) {
      setTimeout(() => { if (panel.hidden) { teaser.hidden = false; sessionStorage.setItem("chatTeased", "1"); } }, 9000);
    }
  } catch { /* storage unavailable */ }
})();
