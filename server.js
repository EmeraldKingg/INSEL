require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- MIDDLEWARE ----------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
}));
app.use(express.json({ limit: '100kb' }));

// very small in-memory rate limiter: 5 requests / 10 min / IP
const hits = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const max = 5;
  const record = hits.get(ip) || { count: 0, start: now };

  if (now - record.start > windowMs) {
    record.count = 0;
    record.start = now;
  }
  record.count += 1;
  hits.set(ip, record);

  if (record.count > max) {
    return res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' });
  }
  next();
}

// ---------- STORAGE (JSON file backup of every submission) ----------
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

function saveSubmission(entry) {
  const all = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  all.push(entry);
  fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2));
}

// ---------- EMAIL ----------
function buildTransport() {
  // Works with any SMTP provider (Gmail app password, Zoho, SendGrid SMTP, etc.)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------- ROUTES ----------
app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/contact', rateLimit, async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ ok: false, error: 'Name and email are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }
    if (String(name).length > 200 || String(message || '').length > 5000) {
      return res.status(400).json({ ok: false, error: 'Submission is too long.' });
    }

    const entry = {
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone || '').trim(),
      service: String(service || '').trim(),
      message: String(message || '').trim(),
      receivedAt: new Date().toISOString(),
      ip: req.ip,
    };

    // 1. Always keep a local backup, even if email sending fails
    saveSubmission(entry);

    // 2. Try to email the team (skipped gracefully if SMTP isn't configured yet)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = buildTransport();
      await transporter.sendMail({
        from: `"Insel Website" <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_TO || process.env.SMTP_USER,
        replyTo: entry.email,
        subject: `New enquiry: ${entry.service || 'General'} — ${entry.name}`,
        text:
          `Name: ${entry.name}\n` +
          `Email: ${entry.email}\n` +
          `Phone: ${entry.phone}\n` +
          `Service: ${entry.service}\n\n` +
          `Message:\n${entry.message}`,
      });
    } else {
      console.warn('[contact] SMTP not configured — submission saved to file only.');
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[contact] error:', err.message);
    return res.status(500).json({ ok: false, error: 'Something went wrong on our end. Please call us directly.' });
  }
});

app.listen(PORT, () => {
  console.log(`Insel contact backend running on http://localhost:${PORT}`);
});
