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
    $('meta[name="theme-color"]').setAttribute("content", isDark() ? "#0f0b0c" : "#fdfafa");
  };
  syncThemeUI();
  themeBtn.addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch { /* storage unavailable */ }
    syncThemeUI();
    orb && orb.setTheme(isDark());
  });

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
      if (caretOn) { ctx.fillStyle = "#f87171"; ctx.fillRect(caret[0] + 2, caret[1] - 20, 3, 26); }
      // status bar
      ctx.fillStyle = "#dc2626"; ctx.fillRect(0, H - 34, W, 34);
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
      g.addColorStop(0, "#dc2626"); g.addColorStop(1, "#f97316");
      ctx.fillStyle = g; rr(ctx, 30, 236, W - 60, 150, 22); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.beginPath(); ctx.arc(W - 70, 270 + Math.sin(t * 1.5) * 6, 70, 0, 7); ctx.fill();
      ctx.font = `700 27px ${SANS}`; ctx.fillStyle = "#fff"; ctx.fillText("Free delivery", 54, 296);
      ctx.font = `400 17px ${SANS}`; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillText("on your first 3 orders", 54, 326);
      ctx.fillStyle = "#fff"; rr(ctx, 54, 342, 110, 30, 15); ctx.fill();
      ctx.font = `700 14px ${SANS}`; ctx.fillStyle = "#dc2626"; ctx.fillText("Order now", 72, 362);
      // categories
      ["Biryani", "Pizza", "Dosa", "Shakes"].forEach((c, i) => {
        const x = 30 + i * 100, on = i === Math.floor(t / 1.6) % 4;
        ctx.fillStyle = on ? "#ef4444" : "#221a1b"; rr(ctx, x, 408, 90, 40, 20); ctx.fill();
        ctx.font = `600 15px ${SANS}`; ctx.fillStyle = on ? "#fff" : "#c4b5b7"; ctx.textAlign = "center"; ctx.fillText(c, x + 45, 434); ctx.textAlign = "left";
      });
      // order tracking card
      ctx.fillStyle = "#1a1415"; rr(ctx, 30, 472, W - 60, 150, 20); ctx.fill();
      ctx.strokeStyle = "rgba(248,113,113,0.25)"; ctx.lineWidth = 1.5; rr(ctx, 30, 472, W - 60, 150, 20); ctx.stroke();
      ctx.font = `700 20px ${SANS}`; ctx.fillStyle = "#fff"; ctx.fillText("Order on the way", 54, 510);
      const p = (t * 0.18) % 1.15, prog = Math.min(p, 1);
      const mins = Math.max(1, Math.round(18 * (1 - prog)));
      ctx.font = `400 16px ${SANS}`; ctx.fillStyle = "#c4b5b7"; ctx.fillText(prog >= 1 ? "Delivered · enjoy your meal" : `Arriving in ${mins} min`, 54, 538);
      const bx = 54, bw = W - 108, by = 572;
      ctx.fillStyle = "#2e2324"; rr(ctx, bx, by, bw, 10, 5); ctx.fill();
      const bg2 = ctx.createLinearGradient(bx, 0, bx + bw, 0); bg2.addColorStop(0, "#ef4444"); bg2.addColorStop(1, "#fb923c");
      ctx.fillStyle = bg2; rr(ctx, bx, by, Math.max(10, bw * prog), 10, 5); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(bx + bw * prog, by + 5, 9, 0, 7); ctx.fill();
      ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.arc(bx + bw * prog, by + 5, 5, 0, 7); ctx.fill();
      ["Placed", "Cooking", "On the way", "Delivered"].forEach((s, i) => {
        ctx.font = `500 12px ${SANS}`; ctx.fillStyle = prog >= i / 3 ? "#fca5a5" : "#5e4f51";
        ctx.textAlign = i === 0 ? "left" : i === 3 ? "right" : "center";
        ctx.fillText(s, bx + (bw * i) / 3, by + 34);
      });
      ctx.textAlign = "left";
      // restaurant list
      [["Spice Route", "North Indian · 25 min", "#f59e0b"], ["Green Bowl", "Healthy · 18 min", "#10b981"]].forEach(([n, m, col], i) => {
        const y = 646 + i * 92;
        ctx.fillStyle = "#1a1415"; rr(ctx, 30, y, W - 60, 78, 18); ctx.fill();
        const gg = ctx.createLinearGradient(44, y + 12, 98, y + 66); gg.addColorStop(0, col); gg.addColorStop(1, "#dc2626");
        ctx.fillStyle = gg; rr(ctx, 44, y + 12, 54, 54, 14); ctx.fill();
        ctx.font = `700 18px ${SANS}`; ctx.fillStyle = "#fff"; ctx.fillText(n, 114, y + 36);
        ctx.font = `400 15px ${SANS}`; ctx.fillStyle = "#8f7f81"; ctx.fillText(m, 114, y + 60);
        ctx.font = `700 15px ${SANS}`; ctx.fillStyle = "#fca5a5"; ctx.textAlign = "right"; ctx.fillText("★ 4." + (6 + i), W - 50, y + 46); ctx.textAlign = "left";
      });
      // tab bar
      ctx.fillStyle = "#1a1415"; ctx.fillRect(0, H - 92, W, 92);
      [0, 1, 2, 3].forEach((i) => {
        const x = 70 + i * 103;
        ctx.fillStyle = i === 0 ? "#ef4444" : "#4f4042";
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
})();
