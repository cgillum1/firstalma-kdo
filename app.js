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
      churchHome: v('churchHome'), why: v('why'), ref1: v('ref1'), ref2: v('ref2'),
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
