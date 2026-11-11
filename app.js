/* ============================================================
   福汇发展 · brand web
   Native scroll + rAF/lerp progress. No dependencies, no scroll hijack.
   ============================================================ */
(() => {
  'use strict';

  const doc = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = motionQuery.matches;
  /* 桌面/平板/手机都走钉住擦入；只有 reduced motion 退化为普通滚动堆叠（html.motion-static）。
     preSettle 视口在手机地址栏收缩落定前保持静态，settle 后再切回钉住。 */
  const preSettleQuery = window.matchMedia('(max-width: 767px)');
  const WIPE_START = 0.7; // wipe happens in the last 30% of each panel segment
  let isStaticHeader = false;
  let chapterTarget = 0;
  let chapterCurrent = 0;
  let frame = 0;
  /* foot wordmark: scroll-linked slide + velocity-driven skew (trae.cn style) */
  const wordmark = document.querySelector('.foot__wordmark');
  let wmTarget = 0;
  let wmCurrent = 0;
  let lastY = window.scrollY;
  let smoothVel = 0;
  /* canvas wordmark: the text is rendered once to an offscreen layer and
     sliced into horizontal bands; at rest they tile into complete glyphs,
     and the cursor locally slides bands sideways so its trail reads as a
     tear across the letterforms */
  const wmCanvas = document.createElement('canvas');
  let wmCtx = null;
  let wmOff = null;
  let wmW = 0, wmH = 0, wmDpr = 1;
  let wmCells = [];
  let wmMx = 0, wmMy = 0, wmMove = 0, wmLastT = 0, wmHover = false;
  const wmFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const onStaticChange = () => syncStatic();

  /* ---------- i18n: zh is the source of truth in markup, en via this dictionary ---------- */
  const langToggle = document.querySelector('[data-lang-toggle]');
  /* wordmark glyphs; kept in sync with the footer spans by setWordmark() */
  const wmChars = wordmark ? Array.from(wordmark.querySelectorAll('span')).map(s => s.textContent) : [];
  let lang = doc.dataset.lang === 'en' ? 'en' : 'zh';
  let appliedLang = null;
  const nodeOrig = new WeakMap(); // original zh content per element, for switching back
  const I18N = {
    en: {
      'meta.title': "Fuhui Development | Futian's dedicated operator of industrial space",
      'meta.desc': "Fuhui Development is Futian District's dedicated operator of industrial space: a district-owned SOE operating 577,300 m2 of industrial space commissioned in the first batch, across 12 industrial districts and 3 types of assets in operation.",
      'a11y.skip': 'Skip to main content',
      'a11y.home': 'Fuhui Development - home',
      'a11y.nav': 'Main navigation',
      'a11y.chapter': 'Industrial map and assets in operation',
      'a11y.lang': 'Switch language',
      'menu.open': 'Open menu',
      'menu.close': 'Close menu',
      'nav.data': 'Data',
      'nav.map': 'Portfolio',
      'nav.services': 'Services',
      'nav.news': 'Insights',
      'nav.contact': 'Contact',
      'hero.label': 'Operating data',
      'hero.lead': 'A district-owned SOE,<br>commissioned to operate<br>Futian\u2019s industrial space<br><em>better.</em>',
      'fig1.dt': 'Area commissioned in the first batch',
      'fig1.value': '577,300',
      'fig1.unit': 'm2',
      'fig2.dt': 'Government-owned buildings consolidated',
      'fig2.unit': 'buildings',
      'fig3.dt': 'Industrial districts',
      'fig3.unit': 'districts',
      'fig4.dt': 'Types of assets in operation',
      'fig4.unit': 'types',
      'panel.cta': 'Book a site visit',
      'alt.panel0': 'Cluster of high-rise buildings in Shenzhen, atmospheric view',
      'alt.panel1': 'Modern glass-curtain-wall office tower, atmospheric view',
      'alt.panel2': 'Glass facades seen from below, atmospheric view',
      'alt.panel3': 'Bright office space with glass partitions, atmospheric view',
      'p0.kicker': 'Industrial map',
      'p0.title': '12 industrial districts,<br>one network of space<br>you can plug into.',
      'p0.desc': 'From Xiangmi Lake to Hetao, Futian\u2019s key industry corridors joined into one searchable, bookable map.',
      'p1.kicker': 'In operation · Offices',
      'p1.title': 'Shenzhen International<br>Innovation Center.',
      'p1.desc': 'Central Park vitality loop · Super Grade-A office cluster · Software and information services, AI',
      'p2.kicker': 'In operation · Industrial park',
      'p2.title': 'Changfu Jinmao<br>Tower.',
      'p2.desc': 'Hetao Shenzhen-Hong Kong S&T Innovation Cooperation Zone · Beside the Convention & Exhibition Center hub · Fintech, professional services',
      'p3.kicker': 'In operation · Incubator',
      'p3.title': 'Xinzhou Building<br>X-HUB.',
      'p3.desc': 'Jinsha Bay industrial-urban community · Co-working, shared labs and startup coaching · Life sciences, AI+',
      'svc.label': 'Operator & services',
      'svc.title': 'From space provider,<br><em>to ecosystem integrator.</em>',
      'svc.lead': 'Shenzhen Fuhui Innovation Development Co., Ltd. is the wholly owned subsidiary of Shenzhen Futian Industrial Investment Services Co., Ltd., a Futian district-owned SOE. Commissioned by the district property-management center, it operates innovative industrial premises and supporting facilities on a market basis.',
      'svc.body': 'Assets are organized across 12 industrial districts, putting offices, industrial parks and incubators on one map and giving companies one-stop service from site selection to move-in.',
      'svc.cta': 'Tell us about your space needs',
      'alt.reveal': 'White geometric architecture against the sky, atmospheric view',
      'f1.name': 'Industrial leasing',
      'f1.desc': 'From requirement to move-in, matched with genuinely leasable space',
      'f1.aria': 'Ask about industrial leasing',
      'f2.name': 'Space operations',
      'f2.desc': 'Day-to-day operation of government-owned buildings and park assets',
      'f2.aria': 'Ask about space operations',
      'f3.name': 'Enterprise ecosystem',
      'f3.desc': 'Investment and financing matchmaking · Incubation and acceleration · Policy and talent services',
      'f3.aria': 'Ask about enterprise ecosystem services',
      'news.label': 'Insights',
      'news.title': 'Recent updates',
      'n1.kind': 'Policy',
      'n1.title': 'Notice: 2026 Futian District Talent Housing Subsidy applications open',
      'n1.desc': 'Monthly rent support of RMB 2,000-6,000 for key talent at priority industry companies, for up to 36 months.',
      'n2.kind': 'News',
      'n2.title': 'WAIC Future Tech Demo Day lands in Futian',
      'n2.desc': '18 projects presented on site, focused on large-model applications and smart hardware, with 5 shortlisted for site visits.',
      'n3.kind': 'News',
      'n3.title': 'Two research companies move into the International Innovation Center',
      'n3.desc': 'Leasing about 3,200 m2 combined; 21 and 34 days from first contact to signature respectively.',
      'contact.label': 'Contact us',
      'contact.title': 'Your next space<br>starts with a site visit.',
      'contact.lead': 'Tell us your team size, budget and commute radius, and we will arrange a site survey.',
      'contact.hotline': 'Leasing hotline',
      'contact.addrTitle': 'Office address',
      'contact.addr': '1006 Shennan Avenue, Huafu Sub-district, Futian District, Shenzhen, Guangdong',
      'contact.hours': 'Service hours',
      'foot.legal': '© 2026 Shenzhen Fuhui Innovation Development Co., Ltd.',
      'foot.top': 'Back to top'
    }
  };
  /* 后台发布时注入的英文词典覆盖内置回退值，缺失时仍用上面的原文 */
  if (window.FH_I18N_EN) Object.assign(I18N.en, window.FH_I18N_EN);
  const t = key => (lang === 'en' ? I18N.en[key] : null) || key;

  /* the footer wordmark keeps its canvas teardown in EN: five letters F-U-H-U-I */
  function setWordmark(nextLang) {
    if (!wordmark) return;
    const next = nextLang === 'en' ? ['F', 'U', 'H', 'U', 'I'] : ['福', '汇', '发', '展'];
    wmChars.length = 0;
    wmChars.push.apply(wmChars, next);
    if (wordmark.querySelector('span')) {
      // spans still render the wordmark (no canvas yet, or reduced motion)
      wordmark.textContent = '';
      wmChars.forEach(ch => {
        const s = document.createElement('span');
        s.textContent = ch;
        wordmark.appendChild(s);
      });
    }
    if (!motionQuery.matches) wmBuild();
  }

  function applyLang() {
    doc.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
    const swap = (el, attr, key) => {
      if (!nodeOrig.has(el)) nodeOrig.set(el, attr ? el.getAttribute(attr) : el.textContent);
      const val = lang === 'en' ? (I18N.en[key] || nodeOrig.get(el)) : nodeOrig.get(el);
      if (attr) el.setAttribute(attr, val); else el.textContent = val;
    };
    document.querySelectorAll('[data-i18n]').forEach(el => swap(el, null, el.getAttribute('data-i18n')));
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (!nodeOrig.has(el)) nodeOrig.set(el, el.innerHTML);
      el.innerHTML = lang === 'en' ? (I18N.en[key] || nodeOrig.get(el)) : nodeOrig.get(el);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => swap(el, 'aria-label', el.getAttribute('data-i18n-aria')));
    document.querySelectorAll('[data-i18n-alt]').forEach(el => swap(el, 'alt', el.getAttribute('data-i18n-alt')));
    document.querySelectorAll('meta[data-i18n-meta]').forEach(el => swap(el, 'content', el.getAttribute('data-i18n-meta')));
    if (langToggle) {
      langToggle.textContent = lang === 'en' ? '中文' : 'EN';
      langToggle.setAttribute('aria-label', t('a11y.lang'));
    }
    if (toggle) toggle.setAttribute('aria-label', nav && nav.classList.contains('is-open') ? t('menu.close') : t('menu.open'));
    if (appliedLang !== lang) { setWordmark(lang); appliedLang = lang; }
  }

  if (langToggle) {
    langToggle.addEventListener('click', () => {
      lang = lang === 'en' ? 'zh' : 'en';
      doc.dataset.lang = lang;
      try { localStorage.setItem('fuhui-lang', lang); } catch (e) {}
      applyLang();
    });
  }


  const head = document.querySelector('[data-head]');
  const pageProgress = document.querySelector('[data-page-progress]');
  const chapter = document.querySelector('[data-chapter]');
  const panels = chapter ? Array.from(chapter.querySelectorAll('[data-panel]')) : [];
  const railLine = chapter ? chapter.querySelector('[data-chapter-progress]') : null;
  const railCurrent = chapter ? chapter.querySelector('[data-chapter-current]') : null;
  const invertEls = Array.from(document.querySelectorAll('[data-invert]'));
  const navLinks = Array.from(document.querySelectorAll('.site-nav a'));
  const navSections = navLinks
    .map(link => ({ link, el: document.querySelector(link.getAttribute('href')) }))
    .filter(item => item.el);

  /* ---------- menu ---------- */
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.getElementById('site-nav');
  const closeMenu = () => {
    if (!nav || !toggle) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', t('menu.open'));
  };
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? t('menu.close') : t('menu.open'));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', e => {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });
  }

  /* ---------- one-time shutter reveal on the hero photo ---------- */
  const shutter = document.querySelector('[data-shutter]');
  if (shutter) {
    requestAnimationFrame(() => setTimeout(() => shutter.classList.add('is-open'), 140));
  }

  /* ---------- image-reveal (colour wipe + photo) ---------- */
  const reveal = document.querySelector('[data-reveal-image]');
  if (reveal) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveal.classList.add('is-open');
    } else {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            io.disconnect();
            const img = reveal.querySelector('img');
            // two frames so the closed clip-path is painted before the class lands,
            // otherwise a observer that fires early swallows the wipe entirely
            const open = () => requestAnimationFrame(() => requestAnimationFrame(() => reveal.classList.add('is-open')));
            // never start the wipe on an undecoded photo: wait for decode/load so the
            // wipe always plays on the real image (2.5s cap so a stalled request still reveals)
            if (img && !img.complete) {
              Promise.race([
                img.decode().catch(() => {}),
                new Promise(r => img.addEventListener('load', r, { once: true })),
                new Promise(r => img.addEventListener('error', r, { once: true })),
                new Promise(r => setTimeout(r, 2500))
              ]).then(open);
            } else {
              open();
            }
          }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px 12% 0px" });
      io.observe(reveal);
    }
  }

  /* ---------- quiet section entrances ---------- */
  /* the numbers block fades in as one unit: per-card fade would fight the
     hover lift, because [data-fade].is-in resets transform on the same element */
  const fadeEls = Array.from(document.querySelectorAll(
    '.figures, .services__copy, .service-lines li, .news__title, .news-list li'
  ));
  fadeEls.forEach(el => el.setAttribute('data-fade', ''));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    fadeEls.forEach(el => el.classList.add('is-in'));
  } else {
    const fadeIO = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          fadeIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    fadeEls.forEach(el => fadeIO.observe(el));
  }

  const refreshStaticHeader = () => { isStaticHeader = window.getComputedStyle(head).position === 'static'; };
  refreshStaticHeader();

  /* ---------- scroll engine ---------- */

  function compute() {
    const vh = window.innerHeight;
    if (head) head.classList.toggle('is-scrolled', window.scrollY > 24);

    // header inversion: sample what actually sits behind the header bar
    if (head) {
      let inverted = false;
      const navEl = document.getElementById('site-nav');
      const menuOpen = navEl && navEl.classList.contains('is-open');
      if (menuOpen) {
        inverted = head.classList.contains('is-light');
      } else if (isStaticHeader) {
        inverted = false;
      } else {
        const probe = 52;
        for (const el of invertEls) {
          const r = el.getBoundingClientRect();
          if (r.top <= probe && r.bottom > probe) { inverted = true; break; }
        }
        /* the pinned chapter is sticky: its own scroll range does not move under the probe */
        if (!inverted && chapter && !doc.classList.contains('chapter-static')) {
          const cr = chapter.getBoundingClientRect();
          const pinnedEnd = cr.top + chapter.offsetHeight - vh;
          if (cr.top <= 0 && pinnedEnd > probe) inverted = true;
        }
      }
      head.classList.toggle('is-light', inverted);
    }

    // current nav item
    let activeSection = null;
    for (const item of navSections) {
      const r = item.el.getBoundingClientRect();
      if (r.top <= vh * 0.45 && r.bottom > vh * 0.45) { activeSection = item.link; break; }
    }
    navLinks.forEach(link => link.classList.toggle('is-current', link === activeSection));

    // wordmark slide progress: starts in the last viewport-height of scroll,
    // reaches 1 exactly at page end (the wordmark can never scroll past the bottom)
    if (wordmark && !motionQuery.matches) {
      const maxScroll = Math.max(1, doc.scrollHeight - vh);
      wmTarget = clamp(1 - (maxScroll - window.scrollY) / (vh * 0.9), 0, 1);
    }

    // chapter progress (only in pinned mode)
    if (chapter && !doc.classList.contains('chapter-static')) {
      const r = chapter.getBoundingClientRect();
      const distance = Math.max(1, chapter.offsetHeight - vh);
      chapterTarget = clamp(-r.top / distance, 0, 1);
    }
  }

  function applyChapter(p) {
    const n = panels.length;
    if (!n) return;
    const t = p * n;
    const active = Math.min(n - 1, Math.floor(t));
    const local = t - active;
    const wipe = active === n - 1
      ? 0
      : clamp((local - WIPE_START) / (1 - WIPE_START), 0, 1);

    panels.forEach((panel, i) => {
      let reveal = 100;
      let enter = 0;
      if (i < active) { reveal = 0; enter = 0; }
      else if (i === active) { reveal = 0; enter = 1 - wipe * 0.85; }
      else if (i === active + 1) { reveal = (1 - wipe) * 100; enter = wipe; }
      const par = i === active ? (local - 0.5) * 7 : 0;

      panel.style.setProperty('--reveal', reveal.toFixed(2) + '%');
      panel.style.setProperty('--enter', enter.toFixed(3));
      panel.style.setProperty('--par', par.toFixed(2) + 'vh');
      panel.classList.toggle('is-active', i === active || (i === active + 1 && wipe > 0.5));
    });

    if (railLine) railLine.style.setProperty('--chapter-p', p.toFixed(4));
    if (railCurrent) {
      const shown = Math.min(n, active + 1 + (wipe > 0.5 ? 1 : 0));
      railCurrent.textContent = String(shown).padStart(2, '0');
    }
  }

  /* render the static text layer and slice it into strips. The DOM spans stay
     as the no-canvas / reduced-motion fallback and are swapped out here. */
  function wmBuild() {
    if (!wordmark) return;
    const cs = window.getComputedStyle(wordmark);
    const fontPx = parseFloat(cs.fontSize);
    wmDpr = Math.min(2, window.devicePixelRatio || 1);
    wmW = Math.max(1, wordmark.clientWidth);
    wmCtx = wmCanvas.getContext('2d');
    if (!wmCtx) return;
    wmCanvas.width = Math.round(wmW * wmDpr);
    wmCanvas.height = Math.round(fontPx * 1.1 * wmDpr); // sized after measuring below

    wmOff = document.createElement('canvas');
    wmOff.width = wmCanvas.width;
    wmOff.height = wmCanvas.height;
    const octx = wmOff.getContext('2d');
    if (!octx) return;
    octx.scale(wmDpr, wmDpr);
    octx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    octx.fillStyle = 'rgba(255, 255, 255, .07)';
    octx.textBaseline = 'alphabetic';

    // per-char draw keeps the -.07em tracking identical to the CSS text
    const chars = wmChars.length ? wmChars : ['福', '汇', '发', '展'];
    const ls = -0.07 * fontPx;
    const widths = chars.map(c => octx.measureText(c).width);
    let inkW = widths.reduce((a, b) => a + b, 0) + ls * (chars.length - 1);
    const probe = octx.measureText(chars[0]);
    const asc = probe.actualBoundingBoxAscent || fontPx * 0.86;
    const desc = probe.actualBoundingBoxDescent || fontPx * 0.12;
    wmH = Math.ceil((asc + desc) * 1.08);
    wmCanvas.height = Math.round(wmH * wmDpr);
    wmCanvas.style.width = wmW + 'px';
    wmCanvas.style.height = wmH + 'px';
    wmOff.height = Math.round(wmH * wmDpr);
    octx.scale(wmDpr, wmDpr);
    octx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    octx.fillStyle = 'rgba(255, 255, 255, .07)';
    octx.textBaseline = 'alphabetic';
    const baseline = (wmH - (asc + desc)) / 2 + asc;
    let x = (wmW - inkW) / 2;
    chars.forEach((c, i) => { octx.fillText(c, x, baseline); x += widths[i] + ls; });

    // rectangular tiles cut along the strokes: thin bands (~12px) sliced
    // into one rectangle per run of glyph ink, so a piece breaks exactly
    // where the strokes break — a thick stroke spans 2-3 stacked pieces.
    // The text was painted at alpha .07, so interior pixels carry ~18/255.
    const bh = clamp(Math.round(wmH / 26), 6, 20);
    const px = octx.getImageData(0, 0, wmOff.width, wmOff.height).data;
    const pw = wmOff.width;
    wmCells = [];
    for (let by = 0; by < wmH; by += bh) {
      const th = Math.min(bh, wmH - by);
      const y0 = Math.round(by * wmDpr);
      const y1 = Math.round((by + th) * wmDpr);
      let run = -1;
      for (let x = 0; x <= wmW; x++) {
        let ink = false;
        if (x < wmW) {
          const xc = Math.min(pw - 1, Math.round(x * wmDpr + wmDpr / 2));
          for (let yy = y0; yy < y1; yy++) {
            if (px[(yy * pw + xc) * 4 + 3] > 4) { ink = true; break; }
          }
        }
        if (ink && run < 0) run = x;
        if (!ink && run >= 0) {
          if (x - run < 2) { run = -1; continue; } // skip anti-alias slivers
          wmCells.push({
            sx: run, sy: by, sw: x - run, sh: th, x: 0,
            dir: Math.random() < 0.5 ? -1 : 1,
            m: 0.6 + Math.random() * 0.4
          });
          run = -1;
        }
      }
    }

    if (wmCanvas.parentNode !== wordmark) {
      wordmark.textContent = '';
      wordmark.appendChild(wmCanvas);
    }
    // the fixed wordmark is out of flow: keep a same-height transparent
    // hole at the end of the document so the last page slides up off it.
    // 1px short so the wordmark's top tucks under the opaque cover —
    // offsetHeight rounding would otherwise leave a hairline gap
    const spacer = document.querySelector('.foot__spacer');
    if (spacer) {
      const h = wordmark.getBoundingClientRect().height;
      spacer.style.height = Math.max(0, h - 1) + 'px';
    }
    wmStep(); // resting frame: offsets are zero, glyphs read whole
  }

  /* redraw the tiles: at rest every offset is zero so the glyphs read whole
     with no visible tiling; only tiles near the pointer slide sideways by
     their fixed random amount, easing closed behind it, so the tear opens
     along the pointer's trail and heals after it */
  function wmStep() {
    wmDrawQueued = false;
    if (!wmCtx || !wmCells.length) return;
    const rect = wmCanvas.getBoundingClientRect();
    const vh = window.innerHeight;
    const near = rect.top < vh && rect.bottom > -80;
    const live = near && wmHover && wmFinePointer.matches;
    wmMove *= 0.82; // hand stops → amplitude fades → tear closes
    let busy = false;
    wmCtx.setTransform(1, 0, 0, 1, 0, 0);
    wmCtx.clearRect(0, 0, wmCanvas.width, wmCanvas.height);
    for (let i = 0; i < wmCells.length; i++) {
      const st = wmCells[i];
      let t = 0;
      if (live) {
        const cx = rect.left + st.sx + st.sw / 2;
        const cy = rect.top + st.sy + st.sh / 2;
        const dx = cx - wmMx;
        const dy = cy - wmMy;
        // tear field follows the pointer's travel; glyphs sit ~400px inside
        // the canvas edges, so shifts up to ~1.2 glyph heights stay visible
        const sigma = wmH * 0.18;
        const inf = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        if (inf > 0.02) {
          const amp = clamp(wmMove * 3, 8, wmH * 1.2);
          t = st.dir * inf * st.m * amp;
        }
      }
      st.x += (t - st.x) * 0.4;
      if (Math.abs(st.x) < 0.4 && Math.abs(t) < 0.4) st.x = 0;
      else if (Math.abs(st.x) > 0.4) busy = true;
      wmCtx.setTransform(1, 0, 0, 1, (st.sx + st.x) * wmDpr, st.sy * wmDpr);
      wmCtx.drawImage(wmOff, st.sx * wmDpr, st.sy * wmDpr, st.sw * wmDpr, st.sh * wmDpr, 0, 0, st.sw * wmDpr, st.sh * wmDpr);
    }
    if (busy) wmRequestDraw(); // keep easing until every tile settles
  }

  /* one step per frame at most; the loop self-continues while bands are
     displaced, and mousemove just pokes it */
  let wmDrawQueued = false;
  function wmRequestDraw() {
    if (wmDrawQueued || !wmCtx) return;
    wmDrawQueued = true;
    requestAnimationFrame(wmStep);
  }

  function tick() {
    const vh = window.innerHeight;
    const maxScroll = Math.max(1, doc.scrollHeight - vh);
    if (pageProgress) pageProgress.style.transform = 'scaleX(' + clamp(window.scrollY / maxScroll, 0, 1).toFixed(4) + ')';
    chapterCurrent += (chapterTarget - chapterCurrent) * 0.14;
    if (Math.abs(chapterTarget - chapterCurrent) < 0.0004) chapterCurrent = chapterTarget;
    applyChapter(chapterCurrent);

    // wordmark: eased slide across the footer + skew that answers scroll velocity
    if (wordmark && !motionQuery.matches) {
      wmCurrent += (wmTarget - wmCurrent) * 0.12;
      if (Math.abs(wmTarget - wmCurrent) < 0.0005) wmCurrent = wmTarget;
      const vel = window.scrollY - lastY;
      lastY = window.scrollY;
      smoothVel += (vel - smoothVel) * 0.1;
      if (Math.abs(smoothVel) < 0.05) smoothVel = 0;
      wordmark.style.setProperty('--wm-x', ((1 - wmCurrent) * 7).toFixed(2) + '%');
      wordmark.style.setProperty('--wm-skew', clamp(smoothVel * 0.08, -5, 5).toFixed(2) + 'deg');
    }

    const chapterDone = chapterCurrent === chapterTarget;
    const wmDone = !wordmark || motionQuery.matches || (wmCurrent === wmTarget && smoothVel === 0);
    frame = chapterDone && wmDone ? 0 : requestAnimationFrame(tick);
  }
  function requestTick() { if (!frame) frame = requestAnimationFrame(tick); }

  function syncStatic() {
    refreshStaticHeader();
    const isStatic = motionQuery.matches || preSettleQuery.matches;
    doc.classList.toggle('motion-static', motionQuery.matches);
    doc.classList.toggle('chapter-static', isStatic);
    if (isStatic) {
      panels.forEach(panel => {
        panel.style.removeProperty('--reveal');
        panel.style.removeProperty('--enter');
        panel.style.removeProperty('--par');
        panel.classList.add('is-active');
      });
    } else {
      panels.forEach(panel => {
        if (panel.dataset.panel !== '0') panel.classList.remove('is-active');
      });
    }
    chapterCurrent = chapterTarget = 0;
    if (wordmark && motionQuery.matches) {
      wordmark.style.removeProperty('--wm-x');
      wordmark.style.removeProperty('--wm-skew');
      wmCurrent = wmTarget = 0;
      smoothVel = 0;
      wmHover = false;
    }
    compute();
    chapterCurrent = chapterTarget;
    applyChapter(chapterCurrent);
  }

  /* settle: on phones the URL bar shrinks after load. Hold the static frame for a
     moment, then hand the chapter to the pinned engine. A real reduce-motion
     preference keeps html.motion-static, so the CSS fallback still wins. */
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    doc.classList.remove('chapter-static');
    chapterCurrent = chapterTarget = 0;
    compute();
    chapterCurrent = chapterTarget;
    applyChapter(chapterCurrent);
  };
  setTimeout(settle, 700);
  window.addEventListener('load', () => setTimeout(settle, 500), { once: true });

  [preSettleQuery, motionQuery].forEach(q => {
    if (typeof q.addEventListener === 'function') q.addEventListener('change', onStaticChange);
    else if (typeof q.addListener === 'function') q.addListener(onStaticChange);
  });

  window.addEventListener('scroll', () => { compute(); requestTick(); }, { passive: true });
  window.addEventListener('resize', () => { refreshStaticHeader(); compute(); requestTick(); if (wordmark && !motionQuery.matches) wmBuild(); }, { passive: true });
  window.addEventListener('load', () => { compute(); requestTick(); });
  window.addEventListener('mousemove', e => {
    if (!wmCtx || motionQuery.matches || !wmFinePointer.matches) return;
    const nx = e.clientX, ny = e.clientY;
    const dist = Math.hypot(nx - wmMx, ny - wmMy);
    const dt = Math.max(1, (e.timeStamp || performance.now()) - wmLastT);
    wmMx = nx;
    wmMy = ny;
    wmLastT = e.timeStamp || performance.now();
    // pointer velocity normalized to px per frame (rate-independent, so a
    // 1000Hz gaming mouse reads the same as a 125Hz office mouse): the
    // faster the hand moves, the further the tiles slide
    wmMove += (Math.min(dist / dt * 16, 120) - wmMove) * 0.3;
    wmHover = true;
    wmRequestDraw();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => {
    if (wmHover) { wmHover = false; wmRequestDraw(); }
  });

  applyLang();
  syncStatic();
  if (wordmark && !motionQuery.matches) {
    wmBuild();
    // webfonts land after first paint: redraw the text layer once they arrive
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (!motionQuery.matches) wmBuild(); });
    }
  }
})();
