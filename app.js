// Kids Day Out: shared site behavior. Forms post to the KDO Google Sheet through an Apps Script web app.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJXhcQoFM-th_nUQJzjwsKmap9QsrYUIfLgYcIMgK7n1Dv9MSFDQRzcNCT7pUyreaDlg/exec';

const KDO = {
  digits: v => (v || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').slice(0, 10),
  formatPhone(v) {
    const d = KDO.digits(v);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  },
  phoneOk: v => /^[2-9]\d{2}[2-9]\d{6}$/.test(KDO.digits(v)),
  emailOk: v => /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test((v || '').trim()),

  // Red asterisk on every required field label.
  markRequired(root = document) {
    root.querySelectorAll('input[required], textarea[required]').forEach(el => {
      if (el.type === 'radio' || el.type === 'checkbox') return;
      const label = el.closest('.field')?.querySelector('label');
      if (label && !label.querySelector('.req-mark')) label.insertAdjacentHTML('beforeend', '<span class="req-mark" aria-hidden="true">*</span>');
    });
    root.querySelectorAll('.chips[data-required]').forEach(group => {
      const label = group.previousElementSibling;
      if (label && label.tagName === 'LABEL' && !label.querySelector('.req-mark')) label.insertAdjacentHTML('beforeend', '<span class="req-mark" aria-hidden="true">*</span>');
    });
  },

  wirePhones(root = document) {
    root.querySelectorAll('input.phone').forEach(el => {
      if (el.dataset.wired) return;
      el.dataset.wired = '1';
      el.addEventListener('input', () => { el.value = KDO.formatPhone(el.value); KDO.clearErr(el); });
    });
    root.querySelectorAll('input.email').forEach(el => el.addEventListener('input', () => KDO.clearErr(el)));
  },

  setErr(el, text) {
    const holder = el.closest('.field') || el;
    holder.classList.add('invalid');
    const slot = holder.querySelector?.('.err-text');
    if (slot) slot.textContent = text;
  },
  clearErr(el) {
    const holder = el.closest('.field') || el;
    holder.classList.remove('invalid');
    const slot = holder.querySelector?.('.err-text');
    if (slot) slot.textContent = '';
  },

  // Checks one field; returns an error message or ''.
  check(el) {
    const v = el.value.trim();
    if (el.required && !v) return 'Required';
    if (el.classList.contains('phone') && v && !KDO.phoneOk(v)) return 'Enter a 10 digit phone number';
    if (el.classList.contains('email') && v && !KDO.emailOk(v)) return 'Enter a valid email address';
    return '';
  },

  // Validates a whole form; marks errors and returns the first bad element (or null).
  validate(form) {
    let first = null;
    const shown = el => el.offsetParent !== null;
    form.querySelectorAll('input:not([type=radio]):not([type=checkbox]), textarea').forEach(el => {
      if (el.closest('.hp') || !shown(el)) return;
      const err = KDO.check(el);
      if (err) { KDO.setErr(el, err); first = first || el; } else KDO.clearErr(el);
    });
    form.querySelectorAll('.chips[data-required]').forEach(group => {
      if (!shown(group)) return;
      const ok = group.querySelector('input:checked');
      group.classList.toggle('invalid', !ok);
      if (!ok) first = first || group;
    });
    form.querySelectorAll('input[type=checkbox][required]').forEach(cb => {
      if (!shown(cb.closest('label'))) return;
      const label = cb.closest('label');
      label.classList.toggle('invalid', !cb.checked);
      if (!cb.checked) first = first || label;
    });
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first.classList.add('shake');
      setTimeout(() => first.classList.remove('shake'), 700);
      if (first.focus && first.tagName !== 'DIV' && first.tagName !== 'LABEL') setTimeout(() => first.focus({ preventScroll: true }), 350);
    }
    return first;
  },

  radio: (form, name) => form.querySelector(`input[name="${name}"]:checked`)?.value || '',

  async post(payload) {
    const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || 'not ok');
    return out;
  },

  confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.id = 'confetti';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const resize = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; };
    resize();
    const colors = ['#40ACA1', '#E4D0A1', '#D9C187', '#1E2624', '#8FD6CE', '#F2EEE3', '#E8846B'];
    const parts = Array.from({ length: 170 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.3, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 6,
      w: 6 + Math.random() * 7, h: 8 + Math.random() * 10, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)], round: Math.random() < 0.3
    }));
    const start = performance.now();
    (function frame(t) {
      const age = t - start;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2600) / 900);
      parts.forEach(p => {
        p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.color;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (age < 3500) requestAnimationFrame(frame); else c.remove();
    })(start);
  }
};

