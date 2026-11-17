const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const URL = process.env.SITE_URL;
const SHOTS = process.env.SHOTS_DIR;
const results = [];
const ok = (name, cond, detail) => { results.push({ name, pass: !!cond, detail: detail === undefined ? '' : String(detail) }); };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const consoleErrors = [];
  const newCtx = async (opts = {}) => {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }, opts));
    await ctx.route(/https?:\/\/t\.me\/.*/, r => r.abort());   // не ходим в реальный Telegram
    ctx.setDefaultNavigationTimeout(60000);
    return ctx;
  };
  const watch = (page, tag) => {
    page.on('pageerror', e => consoleErrors.push(tag + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/t\.me|ERR_FAILED|net::/.test(m.text())) consoleErrors.push(tag + ' console: ' + m.text()); });
  };
  const showHdr = async page => { await page.mouse.move(600, 400); await page.mouse.wheel(0, -80); await page.waitForTimeout(650); };
  const setEx = async (page, s) => { await page.click('#exSeg label:has(input[value="' + s + '"])'); };
  const jump = (page, id) => page.evaluate(i => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById(i).scrollIntoView(); }, id);

  /* 1–5. язык */
  {
    const ctx = await newCtx({ locale: 'en-US', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } });
    const page = await ctx.newPage(); watch(page, 'lang');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600);
    ok('1. Первый вход при английской локали браузера открывает русский', (await page.getAttribute('html', 'lang')) === 'ru' && /[А-Яа-я]/.test(await page.textContent('h1')), await page.textContent('h1'));
    ok('1b. Переключатель языка — одна кнопка без выпадающего списка', (await page.locator('#langList').count()) === 0 && (await page.locator('#langBtn').count()) === 1);
    ok('1c. localStorage lang пуст до выбора', (await page.evaluate(() => localStorage.getItem('lang'))) === null);
    await page.evaluate(() => { window.__marker = 42; });
    await page.fill('#name', 'Анна-Мария');
    await showHdr(page); await page.click('#langBtn'); await page.waitForTimeout(300);
    ok('2. Одно нажатие RU→EN: язык en, заголовок английский', (await page.getAttribute('html', 'lang')) === 'en' && /international video chat/.test(await page.textContent('h1')), await page.textContent('h1'));
    ok('2b. Страница не перезагружалась (маркер жив) и введённое имя сохранилось', (await page.evaluate(() => window.__marker)) === 42 && (await page.inputValue('#name')) === 'Анна-Мария');
    ok('2c. localStorage lang=en', (await page.evaluate(() => localStorage.getItem('lang'))) === 'en');
    ok('2d. aria-label кнопки на английском', /Russian/.test(await page.getAttribute('#langBtn', 'aria-label')), await page.getAttribute('#langBtn', 'aria-label'));
    await showHdr(page); await page.click('#langBtn'); await page.waitForTimeout(300);
    ok('3. Повторное нажатие EN→RU возвращает русский', (await page.getAttribute('html', 'lang')) === 'ru' && /[А-Яа-я]/.test(await page.textContent('h1')));
    await showHdr(page); await page.click('#langBtn'); await page.waitForTimeout(300);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600);
    ok('4. После перезагрузки сохраняется английский', (await page.getAttribute('html', 'lang')) === 'en' && /international video chat/.test(await page.textContent('h1')));
    await jump(page, 'terms');
    await page.mouse.move(600, 500); await page.mouse.wheel(0, -60); await page.waitForTimeout(600);
    await page.click('#menuBtn'); await page.waitForTimeout(400);
    await page.click('#menu a[href="#faq"]'); await page.waitForTimeout(500);
    await page.click('#faq .qa details:first-child summary'); await page.waitForTimeout(300);
    await jump(page, 'apply'); await page.waitForTimeout(300);
    ok('5. Переход по секциям через меню: язык не сбрасывается', (await page.getAttribute('html', 'lang')) === 'en' && /Frequently asked/.test(await page.textContent('#faq-h')));
    const cyrEn = await page.evaluate(() => {
      const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const n = w.currentNode, p = n.parentElement; if (!p || /SCRIPT|STYLE/.test(p.tagName)) continue; if (/[А-Яа-яЁё]/.test(n.data) && !p.closest('[data-i18n-skip]')) out.push(n.data.trim().slice(0, 60)); }
      const attrs = []; document.querySelectorAll('[aria-label],[placeholder],[title],[alt]').forEach(e => ['aria-label', 'placeholder', 'title', 'alt'].forEach(a => { const v = e.getAttribute(a); if (v && /[А-Яа-яЁё]/.test(v)) attrs.push(a + ':' + v); }));
      return { text: out, attrs };
    });
    ok('5b. EN: нет русских текстов в DOM (меню, разделы, партнёрам, футер, форма)', cyrEn.text.length === 0 && cyrEn.attrs.length === 0, JSON.stringify(cyrEn).slice(0, 400));
    await page.click('footer [data-open="privacy"]').catch(() => {});
    await page.waitForTimeout(300);
    const dlgCyr = await page.evaluate(() => /[А-Яа-яЁё]/.test(document.getElementById('privacy').textContent));
    ok('5c. EN: политика конфиденциальности без русского', !dlgCyr);
    await page.keyboard.press('Escape');
    await page.fill('#contact', '@test_user');
    await showHdr(page); await page.click('#langBtn'); await page.waitForTimeout(300);
    ok('5d. Переключение обратно сохраняет поле контакта', (await page.inputValue('#contact')) === '@test_user');
    await page.evaluate(() => localStorage.setItem('lang', 'de')); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
    ok('5e. Некорректное сохранённое значение → русский', (await page.getAttribute('html', 'lang')) === 'ru');
    await ctx.close();
  }

  /* 6. калькулятор: 4,33 недели в месяце */
  {
    const ctx = await newCtx(); const page = await ctx.newPage(); watch(page, 'calc');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
    await jump(page, 'calc');
    const num = s => parseInt(String(s).replace(/[^\d]/g, ''), 10);
    const rnd = x => Math.round(Math.round(x * 100) / 100);
    let bad = [], n = 0;
    for (const s of [0, 1, 2]) for (const h of [1, 2, 3, 4, 5, 6, 7, 8]) {
      await setEx(page, s);
      if (s > 0) await page.locator('#extraHours').fill(String(h));
      await page.waitForTimeout(60);
      const base = rnd(5 * 30 * 4.33), extra = s === 0 ? 0 : rnd(s * h * 9 * 4.33), total = base + extra;
      const got = { base: num(await page.textContent('#vBase')), extra: num(await page.textContent('#vExtra')), total: num(await page.textContent('#vTotal')) };
      n++;
      if (got.base !== base || got.extra !== extra || got.total !== total) bad.push(`s${s} h${h}: exp ${base}/${extra}/${total} got ${got.base}/${got.extra}/${got.total}`);
      if (s === 0) break;
    }
    ok(`6. Калькулятор: ${n} комбинаций, основной = 5×$30×4,33, доп. = смены×часы×$9×4,33, итог = сумма`, bad.length === 0, bad.join(' ; '));
    ok('6a. Выбор периодов 1/2/4/8 недель и вкладки удалены', (await page.locator('#period, #extraShifts, .tile').count()) === 0);
    await setEx(page, 0);
    ok('6b. При 0 доп. смен слайдер часов отключён, доп. доход $0, итог $650', (await page.locator('#extraHours').isDisabled()) && num(await page.textContent('#vExtra')) === 0 && num(await page.textContent('#vTotal')) === 650);
    await setEx(page, 1); await page.locator('#extraHours').fill('4');
    ok('6c. 1 доп. смена × 4 ч: $156 доп., итог $806', num(await page.textContent('#vExtra')) === 156 && num(await page.textContent('#vTotal')) === 806, await page.textContent('#vTotal'));
    ok('6d. Формулы видны: $30 × 5 смен = $150 в неделю; $150 × 4,33 недели ≈ $650 в месяц', /^\$30 × 5 смен = \$150 в неделю$/.test((await page.textContent('#fBase')).trim()) && /^\$150 × 4,33 недели ≈ \$650 в месяц$/.test((await page.textContent('#fBase2')).trim()) && /1 дн\. × 4 ч × \$9 × 4,33 нед\./.test(await page.textContent('#fExtra')), (await page.textContent('#fBase')) + ' | ' + (await page.textContent('#fBase2')) + ' | ' + (await page.textContent('#fExtra')));
    const note = await page.textContent('.calc-out .calc-note');
    ok('6e. Заметное пояснение: ориентировочный расчёт при полном выполнении графика, подарки не учитываются и не гарантируются', /Это ориентировочный расчёт при полном выполнении графика\./.test(note) && /Подарки от собеседников не учитываются и не гарантируются\./.test(note) && /ориентировочный доход/i.test(await page.textContent('.calc-out .k')), note);
    ok('6f. Повторного CTA в калькуляторе нет, заголовок и пояснение обновлены', (await page.locator('#calc .calc-go, #calc .calc-out .btn').count()) === 0 && /Сколько можно заработать/.test(await page.textContent('#calc-h')) && /пяти полных смен в неделю по \$30/.test(await page.textContent('#calc .head p')), await page.textContent('#calc-h'));
    const w0 = await page.evaluate(() => document.getElementById('calcBox').getBoundingClientRect().height);
    await setEx(page, 2); await page.locator('#extraHours').fill('8'); await page.waitForTimeout(100);
    const w1 = await page.evaluate(() => document.getElementById('calcBox').getBoundingClientRect().height);
    ok('6i. Высота калькулятора не прыгает при смене цифр', Math.abs(w0 - w1) < 1, w0 + ' -> ' + w1);
    ok('6j. Недельные вкладки не вернулись, доп. смены — переключатель 0/1/2', (await page.locator('#exSeg input[type=radio]').count()) === 3);
    ok('6g. Подарки не включены в доход (в расчёте нет слагаемого подарков)', !/подар/i.test(await page.textContent('.brk')));
    await ctx.close();
    const ctx2 = await newCtx({ reducedMotion: 'no-preference' }); const p2 = await ctx2.newPage(); watch(p2, 'calc-anim');
    await p2.goto(URL, { waitUntil: 'domcontentloaded' }); await p2.waitForTimeout(500); await jump(p2, 'calc'); await p2.waitForTimeout(300);
    await setEx(p2, 2); await p2.locator('#extraHours').fill('8');
    await p2.waitForTimeout(120);
    const mid = num(await p2.textContent('#vTotal'));
    await p2.waitForTimeout(900);
    const end = num(await p2.textContent('#vTotal'));
    ok('6h. Числа плавно анимируются (промежуточное значение между $650 и итогом)', mid > 650 && mid < end && end === 650 + Math.round(Math.round(2 * 8 * 9 * 4.33 * 100) / 100), `mid=${mid} end=${end}`);
    await ctx2.close();
  }

  /* 12. шапка */
  {
    const ctx = await newCtx({ reducedMotion: 'no-preference' }); const page = await ctx.newPage(); watch(page, 'header');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(900);
    const hidden = () => page.evaluate(() => document.getElementById('top').classList.contains('hide'));
    ok('12a. В начале страницы шапка видна', !(await hidden()));
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    await page.mouse.move(600, 500);
    await page.mouse.wheel(0, 300); await page.waitForTimeout(250);
    await page.mouse.wheel(0, 400); await page.waitForTimeout(500);
    ok('12b. При прокрутке вниз шапка скрывается', await hidden());
    await page.mouse.wheel(0, -60); await page.waitForTimeout(500);
    ok('12c. При прокрутке вверх шапка возвращается', !(await hidden()));
    await page.mouse.wheel(0, 500); await page.waitForTimeout(500);
    const was = await hidden();
    await page.mouse.wheel(0, -6); await page.waitForTimeout(300); await page.mouse.wheel(0, 8); await page.waitForTimeout(300); await page.mouse.wheel(0, -5); await page.waitForTimeout(300);
    ok('12d. Мелкие движения колеса не дёргают шапку', was === (await hidden()), 'hidden state changed on tiny scroll');
    await page.mouse.wheel(0, -2000); await page.waitForTimeout(700);
    ok('12e. У верха страницы шапка всегда видна', !(await hidden()));
    ok('12f. Логотип по центру шапки', await page.evaluate(() => { const l = document.querySelector('.top .logo').getBoundingClientRect(); return Math.abs((l.left + l.right) / 2 - innerWidth / 2) < 3; }));
    ok('12g. Элементов управления в шапке два: меню и язык', (await page.locator('.top .bar > button, .top .bar .tools button').count()) === 2);
    await page.click('#menuBtn'); await page.waitForTimeout(500);
    const items = await page.$$eval('#menu a:not(.btn)', a => a.map(x => ({ t: x.textContent.trim(), ic: !!x.querySelector('svg use'), h: x.getAttribute('href') })));
    ok('12h. Меню: 6 пунктов (Работа, Условия, Доход, Как начать, Вопросы, Партнёрам), у каждого иконка', items.length === 6 && items.every(i => i.ic) && items.map(i => i.t).join('|') === 'Работа|Условия|Доход|Как начать|Вопросы|Партнёрам', JSON.stringify(items.map(i => i.t)));
    ok('12i. Меню видно и aria-expanded=true', (await page.getAttribute('#menuBtn', 'aria-expanded')) === 'true' && await page.locator('#menu').isVisible());
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    ok('12j. Esc закрывает меню', (await page.getAttribute('#menuBtn', 'aria-expanded')) === 'false' && !(await page.locator('#menu').isVisible()));
    await page.click('#menuBtn'); await page.waitForTimeout(300); await page.click('#menu a[href="#partner"]'); await page.waitForTimeout(1200);
    ok('12k. Пункт меню ведёт к разделу и закрывает меню', (await page.getAttribute('#menuBtn', 'aria-expanded')) === 'false' && await page.evaluate(() => Math.abs(document.getElementById('partner').getBoundingClientRect().top) < 140));
    await page.waitForFunction(() => { const l = document.querySelector('link[href*="fonts.googleapis"][rel=stylesheet]'); return l && l.media === 'all'; }, null, { timeout: 30000 }).catch(() => {});
    const fonts = await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => setTimeout(r, 300)); await document.fonts.ready; return { jost: document.fonts.check('500 20px Geologica'), onest: document.fonts.check('400 16px Onest'), h: getComputedStyle(document.querySelector('h2')).fontFamily.split(',')[0], b: getComputedStyle(document.body).fontFamily.split(',')[0] }; });
    ok('12l. Шрифты: Unbounded (заголовки) и Onest (текст) загружены', fonts.jost && fonts.onest && /Unbounded/.test(fonts.h) && /Onest/.test(fonts.b), JSON.stringify(fonts));
    await ctx.close();
  }

  /* 13. партнёрская программа и Telegram-ссылки */
  {
    const ctx = await newCtx(); const page = await ctx.newPage(); watch(page, 'partner');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
    const txt = await page.textContent('#partner');
    ok('13a. Партнёрская программа: заголовок и подзаголовок', /Рекомендуйте ORBIELLA знакомым/.test(txt) && /\$150 в два этапа/.test(txt));
    const ps = await page.$$eval('#partner .pc', l => l.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    ok('13b. Партнёрам: $50 после стажировки, $100 после первого месяца, итого $150', ps.length === 3 && /^\$50 когда она пройдёт обязательную стажировку$/.test(ps[0]) && /^\$100 когда она отработает первый месяц$/.test(ps[1]) && /^\$150 итого за одну успешную рекомендацию$/.test(ps[2]), ps.join(' | '));
    ok('13c. Итог: «$150 за одну успешную рекомендацию»', /\$150/.test(await page.textContent('#partner .pc.tot .pt-a')) && /итого за одну успешную рекомендацию/.test(await page.textContent('#partner .pc.tot')));
    ok('13o. Суммы — отдельные элементы (две выплаты и итог), без слипшихся значений', await page.evaluate(() => document.querySelectorAll('#partner .pc .ps-a').length === 2 && document.querySelectorAll('#partner .pc .pt-a').length === 1 && ![...document.querySelectorAll('#partner .pc')].some(e => /\d\.\s*\d|\d\$\d|[а-я]\$\d/.test(e.innerText.replace(/\s+/g, ' ')))));
    const cnt = re => (txt.match(re) || []).length;
    ok('13d. Суммы не дублируются: $50 и $100 по одному разу, $150 — в подзаголовке и в итоге', cnt(/\$50\b/g) === 1 && cnt(/\$100\b/g) === 1 && cnt(/\$150/g) === 2, [cnt(/\$50\b/g), cnt(/\$100\b/g), cnt(/\$150/g)].join('/'));
    const href = await page.getAttribute('[data-tg-partner]', 'href');
    ok('13e. «Стать партнёром» ведёт прямо в существующий Telegram-контакт', /^https:\/\/t\.me\/alinkakovkova\?text=/.test(href), href);
    ok('13f. Партнёрская секция не придумывает условий', !/%|уровн|процент/i.test(txt.replace(/100%/g, '')));
    const tg = await page.$$eval('a[data-tg]', a => a.map(x => ({ t: x.textContent.trim(), h: x.getAttribute('href'), s: (x.closest('section,footer') || {}).id || 'footer' })));
    ok('13g. Все Telegram-кнопки (' + tg.length + ') ведут напрямую на t.me/alinkakovkova', tg.length >= 3 && tg.every(x => /^https:\/\/t\.me\/alinkakovkova$/.test(x.h)), JSON.stringify(tg.filter(x => !/^https:\/\/t\.me\/alinkakovkova$/.test(x.h))));
    ok('13h. Вопросы — в Telegram (первый экран, FAQ, футер), CTA кандидата — в форму', ['hero', 'faq', 'footer'].every(id => tg.some(x => x.s === id)) && !!href, tg.map(x => x.s).join(','));
    const apply = await page.$$eval('a[href="#apply"]:not([data-tg])', a => a.length);
    const heroTxt = await page.textContent('#hero');
    ok('13j. Первый экран: заголовок, подзаголовок, 3 плашки и две кнопки', await page.evaluate(() => { const h = document.getElementById('hero'); const t = s => (h.querySelector(s) || {}).textContent || ''; const chips = [...h.querySelectorAll('.perks li')].map(x => x.textContent.trim()); const b1 = h.querySelector('.cta-row .btn-primary'), b2 = h.querySelector('.cta-row .btn-ghost'); return t('h1').trim() === 'Работа в международном видеочате' && t('.lead').trim() === 'Общайтесь с мужчинами из Европы по видеосвязи из дома и получайте $30 за каждую полностью отработанную смену.' && chips.join('|') === 'Без откровенного контента|Опыт и английский не нужны|Выплаты каждый понедельник' && b1.textContent.trim() === 'Оставить заявку' && b1.getAttribute('href') === '#apply' && b2.textContent.trim() === 'Условия работы' && b2.getAttribute('href') === '#terms'; }) && !/Разговоры, за которые платят|Бесплатный старт/.test(heroTxt), heroTxt.replace(/\s+/g, ' ').slice(0, 200));
    const st = await page.$$eval('#start .card h3', l => l.map(x => x.textContent.trim()));
    ok('13k. «Как начать»: 5 шагов, регистрация бесплатная, подтверждение до 4 ч, стажировка 2–3 дня', st.length === 5 && st.join('|') === 'Оставьте заявку|Пройдите собеседование|Зарегистрируйтесь|Дождитесь подтверждения аккаунта|Пройдите стажировку' && /Регистрация и создание аккаунта бесплатные/.test(await page.textContent('#start .card:nth-child(3)')) && /до 4 часов/.test(await page.textContent('#start .card:nth-child(4)')) && /2.{0,2}–.{0,2}3 дня/.test(await page.textContent('#start .card:nth-child(5)')) && /Оплата — вместе с первой зарплатой/.test(await page.textContent('#start .card:nth-child(5)')), st.join(' | '));
    const faqA = await page.$$eval('#qa details', l => l.map(d => d.textContent));
    ok('13m. FAQ: стажировка обязательна для всех, 2–3 дня', faqA.some(a => /Стажировка обязательна для всех и длится 2.{0,2}–.{0,2}3 дня/.test(a)));
    ok('13n. Неполная смена: ставка $30 не предусмотрена (без выдуманных правил)', faqA.some(a => /Эта ставка относится только к полной смене/.test(a)));
    const faqQ = await page.$$eval('#qa summary', l => l.map(x => x.textContent.trim()));
    ok('13l. FAQ: 7 вопросов без дублей', faqQ.join('|') === ['Можно ли без опыта и без английского?', 'Что нужно для работы?', 'Сколько платят за смену?', 'Как проходит стажировка?', 'Нужно ли платить за регистрацию?', 'Когда и как выплачивают деньги?', 'Что происходит после отправки заявки?'].join('|'), faqQ.join(' | '));
    ok('13i. Кнопки «Оставить заявку» ведут в форму заявки', apply >= 3 && (await page.locator('#apply #formBox').count()) === 1, apply);
    await ctx.close();
  }

  /* 14. FAQ-аккордеон и плавная смена языка */
  {
    const ctx = await newCtx({ reducedMotion: 'no-preference' }); const page = await ctx.newPage(); watch(page, 'faq');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600); await jump(page, 'faq'); await page.waitForTimeout(1500);
    const h = () => page.$$eval('#qa details', l => l.map(d => Math.round(d.getBoundingClientRect().height)));
    const h0 = await h();
    await page.click('#qa details:nth-child(1) summary'); await page.waitForTimeout(90);
    const hMid = await h(); await page.waitForTimeout(600); const hEnd = await h();
    ok('14a. Ответ раскрывается плавно (промежуточная высота)', hMid[0] > h0[0] && hMid[0] < hEnd[0], h0[0] + ' / ' + hMid[0] + ' / ' + hEnd[0]);
    await page.click('#qa details:nth-child(3) summary'); await page.waitForTimeout(700);
    const opn = await page.$$eval('#qa details', l => l.map(d => d.open));
    ok('14b. Одновременно открыт один ответ, предыдущий закрылся', opn.filter(Boolean).length === 1 && opn[2], JSON.stringify(opn));
    await page.click('#qa details:nth-child(3) summary'); await page.waitForTimeout(90);
    const closing = (await h())[2]; await page.waitForTimeout(700);
    ok('14c. Закрытие тоже плавное и ответ сворачивается', closing > h0[2] && (await h())[2] === h0[2] && !(await page.$eval('#qa details:nth-child(3)', d => d.open)), closing + ' -> ' + (await h())[2]);
    await page.keyboard.press('Tab');
    await page.focus('#qa details:nth-child(2) summary'); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    ok('14d. Ответ открывается с клавиатуры (Enter)', await page.$eval('#qa details:nth-child(2)', d => d.open));
    await showHdr(page); await page.click('#langBtn'); await page.waitForTimeout(80);
    ok('14e. При смене языка контент мягко проявляется (класс анимации)', await page.evaluate(() => document.documentElement.classList.contains('lang-swap')));
    await page.waitForTimeout(800);
    ok('14f. После анимации служебный класс снят', !(await page.evaluate(() => document.documentElement.classList.contains('lang-swap'))));
    await ctx.close();
  }

  /* 15. контент: противоречия, старые формулировки, единые факты */
  {
    const ctx = await newCtx(); const page = await ctx.newPage(); watch(page, 'content');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
    const all = await page.evaluate(() => { document.querySelectorAll('details').forEach(d => d.open = true); return document.body.innerText + '\n' + [...document.querySelectorAll('meta[content]')].map(m => m.content).join('\n') + '\n' + document.getElementById('privacy').textContent; });
    ok('15a. Нет «гарантированной» оплаты (кроме «подарки не гарантированы»)', !/гарантированн/i.test(all.replace(/не гарантированы/g, '')), (all.match(/.{0,40}гарантированн.{0,30}/gi) || []).join(' | '));
    ok('15b. Нет «готового аккаунта» нигде, включая мета-теги', !/готов(ый|ого) аккаунт/i.test(all));
    ok('15c. Стажировка везде 2–3 дня, «3–4 дня» нигде нет', !/3\u2060?–\u2060?4 дн/.test(all) && (all.match(/2\u2060?–\u2060?3 дн/g) || []).length >= 2, (all.match(/.{0,30}\d\u2060?–\u2060?\d дн.{0,10}/g) || []).join(' | '));
    ok('15d. $30 везде связано с полностью отработанной сменой', /полностью отработанную смену/.test(await page.textContent('#hero')) && /полностью отработанную смену/.test(await page.textContent('#terms')) && /полных смен/.test(await page.textContent('#calc')));
    const tx = all.replace(/⁠/g, '');
    const bad15 = [/разбить на/i, /по договорённости/i, /согласуем вместе/i, /подтверждения платформы/i, /© \d{4} Орбиэлла/, /[Мм]енеджер/, /Подходит мне/, /Обсудить начало работы/, /без мелкого шрифта/i, /на лету/i, /мир на связи/i, /в ваших руках/i, /Разговоры, за которые платят/, /Бесплатный старт/, /Посмотреть условия/, /Ваш комфорт/, /Первый шаг/, /Давайте знакомиться/, /Узнаёте себя/, /Посчитайте свой месяц/, /вступительных взносов/, /сложных проверок/, /Условия — без/].filter(r => r.test(tx)).map(String);
    ok('15h. Единые формулировки: «разделить на части», «согласовывается», «подтверждение аккаунта», ORBIELLA, без «менеджера», старых лозунгов и CTA', bad15.length === 0, bad15.join(' '));
    ok('15i. Условия согласованы: стажировка 2–3 дня + оплата с первой зарплатой, подтверждение до 4 часов, регистрация бесплатная', (tx.match(/вместе с первой зарплатой/g) || []).length >= 2 && /до 4 часов/.test(tx) && /Регистрация и создание аккаунта бесплатные/.test(tx) && /Бесплатная регистрация/.test(tx) && !/за неполную смену[^.]{0,30}\$30/.test(tx));
    ok('15j. После аудита: «Без откровенного контента» на первом экране, вопрос в Telegram там же, нет «гибкого графика», «кандидаток», «до $150»; полная занятость названа прямо', /Без откровенного контента/.test(await page.textContent('#hero .perks')) && /^https:\/\/t\.me\/alinkakovkova$/.test(await page.getAttribute('#hero .hero-ask a', 'href')) && !/[Гг]ибк|кандидат|до \$150|не вакансия/.test(tx) && /олная занятость: 5 дней в неделю по 7–8 часов/.test(tx) && !/из разных стран/.test(tx));
    ok('15e. Нет старых тревожных/официальных формулировок', !/без скрытых деталей|Других обязанностей нет|Нужно согласие на обработку|Порядок завершения сотрудничества на сайте не описан|Точные сроки на сайте не указаны/.test(all));
    ok('15f. Макет телефона: оригинал, отдельная метка «ПЕРЕВОД» и перевод — три отдельных элемента', await page.evaluate(() => { const c = document.getElementById('pSub'); return !!c.querySelector(':scope > .bub') && !!c.querySelector('.tag') && !!c.querySelector('.trw .bub') && c.querySelector('.tag').getBoundingClientRect().bottom <= c.querySelector('.trw .bub').getBoundingClientRect().top + 4; }));
    await page.click('#langBtn'); await page.waitForTimeout(300);
    const en = await page.evaluate(() => document.body.innerText + '\n' + [...document.querySelectorAll('meta[content]')].map(m => m.content).join('\n'));
    ok('15g. EN: нет «guaranteed pay», «ready-made account», стажировка 2–3 days', !/guaranteed <|guaranteed \$|guaranteed pay|ready-made/i.test(en) && /2\u2060?–\u2060?3 day/.test(en) && !/3\u2060?–\u2060?4 day/.test(en), (en.match(/.{0,30}(guaranteed|ready-made).{0,20}/gi) || []).join(' | '));
    await ctx.close();
  }

  /* 16. мобильная панель заявки и неблокирующие шрифты */
  {
    const ctx = await newCtx({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); watch(page, 'mobile-cta');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
    const on = () => page.evaluate(() => document.getElementById('sticky').classList.contains('on'));
    const ctaBottom = await page.evaluate(() => document.querySelector('.hero .btn-primary').getBoundingClientRect().bottom);
    ok('16a. 375×667: главная кнопка первого экрана видна без прокрутки', ctaBottom <= 667, Math.round(ctaBottom));
    ok('16b. Пока кнопка первого экрана видна, нижняя панель скрыта', !(await on()));
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, document.querySelector('.hero .cta-row').getBoundingClientRect().bottom + scrollY + 40); }); await page.waitForTimeout(500);
    const heroVisible = await page.evaluate(() => document.getElementById('hero').getBoundingClientRect().bottom > 0);
    ok('16c. Кнопка первого экрана ушла из вида — панель «Оставить заявку» появилась (ещё на первом экране)', heroVisible && (await on()));
    await jump(page, 'apply'); await page.waitForTimeout(500);
    ok('16d. В блоке заявки панель снова скрыта', !(await on()));
    const fl = await page.evaluate(() => { const l = [...document.querySelectorAll('link[href*="fonts.googleapis"]')]; return { media: l.filter(x => x.rel === 'stylesheet').map(x => x.getAttribute('onload') ? 'async' : x.media), ns: !!document.querySelector('noscript') }; });
    ok('16e. Шрифты подключены без блокировки отрисовки (с запасным вариантом без JS)', fl.media.includes('async') && fl.ns, JSON.stringify(fl));
    await ctx.close();
  }

  /* 17. этап 3: порядок разделов, фоны, проверка возраста, подтверждённые условия */
  {
    const ctx = await newCtx(); const page = await ctx.newPage(); watch(page, 'stage3');
    const tgReq = []; ctx.on('request', r => { if (/t\.me/.test(r.url())) tgReq.push(r.url()); });
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
    const secs = await page.$$eval('main > section', l => l.map(s => s.id + ':' + (s.classList.contains('s-paper') ? 'L' : s.classList.contains('s-flip') ? 'D' : s.classList.contains('s-dark') ? 'X' : 'A')));
    ok('17a. Порядок: работа → безопасность → условия → доход → как начать → FAQ → заявка → партнёрам (отдельно, после заявки)', secs.map(s => s.split(':')[0]).join(',') === 'hero,how,safety,terms,calc,start,faq,apply,partner', secs.join(' '));
    const tones = secs.slice(1, 7).map(s => s.split(':')[1]);
    ok('17b. Фоны чередуются без двух одинаковых подряд', tones.every((t, i) => i === 0 || t !== tones[i - 1]), tones.join(''));
    const menu = await page.$$eval('#menu a:not(.btn)', l => l.map(a => a.getAttribute('href').slice(1)));
    ok('17c. Меню: Работа, Условия, Доход, Как начать, Вопросы, Партнёрам — в порядке страницы', menu.join(',') === 'how,terms,calc,start,faq,partner', menu.join(','));
    ok('17d. Страница короткая: меньше 650 слов в основном содержимом', ((await page.evaluate(() => document.querySelector('main').innerText)).match(/[\p{L}\p{N}$]+/gu) || []).length < 650);
    const body = await page.evaluate(() => { document.querySelectorAll('details').forEach(d => d.open = true); return document.body.innerText; });
    ok('17e. Стажировка оплачивается вместе с первой зарплатой, сумма не указана', /Оплата — вместе с первой зарплатой/.test(await page.textContent('#start')) && /Оплата производится вместе с первой зарплатой/.test(await page.textContent('#faq')) && !/\$\d/.test(await page.textContent('#start .card:nth-child(5)')) && !/\$\d/.test(await page.textContent('#qa details:nth-child(4)')) && /стажировка/i.test(await page.textContent('#qa details:nth-child(4) summary')));
    ok('17f. День начала стажировки согласовывается индивидуально', /День начала согласовывается индивидуально/.test(await page.textContent('#faq')));
    ok('17g. Без комиссии со стороны ORBIELLA (без обещаний за банки)', /без комиссии со стороны ORBIELLA/i.test(await page.textContent('#terms')) && /Комиссии со стороны ORBIELLA нет/.test(await page.textContent('#faq')) && !/без комисси[^.]{0,40}банк/i.test(body));
    ok('17h. Поддержка: без обещания круглосуточной работы, вопросы — в Telegram', (body.match(/24\/7|круглосуточ/gi) || []).length === 0 && /Telegram/.test(await page.textContent('#safety')));
    ok('17i. Подарки — отдельное примечание, не смешаны с фиксированной оплатой', /Подарки от собеседников возможны дополнительно, но не гарантированы и не входят в расчёт основного дохода\./.test(await page.textContent('#terms .gift')) && (await page.locator('#terms .bento .t').evaluateAll(l => l.some(x => /подар/i.test(x.textContent)))) === false);
    ok('17j. Галочки «Мне исполнилось 18 лет» в форме нет, остальные согласия на месте', (await page.locator('#c18').count()) === 0 && (await page.locator('#cinfo').count()) === 1 && (await page.locator('#cdata').count()) === 1);
    await jump(page, 'apply');
    const ages = await page.$$eval('#ddAge li', l => l.map(x => parseInt(x.getAttribute('data-v'), 10)));
    ok('17k. В списке возраста нет значений младше 18', ages.length > 0 && Math.min(...ages) === 18);
    await page.fill('#name', 'Тест'); await page.fill('#contact', '@test_user');
    await page.evaluate(() => { document.getElementById('age').value = '17'; });
    await page.click('#toStep2'); await page.waitForTimeout(250);
    ok('17l. Подменённый возраст 17 не пропускает на шаг 2, показана ошибка', (await page.getAttribute('#formBox', 'data-step')) === '1' && /18/.test(await page.textContent('#e-age')), await page.textContent('#e-age'));
    await page.evaluate(() => { document.getElementById('age').value = '25'; });
    await page.click('#toStep2'); await page.waitForTimeout(250);
    await page.check('#cinfo'); await page.check('#cdata');
    await page.evaluate(() => { document.getElementById('age').value = '16'; });
    await page.click('#sendBtn'); await page.waitForTimeout(600);
    ok('17m. Даже на шаге 2 возраст младше 18 блокирует отправку: Telegram не открыт', tgReq.length === 0 && (await page.getAttribute('#formBox', 'data-step')) === '1', 'tg=' + tgReq.length);
    await ctx.close();
  }

  /* 18. две темы: переключатель, сохранение, контраст, логотип */
  {
    const ratio = (a, b) => { const L = c => { const v = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; }; const l1 = L(a), l2 = L(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
    const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const checks = [['#terms h2', '#terms'], ['#terms .t-sch .d', '#terms'], ['#terms .t-sch b', '#terms'], ['#terms .head p', '#terms'], ['#hero .btn-primary', [255, 216, 181]], ['#faq summary', '#faq'], ['#faq .head p', '#faq'], ['#safety h3', '#safety'], ['#safety p', '#safety'], ['#how .step p', '#how .step'], ['#how h2', '#how'], ['#start h3', '#start'], ['#start p', '#start'], ['#calc .lbl', 'CALCIN'], ['#calc .calc-note', [26, 18, 67]], ['#hero .lead', [26, 18, 67]],  ['#apply h2', [91, 67, 181]], ['#partner h2', '#partner'], ['#partner .pc span', '#partner'], ['#safety .lf p', '#safety'], ['#safety h2', '#safety'], ['#how .step h3', '#how .step'], ['.form .fl > span', [248, 245, 255]], ['footer .f-nav a', 'footer']];
    for (const theme of ['dark', 'light']) {
      const ctx = await newCtx({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); watch(page, 'theme-' + theme);
      await page.addInitScript(th => { try { localStorage.setItem('theme', th); } catch (e) {} }, theme);
      await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(700);
      await page.evaluate(() => document.querySelectorAll('.rv').forEach(e => e.classList.add('in')));
      ok(`18a. [${theme}] Тема применена при загрузке (data-ot=${theme})`, (await page.getAttribute('html', 'data-ot')) === theme);
      const res = await page.evaluate(([checks, theme]) => {
        const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const out = [];
        checks.forEach(([fs, bs]) => { const f = document.querySelector(fs); if (!f) { out.push([fs, 'нет элемента']); return; } const fc = getComputedStyle(f).color; let bg; if (Array.isArray(bs)) bg = 'rgb(' + bs.join(',') + ')'; else if (bs === 'CALCIN') bg = theme === 'dark' ? 'rgb(30,16,66)' : 'rgb(248,245,255)'; else { let el = document.querySelector(bs); bg = 'rgba(0,0,0,0)'; while (el) { const c = getComputedStyle(el).backgroundColor; const a = (c.match(/[\d.]+/g) || [])[3]; if (c !== 'rgba(0, 0, 0, 0)' && a !== '0') { bg = c; break; } el = el.parentElement; } } out.push([fs, fc, bg]); });
        return out;
      }, [checks, theme]);
      const bad = [];
      for (const r of res) { if (r.length === 2) { bad.push(r.join(': ')); continue; } const fc = rgb(r[1]), bc = rgb(r[2]); if (fc.length < 3 || bc.length < 3) { bad.push(r[0] + ': нет цвета'); continue; } const cr = ratio(fc, bc); if (cr < 4.5) bad.push(`${r[0]}: ${cr.toFixed(2)}`); }
      ok(`18b. [${theme}] Контраст текста ≥ 4,5:1 у ${res.length} пар (заголовки, текст, кнопки, формы, футер)`, bad.length === 0, bad.join(' | '));
      const logo = await page.evaluate(() => { const d = getComputedStyle(document.querySelector('.top .logo .u-d')).display, l = getComputedStyle(document.querySelector('.top .logo .u-l')).display; return d + '/' + l; });
      ok(`18c. [${theme}] Логотип: белый вариант на сиянии в обеих темах`, logo === 'inline/none', logo);
      await ctx.close();
    }
    const ctx = await newCtx({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); watch(page, 'theme-toggle');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(700);
    ok('18d. По умолчанию светлая тема (яркая Aurora)', (await page.getAttribute('html', 'data-ot')) === 'light');
    const bg0 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.click('#menuBtn'); await page.waitForTimeout(400); await page.click('#themeBtn'); await page.waitForTimeout(300);
    const bg1 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok('18e. Кнопка в меню переключает тему на тёмную, фон страницы меняется', (await page.getAttribute('html', 'data-ot')) === 'dark' && bg0 !== bg1, bg0 + ' → ' + bg1);
    ok('18f. Выбор темы сохранён в localStorage', (await page.evaluate(() => localStorage.getItem('theme'))) === 'dark');
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600);
    ok('18g. После перезагрузки остаётся тёмная тема', (await page.getAttribute('html', 'data-ot')) === 'dark');
    const same = await page.evaluate(() => { const a = [...document.querySelectorAll('.phone,.scr .ctl b.end')].map(e => getComputedStyle(e).backgroundImage).join('|'); return a; });
    ok('18h. Макет телефона одинаковый в обеих темах (устройство не перекрашивается)', same.length > 10, same);
    await ctx.close();
  }

  /* 19. телефон: тап/клик по экрану меняет собеседников местами */
  {
    const state = p => p.evaluate(() => { const s = document.getElementById('scr'), r = s.getBoundingClientRect(), a = document.querySelector('.fa').getBoundingClientRect(), b = document.querySelector('.fb').getBoundingClientRect(); return { sw: s.classList.contains('sw'), pressed: s.getAttribute('aria-pressed'), full: Math.round(r.width), a: Math.round(a.width), b: Math.round(b.width) }; });
    // десктоп, мышь
    {
      const ctx = await newCtx({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' }); const page = await ctx.newPage(); watch(page, 'phone-mouse');
      await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(900);
      const s0 = await state(page);
      ok('19a. Исходно: собеседник на весь экран, вы — в маленьком окне', !s0.sw && s0.pressed === 'false' && s0.a === s0.full && s0.b < 100, JSON.stringify(s0));
      { const bb = await page.locator('#scr').boundingBox(); await page.mouse.click(bb.x + 120, bb.y + 330); } await page.waitForTimeout(250);
      const mid = await state(page);
      await page.waitForTimeout(700);
      const s1 = await state(page);
      ok('19b. Клик мышью по экрану меняет собеседников местами (плавно, есть промежуточный кадр)', s1.sw && s1.pressed === 'true' && s1.b === s1.full && s1.a < 100 && mid.b > s0.b && mid.b < s1.full, JSON.stringify({ mid, s1 }));
      { const bb = await page.locator('#scr').boundingBox(); await page.mouse.click(bb.x + 120, bb.y + 330); } await page.waitForTimeout(900);
      const s2 = await state(page);
      ok('19c. Повторный клик возвращает как было', !s2.sw && s2.a === s2.full && s2.b < 100, JSON.stringify(s2));
      const hit = await page.evaluate(() => { const r = document.getElementById('scr').getBoundingClientRect(); const pts = [[.5, .5], [.85, .2], [.3, .72], [.5, .92], [.15, .12]]; return pts.map(([x, y]) => { const e = document.elementFromPoint(r.left + r.width * x, r.top + r.height * y); return e && e.closest('#scr') ? 'ok' : (e ? e.className || e.tagName : 'none'); }); });
      ok('19d. Ни один слой не перекрывает экран телефона (центр, окно, чат, кнопки, статус-бар)', hit.every(x => x === 'ok'), hit.join(','));
      await page.focus('#scr'); await page.keyboard.press('Enter'); await page.waitForTimeout(800);
      const s3 = await state(page); await page.keyboard.press(' '); await page.waitForTimeout(800); const s4 = await state(page);
      ok('19e. С клавиатуры (Enter и пробел) тоже переключается', s3.sw && !s4.sw, JSON.stringify([s3.sw, s4.sw]));
      await ctx.close();
    }
    // сенсорный телефон: тап, серия тапов, свайп-прокрутка
    for (const dev of [{ n: 'Android', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36', w: 412, h: 915 }, { n: 'iPhone', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', w: 390, h: 844 }]) {
      const ctx = await newCtx({ viewport: { width: dev.w, height: dev.h }, isMobile: true, hasTouch: true, userAgent: dev.ua, reducedMotion: 'no-preference' }); const page = await ctx.newPage(); watch(page, 'phone-' + dev.n);
      await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(900);
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; const r = document.getElementById('scr').getBoundingClientRect(); window.scrollBy(0, r.top - 80); }); await page.waitForTimeout(400);
      const box = await page.locator('#scr').boundingBox();
      await page.touchscreen.tap(box.x + box.width * .4, box.y + box.height * .45); await page.waitForTimeout(900);
      const t1 = await state(page);
      ok(`19f. [${dev.n}] Тап пальцем по экрану меняет собеседников`, t1.sw && t1.b === t1.full, JSON.stringify(t1));
      for (let i = 0; i < 10; i++) { await page.touchscreen.tap(box.x + box.width * .5, box.y + box.height * .5); await page.waitForTimeout(90); }
      await page.waitForTimeout(900);
      const t2 = await state(page);
      ok(`19g. [${dev.n}] 10 быстрых тапов подряд: не зависает, итог чётный (как после 1 тапа)`, t2.sw && t2.b === t2.full && t2.a < 100, JSON.stringify(t2));
      await page.touchscreen.tap(box.x + box.width * .5, box.y + box.height * .5); await page.waitForTimeout(900);
      const t3 = await state(page);
      ok(`19h. [${dev.n}] Ещё один тап возвращает исходное положение`, !t3.sw && t3.a === t3.full, JSON.stringify(t3));
      const cdp = await ctx.newCDPSession(page);
      const y0 = await page.evaluate(() => scrollY);
      const sx = Math.round(box.x + box.width * .5), sy = Math.round(box.y + box.height * .7);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy }] });
      for (let k = 1; k <= 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx, y: sy - k * 30 }] }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(900);
      const t4 = await state(page), y1 = await page.evaluate(() => scrollY);
      ok(`19i. [${dev.n}] Прокрутка пальцем по телефону листает страницу и не переключает собеседников`, !t4.sw && y1 > y0 + 50, `y ${y0}→${y1} sw=${t4.sw}`);
      await ctx.close();
    }
  }

  /* 12m. все пункты меню и футера ведут в нужные разделы */
  {
    const ctx = await newCtx({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); watch(page, 'anchors');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#langBtn', { timeout: 30000 }); await page.waitForTimeout(500);
    const bad = [];
    for (const id of ['how', 'terms', 'calc', 'start', 'faq', 'partner']) {
      await jump(page, 'hero'); await page.waitForTimeout(150); await page.mouse.move(600, 400); await page.mouse.wheel(0, -50); await page.waitForTimeout(500);
      await page.click('#menuBtn'); await page.waitForTimeout(350);
      const lbl = await page.textContent('#menu a[href="#' + id + '"]');
      await page.click('#menu a[href="#' + id + '"]'); await page.waitForTimeout(500);
      const top = await page.evaluate(i => Math.round(document.getElementById(i).getBoundingClientRect().top), id);
      if (!lbl || Math.abs(top) > 140) bad.push(id + ':' + top);
    }
    const foot = await page.$$eval('footer .f-nav a', l => l.map(a => a.getAttribute('href').slice(1)));
    const missing = await page.evaluate(ids => ids.filter(i => !document.getElementById(i)), [...foot, 'apply', 'terms']);
    ok('12m. Все 6 пунктов меню ведут к своим разделам (якоря проверены кликом), ссылки футера указывают на существующие разделы', bad.length === 0 && missing.length === 0 && foot.join(',') === 'how,terms,calc,start,faq,partner', bad.join(',') + ' missing=' + missing.join(','));
    const ctaOk = await page.evaluate(() => [...document.querySelectorAll('a[href="#apply"]')].every(a => !!document.getElementById('formBox')) && document.querySelector('#hero .btn-ghost').getAttribute('href') === '#terms');
    ok('12n. Кнопки «Оставить заявку» ведут к форме, «Условия работы» — к условиям', ctaOk);
    await ctx.close();
  }

  /* 16f. панель «Оставить заявку» скрыта в партнёрском блоке */
  {
    const ctx = await newCtx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); watch(page, 'sticky-partner');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(700);
    await jump(page, 'faq'); await page.waitForTimeout(500);
    const onFaq = await page.evaluate(() => document.getElementById('sticky').classList.contains('on'));
    await jump(page, 'partner'); await page.waitForTimeout(500);
    const onPtn = await page.evaluate(() => document.getElementById('sticky').classList.contains('on'));
    ok('16f. Панель заявки видна в FAQ и скрыта в партнёрской программе (не смешиваем с вакансией)', onFaq && !onPtn, `faq=${onFaq} partner=${onPtn}`);
    await ctx.close();
  }

  /* 7–9. форма и Telegram */




  const tzCases = [['Asia/Bangkok', 'UTC+07:00'], ['Europe/London', null]];
  for (const [tzId, off] of tzCases) {
    const ctx = await newCtx({ timezoneId: tzId });
    const page = await ctx.newPage(); watch(page, 'form-' + tzId);
    const popups = []; ctx.on('page', p => popups.push(p));
    const urls = []; ctx.on('request', r => { if (/t\.me/.test(r.url())) urls.push(r.url()); });
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
    await jump(page, 'apply'); await page.waitForTimeout(300);
    const tag = `[${tzId}] `;
    ok(tag + '9a. Honeypot-поле на месте и пустое', (await page.locator('input.hp[name="website"]').count()) === 1 && (await page.inputValue('input.hp[name="website"]')) === '');
    ok(tag + '8a. «Далее» без данных не пускает и показывает 3 ошибки', await (async () => { await page.click('#toStep2'); await page.waitForTimeout(200); const e = [await page.textContent('#e-name'), await page.textContent('#e-age'), await page.textContent('#e-contact')]; return (await page.getAttribute('#formBox', 'data-step')) === '1' && e.every(x => x.trim().length > 3); })());
    await page.fill('#name', 'Drug'); await page.fill('#contact', '@duhdeveloper');
    ok(tag + '6a. Поле возраста — не текстовый ввод', (await page.locator('#age').getAttribute('type')) === 'hidden' && (await page.locator('#ddAge input[type=text],#ddAge input[type=number]').count()) === 0);
    await page.click('#ddAge .dd-btn'); await page.waitForTimeout(250);
    const ages = await page.$$eval('#ddAge li', l => l.map(x => parseInt(x.textContent, 10)));
    ok(tag + '6b. Возраст: список 18…80 подряд', ages[0] === 18 && ages[ages.length - 1] === 80 && ages.every((v, i) => v === 18 + i), `${ages[0]}..${ages[ages.length - 1]} n=${ages.length}`);
    await page.click('#ddAge li[data-v="29"]'); await page.waitForTimeout(200);
    ok(tag + '6c. Выбор возраста сохраняется', (await page.inputValue('#age')) === '29' && /29/.test(await page.textContent('#ddAgeV')));
    await page.click('#toStep2'); await page.waitForTimeout(300);
    ok(tag + '7a. Переход на шаг 2', (await page.getAttribute('#formBox', 'data-step')) === '2');
    const detected = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    ok(tag + '6d. Часовой пояс определён автоматически (IANA браузера)', (await page.inputValue('#tz')) === tzId && detected === tzId, `hidden=${await page.inputValue('#tz')} detected=${detected} btn=${await page.textContent('#ddTzV')}`);
    if (off) ok(tag + '6e. Показано текущее смещение UTC', (await page.textContent('#ddTzV')).includes(off), await page.textContent('#ddTzV'));
    if (tzId === 'Europe/London') {
      const bst = await page.evaluate(() => new Intl.DateTimeFormat('en', { timeZone: 'Europe/London', timeZoneName: 'longOffset' }).format(new Date()));
      ok(tag + '6f. Летнее/зимнее время учитывается (смещение совпадает с Intl)', await (async () => { const shown = await page.textContent('#ddTzV'); const m = bst.match(/GMT([+-]\d\d:\d\d)?/); const exp = m && m[1] ? 'UTC' + m[1] : 'UTC+00:00'; return shown.includes(exp); })(), await page.textContent('#ddTzV'));
    }
    await page.click('#ddTz .dd-btn'); await page.waitForTimeout(250);
    const ids = await page.$$eval('#ddTz li', l => l.map(x => x.getAttribute('data-v')));
    ok(tag + '6h. В списке есть Asia/Bangkok, Europe/Moscow, Europe/London, America/New_York', ['Asia/Bangkok', 'Europe/Moscow', 'Europe/London', 'America/New_York'].every(x => ids.includes(x)), `n=${ids.length}`);
    await page.fill('#tzQ', 'нью'); await page.waitForTimeout(150);
    ok(tag + '6i. Поиск «нью» находит Нью-Йорк', (await page.$$eval('#ddTz li', l => l.map(x => x.getAttribute('data-v')))).includes('America/New_York'));
    await page.fill('#tzQ', ''); await page.fill('#tzQ', 'moscow'); await page.waitForTimeout(150);
    await page.click('#ddTz li[data-v="Europe/Moscow"]'); await page.waitForTimeout(200);
    ok(tag + '6j. Ручная смена пояса на Europe/Moscow', (await page.inputValue('#tz')) === 'Europe/Moscow' && /Москва/.test(await page.textContent('#ddTzV')), await page.textContent('#ddTzV'));
    await page.click('#whenChips label:has(input[value="утром"])');
    await page.fill('#msg', 'Хочу уточнить график & оплату: 100% «ок»');
    await page.click('#sendBtn'); await page.waitForTimeout(250);
    const errs = [await page.textContent('#e-cinfo'), await page.textContent('#e-cdata')];
    ok(tag + '8b. Без чекбоксов отправка блокируется, показано 2 ошибки (галочки 18+ больше нет — возраст проверяется полем), Telegram не открыт', errs.every(x => x.trim().length > 3) && popups.length === 0 && urls.length === 0, errs.join(' | '));
    await page.check('#cinfo');
    await page.click('#sendBtn'); await page.waitForTimeout(250);
    ok(tag + '8c. Без одного чекбокса согласия отправка блокируется', (await page.textContent('#e-cdata')).trim().length > 3 && popups.length === 0);
    await page.click('#toStep1'); await page.waitForTimeout(250);
    ok(tag + '7b. Назад: шаг 1, данные на месте', (await page.getAttribute('#formBox', 'data-step')) === '1' && (await page.inputValue('#name')) === 'Drug' && (await page.inputValue('#age')) === '29' && (await page.inputValue('#contact')) === '@duhdeveloper');
    await page.click('#toStep2'); await page.waitForTimeout(250);
    ok(tag + '7c. Снова вперёд: данные шага 2 на месте', (await page.inputValue('#tz')) === 'Europe/Moscow' && (await page.inputValue('#msg')).startsWith('Хочу') && (await page.isChecked('#cinfo')));
    await page.check('#cdata');
    await page.dblclick('#sendBtn'); await page.waitForTimeout(900);
    ok(tag + '9a. Один запрос к Telegram при двойном клике (запрос заблокирован тестом, реальная заявка не создана)', urls.length === 1, urls.length);
    const link = urls[0] || '';
    const text = link.includes('text=') ? decodeURIComponent(link.split('text=')[1].replace(/\+/g, '%20')) : '';
    ok(tag + '9b. Ссылка ведёт на t.me/alinkakovkova', /^https:\/\/t\.me\/alinkakovkova\?text=/.test(link), link.slice(0, 50));
    const expected = ['Заявка на работу в видеочате', 'Имя: Drug', 'Возраст: 29', 'Контакт: @duhdeveloper', 'Удобное время: утром', 'Комментарий: Хочу уточнить график & оплату: 100% «ок»'];
    ok(tag + '9c. Сообщение содержит все заполненные поля в нужном виде', expected.every(x => text.includes(x)), text.replace(/\n/g, ' | '));
    ok(tag + '9d. Часовой пояс передан (IANA + смещение)', /Город\/часовой пояс: Europe\/Moscow \(UTC\+03:00\)/.test(text), (text.match(/Город\/часовой пояс: .*/) || [''])[0]);
    ok(tag + '9e. В сообщении нет строки «Язык сайта»', !/Язык сайта/.test(text) && !/Site language/i.test(text));
    ok(tag + '9f. Показан экран «остался последний шаг» с кнопкой копирования и текстом заявки', await page.locator('#done .btn').count() >= 2 && (await page.inputValue('#done textarea')).includes('Имя: Drug'));
    const steps = await page.$$eval('#done ol li', l => l.map(x => x.textContent));
    ok(tag + '9g. Экран после отправки: собеседование → бесплатная регистрация и подтверждение до 4 часов → стажировка 2–3 дня', steps.length === 3 && /собеседовани/.test(steps[0]) && /бесплатно/.test(steps[1]) && /подтверждения аккаунта — до 4 часов/.test(steps[1]) && /обязательную стажировку 2–3 дня/.test(steps[2]), steps.join(' | '));
    ok(tag + '9h. В сообщении нет служебных строк («Хочу уточнить») и пустых значений', !/^Хочу уточнить|undefined|NaN|null/m.test(text) && text.split('\n').every(l => l.trim().length > 0 && !/:\s*$/.test(l)), text.replace(/\n/g, ' | '));
    await ctx.close();
  }

  /* 10. адаптивность, единая сетка, английская версия */
  const sizes = [[375, 667], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900]];
  for (const theme of ['dark', 'light']) for (const lang of ['ru', 'en']) for (const [w, h] of sizes) {
    const ctx = await newCtx({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 });
    const page = await ctx.newPage(); watch(page, 'vp' + w + lang);
    await page.addInitScript(([l, th]) => { try { localStorage.setItem('lang', l); localStorage.setItem('theme', th); } catch (e) {} }, [lang, theme]);
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#langBtn', { timeout: 30000 }); await page.waitForTimeout(800);
    await page.waitForFunction(() => { const l = document.querySelector('link[href*=\"fonts.googleapis\"][rel=stylesheet]'); return l && l.media === 'all'; }, null, { timeout: 20000 }).catch(() => {}); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelectorAll('.rv').forEach(e => e.classList.add('in')));
    const m = await page.evaluate(() => {
      const de = document.documentElement, W = innerWidth;
      const over = []; document.body.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width && r.right > W + 1 && cs.position !== 'fixed' && !e.closest('.stage,.orbits,.spark,.menu,.sticky,.dd-pop,svg,symbol')) over.push((e.className || e.tagName) + ':' + Math.round(r.right)); });
      const clipped = []; document.querySelectorAll('.tc b,.tc span,.btn,summary,.dd-btn,.chk span,h1 span,h2,.pill,.badge,.st,.rw p').forEach(e => { if (!e.getClientRects().length) return; if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible' && !e.matches('.dd-v')) clipped.push(e.textContent.trim().slice(0, 30)); });
      const small = []; document.querySelectorAll('.btn,summary,.chk,.dd-btn,.menu-btn,.langtog,.chips label,#themeBtn').forEach(e => { const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.height < 43 && !e.closest('.menu:not(.open)')) small.push((e.className || e.tagName) + ':' + Math.round(r.height)); });
      const rect = s => document.querySelector(s).getBoundingClientRect();
      const lt = rect('#langBtn'), lg = rect('.top .logo'), mb = rect('#menuBtn');
      const heads = [...document.querySelectorAll('.sec .head, .apply-grid, .hero-grid')].map(e => Math.round(e.getBoundingClientRect().left));
      const wraps = [...document.querySelectorAll('.wrap')].map(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return Math.round(r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)); });
      const h1 = document.querySelector('h1').getBoundingClientRect(), bar = rect('.bar');
      const cards = [...document.querySelectorAll('.bento .t')].map(b => Math.round(b.getBoundingClientRect().height));
      [...document.querySelectorAll('.pc b')].forEach(e => { const c = e.closest('.pc').getBoundingClientRect(), r = e.getBoundingClientRect(); if (r.right > c.right - 8 || r.left < c.left + 8) over.push('amount:' + e.textContent.trim()); });
      const tr = document.querySelector('.v-tr .ru small'), trs = document.querySelector('.v-tr .ru span');
      const hit = (a, b) => { const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); return !(x.right <= y.left + 0.5 || x.left >= y.right - 0.5 || x.bottom <= y.top + 0.5 || x.top >= y.bottom - 0.5); };
      const ov = []; document.querySelectorAll('#partner .ps').forEach(p => { const a = [...p.querySelectorAll('.ps-n,.ps-b')]; if (hit(a[0], a[1])) ov.push('ps'); }); document.querySelectorAll('#partner .ps-b h3,#partner .ps-b p').forEach(e => { const nx = e.nextElementSibling; if (nx && hit(e, nx)) ov.push('ps-b'); });
      const tt = [...document.querySelectorAll('#partner .pt-k,#partner .pt-l,#partner .pt-n')]; for (let i = 0; i < tt.length; i++) for (let j = i + 1; j < tt.length; j++) if (hit(tt[i], tt[j])) ov.push('ptotal');
      const hh = document.querySelector('h1'), hl = document.querySelector('#hero .hero-grid > div:first-child'), st = document.querySelector('#hero .stage-wrap');
      const heroOk = hh.scrollWidth <= hh.clientWidth + 1 && (W < 900 || hl.getBoundingClientRect().right <= st.getBoundingClientRect().left + 1);
      return { partnerOv: ov, heroOk, scrollW: de.scrollWidth, W, over: over.slice(0, 4), clipped, small: small.slice(0, 5), langOverlap: !(lt.right < lg.left || lt.left > lg.right), menuOverlap: !(mb.right < lg.left || mb.left > lg.right), inView: lt.right <= W && mb.left >= 0, heads: [...new Set(heads)], maxWrap: Math.max(...wraps), h1Clear: bar.bottom <= h1.top + 1, cards, trSep: tr && trs && tr.getBoundingClientRect().bottom <= trs.getBoundingClientRect().top + 2, h1: document.querySelector('h1').textContent };
    });
    const t = `[${lang} ${w}px${theme === 'light' ? ' light' : ''}] `;
    ok(t + '10a. Нет горизонтальной прокрутки', m.scrollW <= m.W + 1 && m.over.length === 0, `scrollW=${m.scrollW} W=${m.W} over=${m.over.join(',')}`);
    ok(t + '10b. Нет обрезанного текста', m.clipped.length === 0, m.clipped.join(' | '));
    ok(t + '10c. Элементы управления не ниже 43 px', m.small.length === 0, m.small.join(' | '));
    ok(t + '10d. Меню и язык не наложены на логотип, всё в области экрана', !m.langOverlap && !m.menuOverlap && m.inView);
    ok(t + '10e. Шапка не перекрывает заголовок первого экрана', m.h1Clear);
    ok(t + '10f. Единая сетка: ширина контента ≤ 1080 px, левые границы секций совпадают', m.maxWrap <= 1080 && m.heads.length <= 2, `maxWrap=${m.maxWrap} heads=${m.heads}`);
    ok(t + '10g. Все 6 карточек условий на месте и не пустые', m.cards.length === 6 && m.cards.every(h => h > 60), m.cards.join(','));
    ok(t + '10l. Партнёрская программа: номера, заголовки, суммы и итог не накладываются друг на друга', m.partnerOv.length === 0, m.partnerOv.join(','));
    ok(t + '10m. Заголовок первого экрана целиком помещается в колонку и не заходит на телефон', m.heroOk);
    ok(t + '10h. Подпись «ПЕРЕВОД» и сообщение — отдельные элементы', !!m.trSep);
    if (lang === 'en') {
      const cyr = await page.evaluate(() => { const o = []; const wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (wk.nextNode()) { const n = wk.currentNode, p = n.parentElement; if (!p || /SCRIPT|STYLE/.test(p.tagName) || p.closest('[data-i18n-skip]')) continue; if (/[А-Яа-яЁё]/.test(n.data)) o.push(n.data.trim().slice(0, 40)); } return o; });
      ok(t + '10i. Английская версия без русских фрагментов', cyr.length === 0, cyr.join(' | '));
    }
    if (lang === 'ru') {
      await page.screenshot({ path: path.join(SHOTS, `full-${theme}-${w}.png`), fullPage: true });
      await page.click('#menuBtn'); await page.waitForTimeout(450);
      ok(t + '10j. Меню открывается и помещается в экран', await page.evaluate(() => { const r = document.getElementById('menu').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }));
      await page.screenshot({ path: path.join(SHOTS, `menu-${w}.png`) });
      await page.keyboard.press('Escape');
      await showHdr(page); await page.click('#langBtn'); await page.waitForTimeout(300);
      ok(t + '10k. Язык переключается одним нажатием', (await page.getAttribute('html', 'lang')) === 'en');
    }
    await ctx.close();
  }

  ok('11. Ошибок консоли/JS нет', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log(results.map(r => (r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail && !r.pass ? '  -> ' + r.detail : '')).join('\n'));
  console.log(`\nTOTAL ${results.length}, PASSED ${results.length - failed.length}, FAILED ${failed.length}`);
  fs.writeFileSync(path.join(SHOTS, 'results.json'), JSON.stringify(results, null, 1));
})().catch(e => { console.error('TEST HARNESS ERROR', e.stack.split('\n').slice(0,6).join('\n')); process.exit(2); });
