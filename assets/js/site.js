/* Quipus site interactions. Every motion uses eased curves; only timers/progress run linear. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const onScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

  /* ---------- Haptics: short, light taps on phones ----------
     Android: navigator.vibrate. iPhone (Safari 17.4+): toggling a hidden switch input inside a tap gives a system haptic.
     Never before the visitor has touched the page, never with reduced motion, and rate-limited so it stays subtle. */
  const haptic = (() => {
    if (reduce || !matchMedia('(pointer: coarse)').matches) return () => {};
    const canVibrate = typeof navigator.vibrate === 'function';
    let sw = null;
    if (!canVibrate) {
      sw = document.createElement('label');
      sw.setAttribute('aria-hidden', 'true');
      sw.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      sw.innerHTML = '<input type="checkbox" switch tabindex="-1">';
      document.body.appendChild(sw);
    }
    const PATTERN = { tick: 6, soft: 8, tap: 12, success: [12, 50, 18], error: [14, 40, 14] };
    let last = 0;
    return (kind = 'soft') => {
      const ua = navigator.userActivation;
      if (ua && !ua.hasBeenActive) return;
      const now = performance.now(); if (now - last < 60) return; last = now;
      if (canVibrate) { try { navigator.vibrate(PATTERN[kind] || 8); } catch (e) {} }
      else if (sw && (!ua || ua.isActive)) sw.click();
    };
  })();
  // Taps on anything interactive get a light tick
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    if (e.target.closest('a.cta, button, .ex-tab, .et, summary, .cf-seg label, .mobile-menu a, .step .prog, .links a')) haptic('soft');
  }, { passive: true });

  /* ---------- Lucide icons (animated in CSS on hover / reveal) ---------- */
  if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
  const playIcons = el => { el.classList.add('ip'); setTimeout(() => el.classList.remove('ip'), 1400); };

  /* ---------- Hero headline: split into words ---------- */
  const heroH = $('#heroH');
  if (heroH) {
    let d = 0;
    const wrap = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { f.appendChild(document.createTextNode(t)); return; }
          const s = document.createElement('span');
          s.className = 'w'; s.style.setProperty('--d', d++); s.textContent = t;
          f.appendChild(s);
        });
        n.replaceWith(f);
      } else wrap(n);
    });
    wrap(heroH);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('loaded')));

  /* ---------- Navbar: scrolled state, scroll-spy indicator, mobile menu ---------- */
  const nav = $('#nav'), links = $('#links'), ind = links && $('.ind', links);
  const onScroll = () => {
    const s = scrollY > 40;
    nav.classList.toggle('scrolled', s);
    document.body.classList.toggle('nav-scrolled', s);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  function moveInd(a) {
    if (!ind) return;
    if (!a) { ind.style.opacity = 0; return; }
    ind.style.opacity = 1;
    ind.style.width = a.offsetWidth + 'px';
    ind.style.transform = `translateX(${a.offsetLeft}px)`;
  }
  if (links) {
    const anchors = $$('a', links);
    let current = null;
    const sections = anchors.map(a => $(a.getAttribute('href'))).filter(Boolean);
    const spy = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) {
          current = anchors.find(a => a.getAttribute('href') === '#' + e.target.id) || null;
          anchors.forEach(a => a.classList.toggle('on', a === current));
          moveInd(current);
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => spy.observe(s));
    anchors.forEach(a => {
      a.addEventListener('mouseenter', () => moveInd(a));
      a.addEventListener('focus', () => moveInd(a));
    });
    links.addEventListener('mouseleave', () => moveInd(current));
    // hide indicator while at the top (hero)
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { current = null; anchors.forEach(a => a.classList.remove('on')); moveInd(null); } }),
      { rootMargin: '0px 0px -60% 0px' }).observe($('.hero'));
    addEventListener('resize', () => moveInd(current));
  }

  const burger = $('#burger');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger && burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Reveal on scroll + bento counters ---------- */
  function countUp(el) {
    const to = +el.dataset.count, t0 = performance.now(), D = 2000;
    const f = t => {
      const p = Math.min(1, (t - t0) / D);
      el.textContent = Math.round(to * easeOut(p)).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }
  function lightTicks(el) {
    const n = 34, pct = +el.dataset.ticks, on = Math.round(n * pct / 100);
    $$('i', el).forEach((t, i) => { if (i < on) setTimeout(() => t.classList.add('on'), 300 + i * 38); });
  }
  $$('[data-ticks]').forEach(el => { el.innerHTML = '<i></i>'.repeat(34); });

  const io = new IntersectionObserver(es => es.forEach(e => {
    // reveal when on screen, or straight away if it's already above the viewport (reload mid-page)
    if (!e.isIntersecting && e.boundingClientRect.bottom > 0) return;
    const el = e.target;
    el.classList.add('in');
    if ($('.lucide', el)) setTimeout(() => playIcons(el), 500);
    $$('[data-count]', el).forEach(countUp);
    $$('[data-ticks]', el).forEach(lightTicks);
    io.unobserve(el);
  }), { rootMargin: '0px 0px 12% 0px', threshold: 0 });
  $$('[data-r]').forEach(el => io.observe(el));
  if (reduce) $$('[data-count]').forEach(el => el.textContent = (+el.dataset.count).toLocaleString('en-US'));

  /* ---------- Cursor helper (HTML port of the Cursor / CursorBody component) ---------- */
  function makeCursor(el, box, scaleOf) {
    const body = $('.ncb', el), msg = $('.msg', el);
    const fit = () => {
      const prev = body.offsetWidth; body.style.width = 'max-content';
      const next = body.offsetWidth; body.style.width = prev + 'px'; void body.offsetWidth; body.style.width = next + 'px';
    };
    return {
      show(v = true) { el.style.opacity = v ? 1 : 0; },
      at(x, y, snap) {
        if (snap) { el.classList.add('snap'); el.style.setProperty('--x', x + 'px'); el.style.setProperty('--y', y + 'px'); void el.offsetWidth; el.classList.remove('snap'); }
        else { el.style.setProperty('--x', x + 'px'); el.style.setProperty('--y', y + 'px'); }
      },
      to(target, fx = .5, fy = .5, snap) {
        const b = box.getBoundingClientRect(), r = target.getBoundingClientRect(), k = scaleOf ? scaleOf() : 1;
        this.at((r.left - b.left + r.width * fx) / k, (r.top - b.top + r.height * fy) / k, snap);
      },
      async say(text) {
        if (msg.textContent === text) return;
        msg.classList.add('out'); await wait(260);
        msg.textContent = text; fit(); msg.classList.remove('out');
      },
      async click() { el.classList.add('press'); await wait(220); el.classList.remove('press'); }
    };
  }

  /* ---------- Hero: drifting particles + Rosa's queue, prepared overnight ---------- */
  (function () {
    const sky = $('.sky'); if (!sky) return;

    // Particles: tiny points drifting upward, each fading in and out on an eased sine
    const cv = $('#particles'), ctx = cv && cv.getContext('2d');
    let W = 0, H = 0, dots = [], dpr = Math.min(2, devicePixelRatio || 1);
    function size() {
      W = sky.clientWidth; H = sky.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(W * H / 16000);
      dots = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H, r: .5 + Math.random() * 1.3,
        vy: .06 + Math.random() * .18, vx: (Math.random() - .5) * .06,
        ph: Math.random() * Math.PI * 2, sp: .004 + Math.random() * .01,
        tint: Math.random() < .25 ? '200,255,220' : '255,255,255'
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        if (!reduce) { d.y -= d.vy; d.x += d.vx; d.ph += d.sp; }
        if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; }
        const a = .25 + .55 * (.5 - .5 * Math.cos(d.ph));
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.tint},${a.toFixed(3)})`; ctx.fill();
      }
      if (!reduce) requestAnimationFrame(draw);
    }
    if (cv) { size(); draw(); addEventListener('resize', () => { size(); if (reduce) draw(); }); }

    // Rosa's queue: cases flip from "Preparing" to their prepared state, then Nia points at the first one
    const scene = $('.scene'), rows = $$('.hq-row', scene);
    const cur = makeCursor($('#heroCursor'), scene);
    const setReady = r => { const [c, t] = r.dataset.chip.split('|'), ch = $('.chip', r); r.classList.add('ready'); ch.className = 'chip st ' + c; ch.textContent = t; };
    function countTo(el, to) {
      const t0 = performance.now(), D = 1600;
      const f = t => { const q = Math.min(1, (t - t0) / D); el.textContent = Math.round(to * easeOut(q)); if (q < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }
    async function intro() {
      // phones hide the Review buttons, so Nia points at the member's name there (room for its label inside the screen)
      const phone = innerWidth <= 760, btn = phone ? $('.who b', rows[0]) : $('.btn-s', rows[0]);
      const fx = phone ? .7 : .4, fy = phone ? .85 : .9;
      if (reduce) { await wait(120); cur.to(btn, fx, fy, true); cur.show(); return; }
      rows.forEach(r => { r.classList.remove('ready'); const ch = $('.chip', r); ch.className = 'chip st'; ch.textContent = 'Preparing'; });
      $$('[data-hq]', scene).forEach(el => el.textContent = '0');
      await wait(2300);
      $$('[data-hq]', scene).forEach(el => countTo(el, +el.dataset.hq));
      for (const r of rows) { setReady(r); await wait(380); }
      $$('.hq-row', scene).forEach(r => r.classList.add('idle'));
      const sr = scene.getBoundingClientRect();
      cur.at(sr.width * .9, sr.height * .98, true); cur.show();
      await wait(100); cur.to(btn, fx, fy);
      await wait(1300);
      await cur.say('4 cases ready for you');
      await wait(2600);
      await cur.say("Maria's dispute is drafted");
    }
    intro();
  })();

  /* ---------- Hero: full-bleed at the top, eases into a rounded card as you scroll ---------- */
  (function () {
    const sky = $('.sky'); if (!sky) return;
    const MAX_IN = 12, MAX_R = 30;
    let p = 0, tp = 0, raf = null;
    const apply = () => { sky.style.setProperty('--hi', (MAX_IN * p).toFixed(2) + 'px'); sky.style.setProperty('--hr', (MAX_R * p).toFixed(2) + 'px'); };
    function frame() {
      p += (tp - p) * .075; apply();
      if (Math.abs(tp - p) > .002) raf = requestAnimationFrame(frame); else { p = tp; apply(); raf = null; }
    }
    function onScroll() {
      const t = Math.min(1, Math.max(0, scrollY / (innerHeight * .28)));
      tp = t * t * (3 - 2 * t); // smoothstep: eases in and out of the morph
      if (reduce) { p = tp; apply(); return; }
      if (!raf) raf = requestAnimationFrame(frame);
    }
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  })();

  /* ---------- Bill review: interactive error explorer ---------- */
  (function () {
    const root = $('#explorer'); if (!root) return;
    const ERRORS = [
      { icon: 'copy', next: 'Corrected-bill request drafted', name: 'Duplicate charges', desc: 'The same test or supply billed twice on the same day.',
        rule: 'Billing error', fix: 'Asks the hospital for a corrected bill without the repeat line.',
        org: 'St. Brennan Medical Center', meta: 'Itemized statement · 09/18', msg: 'Same test, same time stamp (07:42)',
        rows: [['85025', 'Complete blood count', 142], ['85025', 'Complete blood count', 142, 0], ['80048', 'Basic metabolic panel', 12.9]] },
      { icon: 'scale', next: 'Balance-bill dispute drafted', name: 'Balance billing', desc: 'An in-network provider billing the member more than the amount the plan allowed.',
        rule: 'Network contract with the plan', fix: 'Disputes the balance and cites the allowed amount on the EOB.',
        org: 'St. Brennan Medical Center', meta: 'Statement · allowed $2,274.80', msg: 'Billed above the allowed amount',
        rows: [['29881', 'Arthroscopy, knee', 412], ['—', 'Facility fee balance', 1675.2, 0]] },
      { icon: 'shield-check', next: 'Reprocessing request drafted', name: 'Surprise bills', desc: 'An out-of-network doctor at an in-network hospital that the member never chose.',
        rule: 'No Surprises Act', fix: 'Asks the insurer to reprocess the claim at in-network cost sharing.',
        org: 'Dallas Anesthesia Associates', meta: 'Out-of-network invoice', msg: 'Member had no choice of anesthesiologist',
        rows: [['01400', 'Anesthesia, knee procedure', 1240, 186.4], ['99100', 'Anesthesia modifier', 0]] },
      { icon: 'trending-up', next: 'Records request drafted', name: 'Upcoding', desc: 'A visit billed at a more complex level than the medical record supports.',
        rule: 'Codes must match the record', fix: 'Requests the visit notes and asks for the correct level.',
        org: 'Northside Primary Care', meta: 'Visit 10/02 · 14 minutes', msg: 'A 14-minute visit is a 99213, not a 99215',
        rows: [['99215', 'Office visit, level 5', 310, 142], ['85025', 'Complete blood count', 11.4]] },
      { icon: 'split', next: 'Rebilling request drafted', name: 'Unbundling', desc: 'Parts of one procedure billed separately to raise the total.',
        rule: 'Bundling rules (NCCI)', fix: 'Asks for the tests to be billed as one lipid panel, CPT 80061.',
        org: 'Lakewood Diagnostic Lab', meta: 'Lab invoice · 1 draw', msg: 'These three tests are one lipid panel',
        rows: [['82465', 'Cholesterol, total', 38, 19], ['83718', 'HDL cholesterol', 41, 0], ['84478', 'Triglycerides', 36, 0]] },
      { icon: 'ban', next: 'Correction request drafted', name: 'Care not received', desc: 'Services, drugs or days on the bill that don\'t match what happened.',
        rule: 'The bill must match the record', fix: 'Matches the bill against the discharge summary and removes the extra day.',
        org: 'Mercy Park Hospital', meta: 'Inpatient · discharged 09/03', msg: 'Discharged on day 2. Day 3 never happened',
        rows: [['0110', 'Room and board, day 1', 2100], ['0110', 'Room and board, day 2', 2100], ['0110', 'Room and board, day 3', 2100, 0]] },
      { icon: 'id-card', next: 'Corrected claim drafted', name: 'Claim errors', desc: 'A wrong member ID or plan, so the claim was denied or paid at the wrong rate.',
        rule: 'Corrected claim to the insurer', fix: 'Fixes the member ID and resubmits the claim to the insurer.',
        org: 'Cedar Ridge Emergency', meta: 'Claim denied 08/27', msg: 'Member ID had one digit wrong', chip: 'Denied: coverage not found',
        rows: [['99283', 'Emergency visit, level 3', 2290.5, 310]] },
      { icon: 'heart-handshake', next: 'Charity-care application drafted', name: 'Missed assistance', desc: 'Hospital financial-assistance programs the member qualifies for but never applied to.',
        rule: 'Hospital financial-assistance policy', fix: 'Fills in the charity-care application and sends it with proof of income.',
        org: 'St. Brennan Medical Center', meta: 'Household of 3 · $58k', msg: 'Under 300% of the poverty line: qualifies',
        rows: [['—', 'Balance after insurance', 3100, 0]] },
      { icon: 'receipt', next: 'Refund request drafted', name: 'Already paid', desc: 'The provider\'s portal still shows a balance, but the payer and the member already paid it.',
        rule: 'Payment record beats the portal', fix: 'Matches the bill to the payer\'s payment and the member\'s receipts, then requests a refund.',
        org: 'St. Brennan Medical Center', meta: 'Portal balance · paid 04/11', msg: 'Member paid this on 04/11. Refund owed',
        saved: 'Refund owed to the member', chip: 'Member receipt: $2,340.00 on 04/11',
        rows: [['99285', 'Emergency visit, level 5', 1410, 0], ['80053', 'Comprehensive metabolic panel', 184, 0], ['—', 'Balance carried forward', 746, 0]] }
    ];
    const DUR = 5600;
    const fmt = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tabsEl = $('#exTabs'), doc = $('#exDoc'), body = $('#exBody'), info = $('#exInfo'), rowsEl = $('#exRows');
    const cur = makeCursor($('#exCursor'), doc);
    root.style.setProperty('--dur', DUR + 'ms');

    tabsEl.innerHTML = ERRORS.map((e, k) =>
      `<button class="ex-tab" type="button" role="tab" aria-selected="false" data-k="${k}"><span class="pf" aria-hidden="true"></span><span class="ring"><i data-lucide="${e.icon}" width="16" height="16"></i></span>${e.name}</button>`).join('');
    if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
    const tabs = $$('.ex-tab', tabsEl);

    let i = 0, run = 0, timer = null, paused = false, started = false, inView = false;
    function fill(e, k) {
      $('#exOrg').textContent = e.org; $('#exMeta').textContent = e.meta;
      rowsEl.innerHTML = e.rows.map(([c, d, a, f]) =>
        `<div class="xr"${f !== undefined ? ' data-f' : ''}><span class="c">${c}</span><span class="d">${d}</span><span class="a"><span class="old">${fmt(a)}</span>${f !== undefined ? `<span class="fix">${fmt(f)}</span>` : ''}</span></div>`).join('');
      $('#exChip').textContent = e.chip || '';
      const before = e.rows.reduce((s, r) => s + r[2], 0), after = e.rows.reduce((s, r) => s + (r[3] !== undefined ? r[3] : r[2]), 0);
      const nFlag = e.rows.filter(r => r[3] !== undefined).length;
      $('#exFindL').textContent = `Checking ${e.rows.length} line${e.rows.length > 1 ? 's' : ''}`;
      $('#exFindAmt').textContent = ''; const st = $('#exFindSt'); st.className = 'chip st'; st.textContent = 'Reviewing';
      $('#exN').textContent = String(k + 1).padStart(2, '0') + ' / ' + String(ERRORS.length).padStart(2, '0');
      $('#exName').textContent = e.name; $('#exDesc').textContent = e.desc;
      $('#exRule').textContent = e.rule; $('#exFix').textContent = e.fix;
      $('#exSaved').textContent = fmt(before - after);
      $('#exSavedL').textContent = e.saved ? 'Refund owed' : 'Flagged';
      $('#exNext').textContent = e.next;
      doc.classList.remove('done');
      return { before, after, nFlag, refund: !!e.saved };
    }
    // when Nia is done: how many lines were flagged, the amount in question, and that it's ready for the advocate
    function findings({ before, after, nFlag, refund }) {
      $('#exFindL').textContent = `${nFlag} line${nFlag > 1 ? 's' : ''} flagged`;
      $('#exFindAmt').textContent = fmt(before - after) + (refund ? ' refund owed' : ' in question');
      const st = $('#exFindSt'); st.className = 'chip st b'; st.textContent = 'Ready for review';
    }
    async function show(k, first) {
      const id = ++run; i = k;
      tabs.forEach((t, j) => {
        t.setAttribute('aria-selected', j === k);
        const b = $('.pf', t); b.style.animation = 'none'; void b.getBoundingClientRect(); b.style.animation = '';
      });
      playIcons(tabs[k]);
      const parts = [body, info];
      if (!first) { parts.forEach(p => { p.classList.remove('swap-in'); p.classList.add('swap-out'); }); cur.show(false); await wait(360); if (id !== run) return; }
      const result = fill(ERRORS[k], k);
      parts.forEach(p => { p.classList.add('swap-in'); p.classList.remove('swap-out'); });
      if (reduce) { $$('.xr[data-f]', rowsEl).forEach(r => r.classList.add('hl', 'struck')); doc.classList.add('done'); findings(result); return; }
      await wait(450); if (id !== run) return;
      const flagged = $$('.xr[data-f]', rowsEl);
      const fx = innerWidth < 600 ? .22 : .5; // leave room for the label on phones
      cur.to(flagged[0], fx - .05, .7, true); cur.show(); $('.msg', $('#exCursor')).textContent = 'Checking';
      await wait(60);
      for (const r of flagged) { r.classList.add('hl'); cur.to(r, fx, .75); await wait(260); }
      await cur.say(ERRORS[k].msg);
      await wait(700); if (id !== run) return;
      flagged.forEach(r => r.classList.add('struck'));
      if (root.classList.contains('sheet-open')) haptic('tick'); // Nia strikes the charge
      await wait(500); if (id !== run) return;
      doc.classList.add('done'); findings(result);
    }
    // Phones: the checks are a grid, and tapping one opens the statement in a bottom sheet
    const mq = matchMedia('(max-width:600px)'), card = $('#exCard'), scrim = $('#exScrim'), closeBtn = $('#exClose');
    function openSheet(btn) {
      clearTimeout(timer);
      card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'exName');
      root.classList.add('sheet-open'); document.documentElement.classList.add('sheet-lock');
    }
    function closeSheet() {
      if (!root.classList.contains('sheet-open')) return;
      root.classList.remove('sheet-open'); document.documentElement.classList.remove('sheet-lock');
      ['role', 'aria-modal', 'aria-labelledby'].forEach(a => card.removeAttribute(a));
      run++; cur.show(false);
    }
    closeBtn.addEventListener('click', closeSheet);
    scrim.addEventListener('click', closeSheet);
    mq.addEventListener('change', () => { if (!mq.matches) closeSheet(); });
    function schedule() { clearTimeout(timer); if (!paused && inView && !reduce && !mq.matches) timer = setTimeout(() => { show((i + 1) % ERRORS.length); schedule(); }, DUR); }
    tabs.forEach((t, k) => t.addEventListener('click', () => {
      if (mq.matches) { openSheet(t); show(k, true); return; }
      show(k); schedule();
    }));
    root.addEventListener('mouseenter', () => { paused = true; clearTimeout(timer); root.classList.add('paused'); });
    root.addEventListener('mouseleave', () => { paused = false; if (inView) { root.classList.remove('paused'); schedule(); } });
    fill(ERRORS[0], 0); tabs[0].setAttribute('aria-selected', 'true');
    root.classList.add('paused');
    function restartRing() { const b = $('.pf', tabs[i]); b.style.animation = 'none'; void b.getBoundingClientRect(); b.style.animation = ''; }
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        inView = true;
        if (!paused) root.classList.remove('paused');
        if (!started) { started = true; show(0, true); } else restartRing();
        schedule();
      } else if (started) {
        inView = false; clearTimeout(timer); root.classList.add('paused');
      }
    }), { threshold: .3 }).observe(root);
  })();

  /* ---------- Workspace: tilt on scroll + Nia prepares, Rosa approves ---------- */
  (function () {
    const app = $('#app'), stage = $('#stage'); if (!app) return;

    // Scroll-linked tilt, smoothed with a lerp so it eases instead of tracking linearly
    let rx = 16, sc = .94, trx = 16, tsc = .94, raf = null;
    const apply = () => { app.style.setProperty('--rx', rx.toFixed(3) + 'deg'); app.style.setProperty('--sc', sc.toFixed(4)); };
    function frame() {
      rx += (trx - rx) * .06; sc += (tsc - sc) * .06; apply();
      if (Math.abs(trx - rx) > .01) raf = requestAnimationFrame(frame); else { rx = trx; sc = tsc; apply(); raf = null; }
    }
    function target() {
      const r = stage.getBoundingClientRect(), vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * .8) - .15));
      trx = 16 * (1 - p); tsc = .94 + .06 * p;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    if (reduce) { rx = 0; sc = 1; apply(); }
    else { addEventListener('scroll', target, { passive: true }); addEventListener('resize', target); target(); }

    // Tablets (761–1100px): the desktop layout is kept and scaled down to the stage width; phones get their own layout (see site.css)
    const DESIGN_W = 1120, fitMq = matchMedia('(min-width:761px) and (max-width:1100px)');
    function fit() {
      if (!fitMq.matches) { app.style.removeProperty('--fit'); stage.style.height = ''; return; }
      const k = Math.min(1, stage.clientWidth / DESIGN_W);
      app.style.setProperty('--fit', k.toFixed(4));
      stage.style.height = Math.ceil(app.offsetHeight * k) + 'px';
    }
    fit(); addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

    const scale = () => app.getBoundingClientRect().width / app.offsetWidth || 1;
    const nia = makeCursor($('#niaCursor'), app, scale), jordan = makeCursor($('#advCursor'), app, scale);
    const tasks = $$('[data-t]', app), draft = $('#draft'), st = $('#draftSt'), btn = $('#approveBtn'), log = $('#npLog');
    const NIA_MSGS = ['Reading the itemized fax', 'Same test billed twice at 07:42', 'Finding the billing fax number', 'Writing the dispute'];

    function reset() {
      tasks.forEach(t => t.className = 'task');
      draft.className = 'draft'; st.className = 'chip st'; st.textContent = 'Drafting';
      $$('.extra', log).forEach(m => log.removeChild(m));
      nia.show(false); jordan.show(false);
    }
    function post(cls, text) { const m = document.createElement('div'); m.className = 'm extra ' + cls; m.textContent = text; log.appendChild(m); }
    function finalState() {
      tasks.forEach(t => t.className = 'task done');
      draft.className = 'draft written sent'; st.className = 'chip g st'; st.textContent = 'Sent';
    }

    async function play() {
      for (;;) {
        reset();
        await wait(700);
        const ph = innerWidth <= 760; // phones: keep Nia's label inside the card
        nia.to(tasks[0], ph ? .4 : .9, .5, true); nia.show();
        for (let k = 0; k < tasks.length; k++) {
          nia.to(tasks[k], ph ? .35 : .78, .55);
          await nia.say(NIA_MSGS[k]);
          tasks[k].className = 'task run'; await wait(1100);
          tasks[k].className = 'task done'; await wait(200);
          if (k === 3) draft.classList.add('written');
        }
        nia.to(draft, ph ? .3 : .55, ph ? .02 : .3); // phones: point at the title so the label clears the buttons
        await nia.say('Ready for you, Rosa');
        draft.classList.add('ready'); st.className = 'chip a st'; st.textContent = 'Needs approval';
        post('n', 'Should the duplicate CBC go in this letter, or wait for round two?');
        await wait(1700);
        post('u', 'This letter. Keep the unbundling for round two.');
        await wait(900);
        await nia.say('Updated. Unbundling saved for round two');
        await wait(1100);

        if (btn.offsetParent) {
          jordan.to(btn, ph ? .85 : 1.8, 2.6, true); jordan.show();
          await wait(120); jordan.to(btn, .5, .55);
          await wait(1350);
          await jordan.click();
          btn.classList.add('press'); if (onScreen(btn)) haptic('tap'); await wait(160); btn.classList.remove('press');
          draft.classList.remove('ready'); draft.classList.add('sent'); st.className = 'chip g st'; st.textContent = 'Sent';
          await wait(700);
          jordan.to(btn, ph ? .75 : 2.2, 3.2);
          post('u', "Remind me if they don't reply.");
          await wait(1100);
          await nia.say("I'll follow up on Nov 20");
          post('n', "Will do. I'll watch the fax line and draft a follow-up on Nov 20.");
        }
        await wait(3800);
      }
    }
    let started = false;
    if (reduce) finalState();
    else new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !started) { started = true; play(); } }), { threshold: .35 }).observe(stage);
  })();

  /* ---------- How it works: expanding card stack ---------- */
  (function () {
    const stack = $('#stack'); if (!stack) return;
    const cards = $$('.sc', stack), steps = $$('#steps .step'), n = cards.length, DUR = 4400;
    const wrap = $('#how');
    let i = 0, timer = null, paused = false, started = false, inView = false;
    const posOf = k => { const r = (k - i + n) % n; return r === 0 ? 'active' : r === 1 ? 'next' : r === n - 1 ? 'prev' : 'hidden'; };
    function layout(first) {
      cards.forEach((c, k) => {
        const was = c.dataset.pos, now = posOf(k);
        if (!first && was === 'prev' && now === 'hidden') {
          c.dataset.pos = 'gone';
          setTimeout(() => { c.classList.add('noanim'); c.dataset.pos = 'hidden'; void c.offsetHeight; c.classList.remove('noanim'); }, 1350);
        } else c.dataset.pos = now;
      });
      steps.forEach((s, k) => {
        s.classList.toggle('on', k === i);
        s.classList.toggle('done', k < i); // phones: earlier segments of the progress bar stay filled
        const bar = $('.prog i', s); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
      });
      $('#steps').style.setProperty('--dur', DUR + 'ms');
    }
    function schedule() { clearTimeout(timer); if (!paused && inView && !reduce) timer = setTimeout(() => { i = (i + 1) % n; layout(); schedule(); }, DUR); }
    function go(k) { i = k; layout(); schedule(); }
    layout(true);
    const list = $('#steps');
    function lockSteps() {
      list.classList.add('measure'); list.style.height = '';
      let mx = 0;
      steps.forEach((_, k) => { steps.forEach((x, j) => x.classList.toggle('on', j === k)); mx = Math.max(mx, list.offsetHeight); });
      steps.forEach((x, j) => x.classList.toggle('on', j === i));
      list.style.height = mx + 'px'; void list.offsetHeight; list.classList.remove('measure');
    }
    lockSteps();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockSteps);
    addEventListener('resize', lockSteps);
    steps.forEach((s, k) => s.addEventListener('click', () => go(k)));
    cards.forEach((c, k) => c.addEventListener('click', () => { if (c.dataset.pos !== 'active') go(k); }));
    stack.addEventListener('mouseenter', () => { paused = true; clearTimeout(timer); wrap.classList.add('paused'); });
    stack.addEventListener('mouseleave', () => { paused = false; if (inView) { wrap.classList.remove('paused'); schedule(); } });
    // Idle until the section is on screen; when it leaves, let the current card finish and hold there
    wrap.classList.add('paused'); stack.classList.add('idle');
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        inView = true;
        stack.classList.remove('idle');
        if (!paused) wrap.classList.remove('paused');
        if (!started) { started = true; go(0); } else { layout(); schedule(); }
      } else if (started) {
        inView = false; clearTimeout(timer); wrap.classList.add('paused');
      }
    }), { threshold: .3 }).observe(stack);
  })();

  /* ---------- Nia conversation ---------- */
  (function () {
    const log = $('#log'); if (!log) return;
    const comp = $('#composer'), compText = $('#composerText'), idle = compText.textContent;
    const SCRIPT = [
      ['u', 'What is the strongest argument to remove the anesthesia charge?'],
      ['n', 'The anesthesiologist was out of network, but the surgery was at an in-network hospital and Maria had no choice of provider. Under the No Surprises Act she should only owe her in-network share: <b>$186.40</b> instead of <b>$1,240.00</b>.'],
      ['u', 'Draft the dispute to BlueRiver and cite that.'],
      ['n', 'Done. I attached the EOB and the anesthesia invoice as evidence. It\'s waiting for your approval.<div class="att"><span class="card"><i>FAX</i><span><b>Dispute to BlueRiver</b><span>2 pages · draft</span></span></span><span class="card"><i>PDF</i><span><b>EOB + invoice</b><span>Attached</span></span></span></div>']
    ];
    let run = 0, started = false;
    async function typeInto(text, id) {
      comp.classList.add('typing'); compText.textContent = '';
      for (const ch of text) { if (id !== run) return; compText.textContent += ch; await wait(22); }
    }
    async function play() {
      const id = ++run; log.innerHTML = '';
      for (const [who, html] of SCRIPT) {
        if (id !== run) return;
        if (who === 'u') { await typeInto(html, id); await wait(350); if (id !== run) return; comp.classList.remove('typing'); compText.textContent = idle; }
        const m = document.createElement('div'); m.className = 'm ' + who;
        if (who === 'n') {
          m.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>'; log.appendChild(m);
          await wait(1300); if (id !== run) return;
          m.style.animation = 'none'; void m.offsetWidth; m.style.animation = ''; m.innerHTML = html;
          if (onScreen(m)) haptic('tick');
        } else { m.textContent = html; log.appendChild(m); }
        await wait(who === 'u' ? 500 : 1700);
      }
    }
    if (reduce) SCRIPT.forEach(([w, h]) => { const m = document.createElement('div'); m.className = 'm ' + w; m.innerHTML = h; log.appendChild(m); });
    else new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !started) { started = true; play(); } }), { threshold: .35 }).observe(log.parentElement);
    $('#replay').addEventListener('click', play);
  })();

  /* ---------- FAQ: accordion, one open at a time, eased open/close ---------- */
  (function () {
    const items = $$('.qa'); if (!items.length) return;
    const EASE_OPEN = 'cubic-bezier(.25,.9,.3,1)', EASE_CLOSE = 'cubic-bezier(.55,0,.25,1)';
    const running = new Map();
    // The shared name="faq" makes the browser snap the other question shut the instant one opens,
    // which skips our closing animation. Keep it only as the no-animation fallback.
    if (!reduce) items.forEach(d => d.removeAttribute('name'));
    function close(d) {
      if (!d.open) return;
      const ans = $('.ans', d);
      running.get(d)?.cancel();
      d.classList.add('is-closing');
      // text fades out first, then the panel folds, so the words never get squeezed
      const txt = $('p', ans);
      txt.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
      const a = ans.animate([{ height: ans.offsetHeight + 'px' }, { height: '0px' }], { duration: 680, delay: 80, easing: 'cubic-bezier(.45,0,.2,1)' }); // same length as opening, so switching feels like one motion
      running.set(d, a);
      a.onfinish = () => { d.open = false; d.classList.remove('is-closing'); running.delete(d); txt.getAnimations().forEach(x => x.cancel()); };
      a.oncancel = () => { d.classList.remove('is-closing'); txt.getAnimations().forEach(x => x.cancel()); };
    }
    function open(d) {
      const ans = $('.ans', d);
      running.get(d)?.cancel();
      d.open = true;
      const h = ans.offsetHeight, txt = $('p', ans);
      // the panel opens first, then the answer fades in with a small rise
      const a = ans.animate([{ height: '0px' }, { height: h + 'px' }], { duration: 700, easing: EASE_OPEN });
      txt.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 220, easing: EASE_OPEN, fill: 'backwards' });
      running.set(d, a);
      a.onfinish = () => running.delete(d);
    }
    items.forEach(d => {
      $('summary', d).addEventListener('click', e => {
        if (reduce) return; // the shared name attribute keeps it one-at-a-time natively
        e.preventDefault();
        if (d.open && !d.classList.contains('is-closing')) { close(d); return; }
        items.forEach(o => { if (o !== d) close(o); });
        open(d);
      });
    });
  })();

  /* ---------- Footer: a rounded rectangle glides between links on hover ---------- */
  $$('.f-col').forEach(col => {
    const ind = document.createElement('span');
    ind.className = 'f-ind'; ind.setAttribute('aria-hidden', 'true'); col.appendChild(ind);
    let shown = false;
    const place = a => { ind.style.width = a.offsetWidth + 'px'; ind.style.height = a.offsetHeight + 'px'; ind.style.transform = `translate(${a.offsetLeft}px,${a.offsetTop}px)`; };
    const show = a => {
      if (!shown) { ind.style.transition = 'opacity .4s'; place(a); void ind.offsetWidth; ind.style.transition = ''; } // first hover: appear in place, don't slide in from the corner
      place(a); ind.style.opacity = 1; shown = true;
    };
    const hide = () => { ind.style.opacity = 0; shown = false; };
    $$('a', col).forEach(a => { a.addEventListener('mouseenter', () => show(a)); a.addEventListener('focus', () => show(a)); a.addEventListener('blur', hide); });
    col.addEventListener('mouseleave', hide);
  });

  /* ---------- Contact form: inline validation + eased thank-you state ---------- */
  (function () {
    const form = $('#contactForm'); if (!form) return;
    const done = $('#cfDone'), card = $('.contact-card');

    // Role: our own dropdown (a button + a list of options) feeding a hidden input
    const dd = $('#cfRoleDD'), ddBtn = $('#cfRoleBtn'), ddVal = $('.cf-dd-val', dd), roleIn = $('#cfRole');
    const ddOpts = $$('[role="option"]', dd), ddPlaceholder = ddVal.textContent;
    const setOpen = o => { dd.classList.toggle('open', o); ddBtn.setAttribute('aria-expanded', o); };
    ddBtn.addEventListener('click', () => setOpen(!dd.classList.contains('open')));
    ddOpts.forEach(o => o.addEventListener('click', () => {
      roleIn.value = o.dataset.v; ddVal.textContent = o.dataset.v; dd.classList.add('filled');
      ddOpts.forEach(x => x.setAttribute('aria-selected', x === o));
      setOpen(false); roleIn.dispatchEvent(new Event('change'));
    }));
    document.addEventListener('pointerdown', e => { if (!dd.contains(e.target)) setOpen(false); });
    const resetRole = () => { roleIn.value = ''; ddVal.textContent = ddPlaceholder; dd.classList.remove('filled'); ddOpts.forEach(x => x.setAttribute('aria-selected', 'false')); setOpen(false); };

    // Cases per month: segmented control; the hint says what the chosen range means
    const volHint = $('#cfVolHint'), volHint0 = volHint.textContent;
    $$('.cf-seg input', form).forEach(i => i.addEventListener('change', () => { volHint.textContent = i.dataset.hint; }));
    const fields = {
      name: { el: $('#cfName'), err: $('#cfNameErr'), test: v => v.trim().length >= 2, msg: 'Enter your name.' },
      email: { el: $('#cfEmail'), err: $('#cfEmailErr'), test: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), msg: 'Enter a work email, like you@company.com.' },
      org: { el: $('#cfOrg'), err: $('#cfOrgErr'), test: v => v.trim().length >= 2, msg: 'Enter your organization.' },
      role: { el: roleIn, focusEl: ddBtn, err: $('#cfRoleErr'), test: v => !!v, msg: 'Choose your role.' }
    };
    function check(k) {
      const f = fields[k], ok = f.test(f.el.value);
      f.el.closest('.cf-field').classList.toggle('bad', !ok);
      f.el.setAttribute('aria-invalid', !ok);
      f.err.textContent = ok ? '' : f.msg;
      return ok;
    }
    Object.keys(fields).forEach(k => {
      const f = fields[k];
      f.el.addEventListener('blur', () => { if (f.el.value) check(k); });
      f.el.addEventListener('input', () => { if (f.el.closest('.cf-field').classList.contains('bad')) check(k); });
      f.el.addEventListener('change', () => { if (k === 'role') check(k); });
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const results = Object.keys(fields).map(check);
      const firstBad = Object.keys(fields).find((k, i) => !results[i]);
      if (firstBad) { haptic('error'); (fields[firstBad].focusEl || fields[firstBad].el).focus(); return; }
      const btn = $('.cf-submit', form); btn.classList.add('sending'); $('span', btn).textContent = 'Sending…';
      await wait(900);
      const first = fields.name.el.value.trim().split(/\s+/)[0];
      $('#cfDoneTitle').textContent = `Thanks, ${first}.`;
      $('#cfDoneText').textContent = `We'll reply to ${fields.email.el.value.trim()} to set up your walkthrough.`;
      const h0 = card.offsetHeight;
      form.classList.add('out'); await wait(reduce ? 0 : 380);
      form.hidden = true; done.hidden = false;
      const h1 = card.offsetHeight;
      if (!reduce) card.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 700, easing: 'cubic-bezier(.25,.9,.3,1)' });
      requestAnimationFrame(() => done.classList.add('in'));
      haptic('success');
      btn.classList.remove('sending'); $('span', btn).textContent = 'Request a demo';
    });
    $('#cfAgain').addEventListener('click', () => {
      form.reset(); resetRole(); volHint.textContent = volHint0; Object.keys(fields).forEach(k => { const f = fields[k]; f.el.closest('.cf-field').classList.remove('bad'); f.err.textContent = ''; });
      done.classList.remove('in'); done.hidden = true; form.hidden = false; form.classList.remove('out');
      fields.name.el.focus();
    });
  })();
})();