KDO.markRequired();
KDO.wirePhones();

// Address suggestions as you type. Free: Photon, built on OpenStreetMap, no key. Typing your own address still works.
KDO.addressAutocomplete = input => {
  const STATES = { Arkansas: 'AR', Oklahoma: 'OK', Missouri: 'MO', Texas: 'TX', Louisiana: 'LA', Mississippi: 'MS', Tennessee: 'TN', Kansas: 'KS' };
  const box = document.createElement('div');
  box.className = 'addr-list';
  box.hidden = true;
  input.closest('.field').style.position = 'relative';
  input.after(box);
  input.setAttribute('autocomplete', 'off');
  let timer, items = [], active = -1, seq = 0;
  const format = (p, typedNum) => {
    const street = p.street || p.name || '';
    const line1 = [p.housenumber || typedNum || '', street].filter(Boolean).join(' ');
    const city = p.city || p.district || p.county || '';
    const state = [STATES[p.state] || p.state || '', p.postcode || ''].filter(Boolean).join(' ');
    return [line1, city, state].filter(Boolean).join(', ');
  };
  const close = () => { box.hidden = true; active = -1; };
  const pick = i => { input.value = items[i]; close(); KDO.clearErr(input); };
  const render = () => {
    box.innerHTML = '';
    items.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      if (i === active) b.className = 'on';
      b.addEventListener('pointerdown', e => { e.preventDefault(); pick(i); });
      box.appendChild(b);
    });
    const credit = document.createElement('small');
    credit.textContent = 'Suggestions © OpenStreetMap';
    box.appendChild(credit);
    box.hidden = !items.length;
  };
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 4) { items = []; close(); return; }
    timer = setTimeout(async () => {
      const mine = ++seq;
      try {
        const url = 'https://photon.komoot.io/api/?limit=8&lang=en&lat=35.478&lon=-94.222&q=' + encodeURIComponent(q);
        const data = await (await fetch(url)).json();
        if (mine !== seq) return;
        const typedNum = (q.match(/^\s*(\d+[A-Za-z]?)\s/) || [])[1];
        const seen = new Set();
        items = (data.features || []).map(f => f.properties).filter(p => p.countrycode === 'US' && (p.state === 'Arkansas' || p.state === 'Oklahoma') && (p.type === 'street' || (p.type === 'house' && (p.housenumber || !p.name))))
          .map(p => format(p, typedNum)).filter(t => !seen.has(t) && seen.add(t)).slice(0, 5);
        active = -1;
        render();
      } catch (e) { close(); }
    }, 250);
  });
  input.addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; render(); }
    else if (e.key === 'Enter' && active > -1) { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') close();
  });
  input.addEventListener('blur', () => setTimeout(close, 150));
};
document.querySelectorAll('#address').forEach(KDO.addressAutocomplete);

// Live "spots left" on the home page; stays hidden if the sheet can't be reached.
const spotsEl = document.getElementById('spots');
if (spotsEl) {
  fetch(SCRIPT_URL + '?summary=1').then(r => r.json()).then(d => {
    if (typeof d.spotsLeft === 'number' && d.spotsLeft > 0) {
      spotsEl.textContent = d.spotsLeft + ' of 30 spots left';
      spotsEl.style.display = 'inline';
    }
  }).catch(() => {});
}

// Teacher application.
const applyForm = document.getElementById('apply-form');
if (applyForm) {
  const msg = document.getElementById('msg');
  const button = document.getElementById('submit-btn');
  let sending = false;
  applyForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    msg.className = 'msg'; msg.textContent = '';
    if (KDO.validate(applyForm)) { msg.className = 'msg err'; msg.textContent = 'Please fix the highlighted fields.'; return; }
    const v = id => document.getElementById(id).value.trim();
    const payload = {
      form: 'leader', website: v('website'), first: v('first'), last: v('last'), phone: v('phone'), email: v('email'),
      address: v('address'), adult: document.getElementById('adult').checked ? 'Yes' : '',
      role: KDO.radio(applyForm, 'role'), experience: v('experience'), cpr: KDO.radio(applyForm, 'cpr'),
      churchHome: v('churchHome'), why: v('why'), ref1: [`${v('refFirst')} ${v('refLast')}`, v('refPhone'), v('refRel')].filter(Boolean).join(', '), ref2: '',
      consent: document.getElementById('consent').checked ? 'Yes' : ''
    };
    sending = true; button.disabled = true; button.textContent = 'Sending...';
    try {
      await KDO.post(payload);
      applyForm.style.display = 'none';
      document.getElementById('thanks').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      KDO.confetti();
    } catch (err) {
      msg.className = 'msg err';
      msg.textContent = "That didn't go through. Check your connection and try again.";
      sending = false; button.disabled = false; button.textContent = 'Send my application';
    }
  });
}

