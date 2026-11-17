/* ===== ORBIELLA: общий скрипт ===== */
var __L = { lang: "ru", idx: -1, loc: "ru-RU", name: "Русский" };
function T(s) { var d = window.__DICT && window.__DICT[s]; return (__L.idx >= 0 && d && d[__L.idx]) || s; }
function TF(s, v) { var r = T(s); for (var k in v) r = r.split("{" + k + "}").join(v[k]); return r; }

/* ============ НАСТРОЙКИ ============ */
var CONFIG = {
  brand: "ORBIELLA",
  telegram: "alinkakovkova",  // Telegram для связи, без @
  currency: "$",
  shiftPay: 30,               // оплата за стандартную смену 7–8 часов
  shiftsPerWeek: 5,           // рабочих смен в неделю
  extraHourRate: 9,           // оплата за дополнительный час работы в выходной
  endpoint: "",               // адрес воркера для приёма заявок (server/worker.js); пусто — заявка открывается в Telegram
  analytics: ""               // адрес воркера анонимной статистики (…/event); пусто — выключена
};
/* ================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  var money = function (n) { return CONFIG.currency + Math.round(n).toLocaleString(__L.loc); };
  var tgReady = !!CONFIG.telegram && CONFIG.telegram !== "your_username";
  var tgUrl = tgReady ? "https://t.me/" + CONFIG.telegram : "";

  /* значения из CONFIG (в разметке они уже записаны, скрипт только синхронизирует) */
  each("[data-shift]", function (n) { n.textContent = CONFIG.currency + CONFIG.shiftPay; });
  each("[data-extra]", function (n) { n.textContent = CONFIG.currency + CONFIG.extraHourRate; });
  each("[data-tg]", function (a) { if (tgReady) { a.href = tgUrl; a.target = "_blank"; a.rel = "noopener"; } });
  /* партнёрская программа: тот же Telegram-контакт, но с отдельным коротким текстом обращения */
  var partnerMsg = function () { return tgUrl + "?text=" + encodeURIComponent(T("Здравствуйте! Хочу узнать о партнёрской программе ORBIELLA.")); };
  var syncPartner = function () { each("[data-tg-partner]", function (a) { if (tgReady) { a.href = partnerMsg(); a.target = "_blank"; a.rel = "noopener"; } }); };
  syncPartner(); document.addEventListener("langchange", syncPartner);

  /* ---------- тема ---------- */
  var themeBtn = $("themeBtn");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var root = document.documentElement, next = root.getAttribute("data-ot") === "light" ? "dark" : "light";
    root.setAttribute("data-ot", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* ---------- шапка: меню разделов, скрытие при прокрутке вниз, реакция логотипа ---------- */
  var top = $("top"), menuBtn = $("menuBtn"), menu = $("menu");
  var menuOpen = false, lastY = window.scrollY, acc = 0, ticking = false;
  var setMenu = function (o) {
    menuOpen = o; menu.classList.toggle("open", o); menuBtn.setAttribute("aria-expanded", o ? "true" : "false");
    if ("inert" in menu) menu.inert = !o;
    if (o) top.classList.remove("hide");
  };
  setMenu(false);
  menuBtn.addEventListener("click", function () { setMenu(!menuOpen); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menuOpen) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener("pointerdown", function (e) { if (menuOpen && !top.contains(e.target)) setMenu(false); });
  /* вниз — шапка плавно уходит, вверх — возвращается; мелкие движения колеса игнорируются */
  var onScroll = function () {
    ticking = false;
    var y = Math.max(0, window.scrollY), d = y - lastY; lastY = y;
    top.classList.toggle("scrolled", y > 24);
    if (menuOpen || y < 80) { acc = 0; top.classList.remove("hide"); return; }
    if (!d) return;
    acc = (d > 0) === (acc > 0) ? acc + d : d;
    if (acc > 28) { top.classList.add("hide"); acc = 0; }
    else if (acc < -14) { top.classList.remove("hide"); acc = 0; }
  };
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();
  top.addEventListener("focusin", function () { top.classList.remove("hide"); });
  var logoEl = top.querySelector(".logo");
  if (logoEl && !reduce && window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    logoEl.addEventListener("pointermove", function (e) { var r = logoEl.getBoundingClientRect(); logoEl.style.setProperty("--rx", (((e.clientX - r.left) / r.width - .5) * 8).toFixed(2)); logoEl.style.setProperty("--ry", ((.5 - (e.clientY - r.top) / r.height) * 6).toFixed(2)); });
    logoEl.addEventListener("pointerleave", function () { logoEl.style.setProperty("--rx", 0); logoEl.style.setProperty("--ry", 0); });
  }

  /* ---------- появление при прокрутке ---------- */
  var rv = document.querySelectorAll(".rv"), cnt = new Map();
  Array.prototype.forEach.call(rv, function (el) { var p = el.parentElement, n = cnt.get(p) || 0; cnt.set(p, n + 1); el.style.setProperty("--rd", Math.min(n, 4) * 60 + "ms"); });
  if (!("IntersectionObserver" in window) || reduce) { Array.prototype.forEach.call(rv, function (el) { el.classList.add("in"); }); }
  else {
    /* после появления снимаем служебный класс, чтобы наведение на карточки работало с обычной скоростью */
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { var t = e.target; t.classList.add("in"); io.unobserve(t); setTimeout(function () { t.classList.remove("rv"); }, 1400); } }); }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    Array.prototype.forEach.call(rv, function (el) { io.observe(el); });
  }

  /* ---------- текущий раздел в меню, пауза анимаций вне экрана, мобильная CTA ---------- */
  if ("IntersectionObserver" in window) {
    var links = {}; each(".menu a:not(.btn)", function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var setCur = function (id) { Object.keys(links).forEach(function (k) { if (k === id) links[k].setAttribute("aria-current", "true"); else links[k].removeAttribute("aria-current"); }); };
    var so = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) setCur(e.target.id); }); }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(links).forEach(function (id) { var s = $(id); if (s) so.observe(s); });
    var hero = $("hero"), apply = $("apply"), foot = document.querySelector("footer"), sticky = $("sticky"), ptn = $("partner");
    var vis = { hero: true, apply: false, foot: false, ptn: false };
    /* панель «Оставить заявку» не показываем у формы, в партнёрском блоке (это не вакансия) и в футере */
    var upd = function () { sticky.classList.toggle("on", !vis.hero && !vis.apply && !vis.foot && !vis.ptn); };
    var ho = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) hero.removeAttribute("data-off"); else hero.setAttribute("data-off", ""); }); }, { threshold: 0.01 });
    ho.observe(hero);
    var heroCta = hero.querySelector(".cta-row") || hero;
    var co = new IntersectionObserver(function (es) { es.forEach(function (e) { vis.hero = e.isIntersecting || e.boundingClientRect.top > 0; }); upd(); }, { threshold: 0 });
    co.observe(heroCta);
    var ao = new IntersectionObserver(function (es) { es.forEach(function (e) { vis[e.target === apply ? "apply" : e.target === ptn ? "ptn" : "foot"] = e.isIntersecting; }); upd(); }, { threshold: 0.12 });
    ao.observe(apply); ao.observe(foot); if (ptn) ao.observe(ptn);
  } else { var st = $("sticky"); if (st) st.classList.add("on"); }

  /* ---------- макет телефона: субтитры с переводом, таймер, часы ---------- */
  (function () {
    var sub = $("pSub"), t = $("pTime"), ck = $("pClock"); if (!sub || !t) return;
    var pairs = [["Hi! How was your day?", "Привет! Как прошёл твой день?"], ["I love travelling. Do you?", "Я люблю путешествовать. А ты?"], ["Tell me about your city", "Расскажи о своём городе"], ["That sounds wonderful!", "Звучит чудесно!"]];
    var i = 0, sec = 134, tok = 0;
    var fmt = function (s) { return ("0" + Math.floor(s / 60)).slice(-2) + ":" + ("0" + (s % 60)).slice(-2); };
    var mk = function (cls, txt, tag) { var el = document.createElement(tag || "div"); el.className = cls; el.textContent = txt; return el; };
    var say = function () {
      var P = window.__PH || pairs, p = P[i++ % P.length];
      sub.innerHTML = "";
      sub.appendChild(mk("bub", p[0]));
      var my = ++tok;
      setTimeout(function () { if (my !== tok) return; var w = mk("trw", "", "div"); w.appendChild(mk("tag", T("ПЕРЕВОД"), "span")); w.appendChild(mk("bub", p[1])); sub.appendChild(w); }, reduce ? 0 : 900);
    };
    t.textContent = fmt(sec); say();
    var clock = function () { var d = new Date(); try { ck.textContent = new Intl.DateTimeFormat(__L.loc, { hour: "numeric", minute: "2-digit" }).format(d); } catch (e) { ck.textContent = d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2); } };
    if (ck) { clock(); setInterval(clock, 15000); }
    document.addEventListener("langchange", function () { i = Math.max(0, i - 1); say(); if (ck) clock(); });
    if (!reduce) { setInterval(function () { sec++; t.textContent = fmt(sec); }, 1000); setInterval(say, 4800); }
  })();

  /* ---------- телефон: тап по экрану меняет собеседников местами ----------
     Используем click: браузеры (iOS, Android, десктоп) присылают его только на настоящее касание/клик,
     а при прокрутке пальцем — нет, поэтому случайных срабатываний не бывает. touch-action: manipulation
     в CSS убирает задержку тапа и двойной зум. Состояние — один класс, поэтому после любого числа
     нажатий ничего не «зависает»: повторный тап посреди анимации просто разворачивает её обратно. */
  (function () {
    var scr = $("scr"); if (!scr) return;
    var toggle = function () {
      var on = !scr.classList.contains("sw");
      scr.classList.add("seen"); scr.classList.toggle("sw", on); scr.setAttribute("aria-pressed", on ? "true" : "false");
    };
    scr.addEventListener("click", toggle);
    scr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  })();

  /* ---------- калькулятор: ориентировочный доход за месяц ---------- */
  (function () {
    var seg = $("exSeg"), eh = $("extraHours"); if (!seg || !eh) return;
    var exVal = function () { var r = seg.querySelector("input:checked"); return r ? +r.value : 0; };
    var WEEKS = 4.33;                                   /* среднее число недель в месяце */
    var cur = { t: 0, b: 0, e: 0 }, raf = 0, srT = 0;
    var round = function (x) { return Math.round(Math.round(x * 100) / 100); };
    var wk = function () { return String(WEEKS).replace(".", __L.lang === "ru" ? "," : "."); };
    var paint = function (v) { $("vTotal").textContent = money(v.t); $("vBase").textContent = money(v.b); $("vExtra").textContent = money(v.e); };
    var tween = function (to) {
      cancelAnimationFrame(raf);
      if (reduce) { cur = to; paint(cur); return; }
      var from = { t: cur.t, b: cur.b, e: cur.e }, t0 = performance.now(), dur = 600;
      (function step(now) {
        var p = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - p, 3);
        cur = { t: from.t + (to.t - from.t) * k, b: from.b + (to.b - from.b) * k, e: from.e + (to.e - from.e) * k }; paint(cur);
        if (p < 1) raf = requestAnimationFrame(step); else { cur = to; paint(cur); }
      })(t0);
    };
    var render = function (anim) {
      var s = exVal(), h = +eh.value;
      var base = round(CONFIG.shiftsPerWeek * CONFIG.shiftPay * WEEKS), extra = round(s * h * CONFIG.extraHourRate * WEEKS), total = base + extra, to = { t: total, b: base, e: extra };
      eh.disabled = s === 0;
      $("hoursOut").textContent = h + " " + T("ч"); $("calcBox").classList.toggle("has-ex", s > 0);
      eh.style.setProperty("--fill", ((h - 1) / 7 * 100) + "%");
      var wkBase = CONFIG.shiftsPerWeek * CONFIG.shiftPay;
      $("fBase").textContent = TF("{p} × {n} смен = {w} в неделю", { n: CONFIG.shiftsPerWeek, p: CONFIG.currency + CONFIG.shiftPay, w: money(wkBase) });
      $("fBase2").textContent = TF("{w} × {k} недели ≈ {m} в месяц", { w: money(wkBase), k: wk(), m: money(base) });
      $("fExtra").textContent = s ? TF("{s} дн. × {h} ч × {r} × {w} нед.",{ s: s, h: h, r: CONFIG.currency + CONFIG.extraHourRate, w: wk() }) : T("не добавлены");
      $("barB").style.width = (total ? base / total * 100 : 100) + "%"; $("barE").style.width = (total ? extra / total * 100 : 0) + "%";
      if (anim === false) { cancelAnimationFrame(raf); cur = to; paint(cur); } else tween(to);
      clearTimeout(srT); srT = setTimeout(function () { $("calcSr").textContent = TF("Ориентировочный доход за месяц: {t}", { t: money(total) }); }, 500);
    };
    seg.addEventListener("change", function () { render(); });
    eh.addEventListener("input", function () { render(); });
    render(false);
    document.addEventListener("langchange", function () { render(false); });
    window.__calc = function (s, h) { var r = seg.querySelector('input[value="' + s + '"]'); if (r) r.checked = true; eh.value = h; render(false); return { base: $("vBase").textContent, extra: $("vExtra").textContent, total: $("vTotal").textContent }; };
  })();
  /* ---------- самопроверка ---------- */
  var fitList = $("fitList");
  var fitRender = function () {
    var n = fitList.querySelectorAll("input:checked").length;
    $("fitN").textContent = n;
    $("fitArc").style.strokeDashoffset = 326.7 * (1 - n / 5);
    $("fitMsg").textContent = n === 0 ? T("Отметьте пункты, которые подходят вам.") : n === 5 ? T("Все пункты отмечены — можно оставлять заявку.") : TF("Отмечено {n} из 5. Остальное можно обсудить на собеседовании.", { n: n });
  };
  fitList.addEventListener("change", fitRender); fitRender();
  document.addEventListener("langchange", fitRender);

  /* ---------- FAQ: одновременно открыт один ответ ---------- */
  var qa = $("qa");
  /* аккордеон: плавно раскрывается и закрывается, одновременно открыт один ответ */
  var qaAnim = function (d, open) {
    if (d._a) { d._a.cancel(); d._a = null; }
    if (reduce || !d.animate) { d.open = open; d.style.height = ""; return; }
    var s = d.querySelector("summary"), border = d.offsetHeight - d.clientHeight, from = d.offsetHeight, to;
    d.style.overflow = "hidden";
    if (open) { d.open = true; d.style.height = "auto"; to = d.offsetHeight; } else to = s.offsetHeight + border;
    d.style.height = from + "px"; d._closing = !open;
    d._a = d.animate([{ height: from + "px" }, { height: to + "px" }], { duration: 380, easing: "cubic-bezier(.16,1,.3,1)" });
    d._a.onfinish = function () { d._a = null; d._closing = false; if (!open) d.open = false; d.style.height = ""; d.style.overflow = ""; };
  };
  qa.addEventListener("click", function (e) {
    var s = e.target.closest("summary"); if (!s || !qa.contains(s)) return;
    e.preventDefault();
    var d = s.parentElement, willOpen = !d.open || d._closing;
    each("#qa details", function (x) { if (x !== d && x.open && !x._closing) qaAnim(x, false); });
    qaAnim(d, willOpen);
  });

  /* ---------- окно политики ---------- */
  each("[data-open]", function (b) { b.addEventListener("click", function () { var d = $(b.getAttribute("data-open")); if (d && d.showModal) d.showModal(); }); });
  each("dialog", function (d) { d.addEventListener("click", function (e) { if (e.target === d || e.target.closest("[data-close]")) d.close(); }); });
  var yr = $("yr"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- форма в два шага ---------- */
  var form = $("applyForm"), box = $("formBox"), sending = false;
  var field = function (id) { return $(id); };
  var setBad = function (el, msg) {
    var wrap = el.closest(".fl, .ckw"); if (!wrap) return;
    wrap.setAttribute("data-bad", ""); var e = wrap.querySelector(".fe"); if (e) e.textContent = msg; el.setAttribute("aria-invalid", "true");
  };
  var clearBad = function (el) {
    var wrap = el.closest(".fl, .ckw"); if (!wrap) return;
    wrap.removeAttribute("data-bad"); var e = wrap.querySelector(".fe"); if (e) e.textContent = ""; el.removeAttribute("aria-invalid");
  };
  form.addEventListener("input", function (e) { clearBad(e.target); });
  form.addEventListener("change", function (e) { clearBad(e.target); });
  var validContact = function (v) { return /^@?[A-Za-z0-9_]{4,32}$/.test(v) || /t\.me\//i.test(v) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || /^\+?[\d\s()\-]{7,}$/.test(v); };
  var checkStep1 = function () {
    var first = null, bad = function (el, m) { setBad(el, m); if (!first) first = el; };
    ["name", "age", "contact"].forEach(function (id) { clearBad(field(id)); });
    var name = field("name").value.trim(), age = parseInt(field("age").value, 10), contact = field("contact").value.trim();
    if (name.length < 2) bad(field("name"), T("Укажите имя"));
    if (isNaN(age)) bad(field("age"), T("Укажите возраст")); else if (age < 18) bad(field("age"), T("Работа доступна только с 18 лет"));
    if (!contact) bad(field("contact"), T("Укажите Telegram или телефон")); else if (!validContact(contact)) bad(field("contact"), T("Похоже на опечатку. Пример: @username или +7 900 000-00-00"));
    if (first) { (first.type === "hidden" ? first.closest(".fl").querySelector(".dd-btn") : first).focus(); }
    return !first;
  };
  var checkStep2 = function () {
    var first = null;
    [["cinfo", "Отметьте этот пункт, чтобы продолжить"], ["cdata", "Отметьте согласие, чтобы мы могли с вами связаться"]].forEach(function (c) {
      var el = field(c[0]); clearBad(el); if (!el.checked) { setBad(el, T(c[1])); if (!first) first = el; }
    });
    if (first) first.focus();
    return !first;
  };
  var goStep = function (n) {
    box.setAttribute("data-step", String(n)); $("stepLbl").textContent = TF("Шаг {n} из 2", { n: n });
    var f = form.querySelector(n === 1 ? ".st1 input" : ".st2 .dd-btn"); box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 250);
  };
  $("toStep2").addEventListener("click", function () { if (checkStep1()) goStep(2); });
  $("toStep1").addEventListener("click", function () { goStep(1); });
  document.addEventListener("langchange", function () { $("stepLbl").textContent = TF("Шаг {n} из 2", { n: box.getAttribute("data-step") }); });
  form.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT" && box.getAttribute("data-step") === "1") { e.preventDefault(); $("toStep2").click(); } });

  /* ---------- выпадающие списки: возраст и часовой пояс ---------- */
  var TZ_RU = { "Europe/Moscow": "Москва", "Europe/Kaliningrad": "Калининград", "Europe/Samara": "Самара", "Asia/Yekaterinburg": "Екатеринбург", "Asia/Omsk": "Омск", "Asia/Novosibirsk": "Новосибирск", "Asia/Krasnoyarsk": "Красноярск", "Asia/Irkutsk": "Иркутск", "Asia/Yakutsk": "Якутск", "Asia/Vladivostok": "Владивосток", "Asia/Magadan": "Магадан", "Asia/Kamchatka": "Камчатка", "Europe/Kyiv": "Киев", "Europe/Kiev": "Киев", "Europe/Minsk": "Минск", "Asia/Almaty": "Алматы", "Asia/Tashkent": "Ташкент", "Asia/Tbilisi": "Тбилиси", "Asia/Yerevan": "Ереван", "Asia/Baku": "Баку", "Europe/Chisinau": "Кишинёв", "Asia/Bishkek": "Бишкек", "Asia/Dushanbe": "Душанбе", "Asia/Ashgabat": "Ашхабад", "Asia/Bangkok": "Бангкок", "Asia/Dubai": "Дубай", "Europe/Istanbul": "Стамбул", "Europe/London": "Лондон", "Europe/Berlin": "Берлин", "Europe/Paris": "Париж", "Europe/Madrid": "Мадрид", "Europe/Rome": "Рим", "Europe/Warsaw": "Варшава", "Europe/Prague": "Прага", "Europe/Vilnius": "Вильнюс", "Europe/Riga": "Рига", "Europe/Tallinn": "Таллин", "Europe/Helsinki": "Хельсинки", "Asia/Tokyo": "Токио", "Asia/Seoul": "Сеул", "Asia/Shanghai": "Шанхай", "Asia/Hong_Kong": "Гонконг", "Asia/Singapore": "Сингапур", "Asia/Jakarta": "Джакарта", "Asia/Ho_Chi_Minh": "Хошимин", "Asia/Saigon": "Хошимин", "Asia/Kolkata": "Дели", "Asia/Calcutta": "Дели", "America/New_York": "Нью-Йорк", "America/Chicago": "Чикаго", "America/Denver": "Денвер", "America/Los_Angeles": "Лос-Анджелес", "America/Toronto": "Торонто", "America/Mexico_City": "Мехико", "America/Sao_Paulo": "Сан-Паулу", "Africa/Cairo": "Каир", "Asia/Jerusalem": "Иерусалим", "Asia/Tel_Aviv": "Тель-Авив", "Australia/Sydney": "Сидней", "Pacific/Auckland": "Окленд", "Europe/Lisbon": "Лиссабон", "Europe/Amsterdam": "Амстердам", "Europe/Athens": "Афины", "Europe/Sofia": "София", "Europe/Bucharest": "Бухарест", "Europe/Belgrade": "Белград", "Europe/Vienna": "Вена", "Europe/Zurich": "Цюрих", "Europe/Budapest": "Будапешт", "Europe/Stockholm": "Стокгольм", "Europe/Oslo": "Осло", "Europe/Copenhagen": "Копенгаген", "Europe/Dublin": "Дублин", "Asia/Nicosia": "Никосия", "Asia/Colombo": "Коломбо", "Asia/Kathmandu": "Катманду", "Asia/Dhaka": "Дакка", "Asia/Karachi": "Карачи", "Asia/Tehran": "Тегеран", "Asia/Riyadh": "Эр-Рияд", "Asia/Manila": "Манила", "Asia/Kuala_Lumpur": "Куала-Лумпур", "Asia/Phnom_Penh": "Пномпень", "Asia/Taipei": "Тайбэй", "Asia/Ulaanbaatar": "Улан-Батор", "Europe/Brussels": "Брюссель", "Europe/Zagreb": "Загреб", "Europe/Bratislava": "Братислава", "Europe/Ljubljana": "Любляна", "Europe/Luxembourg": "Люксембург", "Europe/Monaco": "Монако", "Europe/Skopje": "Скопье", "Europe/Sarajevo": "Сараево", "Europe/Tirane": "Тирана", "Europe/Malta": "Мальта", "Atlantic/Reykjavik": "Рейкьявик", "Africa/Johannesburg": "Йоханнесбург", "Africa/Casablanca": "Касабланка", "Africa/Lagos": "Лагос", "Africa/Nairobi": "Найроби", "America/Argentina/Buenos_Aires": "Буэнос-Айрес", "America/Bogota": "Богота", "America/Lima": "Лима", "America/Santiago": "Сантьяго", "America/Havana": "Гавана", "America/Vancouver": "Ванкувер", "America/Phoenix": "Финикс", "America/Anchorage": "Анкоридж", "Pacific/Honolulu": "Гонолулу", "Australia/Melbourne": "Мельбурн", "Australia/Perth": "Перт", "Australia/Brisbane": "Брисбен", "UTC": "Всемирное время" };
  var TZ_FALLBACK = ["Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Toronto", "America/Mexico_City", "America/Bogota", "America/Sao_Paulo", "America/Argentina/Buenos_Aires", "Atlantic/Reykjavik", "Europe/Lisbon", "Europe/London", "Europe/Dublin", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Prague", "Europe/Warsaw", "Europe/Vilnius", "Europe/Riga", "Europe/Tallinn", "Europe/Helsinki", "Europe/Kyiv", "Europe/Chisinau", "Europe/Athens", "Europe/Bucharest", "Europe/Sofia", "Europe/Istanbul", "Europe/Kaliningrad", "Europe/Minsk", "Europe/Moscow", "Europe/Samara", "Africa/Cairo", "Africa/Johannesburg", "Africa/Nairobi", "Asia/Jerusalem", "Asia/Tbilisi", "Asia/Yerevan", "Asia/Baku", "Asia/Dubai", "Asia/Tehran", "Asia/Tashkent", "Asia/Ashgabat", "Asia/Dushanbe", "Asia/Yekaterinburg", "Asia/Karachi", "Asia/Kolkata", "Asia/Almaty", "Asia/Bishkek", "Asia/Omsk", "Asia/Dhaka", "Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Jakarta", "Asia/Novosibirsk", "Asia/Krasnoyarsk", "Asia/Shanghai", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Manila", "Asia/Irkutsk", "Asia/Seoul", "Asia/Tokyo", "Asia/Yakutsk", "Australia/Perth", "Australia/Sydney", "Asia/Vladivostok", "Asia/Magadan", "Asia/Kamchatka", "Pacific/Auckland", "UTC"];
  var tzOffset = function (tz, d) {
    try {
      var f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }), p = {};
      f.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      var asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
      return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
    } catch (e) { return null; }
  };
  var fmtOffset = function (m) { if (m == null) return ""; var a = Math.abs(m), h = Math.floor(a / 60), mm = a % 60; return "UTC" + (m < 0 ? "-" : "+") + ("0" + h).slice(-2) + ":" + ("0" + mm).slice(-2); };
  var tzList = function () {
    var ids = [];
    try { if (Intl.supportedValuesOf) ids = Intl.supportedValuesOf("timeZone"); } catch (e) {}
    if (!ids || !ids.length) ids = TZ_FALLBACK.slice();
    var detected = ""; try { detected = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    if (detected && ids.indexOf(detected) < 0) ids.push(detected);
    if (ids.indexOf("UTC") < 0) ids.push("UTC");
    var now = new Date(), ru = __L.lang === "ru";
    return ids.map(function (id) {
      var parts = id.split("/"), en = parts[parts.length - 1].replace(/_/g, " "), city = (ru && TZ_RU[id]) || en, off = tzOffset(id, now), offs = fmtOffset(off);
      var sh = (off < 0 ? "-" : "+") + Math.floor(Math.abs(off || 0) / 60) + ((off || 0) % 60 ? ":" + ("0" + Math.abs(off) % 60).slice(-2) : ""); return { v: id, off: off == null ? 0 : off, label: city, right: offs, sub: id, hay: (city + " " + en + " " + (TZ_RU[id] || "") + " " + id + " " + offs + " " + sh + " utc" + sh + " gmt" + sh).toLowerCase() };
    }).sort(function (a, b) { return a.off - b.off || (a.label < b.label ? -1 : 1); });
  };
  var openDd = null;
  var Dropdown = function (box, o) {
    var hid = box.querySelector("input[type=hidden]"), btn = box.querySelector(".dd-btn"), vEl = box.querySelector(".dd-v"), list = box.querySelector(".dd-list"), q = box.querySelector(".dd-search input"), empty = box.querySelector(".dd-empty");
    var items = [], shown = [], act = -1, buf = "", bt = 0;
    var isOpen = function () { return box.classList.contains("open"); };
    var current = function () { for (var i = 0; i < items.length; i++) if (items[i].v === hid.value) return items[i]; return null; };
    var updateBtn = function () { var c = current(); vEl.textContent = c ? (c.right ? c.label + " · " + c.right : c.label) : o.placeholder(); vEl.classList.toggle("ph", !c); };
    var draw = function (term) {
      term = (term || "").trim().toLowerCase();
      shown = term ? items.filter(function (x) { return x.hay.indexOf(term) > -1; }) : items;
      list.innerHTML = "";
      shown.forEach(function (x, i) {
        var li = document.createElement("li"); li.setAttribute("role", "option"); li.id = o.id + "-o" + i; li.setAttribute("data-v", x.v); li.setAttribute("aria-selected", x.v === hid.value ? "true" : "false");
        var l = document.createElement("span"); l.className = "o-l"; l.textContent = x.label;
        if (x.sub) { var s = document.createElement("small"); s.className = "o-s"; s.textContent = x.sub; l.appendChild(s); }
        li.appendChild(l);
        if (x.right) { var r = document.createElement("span"); r.className = "o-r"; r.textContent = x.right; li.appendChild(r); }
        list.appendChild(li);
      });
      if (empty) empty.hidden = shown.length > 0;
      act = -1;
    };
    var setAct = function (i, scroll) {
      var els = list.children; if (!els.length) { act = -1; return; }
      i = Math.max(0, Math.min(els.length - 1, i));
      if (act >= 0 && els[act]) els[act].classList.remove("act");
      act = i; els[i].classList.add("act"); btn.setAttribute("aria-activedescendant", els[i].id);
      if (scroll !== false) { var el = els[i], top = el.offsetTop, bottom = top + el.offsetHeight; if (top < list.scrollTop) list.scrollTop = top - 6; else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 6; }
    };
    var open = function () {
      if (openDd && openDd !== api) openDd.close();
      draw(q ? q.value : ""); box.classList.add("open"); btn.setAttribute("aria-expanded", "true"); openDd = api;
      var sel = -1; for (var i = 0; i < shown.length; i++) if (shown[i].v === hid.value) sel = i;
      setAct(sel >= 0 ? sel : 0, false);
      if (sel >= 0) list.scrollTop = Math.max(0, list.children[sel].offsetTop - list.clientHeight / 2 + 20);
      if (q && window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) setTimeout(function () { q.focus({ preventScroll: true }); }, 30);
    };
    var close = function (focusBtn) { if (!isOpen()) return; box.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.removeAttribute("aria-activedescendant"); if (q) q.value = ""; if (openDd === api) openDd = null; if (focusBtn) btn.focus(); };
    var pick = function (v) {
      hid.value = v; updateBtn(); close(true);
      hid.dispatchEvent(new Event("input", { bubbles: true })); hid.dispatchEvent(new Event("change", { bubbles: true }));
    };
    var api = { render: function () { items = o.options(); draw(q ? q.value : ""); updateBtn(); }, close: close, set: function (v) { hid.value = v; updateBtn(); } };
    btn.addEventListener("click", function () { if (isOpen()) close(); else open(); });
    list.addEventListener("click", function (e) { var li = e.target.closest("li[role=option]"); if (li) pick(li.getAttribute("data-v")); });
    list.addEventListener("pointermove", function (e) { var li = e.target.closest("li[role=option]"); if (li) { var i = [].indexOf.call(list.children, li); if (i !== act) setAct(i, false); } });
    if (q) q.addEventListener("input", function () { draw(q.value); setAct(0, false); list.scrollTop = 0; });
    box.addEventListener("keydown", function (e) {
      var k = e.key;
      if (!isOpen()) { if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") { if (e.target === btn) { e.preventDefault(); open(); } } return; }
      if (k === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (k === "ArrowDown") { e.preventDefault(); setAct(act + 1); }
      else if (k === "ArrowUp") { e.preventDefault(); setAct(act - 1); }
      else if (k === "Home" && e.target === btn) { e.preventDefault(); setAct(0); }
      else if (k === "End" && e.target === btn) { e.preventDefault(); setAct(shown.length - 1); }
      else if (k === "Enter" || (k === " " && e.target === btn)) { e.preventDefault(); if (shown[act]) pick(shown[act].v); }
      else if (k === "Tab") close();
      else if (!q && /^[0-9]$/.test(k)) { buf += k; clearTimeout(bt); bt = setTimeout(function () { buf = ""; }, 700); for (var i = 0; i < shown.length; i++) if (shown[i].label.indexOf(buf) === 0) { setAct(i); break; } }
    });
    api.render();
    return api;
  };
  document.addEventListener("pointerdown", function (e) { if (openDd && !e.target.closest(".dd")) openDd.close(); });
  var ageOpts = function () { var a = []; for (var n = 18; n <= 80; n++) a.push({ v: String(n), label: String(n), right: "", sub: "", hay: String(n) }); return a; };
  var ddAge = Dropdown($("ddAge"), { id: "dda", options: ageOpts, placeholder: function () { return T("Выберите возраст"); } });
  var ddTz = Dropdown($("ddTz"), { id: "ddt", options: tzList, placeholder: function () { return T("Выберите часовой пояс"); } });
  try { var detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (detectedTz) ddTz.set(detectedTz); } catch (e) {}
  document.addEventListener("langchange", function () { ddAge.render(); ddTz.render(); });
  var tzText = function () { var id = $("tz").value; if (!id) return ""; var off = fmtOffset(tzOffset(id, new Date())); return id + (off ? " (" + off + ")" : ""); };

  var buildText = function () {
    var when = (form.querySelector('input[name="when"]:checked') || {}).value || "не важно";
    var comment = field("msg").value.trim();
    var lines = ["Заявка на работу в видеочате", "Имя: " + field("name").value.trim(), "Возраст: " + parseInt(field("age").value, 10),
      "Город/часовой пояс: " + (tzText() || "не указан"), "Контакт: " + field("contact").value.trim(), "Удобное время: " + when,
      "Комментарий: " + (comment || "нет")];
    return lines.join("\n");
  };
  var openTg = function (url) { var a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); };
  var showDone = function (text, name, url, sent) {
    var d = $("done"); d.innerHTML = "";
    var mk = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    d.insertAdjacentHTML("beforeend", '<svg class="okc" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="40"/><path d="M26 43l11 11 21-23"/></svg>');
    d.appendChild(mk("h3", "", name + ", " + (sent ? T("заявка отправлена") : T("остался последний шаг"))));
    d.appendChild(mk("p", "", sent ? T("Заявка у нас. Мы свяжемся с вами по указанному контакту.") : tgReady ? T("Мы открыли Telegram с готовым сообщением. Нажмите «Отправить», чтобы мы получили заявку.") : T("Текст заявки готов. Скопируйте его и отправьте в Telegram.")));
    var acts = mk("div", "acts");
    if (url) { var a = mk("a", "btn btn-primary"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.appendChild(mk("span", "", T("Открыть Telegram ещё раз"))); acts.appendChild(a); }
    var cp = mk("button", "btn btn-ghost", T("Скопировать текст заявки")); cp.type = "button";
    cp.addEventListener("click", function () {
      var ok = function () { cp.textContent = T("Скопировано") + " ✓"; setTimeout(function () { cp.textContent = T("Скопировать текст заявки"); }, 2200); };
      var fb = function () { var dt = d.querySelector("details"); dt.open = true; var ta = dt.querySelector("textarea"); ta.focus(); ta.select(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fb); else fb();
    });
    acts.appendChild(cp);
    var back = mk("button", "linkbtn", T("Исправить данные")); back.type = "button";
    back.addEventListener("click", function () { box.classList.remove("sent"); goStep(1); });
    acts.appendChild(back); d.appendChild(acts);
    if (!sent) d.appendChild(mk("p", "", tgReady ? T("Если Telegram не открылся, нажмите кнопку выше или напишите в Telegram: @") + CONFIG.telegram : ""));
    var det = document.createElement("details"); det.innerHTML = "<summary></summary><textarea readonly></textarea>"; det.querySelector("summary").textContent = T("Показать текст заявки"); det.querySelector("textarea").value = text; d.appendChild(det);
    var ol = document.createElement("ol");
    [T("Мы свяжемся с вами и проведём собеседование"), T("Вы зарегистрируетесь (это бесплатно) и дождётесь подтверждения аккаунта — до 4 часов"), T("Затем пройдёте обязательную стажировку 2–3 дня")].forEach(function (s) { ol.appendChild(mk("li", "", s)); });
    d.appendChild(ol);
    box.classList.add("sent"); box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); setTimeout(function () { d.focus({ preventScroll: true }); }, 300);
  };
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;
    if (!checkStep1()) { goStep(1); return; }
    if (!checkStep2()) return;
    var btn = $("sendBtn"), text = buildText(), name = field("name").value.trim();
    var payload = { name: name, age: parseInt(field("age").value, 10), contact: field("contact").value.trim(), tz: tzText(), when: (form.querySelector('input[name="when"]:checked') || {}).value || "", msg: field("msg").value.trim(), hp: (form.website && form.website.value) || "" };
    var fullUrl = tgReady ? tgUrl + "?text=" + encodeURIComponent(text) : "";
    sending = true; btn.classList.add("is-loading"); btn.disabled = true; $("status").textContent = T("Открываем Telegram…");
    var done = function (sent) {
      if (!sent && fullUrl) openTg(fullUrl);
      setTimeout(function () { sending = false; btn.classList.remove("is-loading"); btn.disabled = false; $("status").textContent = ""; showDone(text, name, sent ? "" : fullUrl, sent); }, reduce ? 0 : 700);
    };
    if (CONFIG.endpoint && !payload.hp) {
      fetch(CONFIG.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error("http " + r.status); done(true); }).catch(function () { done(false); });
    } else done(false);
  });

  /* ---------- анонимная статистика (только если указан CONFIG.analytics) ---------- */
  (function () {
    var url = CONFIG.analytics; if (!url) return;
    var q = {}; try { location.search.replace(/^\?/, "").split("&").forEach(function (p) { var kv = p.split("="); if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ""); }); } catch (e) {}
    var ref = ""; try { ref = document.referrer ? (document.referrer.split("/")[2] || "") : ""; } catch (e) {}
    var src = (q.utm_source || q.src || ref || "direct").slice(0, 40), dev = innerWidth < 760 ? "m" : "d", seen = {};
    var send = function (ev, x) { var body = JSON.stringify({ e: ev, src: src, dev: dev, lang: __L.lang, x: x == null ? "" : String(x).slice(0, 40) }); try { if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) return; } catch (e) {} try { fetch(url, { method: "POST", body: body, keepalive: true }); } catch (e) {} };
    var once = function (ev, x) { if (seen[ev]) return; seen[ev] = 1; send(ev, x); };
    var sec = function (el) { var s = el.closest && el.closest("section"); return s && s.id ? s.id : "page"; };
    once("view");
    addEventListener("scroll", function () { var p = (scrollY + innerHeight) / Math.max(1, document.documentElement.scrollHeight) * 100;[25, 50, 75, 100].forEach(function (m) { if (p >= m - 1) once("scroll" + m); }); }, { passive: true });
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a,button"); if (!a) return;
      if (a.matches('a[href="#apply"]')) send("cta", a.closest("header") ? "nav" : a.closest("#sticky") ? "sticky" : sec(a));
      else if (a.hasAttribute("data-tg") || a.hasAttribute("data-tg-partner")) send("tg", sec(a));
      else if (a.closest("#calcBox")) once("calc");
    }, true);
    each("#calcBox input", function (i) { i.addEventListener("input", function () { once("calc"); }); });
    fitList.addEventListener("change", function () { once("quiz"); });
    document.addEventListener("toggle", function (e) { var d = e.target; if (d && d.tagName === "DETAILS" && d.open && d.closest("#qa")) send("faq", [].indexOf.call(document.querySelectorAll("#qa details"), d) + 1); }, true);
    new MutationObserver(function () { if (box.getAttribute("data-step") === "2") once("form_step2"); if (box.classList.contains("sent")) send("form_done", "telegram"); }).observe(box, { attributes: true, attributeFilter: ["data-step", "class"] });
    form.addEventListener("focusin", function () { once("form_start"); });
  })();
})();
/* Панель «Завершить / Пожаловаться / Следующий» оживляет карточки собеседников над ней */
(function () {
  var sf = document.querySelector(".sf"); if (!sf) return;
  var q = sf.querySelector(".queue"), ui = sf.querySelector(".ui"); if (!q || !ui) return;
  var cards = q.querySelectorAll("i"); if (cards.length < 3) return;
  var BG = ["linear-gradient(165deg,#CDBFF7,#8D78E6)", "linear-gradient(165deg,#8EE3DE,#3FA7B5)", "linear-gradient(165deg,#FFD6C2,#F5A8C8)", "linear-gradient(165deg,#BFD9FF,#6F8FE8)", "linear-gradient(165deg,#FFE3B5,#F0A07C)"];
  var cur = 1, busy = false, EASE = "cubic-bezier(.16,1,.3,1)";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var paint = function () { for (var k = 0; k < 3; k++) cards[k].style.setProperty("--bg", BG[(cur + k - 1 + BG.length) % BG.length]); };
  var step = function () { cur = (cur + 1) % BG.length; paint(); };
  var play = function (el, kf, o) { if (!el.animate) return Promise.resolve(); var a = el.animate(kf, o); return a.finished || new Promise(function (r) { a.onfinish = r; }); };
  var badge = function (card, kind) {
    var b = document.createElement("b"); b.className = "fx fx-" + kind;
    b.innerHTML = '<svg aria-hidden="true"><use href="#i-' + (kind === "end" ? "x" : "flag") + '"/></svg>';
    card.appendChild(b); return b;
  };
  var finish = function (card, b) {
    if (b && b.parentNode) b.parentNode.removeChild(b);
    card.classList.remove("flagged");
    [].forEach.call(card.getAnimations ? card.getAnimations() : [], function (a) { a.cancel(); });
    busy = false;
  };
  var run = function (kind) {
    if (busy) return; busy = true; sf.classList.add("used");
    var c = cards[1];
    if (reduce || !c.animate) { step(); busy = false; return; }
    if (kind === "next") {
      play(q, [{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: "-46px 0" }], { duration: 220, easing: "ease-in" })
        .then(function () { step(); return play(q, [{ opacity: 0, translate: "46px 0" }, { opacity: 1, translate: "0 0" }], { duration: 420, easing: EASE }); })
        .then(function () { finish(c); });
    } else if (kind === "end") {
      var b = badge(c, "end");
      play(b, [{ scale: .2, opacity: 0 }, { scale: 1.18, opacity: 1, offset: .6 }, { scale: 1, opacity: 1 }], { duration: 280, easing: "ease-out", fill: "forwards" })
        .then(function () { return play(c, [{ scale: 1, opacity: 1, translate: "0 0" }, { scale: .8, opacity: 0, translate: "0 12px" }], { duration: 340, delay: 160, easing: "ease-in", fill: "forwards" }); })
        .then(function () { step(); c.getAnimations().forEach(function (a) { a.cancel(); }); if (b.parentNode) b.parentNode.removeChild(b); return play(c, [{ scale: .7, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 420, easing: EASE }); })
        .then(function () { finish(c); });
    } else {
      var f = badge(c, "rep"); c.classList.add("flagged");
      play(f, [{ scale: .2, opacity: 0 }, { scale: 1.18, opacity: 1, offset: .6 }, { scale: 1, opacity: 1 }], { duration: 260, easing: "ease-out", fill: "forwards" });
      play(c, [{ translate: "0 0" }, { translate: "-7px 0" }, { translate: "7px 0" }, { translate: "-5px 0" }, { translate: "5px 0" }, { translate: "0 0" }], { duration: 460, easing: "ease-in-out" })
        .then(function () { return play(c, [{ translate: "0 0", opacity: 1 }, { translate: "0 16px", opacity: 0 }], { duration: 320, delay: 140, easing: "ease-in", fill: "forwards" }); })
        .then(function () { step(); c.getAnimations().forEach(function (a) { a.cancel(); }); c.classList.remove("flagged"); if (f.parentNode) f.parentNode.removeChild(f); return play(c, [{ translate: "0 -14px", opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: 420, easing: EASE }); })
        .then(function () { finish(c); });
    }
  };
  ui.addEventListener("click", function (e) { var b = e.target.closest("button[data-act]"); if (b && ui.contains(b)) run(b.getAttribute("data-act")); });
  paint();
})();
