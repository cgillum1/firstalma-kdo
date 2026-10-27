// Kids Day Out registration: one form per family, one sheet row per child.
(() => {
  const START = { y: 2027, m: 1, d: 7 };
  const THURSDAYS = 18, MONTHS = 5, ENROLL = 60, SIBLING = 0.9;
  const GROUPS = [
    { name: 'Babies', min: 6, max: 18, rate: 30 },
    { name: 'Toddlers', min: 18, max: 36, rate: 25 },
    { name: 'Preschool', min: 36, max: 66, rate: 25 }
  ];
  const form = document.getElementById('reg-form');
  const kidsEl = document.getElementById('kids');
  const tpl = document.getElementById('kid-tpl');
  const msg = document.getElementById('msg');
  const button = document.getElementById('submit-btn');
  const money = n => '$' + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0);

  function ageMonths(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    let months = (START.y - y) * 12 + (START.m - m);
    if (START.d < d) months -= 1;
    return months;
  }
  const groupFor = iso => {
    if (!iso) return null;
    const mo = ageMonths(iso);
    return GROUPS.find(g => mo >= g.min && mo < g.max) || { name: mo < 6 ? 'young' : 'old', rate: 0 };
  };

  function renderKids(n) {
    const cards = [...kidsEl.children];
    for (let i = cards.length; i < n; i++) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelectorAll('.potty input').forEach(r => { r.name = 'potty' + i; });
      node.querySelector('.potty').dataset.group = 'potty' + i;
      node.querySelectorAll('.special input').forEach(r => {
        r.name = 'special' + i;
        r.addEventListener('change', () => { node.querySelector('.special-more').hidden = r.value !== 'Yes' || !r.checked; node.querySelector('.special').classList.remove('invalid'); });
      });
      const last = kidsEl.querySelector('.k-last')?.value || document.getElementById('pLast').value;
      if (last) node.querySelector('.k-last').value = last;
      node.querySelector('.k-bday').addEventListener('change', e => { KDO.clearErr(e.target); update(); });
      node.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', () => KDO.clearErr(el)));
      kidsEl.appendChild(node);
      KDO.markRequired(node);
    }
    [...kidsEl.children].forEach((c, i) => { c.style.display = i < n ? '' : 'none'; c.querySelector('.kid-num').textContent = n > 1 ? `Child ${i + 1}` : 'Your child'; });
    update();
  }

  const count = () => Number(KDO.radio(form, 'kidCount') || 1);
  const activeCards = () => [...kidsEl.children].slice(0, count());

  // Until a birthday is entered, a child is counted at the $25 rate so the total is never $0.
  const EST_RATE = 25;
  function update() {
    let estimated = false;
    const kids = activeCards().map((c, i) => {
      const bday = c.querySelector('.k-bday').value;
      const g = groupFor(bday);
      const badge = c.querySelector('.kid-badge');
      const known = !!(g && g.rate);
      if (known) { badge.textContent = `${g.name} room, $${g.rate} per Thursday`; badge.style.display = 'inline-block'; }
      else badge.style.display = 'none';
      if (!known) estimated = true;
      return { name: c.querySelector('.k-first').value.trim() || (count() > 1 ? `Child ${i + 1}` : 'Your child'), rate: known ? g.rate : EST_RATE, group: known ? g.name : '', note: known ? '' : (bday ? 'Check the birthday' : 'No birthday yet') };
    });
    const priced = [...kids].sort((a, b) => b.rate - a.rate);
    let tuitionBase = 0, sibDiscount = 0, perThursday = 0;
    const lines = priced.map((k, i) => {
      const sem = k.rate * THURSDAYS;
      tuitionBase += sem;
      if (i > 0) sibDiscount += sem * (1 - SIBLING);
      perThursday += i > 0 ? k.rate * SIBLING : k.rate;
      const how = k.group ? `${k.group}: $${k.rate} x ${THURSDAYS} Thursdays` : `${k.note}, counted at $${k.rate}`;
      return `<div class="pc-kid${k.group ? '' : ' pc-est'}"><span>${escapeHtml(k.name)}<small>${how}</small></span><b>${money2(sem)}</b></div>`;
    });
    if (sibDiscount > 0) lines.push(`<div class="pc-kid pc-disc"><span>Sibling discount<small>10% off each additional child</small></span><b>-${money2(sibDiscount)}</b></div>`);
    const tuition = tuitionBase - sibDiscount, enroll = ENROLL * kids.length, total = tuition + enroll;
    lines.push(`<div class="pc-kid"><span>Tuition</span><b>${money2(tuition)}</b></div>`);
    lines.push(`<div class="pc-kid"><span>Enrollment<small>$60 x ${kids.length} ${kids.length > 1 ? 'kids' : 'child'}, covers registration and supplies</small></span><b>${money2(enroll)}</b></div>`);
    document.getElementById('price-lines').innerHTML = lines.join('');
    document.getElementById('pc-total').textContent = money2(total);
    document.getElementById('pc-total-label').textContent = estimated ? 'Estimated total (add birthdays)' : 'Total for the semester';
    document.getElementById('pc-weekly').textContent = `${money2(perThursday)} each Thursday. The first Thursday plus enrollment (${money2(perThursday + enroll)}) is due when your spot is confirmed.`;
    document.getElementById('pc-full').textContent = `${money2(tuition * 0.9)} tuition + ${money2(enroll)} enrollment = ${money2(tuition * 0.9 + enroll)}`;
    const bar = document.getElementById('price-bar-amt');
    if (bar) {
      if (bar.textContent && bar.textContent !== money2(total)) { bar.classList.remove('flash'); void bar.offsetWidth; bar.classList.add('flash'); }
      bar.textContent = money2(total);
      document.getElementById('price-bar-label').textContent = estimated ? 'Estimated semester total' : 'Semester total';
      document.getElementById('price-bar-week').textContent = `or ${money2(perThursday)} each Thursday`;
    }
  }

  function money2(n) {
    const whole = Math.abs(n - Math.round(n)) < 0.005;
    return '$' + (whole ? Math.round(n).toLocaleString() : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }

  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // On phones the cost sits at the end of the form, right above Submit, and a bottom bar tracks the total.
  const card = document.getElementById('price-card'), layout = card.parentElement, slot = document.getElementById('pc-slot');
  const mq = window.matchMedia('(max-width: 860px)');
  const place = () => (mq.matches ? slot : layout).appendChild(card);
  place();
  mq.addEventListener('change', place);
  const priceBar = document.querySelector('.price-bar');
  if (priceBar && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => priceBar.classList.toggle('away', e.isIntersecting), { threshold: 0.1 }).observe(card);
  }

  // Phones: tapping a birthday while the keyboard is up made the page jump. Close the keyboard first.
  const isTyping = el => !!(el && el.matches && el.matches('input:not([type=radio]):not([type=checkbox]):not([type=date]), textarea'));
  form.addEventListener('touchstart', e => {
    const dateInput = e.target.closest && e.target.closest('input[type=date]');
    if (dateInput && isTyping(document.activeElement)) document.activeElement.blur();
  }, { passive: true });
  // Hide the bottom cost bar while typing so it doesn't bounce with the keyboard.
  document.addEventListener('focusin', e => document.body.classList.toggle('typing', isTyping(e.target)));
  document.addEventListener('focusout', () => setTimeout(() => { if (!isTyping(document.activeElement)) document.body.classList.remove('typing'); }, 60));

  form.querySelectorAll('input[name=kidCount]').forEach(r => r.addEventListener('change', () => renderKids(count())));
  form.addEventListener('input', e => { if (e.target.classList.contains('k-first')) update(); });
  renderKids(count());

  // Second parent, emergency contacts, and approved pickups.
  const p2 = document.getElementById('p2'), addP2 = document.getElementById('add-p2');
  addP2.addEventListener('click', () => { p2.hidden = false; addP2.hidden = true; document.getElementById('p2First').focus(); });
  document.getElementById('rm-p2').addEventListener('click', () => { p2.hidden = true; addP2.hidden = false; });
  KDO.markRequired(p2);

  const personTpl = document.getElementById('person-tpl');
  function addPerson(listId, max, title, canPick) {
    const list = document.getElementById(listId);
    const node = personTpl.content.firstElementChild.cloneNode(true);
    if (!canPick) node.querySelector('.p-pick-wrap').remove();
    list.appendChild(node);
    KDO.markRequired(node); KDO.wirePhones(node);
    node.querySelectorAll('input').forEach(el => el.addEventListener('input', () => KDO.clearErr(el)));
    const relabel = () => {
      [...list.children].forEach((c, i) => {
        c.querySelector('.p-title').textContent = `${title} ${i + 1}`;
        c.querySelector('.rm-btn').style.display = (listId === 'contacts' && i === 0) ? 'none' : '';
      });
      document.getElementById(listId === 'contacts' ? 'add-contact' : 'add-pickup').hidden = list.children.length >= max;
    };
    node.querySelector('.rm-btn').addEventListener('click', () => { node.remove(); relabel(); });
    relabel();
    return node;
  }
  addPerson('contacts', 2, 'Emergency contact', true);
  document.getElementById('add-contact').addEventListener('click', () => addPerson('contacts', 2, 'Emergency contact', true).querySelector('.p-first').focus());
  document.getElementById('add-pickup').addEventListener('click', () => addPerson('pickups', 4, 'Approved pickup', false).querySelector('.p-first').focus());
  const people = id => [...document.getElementById(id).children].map(c => ({
    name: `${c.querySelector('.p-first').value.trim()} ${c.querySelector('.p-last').value.trim()}`,
    rel: c.querySelector('.p-rel').value.trim(), phone: c.querySelector('.p-phone').value.trim(),
    pick: c.querySelector('.p-pick') ? (c.querySelector('.p-pick').checked ? 'Yes' : 'No') : ''
  }));

  function validateKids() {
    let first = null;
    activeCards().forEach(c => {
      const b = c.querySelector('.k-bday');
      if (b.value) {
        const g = groupFor(b.value);
        if (!g.rate) {
          KDO.setErr(b, g.name === 'young' ? 'KDO starts at 6 months old on January 7, 2027' : 'KDO is for kids up to Pre-K');
          first = first || b;
        }
      }
    });
    return first;
  }

  const posted = new Set();
  let sending = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    msg.className = 'msg'; msg.textContent = '';
    const bad = KDO.validate(form) || validateKids();
    if (bad) { msg.className = 'msg err'; msg.textContent = 'Please fix the highlighted fields.'; return; }

    const v = id => document.getElementById(id).value.trim();
    const kids = activeCards().map(c => ({
      first: c.querySelector('.k-first').value.trim(), last: c.querySelector('.k-last').value.trim(),
      bday: c.querySelector('.k-bday').value, notes: c.querySelector('.k-notes').value.trim(),
      potty: c.querySelector('.potty input:checked')?.value || '',
      special: c.querySelector('.special input:checked')?.value === 'Yes' ? 'Yes: ' + c.querySelector('.k-special').value.trim() : 'No'
    }));
    const c = people('contacts'), e1 = c[0] || {}, e2 = c[1] || {};
    const hasP2 = !p2.hidden;
    const shared = {
      form: 'kid', website: v('website'), familyId: 'F' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      parentFirst: v('pFirst'), parentLast: v('pLast'), relation: KDO.radio(form, 'relation'),
      phone: v('pPhone'), email: v('pEmail'), address: v('address'),
      p2First: hasP2 ? v('p2First') : '', p2Last: hasP2 ? v('p2Last') : '', p2Relation: hasP2 ? KDO.radio(form, 'p2Relation') : '',
      p2Phone: hasP2 ? v('p2Phone') : '', p2Email: hasP2 ? v('p2Email') : '',
      e1Name: e1.name || '', e1Relation: e1.rel || '', e1Phone: e1.phone || '', e1Pickup: e1.pick || '',
      e2Name: e2.name || '', e2Relation: e2.rel || '', e2Phone: e2.phone || '', e2Pickup: e2.pick || '',
      pickups: people('pickups').map(p => `${p.name}${p.rel ? ' (' + p.rel + ')' : ''}, ${p.phone}`).join('; '),
      churchHome: KDO.radio(form, 'church'), heardFrom: v('heard'),
      photoOk: KDO.radio(form, 'photos') === 'yes' ? 'Yes' : 'No', agree: 'Yes'
    };

    sending = true; button.disabled = true; button.textContent = 'Sending...';
    try {
      for (let i = 0; i < kids.length; i++) {
        if (posted.has(i)) continue;
        const k = kids[i];
        const others = kids.filter((_, j) => j !== i).map(o => `${o.first} ${o.last}`).join(', ');
        await KDO.post({
          ...shared, childFirst: k.first, childLast: k.last, birthday: k.bday, siblings: others,
          potty: k.potty, allergies: k.notes, specialNeeds: k.special
        });
        posted.add(i);
      }
      form.style.display = 'none';
      const names = kids.map(k => k.first);
      document.getElementById('thanks-text').textContent =
        `Thank you. We received ${names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names.slice(-1) : names[0]}. Spots are assigned in the order families register. Kim will contact you within a few days to confirm your spot and next steps.`;
      document.getElementById('thanks').style.display = 'block';
      document.getElementById('price-card').style.display = 'none';
      const bar = document.querySelector('.price-bar'); if (bar) bar.remove();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      KDO.confetti();
    } catch (err) {
      msg.className = 'msg err';
      msg.textContent = "That didn't go through. Check your connection and try again.";
      sending = false; button.disabled = false; button.textContent = 'Submit registration';
    }
  });
})();