// Smooth FAQ open and close.
document.querySelectorAll('details.faq').forEach(d => {
  const summary = d.querySelector('summary');
  const body = document.createElement('div');
  body.className = 'faq-body';
  while (summary.nextSibling) body.appendChild(summary.nextSibling);
  d.appendChild(body);
  let anim;
  summary.addEventListener('click', e => {
    e.preventDefault();
    if (anim) anim.cancel();
    const start = d.offsetHeight;
    if (d.open) {
      const end = summary.offsetHeight;
      anim = d.animate({ height: [start + 'px', end + 'px'] }, { duration: 260, easing: 'ease' });
      anim.onfinish = () => { d.open = false; anim = null; };
    } else {
      d.open = true;
      const end = d.offsetHeight;
      anim = d.animate({ height: [start + 'px', end + 'px'] }, { duration: 300, easing: 'ease' });
      anim.onfinish = () => { anim = null; };
    }
  });
});

// Birthday picker: year, then month, then day, in the KDO colors. Writes yyyy-mm-dd to the hidden input.
// Phones get a bottom sheet; wider screens get a popover under the field.
KDO.datePicker = (input, { minYear = 2021, name = () => '' } = {}) => {
  const btn = input.closest('.field').querySelector('.date-btn');
  const anchor = btn.parentElement;
  const text = btn.querySelector('.date-text');
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const STEPS = ['year', 'month', 'day'];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxY = today.getFullYear(), maxM = today.getMonth();
  const pad = n => String(n).padStart(2, '0');
  const parse = v => { const [a, b, c] = (v || '').split('-').map(Number); return a ? { y: a, m: b - 1, d: c } : null; };
  const sheet = () => window.matchMedia('(max-width: 600px)').matches;
  let pop = null, back = null, body, step, y, m, sel, kb = false;

  function paint() {
    sel = parse(input.value);
    text.textContent = sel ? `${MONTHS[sel.m]} ${sel.d}, ${sel.y}` : 'Choose a birthday';
    btn.classList.toggle('filled', !!sel);
  }

  function open() {
    const a = document.activeElement;
    if (a && a !== btn && a.matches('input, textarea')) a.blur(); // drop the phone keyboard first
    sel = parse(input.value);
    y = sel ? sel.y : null; m = sel ? sel.m : null; step = null;
    pop = document.createElement('div');
    pop.className = 'dp' + (sheet() ? ' dp-sheet' : '');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Choose a birthday');
    pop.innerHTML = '<div class="dp-grab"></div><div class="dp-head"><div class="dp-title"><small></small><b></b></div>'
      + '<button type="button" class="dp-x" aria-label="Close">&times;</button></div>'
      + '<div class="dp-steps">' + STEPS.map(s => `<button type="button" data-step="${s}"></button>`).join('') + '</div><div class="dp-body"></div>';
    body = pop.querySelector('.dp-body');
    if (sheet()) {
      back = document.createElement('div');
      back.className = 'dp-back';
      back.addEventListener('click', () => close());
      document.body.append(back, pop);
      document.documentElement.classList.add('dp-lock');
    } else anchor.appendChild(pop);
    pop.querySelector('.dp-x').addEventListener('click', () => close());
    pop.querySelector('.dp-steps').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b && !b.disabled && b.dataset.step !== step) go(b.dataset.step);
    });
    body.addEventListener('click', onPick);
    pop.addEventListener('keydown', onKey);
    go(sel ? 'day' : 'year');
    btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => requestAnimationFrame(() => { pop && pop.classList.add('open'); back && back.classList.add('open'); }));
    if (!sheet()) setTimeout(() => pop && pop.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80);
    setTimeout(() => document.addEventListener('pointerdown', outside), 0);
  }

  function close(refocus = true) {
    if (!pop) return;
    const p = pop, b = back;
    pop = back = null;
    document.removeEventListener('pointerdown', outside);
    document.documentElement.classList.remove('dp-lock');
    p.classList.remove('open');
    if (b) b.classList.remove('open');
    setTimeout(() => { p.remove(); if (b) b.remove(); }, 320);
    btn.setAttribute('aria-expanded', 'false');
    if (refocus && kb) btn.focus({ preventScroll: true });
    kb = false;
  }
  const outside = e => { if (pop && !pop.contains(e.target) && !btn.contains(e.target) && !(back && back.contains(e.target))) close(false); };

  function go(s) {
    const dir = step ? Math.sign(STEPS.indexOf(s) - STEPS.indexOf(step)) : 0;
    step = s;
    render(dir);
  }

  function render(dir) {
    const who = name();
    pop.querySelector('.dp-title small').textContent = who ? `${who}'s birthday` : 'Birthday';
    pop.querySelector('.dp-title b').textContent = step === 'year' ? 'What year?' : step === 'month' ? `Which month in ${y}?` : 'Which day?';
    pop.querySelectorAll('.dp-steps button').forEach(b => {
      const s = b.dataset.step;
      b.classList.toggle('on', s === step);
      b.disabled = (s === 'month' && y == null) || (s === 'day' && m == null);
      b.textContent = s === 'year' ? (y || 'Year') : s === 'month' ? (m != null ? MONTHS[m].slice(0, 3) : 'Month') : (sel && sel.y === y && sel.m === m ? sel.d : 'Day');
    });
    const v = document.createElement('div');
    v.className = 'dp-view' + (dir > 0 ? ' fwd' : dir < 0 ? ' bwd' : '');
    if (step === 'year') {
      let h = '';
      for (let yr = maxY; yr >= minYear; yr--) h += `<button type="button" class="dp-cell${yr === y ? ' on' : ''}" data-y="${yr}">${yr}</button>`;
      v.innerHTML = `<div class="dp-grid dp-years">${h}</div>`;
    } else if (step === 'month') {
      v.innerHTML = '<div class="dp-grid dp-months">' + MONTHS.map((n, i) =>
        `<button type="button" class="dp-cell${i === m ? ' on' : ''}" data-m="${i}"${y === maxY && i > maxM ? ' disabled' : ''}>${n.slice(0, 3)}</button>`).join('') + '</div>';
    } else {
      const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      let h = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<span class="dp-dow">${d}</span>`).join('') + '<span></span>'.repeat(first);
      for (let d = 1; d <= days; d++) {
        const dt = new Date(y, m, d);
        const on = sel && sel.y === y && sel.m === m && sel.d === d;
        h += `<button type="button" class="dp-cell dp-day${on ? ' on' : ''}${+dt === +today ? ' today' : ''}" data-d="${d}"${dt > today ? ' disabled' : ''}>${d}</button>`;
      }
      v.innerHTML = `<div class="dp-monthbar"><button type="button" class="dp-arrow" data-nav="-1" aria-label="Previous month"${y === minYear && m === 0 ? ' disabled' : ''}>&#8249;</button>`
        + `<b>${MONTHS[m]} ${y}</b><button type="button" class="dp-arrow" data-nav="1" aria-label="Next month"${y === maxY && m >= maxM ? ' disabled' : ''}>&#8250;</button></div>`
        + `<div class="dp-grid dp-days">${h}</div>`;
    }
    // Swap views and ease the height between them.
    const h0 = body.offsetHeight, had = !!body.firstElementChild;
    body.replaceChildren(v);
    body.style.height = '';
    if (had && dir) {
      const h1 = body.offsetHeight;
      body.style.height = h0 + 'px';
      void body.offsetHeight;
      body.style.height = h1 + 'px';
      clearTimeout(body._t);
      body._t = setTimeout(() => { body.style.height = ''; }, 300);
    }
    // Keyboard users get focus moved into the picker; taps and clicks don't, so nothing looks pre-selected.
    const target = v.querySelector('.dp-cell.on:not([disabled])') || v.querySelector('.dp-cell:not([disabled])');
    if (target && (kb || pop.contains(document.activeElement))) target.focus({ preventScroll: true });
  }

  function onPick(e) {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.y) { y = +b.dataset.y; if (m != null && y === maxY && m > maxM) m = null; go('month'); }
    else if (b.dataset.m) { m = +b.dataset.m; go('day'); }
    else if (b.dataset.nav) shift(+b.dataset.nav);
    else if (b.dataset.d) pick(+b.dataset.d, b);
  }

  function shift(n) {
    const dt = new Date(y, m + n, 1);
    y = dt.getFullYear(); m = dt.getMonth();
    render(n);
  }

  function pick(d, b) {
    input.value = `${y}-${pad(m + 1)}-${pad(d)}`;
    body.querySelectorAll('.dp-day.on').forEach(x => x.classList.remove('on'));
    b.classList.add('on', 'pop');
    paint();
    btn.classList.remove('flash'); void btn.offsetWidth; btn.classList.add('flash');
    input.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(() => close(), 240);
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    const cur = document.activeElement;
    if (step !== 'day' || !delta || !cur || !cur.dataset || !cur.dataset.d) return;
    e.preventDefault();
    const dt = new Date(y, m, +cur.dataset.d + delta);
    if (dt > today || dt.getFullYear() < minYear) return;
    if (dt.getMonth() !== m || dt.getFullYear() !== y) { const dir = dt > new Date(y, m, 1) ? 1 : -1; y = dt.getFullYear(); m = dt.getMonth(); render(dir); }
    const next = body.querySelector(`[data-d="${dt.getDate()}"]`);
    if (next) next.focus();
  }

  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') kb = true; });
  btn.addEventListener('click', () => (pop ? close() : open()));
  paint();
};

