/* GOOD WAYS — движение и интерактив. Без библиотек. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  const body = document.body;
  const hero = $('.hero');

  /* ---------- интро → первый экран ---------- */
  $$('.truck .dr').forEach((el, i) => { el.setAttribute('pathLength', '1'); el.style.setProperty('--i', i); });
  $$('.ann-l').forEach(el => el.setAttribute('pathLength', '1'));

  function drive() {
    hero.classList.add('is-driving');
    if (RM || !hero.getAnimations) return;
    const anims = hero.getAnimations({ subtree: true }).filter(a => a.animationName === 'slide' || a.animationName === 'spin');
    const t0 = performance.now(), dur = 3200;
    (function ramp(now) {
      const k = clamp((now - t0) / dur, 0, 1);
      const rate = 0.25 + 0.75 * (1 - Math.pow(1 - k, 3));   // плавный разгон
      anims.forEach(a => { a.playbackRate = rate; });
      if (k < 1) requestAnimationFrame(ramp);
    })(t0);
  }
  let started = false;
  function startHero() {
    if (started) return; started = true;
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    setTimeout(() => { hero.classList.add('is-drawn'); drive(); }, RM ? 0 : 350);
  }
  (function intro() {
    const pct = $('.intro-pct'), line = $('.intro-line i');
    if (RM) { startHero(); return; }
    setTimeout(startHero, 2600);                 // страховка: интро не может зависнуть
    const t0 = performance.now(), dur = 1250;
    (function tick(now) {
      const k = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      pct.textContent = String(Math.round(e * 100)).padStart(3, '0');
      line.style.setProperty('--p', e);
      if (k < 1) requestAnimationFrame(tick); else setTimeout(startHero, 180);
    })(t0);
  })();
  new IntersectionObserver(([e]) => hero.classList.toggle('is-off', !e.isIntersecting)).observe(hero);

  /* ---------- шапка ---------- */
  const hdr = $('#hdr'), nav = $('#nav'), burger = $('#burger');
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    hdr.classList.toggle('is-scrolled', y > 24);
    if (!nav.classList.contains('is-open')) hdr.classList.toggle('is-hidden', y > 400 && y > lastY);
    lastY = y;
  }, { passive: true });
  const closeNav = () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); body.style.overflow = ''; };
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    body.style.overflow = open ? 'hidden' : '';
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeNav(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });

  /* ---------- заголовки по словам, появление в кадре ---------- */
  $$('[data-split]').forEach(h => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
  $$('[data-split], .cargo, #facts').forEach(el => io.observe(el));

  /* ---------- счётчики ---------- */
  const facts = $('#facts');
  new IntersectionObserver((es, o) => {
    if (!es[0].isIntersecting) return;
    o.disconnect();
    $$('[data-count]', facts).forEach(el => {
      const to = +el.dataset.count, from = to > 1000 ? to - 40 : 0;
      if (RM) return;
      const t0 = performance.now(), dur = 1500;
      (function tick(now) {
        const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(lerp(from, to, e));
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.4 }).observe(facts);

  /* ---------- магнитные кнопки ---------- */
  if (FINE && !RM) $$('[data-magnet]').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.14}px, ${(e.clientY - r.top - r.height / 2) * 0.2}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  /* ---------- автопарк: конфигуратор кузова ---------- */
  const TYPES = {
    ref:   { cols: 11, pal: 33, palTxt: '33',    vol: 86, volTxt: '86',    key: 'Режим',    val: 'от −20 до +20 °C',      note: 'Загрузка: 33 европаллеты',       unit: true,  ins: true },
    tent:  { cols: 11, pal: 33, palTxt: '33',    vol: 90, volTxt: '90',    key: 'Погрузка', val: 'с любой стороны',        note: 'Загрузка: 33 европаллеты',       arrows: true },
    iso:   { cols: 6,  pal: 18, palTxt: '15–18', vol: 45, volTxt: '36–45', key: 'Кузов',    val: 'изотермический',         note: 'Загрузка: от 15 до 18 европаллет', ins: true },
    tentk: { cols: 6,  pal: 18, palTxt: '15–18', vol: 45, volTxt: '36–45', key: 'Кузов',    val: 'тентованный',            note: 'Загрузка: от 15 до 18 европаллет', arrows: true }
  };
  const cfg = $('#cfg'), stage = $('.cfg-stage'), cfgSvg = $('#cfgSvg');
  const tabs = $$('.cfg-tabs [role=tab]');
  const spPal = $('#spPal'), spVol = $('#spVol'), spKey = $('#spKey'), spVal = $('#spVal'), cfgNote = $('#cfgNote'), cfgTemp = $('#cfgTemp');
  let cfgSeen = false, cfgType = 'ref';

  function countTo(el, to, finalTxt) {
    if (RM) { el.textContent = finalTxt; return; }
    const t0 = performance.now(), dur = 900;
    (function tick(now) {
      const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? Math.round(to * e) : finalTxt;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
  function buildCfg(type) {
    const T = TYPES[type], CW = 68, CH = 46, G = 5, P = 12, ROWS = 3;
    const inner = T.cols * CW + (T.cols - 1) * G, bw = inner + P * 2, bh = ROWS * CH + (ROWS - 1) * G + P * 2;
    const total = bw + 18 + 84, x0 = (1000 - total) / 2, y0 = (300 - bh) / 2;
    cfgSvg.classList.remove('is-loaded');
    cfgSvg.innerHTML = '';
    svg('rect', { class: 'c-body', x: x0, y: y0, width: bw, height: bh, rx: 8 }, cfgSvg);
    if (T.ins) svg('rect', { class: 'c-ins', x: x0 + 5, y: y0 + 5, width: bw - 10, height: bh - 10, rx: 5 }, cfgSvg);
    svg('path', { class: 'c-line', d: `M${x0} ${y0 + 14}V${y0 + bh - 14}` }, cfgSvg);                 // задние двери
    if (T.unit) svg('rect', { class: 'c-unit', x: x0 + bw, y: y0 + bh / 2 - 44, width: 10, height: 88, rx: 3 }, cfgSvg);
    const cx = x0 + bw + 18, cy = y0 + 10, ch = bh - 20;
    svg('path', { class: 'c-line', d: `M${x0 + bw} ${y0 + bh / 2}H${cx}` }, cfgSvg);                   // сцепка
    svg('rect', { class: 'c-cab', x: cx, y: cy, width: 84, height: ch, rx: 16 }, cfgSvg);
    svg('path', { class: 'c-glass', d: `M${cx + 52} ${cy + 12}Q${cx + 74} ${cy + ch / 2} ${cx + 52} ${cy + ch - 12}L${cx + 44} ${cy + ch - 16}Q${cx + 58} ${cy + ch / 2} ${cx + 44} ${cy + 16}Z` }, cfgSvg);
    svg('path', { class: 'c-line', d: `M${cx + 60} ${cy}v-10M${cx + 60} ${cy + ch}v10` }, cfgSvg);     // зеркала
    for (let c = 0; c < T.cols; c++) for (let r = 0; r < ROWS; r++) {
      const i = c * ROWS + r;
      const x = x0 + P + (T.cols - 1 - c) * (CW + G), y = y0 + P + r * (CH + G);
      const opt = T.cols === 6 && i >= 15;
      const p = svg('rect', { class: 'pal' + (opt ? ' opt' : ''), x, y, width: CW, height: CH, rx: 4 }, cfgSvg);
      p.style.setProperty('--i', i);
      if (!opt) { const s = svg('path', { class: 'pal-s', d: `M${x + 22} ${y + 6}v${CH - 12}M${x + CW - 22} ${y + 6}v${CH - 12}` }, cfgSvg); s.style.setProperty('--i', i); }
    }
    if (T.arrows) {
      const mid = x0 + bw / 2, ch3 = (x, y, dir) => {
        const d = dir === 'd' ? `M${x - 12} ${y - 7}l12 12 12-12` : dir === 'u' ? `M${x - 12} ${y + 7}l12-12 12 12` : `M${x - 7} ${y - 12}l12 12-12 12`;
        return d;
      };
      [-bw * 0.28, 0, bw * 0.28].forEach((dx, k) => {
        const a = svg('path', { class: 'arr a-top', d: ch3(mid + dx, y0 - 26, 'd') }, cfgSvg); a.style.animationDelay = k * 0.12 + 's';
        const b = svg('path', { class: 'arr a-bot', d: ch3(mid + dx, y0 + bh + 26, 'u') }, cfgSvg); b.style.animationDelay = k * 0.12 + 's';
      });
      svg('path', { class: 'arr a-back', d: ch3(x0 - 30, y0 + bh / 2, 'r') }, cfgSvg);
    }
    stage.dataset.type = type;
    cfgTemp.hidden = type !== 'ref';
    if (type === 'ref') applyTemp(); else stage.style.removeProperty('--tc');
    cfgNote.textContent = T.note;
    spKey.textContent = T.key; spVal.textContent = T.val;
    if (cfgSeen) {
      requestAnimationFrame(() => requestAnimationFrame(() => cfgSvg.classList.add('is-loaded')));
      countTo(spPal, T.pal, T.palTxt); countTo(spVol, T.vol, T.volTxt);
    } else { spPal.textContent = T.palTxt; spVol.textContent = T.volTxt; }
  }
  function pickTab(tab, focus) {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    if (focus) tab.focus();
    cfgType = tab.dataset.type;
    buildCfg(cfgType);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pickTab(t));
    t.addEventListener('keydown', e => {
      const d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ? -1 : 0;
      if (d) { e.preventDefault(); pickTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });
  const temp = $('#temp'), tempOut = $('#tempOut');
  const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  function applyTemp() {
    const v = +temp.value, ICE = [205, 224, 240], MID = [245, 243, 239], HOT = [246, 222, 196];
    const c = v <= 0 ? mix(ICE, MID, (v + 20) / 20) : mix(MID, HOT, v / 20);
    stage.style.setProperty('--tc', `rgb(${c.join(',')})`);
    const txt = (v < 0 ? '−' + Math.abs(v) : v > 0 ? '+' + v : '0') + ' °C';
    tempOut.textContent = txt;
    temp.setAttribute('aria-valuetext', txt);
  }
  temp.addEventListener('input', applyTemp);
  buildCfg('ref');
  new IntersectionObserver((es, o) => {
    if (!es[0].isIntersecting) return;
    o.disconnect(); cfgSeen = true;
    cfgSvg.classList.add('is-loaded');
    const T = TYPES[cfgType]; countTo(spPal, T.pal, T.palTxt); countTo(spVol, T.vol, T.volTxt);
  }, { threshold: 0.45 }).observe(stage);

  /* ---------- как работаем: маршрут по прокрутке ---------- */
  (function how() {
    const sec = $('#how'), base = $('#howBase'), prog = $('#howProg'), truck = $('#howTruck'), nodesG = $('#howNodes');
    const steps = $$('#steps li');
    const len = base.getTotalLength();
    const mid = base.cloneNode(); mid.removeAttribute('id'); mid.setAttribute('class', 'how-mid'); base.after(mid);
    prog.style.strokeDasharray = len;
    const N = steps.length;
    const nodes = steps.map((_, i) => {
      const p = base.getPointAtLength(len * i / (N - 1));
      const g = svg('g', { class: 'how-node', transform: `translate(${p.x} ${p.y})` }, nodesG);
      svg('circle', { r: 20 }, g);
      svg('text', {}, g).textContent = i + 1;
      return g;
    });
    function render(p) {
      prog.style.strokeDashoffset = len * (1 - p);
      const a = base.getPointAtLength(len * p), b = base.getPointAtLength(Math.min(len, len * p + 2)), a0 = base.getPointAtLength(Math.max(0, len * p - 2));
      const ang = Math.atan2(b.y - a0.y, b.x - a0.x) * 180 / Math.PI;
      truck.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${ang})`);
      const idx = clamp(Math.floor((p + 0.06) * (N - 1)), 0, N - 1);
      steps.forEach((s, i) => s.classList.toggle('is-on', i === idx));
      nodes.forEach((n, i) => n.classList.toggle('is-on', p >= i / (N - 1) - 0.012));
    }
    if (RM) { render(1); steps.forEach(s => s.classList.add('is-on')); return; }
    let cur = 0, target = 0, raf = 0;
    function loop() {
      cur = lerp(cur, target, 0.12);
      if (Math.abs(cur - target) < 0.0005) cur = target;
      render(cur);
      raf = cur === target ? 0 : requestAnimationFrame(loop);
    }
    function onScroll() {
      const r = sec.getBoundingClientRect();
      target = clamp(-r.top / (r.height - innerHeight), 0, 1);
      if (!raf) raf = requestAnimationFrame(loop);
    }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    render(0); onScroll();
  })();

  /* ---------- направления: радар ---------- */
  (function radar() {
    // [город, широта, долгота, км по трассе от Москвы, положение подписи]
    const CITIES = [
      ['Тверь', 56.86, 35.91, 175, 'l'], ['Ярославль', 57.63, 39.87, 270, 'l'], ['Кострома', 57.77, 40.93, 340, 'r'],
      ['Иваново', 57.00, 40.97, 300, 'r'], ['Владимир', 56.13, 40.41, 185, 'r'], ['Рязань', 54.63, 39.74, 195, 'r'],
      ['Тамбов', 52.72, 41.45, 460, 'r'], ['Липецк', 52.61, 39.59, 450, 'l'], ['Воронеж', 51.67, 39.21, 520, 'r'],
      ['Белгород', 50.60, 36.59, 670, 'r'], ['Курск', 51.73, 36.19, 530, 'l'], ['Орёл', 52.97, 36.07, 370, 'l'],
      ['Тула', 54.19, 37.62, 185, 'r'], ['Калуга', 54.51, 36.26, 180, 'l'], ['Брянск', 53.24, 34.37, 380, 'l'],
      ['Смоленск', 54.78, 32.05, 400, 'u']
    ];
    const M = [55.75, 37.62], KX = Math.cos(M[0] * Math.PI / 180) * 111.32, KY = 110.57;
    const proj = (lat, lon) => [(lon - M[1]) * KX, -(lat - M[0]) * KY];
    const root = $('#radarSvg'), list = $('#cities'), roName = $('#roName'), roKm = $('#roKm');

    svg('path', { class: 'r-cross', d: 'M-430 0H430M0 -330V630' }, root);
    [200, 400, 600].forEach((r, i) => {
      svg('circle', { class: 'r-ring' + (i === 2 ? ' dash' : ''), r }, root);
      svg('text', { class: 'r-ringt', x: r * 0.7071 + 8, y: -r * 0.7071 - 6 }, root).textContent = r + ' км';
    });
    // дальние направления
    [[-430, -250, 'Северо-Запад'], [430, 40, 'Урал · Сибирь'], [300, 630, 'Юг · СНГ']].forEach(([x, y, t]) => {
      const k = 0.86;
      svg('path', { class: 'r-farl', d: `M${x * 0.35} ${y * 0.35}L${x * k} ${y * k}` }, root);
      const tx = svg('text', { class: 'r-far', x: x * k + (x < 0 ? 8 : -8), y: y * k + (y > 300 ? -14 : 24), 'text-anchor': x < 0 ? 'start' : 'end' }, root);
      tx.textContent = x < 0 ? '← ' + t : t + ' →';
    });
    const gLines = svg('g', {}, root), gPts = svg('g', {}, root);
    const items = CITIES.map(([name, lat, lon, km, pos], i) => {
      const [x, y] = proj(lat, lon);
      const line = svg('line', { class: 'rt', x1: 0, y1: 0, x2: x, y2: y }, gLines);
      const g = svg('g', { class: 'rc', transform: `translate(${x} ${y})` }, gPts);
      svg('circle', { class: 'hit', r: 30 }, g);
      svg('circle', { class: 'pt', r: 7 }, g);
      const t = svg('text', pos === 'u' ? { x: 0, y: -18, 'text-anchor': 'middle' } : pos === 'l' ? { x: -14, y: 7, 'text-anchor': 'end' } : { x: 14, y: 7 }, g);
      t.textContent = name;
      const li = document.createElement('li'), btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = name; li.appendChild(btn); list.appendChild(li);
      const act = () => { setActive(i); userAt = performance.now(); };
      g.addEventListener('pointerenter', act); g.addEventListener('click', act);
      btn.addEventListener('pointerenter', act); btn.addEventListener('focus', act); btn.addEventListener('click', act);
      return { name, km, x, y, line, g, btn };
    });
    // Москва
    svg('circle', { class: 'r-mskp', r: 9 }, root);
    svg('circle', { class: 'r-msk', r: 9 }, root);
    svg('text', { class: 'r-mskt', x: -16, y: -16, 'text-anchor': 'end' }, root).textContent = 'Москва';
    const p1 = svg('circle', { class: 'r-pulse', r: 6 }, root), p2 = svg('circle', { class: 'r-pulse', r: 6 }, root);

    let active = -1, userAt = -1e9, visible = false;
    function setActive(i) {
      if (i === active) return;
      active = i;
      items.forEach((it, k) => { const on = k === i; it.line.classList.toggle('is-on', on); it.g.classList.toggle('is-on', on); it.btn.classList.toggle('is-on', on); });
      roName.textContent = 'Москва ⇄ ' + items[i].name;
      roKm.textContent = '≈ ' + items[i].km + ' км по трассе';
    }
    setActive(12);
    const order = [12, 4, 1, 8, 15, 6, 0, 9, 3, 14, 5, 10, 2, 13, 7, 11];
    let oi = 0, lastSwitch = 0;
    function frame(now) {
      if (visible) {
        const it = items[active], t = (now % 1700) / 1700, e = t * t * (3 - 2 * t);
        p1.setAttribute('cx', it.x * e); p1.setAttribute('cy', it.y * e);
        p2.setAttribute('cx', it.x * (1 - e)); p2.setAttribute('cy', it.y * (1 - e));
        if (now - userAt > 6000 && now - lastSwitch > 2800) { lastSwitch = now; oi = (oi + 1) % order.length; setActive(order[oi]); }
        requestAnimationFrame(frame);
      }
    }
    if (RM) { p1.remove(); p2.remove(); return; }
    new IntersectionObserver(([e]) => {
      const was = visible; visible = e.isIntersecting;
      if (visible && !was) { lastSwitch = performance.now(); requestAnimationFrame(frame); }
    }, { threshold: 0.15 }).observe($('#radar'));
  })();

  /* ---------- отзывы ---------- */
  (function reviews() {
    const names = $$('.rev-names [role=tab]'), quotes = $$('.rev-body blockquote');
    function pick(i, focus) {
      names.forEach((n, k) => { n.setAttribute('aria-selected', String(k === i)); n.tabIndex = k === i ? 0 : -1; });
      quotes.forEach((q, k) => q.classList.toggle('is-on', k === i));
      if (focus) names[i].focus();
    }
    names.forEach((n, i) => {
      n.addEventListener('click', () => pick(i));
      if (FINE) n.addEventListener('pointerenter', () => pick(i));
      n.addEventListener('keydown', e => {
        const d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ? -1 : 0;
        if (d) { e.preventDefault(); pick((i + d + names.length) % names.length, true); }
      });
    });
  })();

  /* ---------- заявка ---------- */
  (function form() {
    const f = $('#form'), err = $('#formErr');
    const bind = (inp, out, empty) => $(inp).addEventListener('input', e => { $(out).textContent = e.target.value.trim() || empty; });
    bind('#fFrom', '#bFrom', 'Москва'); bind('#fTo', '#bTo', 'Ваш город'); bind('#fWhat', '#bWhat', '—'); bind('#fVol', '#bVol', '—');
    f.addEventListener('input', e => { e.target.closest('.fld')?.classList.remove('is-bad'); err.hidden = true; });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(f), bad = [];
      ['from', 'to', 'name', 'tel'].forEach(n => {
        const el = f.elements[n], ok = el.value.trim().length > 1 && (n !== 'tel' || el.value.replace(/\D/g, '').length >= 10);
        el.closest('.fld').classList.toggle('is-bad', !ok);
        if (!ok) bad.push(el);
      });
      if (bad.length) { err.textContent = 'Заполните маршрут, имя и телефон — без них не посчитать.'; err.hidden = false; bad[0].focus(); return; }
      if (!f.elements.agree.checked) { err.textContent = 'Отметьте согласие на обработку персональных данных.'; err.hidden = false; f.elements.agree.focus(); return; }
      const text = [
        'Маршрут: ' + d.get('from') + ' → ' + d.get('to'),
        'Груз: ' + (d.get('what') || 'не указан'),
        'Объём / вес: ' + (d.get('vol') || 'не указан'),
        'Имя: ' + d.get('name'),
        'Телефон: ' + d.get('tel')
      ].join('\n');
      location.href = 'mailto:info@good-ways.ru?subject=' + encodeURIComponent('Заявка на расчёт перевозки') + '&body=' + encodeURIComponent(text);
    });
  })();
})();
