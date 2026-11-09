/* LF Soares — interação e motion. Sem dependências além de Lenis (opcional). */
(() => {
  const root = document.querySelector('.site');
  if (!root) return;
  const MODE = root.dataset.mode || 'prod';
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const EASE = { slide: 'cubic-bezier(.55,.58,.34,1.04)', overshoot: 'cubic-bezier(0,1.2,.56,1)', roll: 'cubic-bezier(.65,0,.35,1)',
    // spring bounce .2 aproximada em linear()
    spring: 'linear(0, .009, .035 2.1%, .141 4.4%, .723 12.9%, .938 16.7%, 1.017 19.4%, 1.067, 1.099 24.3%, 1.108 26%, 1.098 28.6%, 1.041 34.6%, 1.008 38.5%, .991 43.2%, .99 49.5%, 1.003 61.6%, 1)' };
  const supportsLinear = CSS.supports('transition-timing-function', 'linear(0, 1)');
  const springEase = supportsLinear ? EASE.spring : EASE.overshoot;
  if (!RM) root.classList.add('js-motion');

  /* ---------- Text roll ---------- */
  $$('[data-roll]').forEach((el) => {
    const txt = el.textContent.trim();
    const chars = el.dataset.roll === 'chars';
    el.setAttribute('aria-label', txt);
    const wrap = document.createElement('span');
    wrap.className = 'roll' + (chars ? ' roll--chars' : '');
    wrap.setAttribute('aria-hidden', 'true');
    if (chars) {
      [...txt].forEach((c, i) => {
        const ch = document.createElement('span'); ch.className = 'roll__ch'; ch.style.setProperty('--i', i);
        ch.innerHTML = `<span>${c === ' ' ? '&nbsp;' : c}</span><span>${c === ' ' ? '&nbsp;' : c}</span>`;
        wrap.appendChild(ch);
      });
    } else {
      const inn = document.createElement('span'); inn.className = 'roll__in';
      inn.innerHTML = `<span>${txt}</span><span>${txt}</span><span>${txt}</span>`;
      wrap.appendChild(inn);
    }
    el.textContent = ''; el.appendChild(wrap);
    if (el.tagName !== 'A' && el.tagName !== 'BUTTON') { el.removeAttribute('aria-label'); const sr = document.createElement('span'); sr.className = 'vh'; sr.textContent = txt; el.appendChild(sr); }
  });

  /* ---------- Lenis ---------- */
  let lenis = null;
  if (!RM && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { lenis = null; }
  }
  const scrollToEl = (el) => { if (lenis) lenis.scrollTo(el, { offset: -72 }); else el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); };
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1); const t = id && document.getElementById(id);
    if (t) { e.preventDefault(); scrollToEl(t); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  }));

  /* ---------- Navbar ---------- */
  const nav = $('.nav');
  let lastY = window.scrollY;
  const onNavScroll = () => {
    const y = window.scrollY;
    if (nav && !document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > lastY && y > 240);
    lastY = y;
  };

  /* ---------- Menu mobile ---------- */
  const menu = $('#menu'); const burger = $('.nav__burger');
  if (menu && burger) {
    const close = () => { menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); lenis && lenis.start(); burger.focus(); };
    const open = () => { menu.hidden = false; burger.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); lenis && lenis.stop(); $('a, button', menu).focus(); };
    burger.addEventListener('click', open);
    $('.menu__close', menu).addEventListener('click', close);
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { const f = $$('a, button', menu); const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
  }

  /* ---------- Entradas (presets do template) ---------- */
  const PRESETS = {
    slideFromLeft: { from: { transform: 'translateX(-100px)' }, dur: 1000, ease: EASE.slide },
    slideFromLeftShort: { from: { transform: 'translateX(-30px)' }, dur: 1000, ease: EASE.slide },
    slideFromRight: { from: { transform: 'translateX(85px)' }, dur: 1000, ease: EASE.slide },
    fadeUp: { from: { opacity: 0, transform: 'translateY(40px)' }, dur: 1000, ease: springEase },
    fade: { from: { opacity: 0 }, dur: 1000, ease: springEase },
    fadeQuick: { from: { opacity: 0 }, dur: 400, ease: springEase },
    fadeOvershoot: { from: { opacity: 0 }, dur: 600, ease: EASE.overshoot },
    riseOvershoot: { from: { transform: 'translateY(40px)' }, dur: 1000, ease: EASE.overshoot },
  };
  const vh = () => window.innerHeight;
  const revealEls = $$('[data-reveal]');
  if (!RM && 'IntersectionObserver' in window) {
    revealEls.forEach((el) => { if (el.getBoundingClientRect().top > vh() * 0.92) el.classList.add('is-pending'); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target; io.unobserve(el);
        if (!el.classList.contains('is-pending')) return;
        const p = PRESETS[el.dataset.reveal] || PRESETS.fadeUp;
        const sib = el.parentElement ? $$(':scope > [data-reveal]', el.parentElement) : [el];
        const delay = Math.min(sib.indexOf(el), 6) * 90;
        el.classList.remove('is-pending');
        const to = {}; Object.keys(p.from).forEach((k) => { to[k] = k === 'opacity' ? 1 : 'none'; });
        el.animate([p.from, to], { duration: p.dur, easing: p.ease, delay, fill: 'backwards' });
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' });
    revealEls.forEach((el) => io.observe(el));
    // Rede de segurança: nada fica escondido.
    setTimeout(() => $$('.is-pending').forEach((el) => { if (el.getBoundingClientRect().top < vh()) el.classList.remove('is-pending'); }), 2500);
  }

  /* ---------- Hero: sequência de entrada ---------- */
  if (!RM) {
    $$('[data-hero]').forEach((el, i) => {
      const k = el.dataset.hero; const p = PRESETS[k] || PRESETS.fadeUp;
      const to = {}; Object.keys(p.from).forEach((x) => { to[x] = x === 'opacity' ? 1 : 'none'; });
      el.animate([p.from, to], { duration: p.dur, easing: p.ease, delay: 120 + i * 110, fill: 'backwards' });
    });
  }

  /* ---------- charReveal ---------- */
  const charEls = RM ? [] : $$('[data-chars]');
  charEls.forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el); el.classList.add('chars');
    el._words = $$('.w', el);
  });

  /* ---------- Contadores ---------- */
  const fmt = (n) => n.toLocaleString('pt-BR');
  const counters = $$('[data-count]');
  if (!RM && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return; cio.unobserve(en.target);
        const el = en.target; const target = +el.dataset.count; const suf = el.dataset.suffix || '';
        if (el.getBoundingClientRect().top < 0) return;
        const t0 = performance.now(); const D = 1600;
        const tick = (t) => { const k = Math.min(1, (t - t0) / D); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(target * e)) + suf; if (k < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => { if (el.getBoundingClientRect().top > vh()) { el.textContent = '0' + (el.dataset.suffix || ''); } cio.observe(el); });
  }

  /* ---------- Manifesto pinado / painéis / parallax / charReveal (scroll) ---------- */
  const manifestos = $$('.manifesto');
  const panelsWrap = $$('.panels');
  const parallax = RM ? [] : $$('[data-parallax]');
  if (RM) manifestos.forEach((m) => m.classList.add('is-static'));
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const onScrollFx = () => {
    const H = vh();
    if (!RM) manifestos.forEach((m) => {
      const r = m.getBoundingClientRect(); const total = m.offsetHeight - H;
      const p = clamp01(-r.top / total);
      const lines = $$('.manifesto__lines p', m); const n = lines.length;
      lines.forEach((l, i) => {
        const start = (i / n) * 0.85; const k = clamp01((p - start) / (0.85 / n));
        l.style.opacity = (0.08 + 0.92 * k).toFixed(3);
        l.style.transform = `translateY(${(1 - k) * 30}px)`;
      });
      const bg = $('.bgmedia', m); if (bg) bg.style.transform = `scale(${1.08 - p * 0.08})`;
    });
    if (!RM) panelsWrap.forEach((w) => {
      const ps = $$('.panel', w);
      ps.forEach((pnl, i) => {
        const next = ps[i + 1]; if (!next) { pnl.style.transform = ''; pnl.style.filter = ''; return; }
        const nr = next.getBoundingClientRect();
        const k = clamp01(1 - nr.top / H);
        pnl.style.transform = k > 0 ? `scale(${1 - 0.08 * k})` : '';
        pnl.style.filter = k > 0 ? `brightness(${1 - 0.4 * k})` : '';
      });
    });
    parallax.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect(); const sp = +(el.dataset.parallax || 0.12);
      if (r.bottom < 0 || r.top > H) return;
      el.style.transform = `translate3d(0, ${(r.top - H / 2) * -sp}px, 0) scale(1.15)`;
    });
    charEls.forEach((el) => {
      const r = el.getBoundingClientRect(); if (r.top > H || r.bottom < 0) { if (r.top > H) el._words.forEach((w) => w.style.setProperty('--o', .15)); return; }
      const p = clamp01((H * 0.9 - r.top) / (H * 0.6 + r.height * 0.4));
      const n = el._words.length; const lit = p * n;
      el._words.forEach((w, i) => w.style.setProperty('--o', (0.15 + 0.85 * clamp01(lit - i)).toFixed(2)));
    });
  };
  let ticking = false;
  const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { onNavScroll(); onScrollFx(); ticking = false; }); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScrollFx();

  /* ---------- Vídeos de fundo: pausa por acessibilidade ---------- */
  $$('video[data-bgvideo]').forEach((v) => {
    if (RM) { v.removeAttribute('autoplay'); v.pause(); }
    else { const p = v.play(); p && p.catch(() => {}); }
    const btn = v.parentElement.querySelector('.vctl');
    if (!btn) return;
    const sync = () => { btn.setAttribute('aria-label', v.paused ? 'Reproduzir vídeo' : 'Pausar vídeo'); btn.innerHTML = v.paused ? '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6z"/></svg>' : '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>'; };
    btn.addEventListener('click', () => { v.paused ? v.play() : v.pause(); sync(); });
    v.addEventListener('play', sync); v.addEventListener('pause', sync); sync();
  });

  /* ---------- Relógio UTC−4 ---------- */
  const clocks = $$('[data-clock]');
  if (clocks.length) {
    const f = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Campo_Grande', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const t = () => { const s = f.format(new Date()); clocks.forEach((c) => { c.textContent = s; c.setAttribute('datetime', s); }); };
    t(); setInterval(t, 1000);
  }

  /* ---------- FAQ (altura animada) ---------- */
  $$('.faq details').forEach((d) => {
    const sum = $('summary', d); const body = $('.faq__a', d);
    sum.addEventListener('click', (e) => {
      if (RM || !body.animate) return;
      e.preventDefault();
      if (d.open) {
        const h = body.offsetHeight;
        body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 300, easing: EASE.roll }).onfinish = () => { d.open = false; };
      } else {
        d.open = true; const h = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 400, easing: springEase });
      }
    });
  });

  /* ---------- Arrastáveis ---------- */
  $$('[data-drag]').forEach((el) => {
    let down = false, sx = 0, sl = 0, moved = false;
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; el.classList.add('is-drag'); });
    window.addEventListener('pointerup', () => { if (!down) return; down = false; el.classList.remove('is-drag'); });
    el.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; el.scrollLeft = sl - dx; });
    el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    el.addEventListener('dragstart', (e) => e.preventDefault());
  });

  /* ---------- Catálogo: filtros + busca ---------- */
  const cat = $('[data-catalog]');
  if (cat) {
    const rows = $$('.cat__row', cat); const btns = $$('[data-filter]'); const q = $('#busca-treinamento'); const empty = $('.cat__empty', cat); const count = $('[data-count-visible]');
    let current = 'todas';
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const apply = () => {
      const term = q ? norm(q.value.trim()) : ''; let n = 0;
      rows.forEach((r) => { const ok = (current === 'todas' || r.dataset.cat === current) && (!term || norm(r.textContent).includes(term)); r.hidden = !ok; if (ok) n++; });
      if (empty) empty.hidden = n > 0; if (count) count.textContent = n;
    };
    btns.forEach((b) => b.addEventListener('click', () => { current = b.dataset.filter; btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); apply(); }));
    q && q.addEventListener('input', apply);
  }

  /* ---------- Galeria: filtros + lightbox ---------- */
  const gal = $('[data-gallery]');
  if (gal) {
    const items = $$('.gal__item', gal); const lb = $('#lightbox'); const lbImg = $('#lightbox img'); const lbCap = $('#lightbox [data-cap]');
    let idx = 0; let visible = items; let lastFocus = null;
    const show = (i) => { idx = (i + visible.length) % visible.length; const it = visible[idx]; lbImg.src = it.dataset.full; lbImg.alt = it.querySelector('img').alt; lbCap.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`; };
    const open = (i) => { lastFocus = document.activeElement; lb.hidden = false; show(i); lenis && lenis.stop(); $('[data-close]', lb).focus(); };
    const close = () => { lb.hidden = true; lenis && lenis.start(); lastFocus && lastFocus.focus(); };
    items.forEach((it) => it.addEventListener('click', () => open(visible.indexOf(it))));
    $('[data-close]', lb).addEventListener('click', close);
    $('[data-prev]', lb).addEventListener('click', () => show(idx - 1));
    $('[data-next]', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox__img')) close(); });
    $$('[data-gfilter]').forEach((b) => b.addEventListener('click', () => {
      const f = b.dataset.gfilter; $$('[data-gfilter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      items.forEach((it) => { it.hidden = !(f === 'todas' || it.dataset.cat === f); }); visible = items.filter((it) => !it.hidden);
    }));
    const more = $('[data-gmore]');
    if (more) more.addEventListener('click', () => { $$('.gal__item.is-extra', gal).forEach((x) => x.classList.remove('is-extra')); more.remove(); });
  }

  /* ---------- YouTube facade ---------- */
  $$('[data-yt]').forEach((el) => {
    if (MODE === 'local' || MODE === 'preview') return; // usa o link direto para o YouTube
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const id = el.dataset.yt; const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`; f.title = el.getAttribute('aria-label') || 'Vídeo';
      f.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; el.appendChild(f);
    }, { once: true });
  });

  /* ---------- WhatsApp: sai da frente de CTAs e formulários ---------- */
  const wa = $('.wa'); const avoid = $$('[data-hide-wa]');
  if (wa && avoid.length && 'IntersectionObserver' in window) {
    const vis = new Set();
    const wio = new IntersectionObserver((ens) => { ens.forEach((en) => en.isIntersecting ? vis.add(en.target) : vis.delete(en.target)); wa.classList.toggle('is-away', vis.size > 0); }, { rootMargin: '0px 0px -10% 0px' });
    avoid.forEach((a) => wio.observe(a));
  }

  /* ---------- Formulários ---------- */
  const onlyDigits = (s) => s.replace(/\D/g, '');
  const masks = {
    tel: (v) => { const d = onlyDigits(v).slice(0, 11); if (d.length <= 2) return d; if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`; if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`; },
    cpf: (v) => { const d = onlyDigits(v).slice(0, 11); return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); },
    cep: (v) => { const d = onlyDigits(v).slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; },
  };
  const cpfOk = (v) => { const d = onlyDigits(v); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; const calc = (n) => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; }; return calc(9) === +d[9] && calc(10) === +d[10]; };
  $$('[data-mask]').forEach((i) => i.addEventListener('input', () => { const m = masks[i.dataset.mask]; if (m) i.value = m(i.value); }));

  const validateField = (input) => {
    const field = input.closest('.field') || input.closest('.checkline'); if (!field) return true;
    let msg = '';
    const v = (input.type === 'checkbox') ? input.checked : input.value.trim();
    if (input.required && !v) msg = input.type === 'checkbox' ? 'Marque esta opção para continuar.' : 'Preencha este campo.';
    else if (v && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Confira o e-mail. Ex.: nome@empresa.com.br';
    else if (v && input.dataset.mask === 'tel' && onlyDigits(v).length < 10) msg = 'Informe o telefone com DDD.';
    else if (v && input.dataset.mask === 'cpf' && !cpfOk(v)) msg = 'CPF inválido. Confira os 11 números.';
    else if (v && input.dataset.mask === 'cep' && onlyDigits(v).length !== 8) msg = 'O CEP tem 8 números.';
    const err = field.querySelector('.field__err');
    field.classList.toggle('is-invalid', !!msg);
    if (err) err.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  const validateScope = (scope) => { let ok = true; let first = null; $$('input, select, textarea', scope).forEach((i) => { if (i.closest('[hidden]') || i.classList.contains('hp-in')) return; if (!validateField(i)) { ok = false; first = first || i; } }); if (first) first.focus(); return ok; };
  $$('form[data-form] input, form[data-form] select, form[data-form] textarea').forEach((i) => i.addEventListener('blur', () => { if (i.value || i.closest('.field')?.classList.contains('is-invalid')) validateField(i); }));

  // Pré-seleção vinda de links "ORÇAR" (?treinamento=...)
  try {
    const params = new URLSearchParams(location.search);
    const pre = params.get('treinamento') || params.get('item');
    if (pre) $$('select[data-prefill]').forEach((s) => { const o = [...s.options].find((x) => x.value === pre || x.text.startsWith(pre)); if (o) s.value = o.value; });
  } catch (e) {}
  $$('[data-orcar]').forEach((b) => b.addEventListener('click', (e) => {
    const sel = $('#eq-itens'); const form = $('#orcamento');
    if (sel && form) { e.preventDefault(); [...sel.options].forEach((o) => { if (o.value === b.dataset.orcar) o.selected = true; }); scrollToEl(form); setTimeout(() => sel.focus({ preventScroll: true }), RM ? 0 : 700); }
  }));

  const submitForm = (form) => {
    if ($('.hp-in', form)?.value) return;
    const status = $('.form__status--err', form);
    status.classList.add('is-on');
    status.setAttribute('tabindex', '-1');
    status.focus();
  };
  $$('form[data-form]').forEach((form) => {
    if (form.dataset.form === 'matricula') return;
    form.addEventListener('submit', (e) => { e.preventDefault(); if (validateScope(form)) submitForm(form); });
  });

  /* ---------- Wizard de matrícula ---------- */
  const wiz = $('form[data-form="matricula"]');
  if (wiz) {
    const panels = $$('.wiz__panel', wiz); const steps = $$('.wiz__steps li', wiz); const bar = $('.wiz__bar', wiz); const label = $('[data-wiz-label]', wiz);
    let cur = 0;
    const go = (i) => {
      cur = i; panels.forEach((p, k) => p.hidden = k !== i); steps.forEach((s, k) => s.toggleAttribute('aria-current', k === i) || (k === i && s.setAttribute('aria-current', 'step')));
      steps.forEach((s, k) => { if (k === i) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current'); });
      bar.style.width = `${((i + 1) / panels.length) * 100}%`; if (label) label.textContent = `${String(i + 1).padStart(2, '0')}/${String(panels.length).padStart(2, '0')}`;
      if (i === panels.length - 1) buildReview();
      const h = $('h3', panels[i]); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      scrollToEl(wiz);
    };
    const buildReview = () => {
      const rv = $('[data-review]', wiz); if (!rv) return; const g = (n) => (wiz.elements[n]?.value || '—').trim() || '—';
      const cpf = onlyDigits(g('cpf')); const masked = cpf.length === 11 ? `***.${cpf.slice(3, 6)}.***-${cpf.slice(9)}` : '—';
      const rows = [['Nome', g('nome')], ['E-mail', g('email')], ['Telefone', g('telefone')], ['CPF', masked], ['Cidade / CEP', g('cep')], ['Contato de emergência', g('emergencia_nome')]];
      rv.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd></dd></div>`).join('');
      $$('dd', rv).forEach((dd, k) => { dd.textContent = rows[k][1]; });
    };
    $$('[data-wiz-next]', wiz).forEach((b) => b.addEventListener('click', () => { if (validateScope(panels[cur])) go(cur + 1); }));
    $$('[data-wiz-prev]', wiz).forEach((b) => b.addEventListener('click', () => go(cur - 1)));
    $$('.yn input[type="radio"]', wiz).forEach((r) => r.addEventListener('change', () => { const more = r.closest('.yn').querySelector('.more'); if (more) more.hidden = r.value !== 'sim'; }));
    wiz.addEventListener('submit', (e) => { e.preventDefault(); if (cur !== panels.length - 1) { if (validateScope(panels[cur])) go(cur + 1); return; } if (validateScope(panels[cur])) submitForm(wiz); });
  }

  /* ---------- Transição de página (cortina) ---------- */
  const curtain = $('.curtain');
  if (curtain && !RM) {
    try { if (sessionStorage.getItem('lf-curtain') === '1') { sessionStorage.removeItem('lf-curtain'); curtain.classList.add('is-out'); } } catch (e) {}
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const href = a.getAttribute('href') || ''; if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:)/.test(href)) return;
      e.preventDefault();
      curtain.classList.remove('is-out'); curtain.classList.add('is-in');
      try { sessionStorage.setItem('lf-curtain', '1'); } catch (er) {}
      setTimeout(() => { location.href = a.href; }, 560);
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) { curtain.classList.remove('is-in'); } });
  }

  /* ---------- Ano do rodapé ---------- */
  $$('[data-year]').forEach((y) => { y.textContent = new Date().getFullYear(); });
})();