// Document viewer: links with data-doc open the document's page images in a pop-up, so nothing depends on
// a phone's PDF or Word viewer. Pages and titles come from docs/pages/manifest.json (built by build-pages.sh).
KDO.docViewer = (() => {
  let manifest = null, el = null, back = null, ours = false;
  const load = () => manifest || (manifest = fetch('docs/pages/manifest.json').then(r => r.json()));
  const phone = () => window.matchMedia('(max-width: 600px)').matches;
  const DL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';

  async function open(key, push = true, only = '') {
    const docs = await load(), d = docs[key];
    if (!d || el) return;
    back = document.createElement('div');
    back.className = 'dv-back';
    el = document.createElement('div');
    el.className = 'dv';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', d.title);
    const unit = key === 'proposal' ? 'slides' : d.pages === 1 ? 'page' : 'pages';
    let pages = '';
    for (let i = 1; i <= (d.html ? 0 : d.pages); i++) {
      pages += `<div class="dv-page" style="aspect-ratio:1/${d.ratio}"><img src="docs/pages/${key}-${i}.jpg" alt="${d.title}, page ${i}" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async"></div>`;
    }
    el.innerHTML = `<div class="dv-bar"><div class="dv-title"><b>${d.title}</b><small>${d.html ? 'Kids Day Out at First Baptist Alma' : d.pages + ' ' + unit}</small></div>`
      + (d.downloads || []).filter(([label]) => !only || label.toLowerCase() === only).map(([label, href]) => `<a class="dv-dl" href="${href}" download aria-label="Download ${label}">${DL}${label}</a>`).join('')
      + '<button type="button" class="dv-x" aria-label="Close">&times;</button></div>'
      + `<div class="dv-scroll">${d.html ? `<article class="dv-text dv-${key}"><p class="dv-loading">Loading...</p></article>` : `<div class="dv-pages">${pages}</div>`}</div>`
      + (!d.html && d.pages > 1 ? `<div class="dv-count">1 of ${d.pages}</div>` : '');
    if (d.html) fetch(d.html).then(r => r.text()).then(t => { const a = el && el.querySelector('.dv-text'); if (a) a.innerHTML = t; });
    document.body.append(back, el);
    document.documentElement.classList.add('dp-lock');
    back.addEventListener('click', () => close());
    el.querySelector('.dv-x').addEventListener('click', () => close());
    const count = el.querySelector('.dv-count');
    if (count && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) count.textContent = `${[...el.querySelectorAll('.dv-page')].indexOf(e.target) + 1} of ${d.pages}`;
      }), { root: el.querySelector('.dv-scroll'), threshold: 0.5 });
      el.querySelectorAll('.dv-page').forEach(p => io.observe(p));
    }
    if (push) { history.pushState({ kdoDoc: key }, ''); ours = true; }
    requestAnimationFrame(() => requestAnimationFrame(() => { el && el.classList.add('open'); back && back.classList.add('open'); }));
    el.querySelector('.dv-x').focus({ preventScroll: true });
  }

  function close(fromHistory = false) {
    if (!el) return;
    const e = el, b = back;
    el = back = null;
    e.classList.remove('open');
    b.classList.remove('open');
    document.documentElement.classList.remove('dp-lock');
    setTimeout(() => { e.remove(); b.remove(); }, 340);
    if (ours && !fromHistory) { ours = false; history.back(); }
    ours = false;
  }

  // Phones: the back button closes the viewer instead of leaving the page.
  window.addEventListener('popstate', () => { if (el) close(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && el) close(); });
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-doc]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    open(a.dataset.doc, true, a.dataset.dl || '');
  });
  if (/^#view=\w+$/.test(location.hash)) open(location.hash.slice(6), false);
  return { open, close, phone };
})();
