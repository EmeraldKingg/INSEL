// ---------- CONFIG ----------
// Point this at your deployed backend (see /server folder). Leave as-is for local testing
// against `node server.js` running on port 3000.
const API_BASE = window.INSEL_API_BASE || 'http://localhost:3000';

// ---------- MOBILE MENU ----------
const burger = document.getElementById('burgerBtn');
const menu = document.getElementById('mobileMenu');
if (burger && menu) {
  burger.addEventListener('click', () => menu.classList.toggle('open'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
}

// ---------- REVEAL ON SCROLL ----------
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
}

// ---------- CONTACT FORM -> BACKEND ----------
const form = document.getElementById('contactForm');
const note = document.getElementById('formNote');

if (form) {
  const submitBtn = form.querySelector('.submit-btn');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      service: form.service.value,
      message: form.message.value.trim(),
    };

    if (!payload.name || !payload.email) {
      note.textContent = 'Please add at least your name and email.';
      note.style.color = '#e0a53b';
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';
    note.style.color = '';
    note.textContent = '';

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        note.textContent = "Thanks — we've got your message and will be in touch within one business day.";
        form.reset();
      } else {
        note.textContent = data.error || 'Something went wrong sending that. Please call 057 611 1558 instead.';
        note.style.color = '#c0665a';
      }
    } catch (err) {
      note.textContent = "Couldn't reach the server. Please call 057 611 1558 or try again shortly.";
      note.style.color = '#c0665a';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}
