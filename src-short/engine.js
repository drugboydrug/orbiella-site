/* ===== ORBIELLA: языки (ru — база, en — перевод по тексту) ===== */
(function () {
  var LANGS = [["ru", "Русский", "RU", "ru-RU"], ["en", "English", "EN", "en-US"]];
  var DICT = __DICT_JSON__;
  window.__DICT = DICT;
  var PH = { en: [["¡Hola! ¿Qué tal tu día?", "Hi! How was your day?"], ["Me encanta viajar. ¿Y a ti?", "I love travelling. Do you?"], ["Cuéntame sobre tu ciudad", "Tell me about your city"], ["¡Suena maravilloso!", "That sounds wonderful!"]] };
  var $ = function (id) { return document.getElementById(id); };
  var CYR = /[А-Яа-яЁё]/;
  var SKIPID = { pTime: 1, pSub: 1, pClock: 1, vBase: 1, vExtra: 1, vTotal: 1, fBase: 1, fBase2: 1, fExtra: 1, totLabel: 1, hoursOut: 1, calcSr: 1, exCountOut: 1, fitN: 1, fitMsg: 1, status: 1, stepLbl: 1, done: 1, ddAgeV: 1, ddTzV: 1 };
  var INLINE = { B: 1, I: 1, EM: 1, STRONG: 1, SPAN: 1, SMALL: 1, A: 1, BR: 1, MARK: 1, U: 1 };
  var BLOCKSEL = "svg,input,button,img,textarea,select,ul,ol,p,div,li,h1,h2,h3,h4,label,details,summary,table,.btn";
  var slots = [], attrs = [], missing = {};
  var norm = function (s) { return s.replace(/\s+/g, " ").trim(); };
  function isUnit(el) {
    if (el.querySelector(BLOCKSEL)) return false;
    for (var i = 0; i < el.children.length; i++) if (!INLINE[el.children[i].tagName]) return false;
    for (var j = 0; j < el.childNodes.length; j++) if (el.childNodes[j].nodeType === 3 && el.childNodes[j].data.trim()) return true;
    return false;
  }
  function scanAttrs(el) {
    ["aria-label", "title", "placeholder", "alt"].forEach(function (a) {
      var v = el.getAttribute && el.getAttribute(a);
      if (v && CYR.test(v)) attrs.push({ el: el, a: a, orig: v, key: norm(v) });
    });
  }
  function walk(el) {
    var tag = el.tagName;
    if (tag === "TEXTAREA") { scanAttrs(el); return; }
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "svg" || tag === "NOSCRIPT" || tag === "TITLE") return;
    if (el.hasAttribute("data-i18n-skip") || (el.id && SKIPID[el.id])) return;
    scanAttrs(el);
    if (CYR.test(el.textContent) && isUnit(el)) { slots.push({ t: "h", el: el, orig: el.innerHTML, key: norm(el.innerHTML) }); return; }
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) { if (n.data.trim() && CYR.test(n.data)) slots.push({ t: "t", node: n, orig: n.data, key: norm(n.data) }); }
      else if (n.nodeType === 1) walk(n);
    });
  }
  walk(document.body);
  Array.prototype.forEach.call(document.querySelectorAll('meta[name="description"],meta[property^="og:"],meta[name="twitter:title"],meta[name="twitter:description"]'), function (m) {
    var v = m.getAttribute("content"); if (v && CYR.test(v)) attrs.push({ el: m, a: "content", orig: v, key: norm(v) });
  });
  window.__i18nKeys = function () { var out = {}; slots.concat(attrs).forEach(function (s) { out[s.key] = 1; }); return Object.keys(out); };
  function pick(key, idx) { if (idx < 0) return null; var d = DICT[key]; var v = d && d[idx]; if (!v) missing[key] = 1; return v || null; }
  function apply(idx) {
    slots.forEach(function (s) {
      var tr = pick(s.key, idx);
      if (s.t === "h") s.el.innerHTML = idx < 0 ? s.orig : (tr || s.orig);
      else { var o = s.orig, lead = o.match(/^\s*/)[0], trail = o.match(/\s*$/)[0]; s.node.data = idx < 0 ? o : lead + (tr || s.key) + trail; }
    });
    attrs.forEach(function (s) { var tr = pick(s.key, idx); s.el.setAttribute(s.a, idx < 0 ? s.orig : (tr || s.orig)); });
    if (!window.__t0) window.__t0 = document.title;
    attrs.forEach(function (s) { if (s.el.getAttribute("property") === "og:title") document.title = idx < 0 ? window.__t0 : (pick(s.key, idx) || window.__t0); });
  }
  var cur = null;
  function indexOf(code) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === code) return i; return 0; }
  function setLang(code, persist) {
    var li = indexOf(code), L = LANGS[li];
    cur = L[0]; __L.lang = L[0]; __L.idx = li - 1; __L.loc = L[3]; __L.name = L[1];
    document.documentElement.setAttribute("lang", L[0]);
    window.__PH = li > 0 && PH[L[0]] ? PH[L[0]] : null;
    apply(li - 1);
    if (persist) { try { localStorage.setItem("lang", L[0]); } catch (e) {}
      /* мягкое появление текста после смены языка (без смены разметки и прокрутки) */
      var de = document.documentElement; de.classList.remove("lang-swap"); void de.offsetWidth; de.classList.add("lang-swap");
      clearTimeout(window.__lsT); window.__lsT = setTimeout(function () { de.classList.remove("lang-swap"); }, 600); }
    var yr = $("yr"); if (yr) yr.textContent = new Date().getFullYear();
    document.dispatchEvent(new Event("langchange"));
  }
  /* Язык по умолчанию — русский. Английский включается только кнопкой RU/EN; выбор хранится в localStorage. */
  var LABEL = { ru: "Переключить язык на английский", en: "Switch language to Russian" };
  window.__i18nBoot = function () {
    var saved = null; try { saved = localStorage.getItem("lang"); } catch (e) {}
    if (saved !== "ru" && saved !== "en") saved = "ru";
    var btn = $("langBtn");
    var sync = function () { if (btn) { btn.setAttribute("aria-label", LABEL[cur || "ru"]); btn.setAttribute("data-l", cur || "ru"); } };
    document.addEventListener("langchange", sync);
    if (saved === "en") setLang("en", false); else { cur = "ru"; document.documentElement.setAttribute("lang", "ru"); sync(); }
    if (!btn) return;
    btn.addEventListener("click", function () { setLang(cur === "en" ? "ru" : "en", true); });
  };  window.__i18nSet = setLang;
  window.__i18nMissing = function () { return Object.keys(missing); };
})();
window.__i18nBoot && window.__i18nBoot();
