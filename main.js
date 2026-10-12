(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const reveal = () => requestAnimationFrame(() => document.body.classList.add("is-loaded"));
  if (root.classList.contains("intro-pending")) {
    window.addEventListener("introdone", reveal, { once: true });
    setTimeout(reveal, 8000); // safety net if the intro never runs
  } else reveal();

  /* ---------- Theme (dark by default) ---------- */
  const isDark = () => root.dataset.theme !== "light";
  const themeBtn = $("#themeToggle");
  const syncThemeUI = () => {
    themeBtn.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
    $('meta[name="theme-color"]').setAttribute("content", getComputedStyle(root).getPropertyValue("--bg").trim() || (isDark() ? "#0f0b0c" : "#fdfafa"));
  };
  syncThemeUI();
  themeBtn.addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch { /* storage unavailable */ }
    syncThemeUI();
    orb && orb.setTheme(isDark());
    lab && lab.setTheme();
  });

  /* ---------- Accent palette picker ---------- */
  const accentWrap = $("#accent");
  if (accentWrap) {
    const btn = $("#accentBtn", accentWrap);
    const swatches = $$(".swatch", accentWrap);
    const nameEl = $("#accentName", accentWrap);
    const setOpen = (open) => {
      accentWrap.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    };
    const sync = () => {
      const cur = root.dataset.accent || "red";
      swatches.forEach((s) => {
        const on = s.dataset.accent === cur;
        s.setAttribute("aria-checked", String(on));
        s.tabIndex = on ? 0 : -1;
        if (on) nameEl.textContent = s.getAttribute("aria-label");
      });
    };
    const pick = (key) => {
      if (key === "red") delete root.dataset.accent; else root.dataset.accent = key;
      try { localStorage.setItem("accent", key); } catch { /* storage unavailable */ }
      sync();
      syncThemeUI();
      orb && orb.setTheme(isDark());
      lab && lab.setTheme();
    };
    sync();
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !accentWrap.classList.contains("is-open");
      setOpen(open);
      if (open) (swatches.find((s) => s.tabIndex === 0) || swatches[0]).focus({ preventScroll: true });
    });
    swatches.forEach((s, i) => {
      s.addEventListener("click", () => pick(s.dataset.accent));
      s.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const next = swatches[(i + step + swatches.length) % swatches.length];
        next.focus();
        pick(next.dataset.accent);
      });
    });
    document.addEventListener("click", (e) => { if (!accentWrap.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && accentWrap.classList.contains("is-open")) { setOpen(false); btn.focus(); }
    });
  }

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const progress = $("#progress");
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 20);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const menuBtn = $("#menuBtn");
  const navLinks = $("#navLinks");
  const setMenu = (open) => {
    navLinks.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  menuBtn.addEventListener("click", () => setMenu(!navLinks.classList.contains("is-open")));
  navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  document.addEventListener("click", (e) => { if (!e.target.closest("#nav")) setMenu(false); });

  const links = $$("a", navLinks).filter((a) => !a.closest(".nav__mobile-cta"));
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => { const s = $(a.getAttribute("href")); if (s) sectionObserver.observe(s); });

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.transitionDelay = Math.min(siblings.indexOf(el), 6) * 70 + "ms";
    revealObserver.observe(el);
  });

  /* ---------- Count-up stats ---------- */
  if (!reduceMotion) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target, end = +el.dataset.count, suffix = el.dataset.suffix || "", t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / 1200, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        countObserver.unobserve(el);
      });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach((c) => countObserver.observe(c));
  }

  /* ---------- Pointer effects: magnetic buttons + card spotlight ---------- */
  if (finePointer && !reduceMotion) {
    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--mx", (e.clientX - r.left - r.width / 2) * 0.18 + "px");
        btn.style.setProperty("--my", (e.clientY - r.top - r.height / 2) * 0.28 + "px");
      });
      btn.addEventListener("pointerleave", () => { btn.style.setProperty("--mx", "0px"); btn.style.setProperty("--my", "0px"); });
    });
    $$(".spot").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--sx", e.clientX - r.left + "px");
        card.style.setProperty("--sy", e.clientY - r.top + "px");
      });
    });
  }

  /* ---------- Toast + copy ---------- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2400);
  };
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copy); showToast("Copied to clipboard"); }
      catch { showToast(btn.dataset.copy); }
    });
  });

  /* ---------- Work-with-me switch ---------- */
  const ways = $("#ways");
  if (ways) {
    const setMode = (mode) => {
      ways.dataset.mode = mode;
      $$(".ways__tab", ways).forEach((t) => t.setAttribute("aria-selected", String(t.dataset.mode === mode)));
      $$(".ways__panel", ways).forEach((p) => {
        const on = p.dataset.panel === mode;
        p.hidden = !on;
        if (on) { p.classList.add("is-in"); p.classList.remove("is-entering"); void p.offsetWidth; p.classList.add("is-entering"); }
      });
    };
    $$(".ways__tab", ways).forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));
  }

  /* ---------- Contact form: project / hiring ---------- */
  const form = $("#contactForm");
  const message = form.elements.message;
  const msgLabel = $('label[for="f-msg"]', form);
  const submitLabel = $("#submitLabel");
  const msgCount = $("#msgCount");
  const done = $("#formDone");
  const copyFor = {
    project: { label: "Tell me about the project", submit: "Send project details" },
    hire: { label: "Tell me about the role and team", submit: "Send interview invite" },
  };
  let intent = "project";
  const setIntent = (next) => {
    if (!copyFor[next]) return;
    intent = next;
    const radio = $(`input[name="intent"][value="${next}"]`, form);
    if (radio) radio.checked = true;
    $$(".cform__group", form).forEach((g) => {
      const on = g.dataset.for === next;
      g.hidden = !on;
      if (on) { g.classList.remove("is-entering"); void g.offsetWidth; g.classList.add("is-entering"); }
    });
    msgLabel.textContent = copyFor[next].label;
    submitLabel.textContent = copyFor[next].submit;
  };
  $$('input[name="intent"]', form).forEach((r) => r.addEventListener("change", () => setIntent(r.value)));
  // Any CTA with data-intent pre-selects the matching option
  $$("a[data-intent]").forEach((a) => a.addEventListener("click", () => setIntent(a.dataset.intent)));

  message.addEventListener("input", () => { msgCount.textContent = `${message.value.length} / 1000`; });
  $$("input, textarea", form).forEach((f) => f.addEventListener("input", () => f.removeAttribute("aria-invalid")));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    $$("[required]", form).forEach((f) => {
      const valid = f.value.trim() && (f.type !== "email" || /^\S+@\S+\.\S+$/.test(f.value.trim()));
      f.setAttribute("aria-invalid", valid ? "false" : "true");
      if (!valid && ok) { f.focus(); ok = false; }
    });
    if (!ok) { showToast("Please fill in the highlighted fields"); return; }

    const d = Object.fromEntries(new FormData(form));
    let subject, lines;
    if (intent === "hire") {
      subject = `Interview: ${d.role || "Developer role"}${d.company ? " at " + d.company : ""}`;
      lines = [`Company: ${d.company || "-"}`, `Role: ${d.role || "-"}`, `Work type: ${d.workType}`];
    } else {
      subject = `Project enquiry: ${d.projectType}`;
      lines = [`Project: ${d.projectType}`, `Budget: ${d.budget || "Not specified"}`, `Timeline: ${d.timeline}`];
    }
    const body = `${d.message}\n\n${lines.join("\n")}\n\n— ${d.name}\n${d.email}`;
    window.location.href = `mailto:abindas3.2@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    done.hidden = false;
    $("#formNote").textContent = "Your email app should now be open with your message ready to send.";
    $("#formEdit").focus();
  });
  $("#formEdit").addEventListener("click", () => { done.hidden = true; message.focus(); });

  /* ---------- Contact panel: rotating word + local time ---------- */
  const swap = $("#ctaSwap");
  if (swap && !reduceMotion) {
    const words = ["real.", "fast.", "beautiful.", "live."];
    let wi = 0;
    setInterval(() => {
      const cur = $("span:not(.is-out)", swap);
      wi = (wi + 1) % words.length;
      const next = document.createElement("span");
      next.textContent = words[wi];
      cur.classList.add("is-out");
      swap.appendChild(next);
      setTimeout(() => cur.remove(), 500);
    }, 2600);
  }
  const localTime = $("#localTime");
  if (localTime) {
    const fmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });
    const tickTime = () => { localTime.textContent = fmt.format(new Date()); };
    tickTime();
    setInterval(tickTime, 30000);
  }

  /* ---------- Skills orbit: highlight a category from the legend ---------- */
  const orbitEl = $("#orbit");
  if (orbitEl) {
    let pinned = null;
    const focus = (cat) => { if (cat) orbitEl.dataset.focus = cat; else delete orbitEl.dataset.focus; };
    $$(".legend__item").forEach((btn) => {
      const cat = btn.dataset.cat;
      btn.addEventListener("mouseenter", () => focus(cat));
      btn.addEventListener("mouseleave", () => focus(pinned));
      btn.addEventListener("focus", () => focus(cat));
      btn.addEventListener("blur", () => focus(pinned));
      btn.addEventListener("click", () => {
        pinned = pinned === cat ? null : cat;
        $$(".legend__item").forEach((b) => b.classList.toggle("is-active", b.dataset.cat === pinned));
        $$(".legend__item").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === pinned)));
        focus(pinned);
      });
    });
  }

  $("#year").textContent = new Date().getFullYear();

  /* ---------- 3D laptop + phone (Three.js) ---------- */
  const orb = (() => {
    const canvas = $("#orb");
    const wrap = canvas.parentElement;
    if (!window.THREE) return null;
    const THREE = window.THREE;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    /* ----- Canvas helpers ----- */
    const rr = (ctx, x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    const makeTexture = (w, h) => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const tex = new THREE.CanvasTexture(c);
      tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = maxAniso;
      return { c, ctx: c.getContext("2d"), tex };
    };
    const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
    const SANS = '"Inter", system-ui, sans-serif';

    // Accent colours for the screens and lights, refreshed from CSS when the palette changes
    const A = { c1: "#ef4444", c2: "#dc2626", c3: "#f97316", soft: "#fca5a5" };
    const readAccent = () => {
      const css = getComputedStyle(root), v = (n, f) => css.getPropertyValue(n).trim() || f;
      A.c1 = v("--c1", "#ef4444"); A.c3 = v("--c3", "#f97316");
      // the screens are always dark, so use the dark-theme accent text for soft highlights
      A.soft = isDark() ? v("--accent-text", "#fca5a5") : v("--hl-to", "#fca5a5");
      A.c2 = v("--accent", "#dc2626");
    };
    readAccent();

    /* ----- Laptop screen: code editor that types itself ----- */
    const C = { kw: "#c792ea", fn: "#82aaff", str: "#c3e88d", tag: "#f07178", attr: "#ffcb6b", p: "#89ddff", pl: "#ece4e5", cm: "#7a6a6c" };
    const code = [
      [["import", "kw"], [" { ", "p"], ["useOrders", "fn"], [" } ", "p"], ["from", "kw"], [' "./api"', "str"], [";", "p"]],
      [],
      [["export default function ", "kw"], ["Checkout", "fn"], ["() {", "p"]],
      [["  const ", "kw"], ["{ items, total }", "pl"], [" = ", "p"], ["useOrders", "fn"], ["();", "p"]],
      [],
      [["  return ", "kw"], ["(", "p"]],
      [["    <", "p"], ["main ", "tag"], ["className", "attr"], ["=", "p"], ['"grid gap-4"', "str"], [">", "p"]],
      [["      {items.", "pl"], ["map", "fn"], ["(i => <", "p"], ["Item ", "tag"], ["key", "attr"], ["={i.id} {...i} />)}", "p"]],
      [["      <", "p"], ["Pay ", "tag"], ["amount", "attr"], ["={total} />", "p"]],
      [["    </", "p"], ["main", "tag"], [">", "p"]],
      [["  );", "p"]],
      [["}", "p"]],
      [],
      [["// responsive · accessible · fast", "cm"]],
    ];
    const totalChars = code.reduce((n, line) => n + line.reduce((m, [t]) => m + t.length, 0) + 1, 0);

    const lap = makeTexture(1280, 800);
    const drawLaptop = (chars, caretOn) => {
      const { ctx } = lap, W = 1280, H = 800;
      ctx.fillStyle = "#1a1416"; ctx.fillRect(0, 0, W, H);
      // title bar
      ctx.fillStyle = "#120e0f"; ctx.fillRect(0, 0, W, 46);
      [["#ff5f57", 26], ["#febc2e", 50], ["#28c840", 74]].forEach(([col, x]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, 23, 7, 0, 7); ctx.fill(); });
      ctx.fillStyle = "#1a1416"; rr(ctx, 230, 8, 190, 38, 8); ctx.fill(); ctx.fillRect(230, 30, 190, 16);
      ctx.font = `500 17px ${MONO}`; ctx.fillStyle = "#ece4e5"; ctx.fillText("Checkout.jsx", 252, 33);
      ctx.fillStyle = "#7a6a6c"; ctx.fillText("Item.jsx", 450, 33);
      // sidebar
      ctx.fillStyle = "#161112"; ctx.fillRect(0, 46, 210, H - 46 - 34);
      ctx.font = `600 13px ${SANS}`; ctx.fillStyle = "#7a6a6c"; ctx.fillText("EXPLORER", 22, 82);
      const files = [["▾ src", 0], ["api.js", 1], ["Checkout.jsx", 1], ["Item.jsx", 1], ["Pay.jsx", 1], ["▾ app", 0], ["layout.jsx", 1], ["page.jsx", 1]];
      files.forEach(([name, indent], i) => {
        const y = 118 + i * 34;
        if (name === "Checkout.jsx") { ctx.fillStyle = "rgba(239,68,68,0.2)"; ctx.fillRect(0, y - 22, 210, 32); }
        ctx.font = `${indent ? 400 : 600} 16px ${SANS}`;
        ctx.fillStyle = name === "Checkout.jsx" ? "#ffffff" : indent ? "#c4b5b7" : "#8f7f81";
        ctx.fillText(name, 22 + indent * 18, y);
      });
      // code
      ctx.font = `400 21px ${MONO}`;
      let left = chars, caret = null;
      code.forEach((line, li) => {
        const y = 100 + li * 38;
        ctx.fillStyle = "#4f4042"; ctx.textAlign = "right"; ctx.fillText(String(li + 1), 270, y); ctx.textAlign = "left";
        let x = 296;
        for (const [text, kind] of line) {
          if (left <= 0) break;
          const part = text.slice(0, left);
          ctx.fillStyle = C[kind];
          ctx.fillText(part, x, y);
          x += ctx.measureText(part).width;
          left -= part.length;
        }
        if (left > 0) left -= 1; // newline
        else if (!caret) caret = [x, y];
      });
      if (!caret) caret = [296, 100 + (code.length - 1) * 38];
      if (caretOn) { ctx.fillStyle = A.soft; ctx.fillRect(caret[0] + 2, caret[1] - 20, 3, 26); }
      // status bar
      ctx.fillStyle = A.c2; ctx.fillRect(0, H - 34, W, 34);
      ctx.font = `500 15px ${SANS}`; ctx.fillStyle = "#ffffff";
      ctx.fillText("⎇ main", 18, H - 12);
      ctx.fillText(chars >= totalChars ? "✓ Compiled successfully" : "● Editing…", 120, H - 12);
      ctx.textAlign = "right"; ctx.fillText("React · JSX · UTF-8", W - 18, H - 12); ctx.textAlign = "left";
      lap.tex.needsUpdate = true;
    };

    /* ----- Phone screen: food delivery app ----- */
    const ph = makeTexture(450, 940);
    const drawPhone = (t) => {
      const { ctx } = ph, W = 450, H = 940;
      ctx.fillStyle = "#120d0e"; ctx.fillRect(0, 0, W, H);
      ctx.font = `600 17px ${SANS}`; ctx.fillStyle = "#f3eeee"; ctx.fillText("9:41", 36, 46);
      ctx.fillStyle = "#f3eeee"; rr(ctx, W - 66, 34, 30, 14, 4); ctx.fill();
      ctx.fillStyle = "#000"; rr(ctx, W / 2 - 60, 22, 120, 34, 17); ctx.fill(); // notch
      ctx.font = `400 17px ${SANS}`; ctx.fillStyle = "#8f7f81"; ctx.fillText("Deliver to", 30, 104);
      ctx.font = `700 25px ${SANS}`; ctx.fillStyle = "#ffffff"; ctx.fillText("Home · Kowdiar", 30, 136);
      // search
      ctx.fillStyle = "#221a1b"; rr(ctx, 30, 160, W - 60, 54, 16); ctx.fill();
      ctx.font = `400 17px ${SANS}`; ctx.fillStyle = "#8f7f81"; ctx.fillText("Search dishes, restaurants", 62, 194);
      // promo card
      const g = ctx.createLinearGradient(30, 236, W - 30, 400);
      g.addColorStop(0, A.c1); g.addColorStop(1, A.c3);
      ctx.fillStyle = g; rr(ctx, 30, 236, W - 60, 150, 22); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.beginPath(); ctx.arc(W - 70, 270 + Math.sin(t * 1.5) * 6, 70, 0, 7); ctx.fill();
      ctx.font = `700 27px ${SANS}`; ctx.fillStyle = "#fff"; ctx.fillText("Free delivery", 54, 296);
      ctx.font = `400 17px ${SANS}`; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillText("on your first 3 orders", 54, 326);
      ctx.fillStyle = "#fff"; rr(ctx, 54, 342, 110, 30, 15); ctx.fill();
      ctx.font = `700 14px ${SANS}`; ctx.fillStyle = A.c2; ctx.fillText("Order now", 72, 362);
      // categories
      ["Biryani", "Pizza", "Dosa", "Shakes"].forEach((c, i) => {
        const x = 30 + i * 100, on = i === Math.floor(t / 1.6) % 4;
        ctx.fillStyle = on ? A.c1 : "#221a1b"; rr(ctx, x, 408, 90, 40, 20); ctx.fill();
        ctx.font = `600 15px ${SANS}`; ctx.fillStyle = on ? "#fff" : "#c4b5b7"; ctx.textAlign = "center"; ctx.fillText(c, x + 45, 434); ctx.textAlign = "left";
      });
      // order tracking card
      ctx.fillStyle = "#1a1415"; rr(ctx, 30, 472, W - 60, 150, 20); ctx.fill();
      ctx.strokeStyle = A.soft; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.5; rr(ctx, 30, 472, W - 60, 150, 20); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.font = `700 20px ${SANS}`; ctx.fillStyle = "#fff"; ctx.fillText("Order on the way", 54, 510);
      const p = (t * 0.18) % 1.15, prog = Math.min(p, 1);
      const mins = Math.max(1, Math.round(18 * (1 - prog)));
      ctx.font = `400 16px ${SANS}`; ctx.fillStyle = "#c4b5b7"; ctx.fillText(prog >= 1 ? "Delivered · enjoy your meal" : `Arriving in ${mins} min`, 54, 538);
      const bx = 54, bw = W - 108, by = 572;
      ctx.fillStyle = "#2e2324"; rr(ctx, bx, by, bw, 10, 5); ctx.fill();
      const bg2 = ctx.createLinearGradient(bx, 0, bx + bw, 0); bg2.addColorStop(0, A.c1); bg2.addColorStop(1, A.c3);
      ctx.fillStyle = bg2; rr(ctx, bx, by, Math.max(10, bw * prog), 10, 5); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(bx + bw * prog, by + 5, 9, 0, 7); ctx.fill();
      ctx.fillStyle = A.c3; ctx.beginPath(); ctx.arc(bx + bw * prog, by + 5, 5, 0, 7); ctx.fill();
      ["Placed", "Cooking", "On the way", "Delivered"].forEach((s, i) => {
        ctx.font = `500 12px ${SANS}`; ctx.fillStyle = prog >= i / 3 ? A.soft : "#5e4f51";
        ctx.textAlign = i === 0 ? "left" : i === 3 ? "right" : "center";
        ctx.fillText(s, bx + (bw * i) / 3, by + 34);
      });
      ctx.textAlign = "left";
      // restaurant list
      [["Spice Route", "North Indian · 25 min", "#f59e0b"], ["Green Bowl", "Healthy · 18 min", "#10b981"]].forEach(([n, m, col], i) => {
        const y = 646 + i * 92;
        ctx.fillStyle = "#1a1415"; rr(ctx, 30, y, W - 60, 78, 18); ctx.fill();
        const gg = ctx.createLinearGradient(44, y + 12, 98, y + 66); gg.addColorStop(0, col); gg.addColorStop(1, A.c1);
        ctx.fillStyle = gg; rr(ctx, 44, y + 12, 54, 54, 14); ctx.fill();
        ctx.font = `700 18px ${SANS}`; ctx.fillStyle = "#fff"; ctx.fillText(n, 114, y + 36);
        ctx.font = `400 15px ${SANS}`; ctx.fillStyle = "#8f7f81"; ctx.fillText(m, 114, y + 60);
        ctx.font = `700 15px ${SANS}`; ctx.fillStyle = A.soft; ctx.textAlign = "right"; ctx.fillText("★ 4." + (6 + i), W - 50, y + 46); ctx.textAlign = "left";
      });
      // tab bar
      ctx.fillStyle = "#1a1415"; ctx.fillRect(0, H - 92, W, 92);
      [0, 1, 2, 3].forEach((i) => {
        const x = 70 + i * 103;
        ctx.fillStyle = i === 0 ? A.c1 : "#4f4042";
        rr(ctx, x - 14, H - 64, 28, 28, 8); ctx.fill();
      });
      ctx.fillStyle = "#f3eeee"; rr(ctx, W / 2 - 66, H - 18, 132, 6, 3); ctx.fill();
      ph.tex.needsUpdate = true;
    };

    /* ----- Materials ----- */
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b3335, metalness: 0.65, roughness: 0.32 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0d0a0b, metalness: 0.3, roughness: 0.6 });
    const keyMat = new THREE.MeshStandardMaterial({ color: 0x1e1819, metalness: 0.2, roughness: 0.7 });
    const screenMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });

    // Rounded-rectangle shape with UVs normalised to 0..1 so a canvas texture maps cleanly
    const roundedShape = (w, h, r) => {
      const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    };
    const normaliseUV = (geo, w, h) => {
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
      uv.needsUpdate = true;
      return geo;
    };

    /* ----- Laptop ----- */
    const laptop = new THREE.Group();
    const LW = 3.3, LD = 2.2;
    const base = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedShape(LW, LD, 0.14), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 8 }), bodyMat);
    base.rotation.x = -Math.PI / 2;
    laptop.add(base);
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.3, 1.0), keyMat);
    deck.rotation.x = -Math.PI / 2; deck.position.set(0, 0.125, -0.38);
    laptop.add(deck);
    // key grid
    const keyGeo = new THREE.BoxGeometry(0.17, 0.02, 0.17);
    const keys = new THREE.InstancedMesh(keyGeo, darkMat, 13 * 5);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 13; c++) { m4.makeTranslation(-1.26 + c * 0.21, 0.135, -0.78 + r * 0.2); keys.setMatrixAt(k++, m4); }
    laptop.add(keys);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.62), keyMat);
    pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.126, 0.55);
    laptop.add(pad);

    const lid = new THREE.Group();
    lid.position.set(0, 0.11, -LD / 2 + 0.02);
    const lidH = 2.15;
    const lidBody = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedShape(LW, lidH, 0.14), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 8 }), bodyMat);
    lidBody.position.set(0, lidH / 2, -0.07);
    lid.add(lidBody);
    const bezel = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.08, lidH - 0.08), darkMat);
    bezel.position.set(0, lidH / 2, 0.006);
    lid.add(bezel);
    const lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.26, (LW - 0.26) * (800 / 1280)), screenMat(lap.tex));
    lapScreen.position.set(0, lidH / 2 + 0.02, 0.008);
    lid.add(lapScreen);
    lid.rotation.x = -0.2;
    laptop.add(lid);

    /* ----- Phone ----- */
    const phone = new THREE.Group();
    const PW = 1.0, PH = 2.05;
    const pBody = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedShape(PW, PH, 0.16), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 10 }), bodyMat);
    pBody.position.z = -0.08;
    phone.add(pBody);
    const pFace = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(PW - 0.02, PH - 0.02, 0.15), 10), darkMat);
    pFace.position.z = 0.021;
    phone.add(pFace);
    const sw = PW - 0.09, sh = sw * (940 / 450);
    const pScreen = new THREE.Mesh(normaliseUV(new THREE.ShapeGeometry(roundedShape(sw, sh, 0.12), 10), sw, sh), screenMat(ph.tex));
    pScreen.position.z = 0.023;
    phone.add(pScreen);

    /* ----- Layout ----- */
    const rig = new THREE.Group();
    laptop.position.set(-0.45, -1.05, -0.3);
    laptop.rotation.set(0.32, 0.42, 0);
    phone.position.set(1.65, -0.35, 0.95);
    phone.rotation.set(0.05, -0.38, 0.06);
    rig.add(laptop, phone);
    scene.add(rig);
    rig.updateMatrixWorld(true);
    const fitBox = new THREE.Box3().setFromObject(rig);
    const fitSize = fitBox.getSize(new THREE.Vector3());
    const fitCenter = fitBox.getCenter(new THREE.Vector3());
    const viewDir = new THREE.Vector3(0.05, 0.16, 1).normalize();

    /* ----- Lights ----- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 5, 5); scene.add(key);
    const red = new THREE.PointLight(0xef4444, 1.3, 14); red.position.set(-3.5, 1.5, 2.5); scene.add(red);
    const orange = new THREE.PointLight(0xfb923c, 0.9, 12); orange.position.set(3.5, -1, 3); scene.add(orange);

    const setTheme = (dark) => {
      bodyMat.color.set(dark ? 0x3b3335 : 0xdcd4d4);
      keyMat.color.set(dark ? 0x1e1819 : 0xc6baba);
      readAccent();
      red.color.set(A.c1);
      orange.color.set(A.c3);
      drawAll();
      if (!running) render();
    };

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Frame both devices: fit their bounding box (plus ~10% for float and tilt) to the canvas
      const vfov = THREE.MathUtils.degToRad(camera.fov);
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      const distW = (fitSize.x * 0.55) / Math.tan(hfov / 2);
      const distH = (fitSize.y * 0.6) / Math.tan(vfov / 2);
      const dist = Math.max(distW, distH) + fitSize.z * 0.5;
      camera.position.copy(fitCenter).addScaledVector(viewDir, dist);
      camera.lookAt(fitCenter);
      camera.updateProjectionMatrix();
      if (!running) render();
    };

    const target = { x: 0, y: 0 };
    if (finePointer) {
      window.addEventListener("pointermove", (e) => {
        target.x = (e.clientX / window.innerWidth - 0.5) * 2;
        target.y = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    // Typing state: type, hold, then restart
    const typing = { chars: totalChars, acc: 0, hold: 0 }; // start with the full snippet, then retype
    const clock = { t: 0, last: performance.now() };
    let running = false, raf = 0, phoneAcc = 0, lastCaret = null;

    const render = () => renderer.render(scene, camera);
    const frame = (now) => {
      const dt = Math.min((now - clock.last) / 1000, 0.05);
      clock.last = now;
      clock.t += dt;
      const t = clock.t;

      // advance typing
      if (typing.chars < totalChars) {
        typing.acc += dt;
        while (typing.acc > 0.035 && typing.chars < totalChars) { typing.acc -= 0.035; typing.chars++; }
      } else if ((typing.hold += dt) > 3.5) { typing.chars = 0; typing.hold = 0; }
      const caretOn = Math.floor(t * 2) % 2 === 0;
      if (typing.chars !== lap.lastChars || caretOn !== lastCaret) { drawLaptop(typing.chars, caretOn); lap.lastChars = typing.chars; lastCaret = caretOn; }
      if ((phoneAcc += dt) > 1 / 30) { phoneAcc = 0; drawPhone(t); }

      // float + follow pointer
      laptop.position.y = -1.05 + Math.sin(t * 0.9) * 0.05;
      phone.position.y = -0.35 + Math.sin(t * 1.1 + 1.4) * 0.09;
      phone.rotation.z = 0.06 + Math.sin(t * 0.8) * 0.02;
      rig.rotation.y += (target.x * 0.22 - rig.rotation.y) * 0.05;
      rig.rotation.x += (target.y * 0.1 - rig.rotation.x) * 0.05;
      render();
      raf = requestAnimationFrame(frame);
    };
    const play = () => { if (running || reduceMotion) return; running = true; clock.last = performance.now(); raf = requestAnimationFrame(frame); };
    const pause = () => { running = false; cancelAnimationFrame(raf); };

    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible && !document.hidden ? play() : pause(); }).observe(wrap);
    document.addEventListener("visibilitychange", () => (document.hidden || !visible ? pause() : play()));
    new ResizeObserver(resize).observe(canvas);
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); pause(); canvas.classList.remove("is-ready"); const f = $(".orb-fallback", wrap); if (f) f.style.display = ""; });

    // Redraw screens once web fonts are ready so the canvas text uses them
    const drawAll = () => { drawLaptop(typing.chars, true); drawPhone(clock.t); if (!running) render(); };
    drawAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);

    resize();
    setTheme(isDark());
    render();
    canvas.classList.add("is-ready");
    const fallback = $(".orb-fallback", wrap);
    if (fallback) fallback.style.display = "none";
    play();
    return { setTheme };
  })();

  /* ---------- Education card: engineering projects (3D printer + app-controlled pick-and-place arm) ---------- */
  const lab = (() => {
    const canvas = $("#lab");
    if (!canvas || !window.THREE) return null;
    const THREE = window.THREE;
    const wrap = canvas.parentElement;
    const card = canvas.closest(".edu");

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(2, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0xffffff, 0.6, 20);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    const mat = {
      accent: new THREE.MeshStandardMaterial({ metalness: 0.25, roughness: 0.4 }),
      part: new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.5, transparent: true }),
      frame: new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.45 }),
      dark: new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.6 }),
    };
    const rig = new THREE.Group();
    scene.add(rig);
    const box = (w, h, d, m, x = 0, y = 0, z = 0, parent = rig) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };
    const cyl = (r, h, m, x = 0, y = 0, z = 0, parent = rig, axis = "y") => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), m);
      if (axis === "z") mesh.rotation.x = Math.PI / 2;
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    /* ----- Compact 3D printer (i3 style: moving bed, gantry, hotend) ----- */
    const printer = new THREE.Group();
    printer.position.set(-1.45, 0, -0.1);
    rig.add(printer);
    box(1.0, 0.06, 0.9, mat.dark, 0, 0.03, 0, printer);
    const bed = new THREE.Group();
    printer.add(bed);
    box(0.8, 0.04, 0.7, mat.frame, 0, 0.2, 0, bed);
    box(0.06, 0.12, 0.5, mat.dark, 0, 0.12, 0, bed);
    [-0.48, 0.48].forEach((x) => box(0.06, 1.3, 0.06, mat.frame, x, 0.65, -0.42, printer));
    box(1.02, 0.06, 0.06, mat.frame, 0, 1.3, -0.42, printer);
    const gantry = new THREE.Group();
    printer.add(gantry);
    box(0.96, 0.05, 0.05, mat.frame, 0, 0, -0.36, gantry);
    const hotend = new THREE.Group();
    gantry.add(hotend);
    box(0.16, 0.18, 0.26, mat.accent, 0, 0.02, -0.22, hotend);
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 16), mat.dark);
    nozzle.rotation.x = Math.PI;
    nozzle.position.set(0, -0.11, -0.12);
    hotend.add(nozzle);
    const BED_TOP = 0.22, PART = 0.2, PART_Z = -0.12;

    // The printed part lives in the rig so the arm can carry it out of the printer
    const part = box(PART, PART, PART, mat.part);

    /* ----- Drop-off tray ----- */
    const TRAY = new THREE.Vector3(1.25, 0, 0.55);
    box(0.5, 0.05, 0.5, mat.dark, TRAY.x, 0.025, TRAY.z);

    /* ----- Robotic arm: turret yaw + 2-link IK + gripper ----- */
    const H0 = 0.42, L1 = 0.9, L2 = 0.8, GRAB = 0.2;
    cyl(0.3, 0.1, mat.dark, 0, 0.05, 0);
    const turret = new THREE.Group();
    rig.add(turret);
    cyl(0.18, 0.3, mat.frame, 0, 0.25, 0, turret);
    const shoulder = new THREE.Group();
    shoulder.position.y = H0;
    turret.add(shoulder);
    cyl(0.1, 0.2, mat.dark, 0, 0, 0, shoulder, "z");
    box(L1, 0.12, 0.12, mat.accent, L1 / 2, 0, 0, shoulder);
    const elbow = new THREE.Group();
    elbow.position.x = L1;
    shoulder.add(elbow);
    cyl(0.085, 0.18, mat.dark, 0, 0, 0, elbow, "z");
    box(L2, 0.1, 0.1, mat.accent, L2 / 2, 0, 0, elbow);
    const wrist = new THREE.Group();
    wrist.position.x = L2;
    elbow.add(wrist);
    cyl(0.07, 0.16, mat.dark, 0, 0, 0, wrist, "z");
    box(0.08, 0.06, 0.34, mat.frame, 0, -0.06, 0, wrist);
    const fingers = [-1, 1].map((s) => box(0.05, 0.2, 0.04, mat.frame, 0, -0.18, s * 0.17, wrist));

    const ik = (target) => {
      const r = Math.hypot(target.x, target.z);
      turret.rotation.y = Math.atan2(-target.z, target.x);
      const dx = r, dy = target.y + GRAB - H0;
      const d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.001);
      const q2 = Math.acos(THREE.MathUtils.clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1));
      const a1 = Math.atan2(dy, dx) + Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2));
      shoulder.rotation.z = a1;
      elbow.rotation.z = -q2;
      wrist.rotation.z = q2 - a1; // keep the gripper pointing straight down
    };
    const setGrip = (g) => fingers.forEach((f, i) => (f.position.z = (i ? 1 : -1) * THREE.MathUtils.lerp(0.17, PART / 2 + 0.02, g)));

    /* ----- Phone running the controller app ----- */
    const phone = new THREE.Group();
    phone.position.set(1.85, 0.8, -0.55);
    phone.rotation.set(-0.1, -0.45, 0);
    phone.scale.setScalar(1.25);
    rig.add(phone);
    box(0.44, 0.86, 0.05, mat.dark, 0, 0, 0, phone);
    const screen = document.createElement("canvas");
    screen.width = 256; screen.height = 512;
    const sctx = screen.getContext("2d");
    const stex = new THREE.CanvasTexture(screen);
    stex.encoding = THREE.sRGBEncoding;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.8), new THREE.MeshBasicMaterial({ map: stex }));
    glass.position.z = 0.026;
    phone.add(glass);
    const theme = { c1: "#ef4444", c3: "#f97316" };
    const drawScreen = (label, active, joy) => {
      const g = sctx;
      g.fillStyle = "#151012"; g.fillRect(0, 0, 256, 512);
      g.fillStyle = "#f3eeee"; g.font = '600 22px "Inter", system-ui, sans-serif'; g.textAlign = "center";
      g.fillText("Arm Control", 128, 58);
      g.fillStyle = "#22c55e"; g.beginPath(); g.arc(70, 92, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#bfb2b3"; g.font = '500 15px "JetBrains Mono", ui-monospace, monospace'; g.textAlign = "left";
      g.fillText("BT connected", 84, 97);
      g.fillStyle = theme.c3; g.font = '600 17px "JetBrains Mono", ui-monospace, monospace'; g.textAlign = "center";
      g.fillText(label, 128, 150);
      // joystick mirrors the arm's yaw
      g.strokeStyle = "#3a2e30"; g.lineWidth = 3; g.beginPath(); g.arc(128, 260, 70, 0, Math.PI * 2); g.stroke();
      g.fillStyle = theme.c1; g.beginPath(); g.arc(128 + Math.cos(joy) * 38, 260 - Math.sin(joy) * 38, 26, 0, Math.PI * 2); g.fill();
      ["PICK", "PLACE"].forEach((t, i) => {
        const x = 24 + i * 112, on = active === t;
        g.fillStyle = on ? theme.c1 : "#2a2022";
        g.beginPath(); g.roundRect ? g.roundRect(x, 380, 96, 54, 14) : g.rect(x, 380, 96, 54); g.fill();
        g.fillStyle = on ? "#ffffff" : "#8f7f81"; g.font = '700 18px "Inter", system-ui, sans-serif';
        g.fillText(t, x + 48, 414);
      });
      stex.needsUpdate = true;
    };

    /* ----- One cycle: print → pick → place → home ----- */
    const PRINT = 4.2, CYCLE = 11;
    const PRINTER_GRAB = new THREE.Vector3(printer.position.x, BED_TOP + PART / 2, printer.position.z + PART_Z);
    const TRAY_GRAB = new THREE.Vector3(TRAY.x, 0.05 + PART / 2, TRAY.z);
    const up = (v, h) => v.clone().setY(v.y + h);
    const HOME = new THREE.Vector3(0.75, 0.95, 0.35);
    // [time, gripper target, grip 0..1, carrying]
    const keys = [
      [0, HOME, 0], [PRINT, HOME, 0], [5.2, up(PRINTER_GRAB, 0.45), 0], [5.8, PRINTER_GRAB, 0], [6.2, PRINTER_GRAB, 1],
      [6.8, up(PRINTER_GRAB, 0.45), 1], [8.2, up(TRAY_GRAB, 0.45), 1], [8.7, TRAY_GRAB, 1], [9.1, TRAY_GRAB, 0],
      [9.6, up(TRAY_GRAB, 0.45), 0], [10.6, HOME, 0], [CYCLE, HOME, 0],
    ];
    const ease = (x) => x * x * (3 - 2 * x);
    const tmp = new THREE.Vector3(), grabPos = new THREE.Vector3();
    let lastLabel = "";

    const pose = (t) => {
      t %= CYCLE;
      let i = 0;
      while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
      const [t0, p0, g0] = keys[i], [t1, p1, g1] = keys[i + 1];
      const k = ease(THREE.MathUtils.clamp((t - t0) / (t1 - t0 || 1), 0, 1));
      tmp.lerpVectors(p0, p1, k);
      ik(tmp);
      const grip = THREE.MathUtils.lerp(g0, g1, k);
      setGrip(grip);

      // printer: part grows layer by layer while the hotend sweeps
      const progress = THREE.MathUtils.clamp(t / PRINT, 0, 1);
      const printing = t < PRINT;
      hotend.position.x = printing ? Math.sin(t * 9) * 0.12 : THREE.MathUtils.lerp(hotend.position.x, 0.38, 0.08);
      bed.position.z = printing ? Math.sin(t * 5.3) * 0.05 : 0;
      gantry.position.y = BED_TOP + 0.13 + (printing ? PART * progress : THREE.MathUtils.clamp((t - PRINT) * 2, 0, 1) * 0.55 + PART);

      const carrying = t >= 6.2 && t < 9.1;
      if (carrying) {
        wrist.getWorldPosition(grabPos);
        rig.worldToLocal(grabPos);
        part.position.set(grabPos.x, grabPos.y - GRAB, grabPos.z);
        part.scale.set(1, 1, 1);
        part.rotation.y = turret.rotation.y;
      } else if (t >= 9.1) {
        part.position.copy(TRAY_GRAB);
        part.rotation.y = turret.rotation.y;
      } else {
        const h = Math.max(progress, 0.02);
        part.scale.set(1, h, 1);
        part.rotation.y = 0;
        part.position.set(PRINTER_GRAB.x, BED_TOP + (PART * h) / 2, PRINTER_GRAB.z + bed.position.z);
      }
      mat.part.opacity = t > 10.2 ? 1 - THREE.MathUtils.clamp((t - 10.2) / 0.6, 0, 1) : 1;

      const label = printing ? `PRINTING ${Math.round(progress * 100)}%` : t < 6.2 ? "PICKING…" : t < 9.1 ? "PLACING…" : "HOMING";
      const active = t >= 5.2 && t < 6.8 ? "PICK" : t >= 8.2 && t < 9.6 ? "PLACE" : "";
      if (label !== lastLabel || Math.round(t * 10) % 2 === 0) { drawScreen(label, active, turret.rotation.y + Math.PI / 2); lastLabel = label; }
    };

    // Fit the camera to the whole bench: sample every mesh's box across the arm's motion
    const pts = [];
    const corner = new THREE.Vector3();
    [0, 2, 5.2, 5.8, 6.8, 8.2, 8.7, 10].forEach((t) => {
      pose(t);
      rig.updateMatrixWorld(true);
      rig.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const { min, max } = o.geometry.boundingBox;
        for (let n = 0; n < 8; n++) {
          corner.set(n & 1 ? max.x : min.x, n & 2 ? max.y : min.y, n & 4 ? max.z : min.z).applyMatrix4(o.matrixWorld);
          pts.push(rig.worldToLocal(corner.clone()));
        }
      });
    });
    const centre = new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3());
    pts.forEach((pt) => pt.sub(centre));
    rig.position.copy(centre).multiplyScalar(-1);
    const BASE_TILT = { x: 0.42, y: -0.38 };
    const stage = new THREE.Group();
    scene.remove(rig);
    stage.add(rig);
    scene.add(stage);
    stage.rotation.set(BASE_TILT.x, BASE_TILT.y, 0);

    const render = () => renderer.render(scene, camera);
    const tilted = new THREE.Vector3(), tiltQ = new THREE.Quaternion();
    const resize = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Distance at which every sampled point lands inside the frame (with room for the pointer tilt)
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * camera.aspect, fill = 0.86;
      tiltQ.setFromEuler(new THREE.Euler(BASE_TILT.x, BASE_TILT.y, 0));
      let dist = 0;
      pts.forEach((pt) => {
        tilted.copy(pt).applyQuaternion(tiltQ);
        dist = Math.max(dist, tilted.z + Math.max(Math.abs(tilted.x) / (tanH * fill), Math.abs(tilted.y) / (tanV * fill)));
      });
      camera.position.set(0, 0, dist);
      camera.updateProjectionMatrix();
      render();
    };

    const setTheme = () => {
      const css = getComputedStyle(root);
      const col = (v, f) => new THREE.Color(css.getPropertyValue(v).trim() || f).convertSRGBToLinear();
      theme.c1 = css.getPropertyValue("--c1").trim() || theme.c1;
      theme.c3 = css.getPropertyValue("--c3").trim() || theme.c3;
      mat.accent.color.copy(col("--c1", "#ef4444"));
      mat.part.color.copy(col("--c3", "#f97316"));
      mat.frame.color.copy(col("--muted", "#8f7f81"));
      mat.dark.color.copy(col("--surface-3", "#2e2324"));
      rim.color.copy(col("--c3", "#f97316"));
      lastLabel = "";
      pose(clock);
      if (!running) render();
    };

    const target = { x: 0, y: 0 };
    if (finePointer && card) {
      card.addEventListener("pointermove", (e) => {
        const b = card.getBoundingClientRect();
        target.x = ((e.clientX - b.left) / b.width - 0.5) * 2;
        target.y = ((e.clientY - b.top) / b.height - 0.5) * 2;
      }, { passive: true });
      card.addEventListener("pointerleave", () => { target.x = target.y = 0; });
    }

    let running = false, raf = 0, clock = reduceMotion ? 6.5 : 0, last = performance.now();
    const frame = (now) => {
      clock += Math.min((now - last) / 1000, 0.05);
      last = now;
      pose(clock);
      stage.rotation.x += (BASE_TILT.x + target.y * 0.12 - stage.rotation.x) * 0.06;
      stage.rotation.y += (BASE_TILT.y + target.x * 0.35 - stage.rotation.y) * 0.06;
      render();
      raf = requestAnimationFrame(frame);
    };
    const play = () => { if (running || reduceMotion) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    const pause = () => { running = false; cancelAnimationFrame(raf); };

    let visible = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible && !document.hidden ? play() : pause(); }).observe(wrap);
    document.addEventListener("visibilitychange", () => (document.hidden || !visible ? pause() : play()));
    new ResizeObserver(resize).observe(wrap);
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); pause(); canvas.classList.remove("is-ready"); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { lastLabel = ""; pose(clock); if (!running) render(); });

    setTheme();
    resize();
    canvas.classList.add("is-ready");
    return { setTheme };
  })();
})();
