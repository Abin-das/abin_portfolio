/* Page translation.
   English is the source: text in index.html (and strings passed to I18N.t) are looked up in
   lang/<code>.js, which registers window.I18N_DICT[<code>] = { "English text": "Translation" }.
   Anything without a translation stays in English, so editing English copy never breaks the page. */
(() => {
  "use strict";
  const root = document.documentElement;
  const LANGS = {
    en: { name: "English", dir: "ltr" },
    ml: { name: "മലയാളം", dir: "ltr", font: "Noto+Sans+Malayalam:wght@400;500;600;700;800" },
    hi: { name: "हिन्दी", dir: "ltr", font: "Noto+Sans+Devanagari:wght@400;500;600;700;800" },
    ta: { name: "தமிழ்", dir: "ltr", font: "Noto+Sans+Tamil:wght@400;500;600;700;800" },
    ar: { name: "العربية", dir: "rtl", font: "Noto+Sans+Arabic:wght@400;500;600;700;800" },
  };
  const DICT = (window.I18N_DICT = window.I18N_DICT || {});
  const ATTRS = ["aria-label", "title", "placeholder", "alt"];
  // Tags that can sit inside a translated sentence; anything else (links, buttons, svg…) splits it
  const INLINE = new Set(["B", "STRONG", "EM", "I", "SPAN", "SMALL", "BR", "SUP", "SUB"]);
  const SKIP = new Set(["SCRIPT", "STYLE", "SVG", "CANVAS", "TEXTAREA", "INPUT", "SELECT", "NOSCRIPT", "TEMPLATE"]);
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const hasWords = (s) => /\p{L}{2,}/u.test(s);

  let lang = "en";
  const units = new Map(); // element -> { key: normalised English innerHTML, raw: original innerHTML }
  const texts = new Map(); // text node -> English text (raw)
  const attrs = []; // [element, attribute, English value]
  const listeners = [];

  // A "unit" is an element whose whole content is one sentence: text plus inline formatting only.
  // Elements with ids or data-* (or such descendants) belong to scripts, so they are left alone.
  const owned = (el) => el.id || Object.keys(el.dataset).length;
  const isUnit = (el) => {
    if (owned(el) || !hasWords(el.textContent)) return false;
    for (const d of el.querySelectorAll("*")) if (!INLINE.has(d.tagName) || owned(d)) return false;
    return true;
  };

  const collect = (scope) => {
    const walk = (el) => {
      if (SKIP.has(el.tagName) || el.hasAttribute("data-i18n-skip")) return;
      ATTRS.forEach((a) => { const v = el.getAttribute(a); if (v && hasWords(v)) attrs.push([el, a, v]); });
      if (el !== scope && !units.has(el) && isUnit(el)) { units.set(el, { key: norm(el.innerHTML), raw: el.innerHTML }); return; }
      for (const n of el.childNodes) {
        if (n.nodeType === 1) walk(n);
        else if (n.nodeType === 3 && hasWords(n.nodeValue) && !texts.has(n)) texts.set(n, n.nodeValue);
      }
    };
    walk(scope);
  };

  const lookup = (en) => (lang !== "en" && DICT[lang] && DICT[lang][en]) || null;

  const apply = () => {
    units.forEach(({ key, raw }, el) => { if (el.isConnected) el.innerHTML = lookup(key) || raw; });
    texts.forEach((en, node) => {
      if (!node.isConnected) return;
      const tr = lookup(norm(en));
      node.nodeValue = tr ? en.match(/^\s*/)[0] + tr + en.match(/\s*$/)[0] : en;
    });
    attrs.forEach(([el, a, en]) => { if (el.isConnected) el.setAttribute(a, lookup(norm(en)) || en); });
    const titleEn = apply.title || (apply.title = document.title);
    document.title = lookup(titleEn) || titleEn;
  };

  const loadFont = (code) => {
    const f = LANGS[code].font;
    if (!f || document.getElementById("font-" + code)) return;
    const link = document.createElement("link");
    link.id = "font-" + code;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${f}&display=swap`;
    document.head.appendChild(link);
  };

  const loadDict = (code) =>
    code === "en" || DICT[code]
      ? Promise.resolve()
      : new Promise((resolve) => {
          const s = document.createElement("script");
          s.src = `lang/${code}.js`;
          s.onload = s.onerror = () => resolve();
          document.head.appendChild(s);
        });

  const set = async (code) => {
    if (!LANGS[code]) code = "en";
    loadFont(code);
    await loadDict(code);
    lang = code;
    root.lang = code;
    root.dir = LANGS[code].dir;
    try { localStorage.setItem("lang", code); } catch { /* storage unavailable */ }
    apply();
    listeners.forEach((fn) => fn(code));
    root.classList.remove("i18n-pending");
  };

  // t("Hi {name}", { name }) — for strings built in JavaScript
  const t = (en, vars) => {
    let s = lookup(en) || en;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  };

  window.I18N = {
    LANGS,
    get lang() { return lang; },
    t,
    set,
    onChange: (fn) => listeners.push(fn),
    // For markup added later (chat widget, intro): register it, then translate it now
    translate: (el) => { collect(el); if (lang !== "en") apply(); },
    // Every English string the page has registered, for keeping lang/*.js complete
    keys: () => [...new Set([...[...units.values()].map((u) => u.key), ...[...texts.values()].map(norm), ...attrs.map(([, , v]) => norm(v)), document.title])],
  };

  collect(document.body);
  let saved = "en";
  try { saved = localStorage.getItem("lang") || "en"; } catch { /* storage unavailable */ }
  if (saved !== "en" && LANGS[saved]) set(saved);
  else root.classList.remove("i18n-pending");
  setTimeout(() => root.classList.remove("i18n-pending"), 2500); // never keep the page hidden
})();
