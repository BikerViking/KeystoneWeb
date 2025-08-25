# Keystone Notary — God‑Tier Site (Vite + React + TS + Tailwind + GSAP + Lenis)

Apple‑level single page experience with scroll‑driven, reversible animations, booking, contact form, and OpenAI chat.

## Quick start (two terminals)
### 1) API (for email + OpenAI chat)
```
cd server
cp .env.example .env    # fill SMTP + OPENAI_API_KEY
npm install
npm run dev
```
Runs at http://localhost:8787

### 2) Client
```
cd client
npm install
npm run dev
```
Vite dev server: http://localhost:5173 (proxying /api to :8787)

## Build for production
```
cd client && npm run build
```
Deploy `client/dist` to static hosting. Deploy `server/` to Node hosting and set env vars.

## Tech
- **React + TypeScript + Vite** for speed and DX
- **TailwindCSS** for design tokens and consistent theming (black/platinum/silver)
- **GSAP + ScrollTrigger** for god‑tier motion, **Lenis** for silky scrolling
- **Express** server for secure contact email + OpenAI chat proxy

## Branding
- Update copy, phone, email inside the sections (`src/modules/sections/*`).
- Replace `/client/public/assets` with your final logos/badges.

## Accessibility
- Reduced motion by the OS is respected via GSAP’s prefers‑reduced‑motion behavior; keep content legible without animations.


## Optional power-ups
- **reCAPTCHA v3**: set `VITE_RECAPTCHA_SITEKEY` in client env and `RECAPTCHA_SECRET` in server env.
- **Analytics**: Plausible script in `client/index.html` (replace `data-domain`).
- **Calendar invites**: ICS auto-attached on contact confirmation.
- **Travel fee estimator**: click on the map to compute distance & fee.


## Google Workspace Integrations
- **SMTP relay (recommended)**: use `smtp-relay.gmail.com` from Admin Console for highly deliverable emails.
- **Sheets logging**: every contact submission can append a row to your Google Sheet (`SHEETS_SPREADSHEET_ID` + `SHEETS_CONTACTS_RANGE`).
- **Calendar event creation**: if `CALENDAR_ID` is set, the server creates a Google Calendar event for the requested time.
- **Service account**: paste JSON into `GOOGLE_APPLICATION_CREDENTIALS_JSON` and enable domain-wide delegation for Sheets/Calendar scopes.


## Document Uploads (Infinity Edition)
- Client can upload PDFs (or multiple files) via the Contact form or the `/upload` page.
- Server uploads to **Google Drive** if `DRIVE_ROOT_FOLDER_ID` and service account JSON are configured.
- If not configured, files save to `server/uploads` (demo mode) and still work for local testing.
- Uploaded file links are appended to your **Contacts** Google Sheet and included in the **Calendar** event description.
