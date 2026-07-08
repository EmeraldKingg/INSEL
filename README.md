# Insel Communications — Contact Form Backend

A small Node/Express API that powers the "Send message" form on the website.
It does two things for every submission:

1. Saves a backup copy to `server/data/submissions.json` (so nothing is ever lost, even if email fails).
2. Emails the enquiry to your team via SMTP.

## 1. Install

Requires Node.js 18+.

```bash
cd server
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Open `.env` and fill in:

- `ALLOWED_ORIGINS` — the domain(s) your website is served from (e.g. `https://inselgh.com`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — credentials for the mailbox that should send enquiry emails.
  - **Gmail**: enable 2-factor auth on the account, then create an "App Password" at
    myaccount.google.com/apppasswords — use that as `SMTP_PASS`, not the normal password.
  - Any other provider (Zoho, Outlook, SendGrid, Mailgun) works the same way — they all publish SMTP host/port details.
- `CONTACT_TO` — the inbox enquiries should land in (can be different from `SMTP_USER`).

If you skip SMTP setup, the server still runs and still saves every submission to
`data/submissions.json` — it just won't send an email until you add credentials.

## 3. Run locally

```bash
npm start
```

The API starts on `http://localhost:3000`. Check it's alive:

```bash
curl http://localhost:3000/health
```

The homepage's contact form (see `js/main.js`, `API_BASE`) points at
`http://localhost:3000` by default — perfect for testing on your own machine.

## 4. Point the website at your backend

In the deployed website, add this **before** the `<script src="js/main.js">` tag on every page,
setting it to wherever you deploy this backend:

```html
<script>window.INSEL_API_BASE = "https://api.inselgh.com";</script>
```

## 5. Deploy

Any Node host works. Two easy options:

**Render.com (free tier available)**
1. Push this `server/` folder to a GitHub repo.
2. Create a new "Web Service" on Render, point it at the repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Add the same variables from `.env` under Render's "Environment" tab.

**A VPS (e.g. DigitalOcean, Linode)**
```bash
git clone <your-repo>
cd server && npm install
npx pm2 start server.js --name insel-contact
pm2 save
```
Put Nginx or Caddy in front of it for HTTPS.

## Endpoints

| Method | Path            | Body                                              | Response                        |
|--------|-----------------|----------------------------------------------------|----------------------------------|
| GET    | `/health`       | —                                                  | `{ ok: true }`                   |
| POST   | `/api/contact`  | `{ name, email, phone, service, message }`         | `{ ok: true }` or `{ ok:false, error }` |

Basic protections included: input validation, a 5-requests-per-10-minutes-per-IP rate limit,
and CORS locked to the origins you list in `ALLOWED_ORIGINS`.

## Viewing saved submissions

Every enquiry (whether or not email sending succeeded) is appended to:

```
server/data/submissions.json
```

Treat this file as sensitive — it contains names, emails and phone numbers. Don't commit it to git
(it's already covered by the `.gitignore` below).
