import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
// Redis is optional; dynamically import so tests can run without the module
let createRedisClient;
try {
  ({ createClient: createRedisClient } = await import('redis'));
} catch {
  createRedisClient = null;
  console.warn('redis module not found; continuing without Redis support');
}
// ---------- File Uploads -> Google Drive (or local demo) ----------
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const app = express();
// Configure CORS with an explicit origin whitelist and optional credentials
const CORS_WHITELIST = (process.env.CORS_WHITELIST || 'https://example.com').split(',');
const CORS_ALLOW_CREDENTIALS = process.env.CORS_ALLOW_CREDENTIALS === 'true';
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];
const upload = multer({
  dest: path.resolve(process.cwd(), 'tmp'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
const DRIVE_ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID;

async function ensureDriveClient(){
  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!creds) return null;
  try{
    const data = JSON.parse(creds);
    const scopes = ['https://www.googleapis.com/auth/drive.file'];
    const auth = new google.auth.JWT(data.client_email, undefined, data.private_key, scopes);
    const drive = google.drive({ version: 'v3', auth });
    return drive;
  }catch(e){ console.error('Drive client error', e); return null; }
}

async function driveCreateFolder(drive, name, parentId){
  const res = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId? [parentId] : [] },
    fields: 'id, name'
  });
  return res.data;
}

async function driveUploadFile(drive, filePath, fileName, parentId){
  const mime = 'application/pdf'; // good default; Drive sniffs real type
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: parentId ? [parentId] : [] },
    media: { mimeType: mime, body: fs.createReadStream(filePath) },
    fields: 'id, name, webViewLink, webContentLink'
  });
  // make sure we can at least view in your org (private by default)
  return res.data;
}

app.post('/api/upload', (req, res) => {
  upload.array('files', 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      const clientName = (req.body?.name || 'Unknown').toString().replace(/[^a-z0-9 _-]/gi,' ').trim() || 'Unknown';
      const dateSlug = new Date().toISOString().slice(0,10);
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error:'No files' });

      // DEMO fallback (no Drive folder configured or no credentials)
      const drive = await ensureDriveClient();
      if (!drive || !DRIVE_ROOT_FOLDER_ID){
        const localDir = path.resolve(process.cwd(), 'uploads', `${dateSlug}_${clientName.replace(/\s+/g,'')}`);
        fs.mkdirSync(localDir, { recursive: true });
        const out = [];
        for (const f of files){
          const dest = path.join(localDir, f.originalname || f.filename);
          fs.renameSync(f.path, dest);
          out.push({ mode:'local', path: dest, name: f.originalname });
        }
        return res.json({ ok:true, target:'local', items: out });
      }

      // DRIVE mode
      const parent = await driveCreateFolder(drive, `${dateSlug}_${clientName}`, DRIVE_ROOT_FOLDER_ID);
      const uploaded = [];
      for (const f of files){
        const up = await driveUploadFile(drive, f.path, f.originalname || f.filename, parent.id);
        uploaded.push({ id: up.id, name: up.name, webViewLink: up.webViewLink, webContentLink: up.webContentLink, parent: parent.id });
        fs.unlinkSync(f.path);
      }
      return res.json({ ok:true, target:'drive', folderId: parent.id, items: uploaded });
    } catch(e){
      console.error(e);
      return res.status(500).json({ error:'upload failed' });
    }
  });
});

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || CORS_WHITELIST.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: CORS_ALLOW_CREDENTIALS,
}));
app.use(express.json());
app.use(morgan('tiny'));
app.use(cookieParser());

// DEMO / ZERO-CONFIG MODE:
// - If SMTP isn't set, log emails to console and still return success.
// - If OPENAI_API_KEY is missing, return a helpful canned response.
const ZERO_CONFIG = !process.env.SMTP_HOST || !process.env.OPENAI_API_KEY;


const limiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use('/api/', limiter);

// --- Admin magic-link auth & CMS storage ---
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_TO || 'owner@example.com';
const ADMIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const REDIS_URL = process.env.REDIS_URL;
let redis = null;
if (REDIS_URL && createRedisClient) {
  try {
    redis = createRedisClient({ url: REDIS_URL });
    redis.on('error', e => console.error('Redis error', e));
    await redis.connect();
  } catch (e) {
    console.error('Redis connect failed', e);
    redis = null;
  }
} else if (REDIS_URL) {
  console.warn('REDIS_URL provided but redis module is unavailable');
}
const memory = { tokens: new Map(), sessions: new Map() };

function pruneMemory(){
  const now = Date.now();
  for (const [k,v] of memory.tokens) if (v.exp < now) memory.tokens.delete(k);
  for (const [k,v] of memory.sessions) if (v.exp < now) memory.sessions.delete(k);
}
if (!redis) setInterval(pruneMemory, 60 * 1000).unref();

async function issueToken(email){
  const token = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
  if (redis){
    await redis.set(`admintoken:${token}`, email, { EX: Math.floor(ADMIN_TOKEN_TTL_MS/1000) });
  } else {
    const exp = Date.now() + ADMIN_TOKEN_TTL_MS;
    memory.tokens.set(token, { email, exp });
  }
  return token;
}
async function setSession(res, email){
  const id = Math.random().toString(36).slice(2);
  if (redis){
    await redis.set(`adminsession:${id}`, email, { EX: Math.floor(ADMIN_SESSION_TTL_MS/1000) });
  } else {
    const exp = Date.now() + ADMIN_SESSION_TTL_MS;
    memory.sessions.set(id, { email, exp });
  }
  res.cookie('ks_admin', id, { httpOnly: true, sameSite: 'lax', maxAge: ADMIN_SESSION_TTL_MS });
}
async function requireAdmin(req,res,next){
  const sid = req.cookies?.ks_admin;
  let ok = false;
  if (sid){
    if (redis){
      const email = await redis.get(`adminsession:${sid}`);
      ok = !!email;
    } else {
      const s = memory.sessions.get(sid);
      ok = !!s && s.exp >= Date.now();
    }
  }
  if (!ok) return res.status(401).json({ error:'unauthorized' });
  next();
}

// CMS storage files
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const FILE_TESTIMONIALS = path.join(DATA_DIR, 'testimonials.json');
const FILE_SERVICES = path.join(DATA_DIR, 'services.json');

function readJSON(file, fallback){ try{ return JSON.parse(fs.readFileSync(file,'utf8')); }catch{ return fallback; } }
function writeJSON(file, obj){ fs.writeFileSync(file, JSON.stringify(obj, null, 2)); }

// Admin endpoints
app.post('/api/admin/request-magic-link', async (req,res)=>{
  const email = (req.body?.email || '').toString();
  if (!email) return res.status(400).json({ error:'email required' });
  const token = await issueToken(email);
  const url = (process.env.ADMIN_URL_BASE || 'http://localhost:5173') + '/admin?token=' + token;
  if (process.env.SENDGRID_API_KEY){
    try{
      await sgMail.send({ to: email, from: (process.env.EMAIL_FROM || 'no-reply@example.com'), subject:'Your Keystone admin link', text:`Click to log in: ${url}` });
    }catch(e){ console.error('Send email failed', e); }
  } else if (transporter){
    try{ await transporter.sendMail({ to: email, from: (process.env.EMAIL_FROM || 'no-reply@example.com'), subject:'Your Keystone admin link', text:`Click to log in: ${url}` }); }catch(e){ console.error(e) }
  } else {
    console.log('[DEMO] Admin magic link:', url);
  }
  res.json({ ok:true });
});
app.post('/api/admin/login', async (req,res)=>{
  const token = (req.body?.token || '').toString();
  let email = null;
  if (redis){
    email = await redis.get(`admintoken:${token}`);
    if (email) await redis.del(`admintoken:${token}`);
  } else {
    const record = memory.tokens.get(token);
    if (record && record.exp >= Date.now()){
      email = record.email;
      memory.tokens.delete(token);
    }
  }
  if (!email) return res.status(400).json({ error:'invalid token' });
  await setSession(res, email);
  res.json({ ok:true });
});
app.post('/api/admin/logout', requireAdmin, async (req,res)=>{
  const sid = req.cookies?.ks_admin;
  if (sid){
    if (redis) await redis.del(`adminsession:${sid}`);
    else memory.sessions.delete(sid);
  }
  res.clearCookie('ks_admin');
  res.json({ ok:true });
});

// Editable CMS endpoints
app.get('/api/admin/cms/export', requireAdmin, (req,res)=>{
  res.json({
    testimonials: readJSON(FILE_TESTIMONIALS, []),
    services: readJSON(FILE_SERVICES, [])
  });
});
app.post('/api/admin/cms/import', requireAdmin, (req,res)=>{
  const { testimonials, services } = req.body || {};
  if (Array.isArray(testimonials)) writeJSON(FILE_TESTIMONIALS, testimonials);
  if (Array.isArray(services)) writeJSON(FILE_SERVICES, services);
  res.json({ ok:true });
});

// Use stored CMS if present
app.get('/api/cms/testimonials', async (req, res, next)=>{
  const local = readJSON(FILE_TESTIMONIALS, null);
  if (local) return res.json({ source:'local-file', data: local });
  next();
});
app.get('/api/cms/services', async (req, res, next)=>{
  const local = readJSON(FILE_SERVICES, null);
  if (local) return res.json({ source:'local-file', data: local });
  next();
});

// --- Optional providers ---
import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_TEMPLATE_OWNER = process.env.SENDGRID_TEMPLATE_OWNER;
const SENDGRID_TEMPLATE_CLIENT = process.env.SENDGRID_TEMPLATE_CLIENT;
if (SENDGRID_API_KEY) sgMail.setApiKey(SENDGRID_API_KEY);

// Suspicious submissions log (reCAPTCHA low score)
const suspicious = [];
function logSuspicious(entry){ suspicious.push({ ...entry, at: new Date().toISOString() }); }
app.get('/api/admin/suspicious', (req,res)=> res.json({ count: suspicious.length, items: suspicious.slice(-100) }));

// Google Sheets client (if configured)
function getSheetsClient(){
  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!creds) return null;
  try{
    const data = JSON.parse(creds);
    const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    const auth = new google.auth.JWT(data.client_email, undefined, data.private_key, scopes);
    return google.sheets({ version: 'v4', auth });
  }catch(e){ console.error('Sheets JSON parse error', e); return null; }
}

// CMS: testimonials & services from Sheets or fallback JSON
app.get('/api/cms/testimonials', async (req, res)=>{
  try{
    const sheets = getSheetsClient();
    if (sheets && process.env.SHEETS_SPREADSHEET_ID){
      const r = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.SHEETS_SPREADSHEET_ID, range: process.env.SHEETS_TESTIMONIALS_RANGE || 'Testimonials!A:B' });
      const rows = r.data.values?.slice(1) || []; // skip header
      const data = rows.map(r => ({ quote: r[0], author: r[1] }));
      return res.json({ source:'sheets', data });
    }
  }catch(e){ console.error(e); }
  // fallback to local demo data
  return res.json({ source:'local', data: [
    { quote:'On time, professional, and kind. Got our refinance done flawlessly.', author:'J. Ramirez' },
    { quote:'Showed up after hours at the hospital and handled everything smoothly.', author:'K. Patel' },
    { quote:'As a title office, we need perfection. They delivered.', author:'J. Li, Escrow Officer' },
    { quote:'Fast response, clear communication, zero errors.', author:'M. O’Connor' }
  ]});
});

app.get('/api/cms/services', async (req, res)=>{
  try{
    const sheets = getSheetsClient();
    if (sheets && process.env.SHEETS_SPREADSHEET_ID){
      const r = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.SHEETS_SPREADSHEET_ID, range: process.env.SHEETS_SERVICES_RANGE || 'Services!A:B' });
      const rows = r.data.values?.slice(1) || [];
      const data = rows.map(r => ({ title: r[0], body: r[1] }));
      return res.json({ source:'sheets', data });
    }
  }catch(e){ console.error(e); }
  return res.json({ source:'local', data: [
    { title:'Loan Signings', body:'Purchase, refinance, HELOC, reverse—error‑free, lender‑friendly packages.'},
    { title:'General Notary Work', body:'POAs, affidavits, deeds, titles, I‑9s, and more—mobile to you.'},
    { title:'After‑Hours & Rush', body:'Evenings/weekends on request with punctual arrival windows.'},
    { title:'Business On‑Site', body:'Title, escrow, law offices, hospitals, senior communities—white‑glove service.'}
  ]});
});

// Geocode (demo or provider-backed)
app.get('/api/geocode', async (req,res)=>{
  const q = (req.query.q || '').toString();
  if (!q) return res.status(400).json({ error:'Missing q' });
  // Demo mode: return a plausible point near Hellertown
  if (!process.env.GEOCODE_PROVIDER){
    return res.json({ ok:true, lat: 40.5795 + (Math.random()-0.5)*0.1, lon: -75.3407 + (Math.random()-0.5)*0.1, label: q + ' (demo)' });
  }
  try{
    if (process.env.GEOCODE_PROVIDER === 'nominatim'){
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q), { headers:{ 'User-Agent':'KeystoneNotary/1.0' } })
      const j = await r.json(); if (!j.length) return res.status(404).json({ error:'not found' });
      return res.json({ ok:true, lat: Number(j[0].lat), lon: Number(j[0].lon), label: j[0].display_name });
    }
    // Google Geocoding
    if (process.env.GEOCODE_PROVIDER === 'google' && process.env.GEOCODE_API_KEY){
      const r = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address='+encodeURIComponent(q)+'&key='+process.env.GEOCODE_API_KEY)
      const j = await r.json(); if (!j.results?.length) return res.status(404).json({ error:'not found' });
      const loc = j.results[0].geometry.location;
      return res.json({ ok:true, lat: loc.lat, lon: loc.lng, label: j.results[0].formatted_address });
    }
    return res.status(500).json({ error:'Unsupported provider' });
  }catch(e){ console.error(e); return res.status(500).json({ error:'geocode failed' }); }
});

// Route ETA (demo or provider-backed)
app.get('/api/route', async (req,res)=>{
  const lat = Number(req.query.lat); const lon = Number(req.query.lon);
  if (!lat || !lon) return res.status(400).json({ error:'Missing lat/lon' });
  // Demo mode: haversine w/ avg 35mph
  if (!process.env.ROUTING_PROVIDER){
    const R = 3958.8;
    function toRad(x){ return x*Math.PI/180; }
    const a1 = 40.5795, b1 = -75.3407;
    const dLat = toRad(lat - a1), dLon = toRad(lon - b1);
    const h = Math.sin(dLat/2)**2 + Math.cos(toRad(a1))*Math.cos(toRad(lat))*Math.sin(dLon/2)**2;
    const miles = 2*R*Math.asin(Math.sqrt(h));
    const minutes = Math.round((miles / 35) * 60);
    return res.json({ ok:true, miles, minutes });
  }
  // With OSRM/Google would go here
  return res.status(501).json({ error:'routing provider not configured' });
});


let transporter = null;
if (process.env.EMAIL_TRANSPORT === 'smtp') {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function buildICS(summary, description) {
  const dt = new Date();
  const dtStart = new Date(dt.getTime() + 60*60*1000); // default start in 1h
  const dtEnd = new Date(dtStart.getTime() + 60*60*1000); // 1h duration
  function fmt(d){ return d.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z' }
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Keystone Notary Group//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:keystone-'+ Date.now() +'@keystone',
    'DTSTAMP:'+ fmt(new Date()),
    'DTSTART:'+ fmt(dtStart),
    'DTEND:'+ fmt(dtEnd),
    'SUMMARY:'+ summary,
    'DESCRIPTION:'+ description.replace(/\n/g,'\\n'),
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, service, message, company, recaptcha, address, preferredDate, preferredTime, uploads } = req.body || {};
  if (company) return res.status(200).json({ ok: true }); // honeypot triggered; pretend success
  // reCAPTCHA check when secret is set
  if (RECAPTCHA_SECRET) {
    try {
      const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST', headers: { 'Content-Type':'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: recaptcha || '' })
      });
      const json = await r.json();
      if (!json.success || (json.score && json.score < 0.5)) { logSuspicious({ name, email, score: json.score }); return res.status(200).json({ ok: true }); }
    } catch(err){ console.error(err); return res.status(400).send('Recaptcha error'); }
  }
  if (!name || !email || !message) return res.status(400).send('Missing required fields');

  const text = `New contact form submission:
Name: ${name}
Email: ${email}
Phone: ${phone || 'n/a'}
Service: ${service || 'n/a'}\nAddress: ${address || 'n/a'}\nPreferred: ${preferredDate || '—'} ${preferredTime || ''}

Message:
${message}
`;
  try {
    // Append to Google Sheet (contact log)
    try {
      const sheets = getSheetsClient();
      if (sheets && process.env.SHEETS_SPREADSHEET_ID && (process.env.SHEETS_CONTACTS_RANGE || process.env.SHEETS_TESTIMONIALS_RANGE)) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.SHEETS_SPREADSHEET_ID,
          range: process.env.SHEETS_CONTACTS_RANGE || 'Contacts!A:I',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[
            new Date().toISOString(), name, email, phone || '', service || '', message || '', address || '', preferredDate || '', preferredTime || ''
          ]] }
        });
      }
    } catch(e) { console.error('Sheets append error', e); }
    // Create Calendar event if possible
    await createCalendarEvent({ name, email, phone, service, message, address, preferredDate, preferredTime, uploads });

    const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:#0b0b0d;color:#f2f2f2;padding:24px">
    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#121217;border:1px solid rgba(255,255,255,.08);border-radius:12px">
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 8px;font-size:22px;color:#E5E4E2">We received your message</h1>
        <p style="margin:0 0 16px;color:#a1a1a1">Thanks for reaching out to Keystone Notary Group, LLC. We'll respond shortly.</p>
        <div style="padding:12px 16px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#0f1013">
          <p style="margin:0 0 6px"><strong>Name:</strong> ${name}</p>
          <p style="margin:0 0 6px"><strong>Email:</strong> ${email}</p>
          <p style="margin:0 0 6px"><strong>Phone:</strong> ${phone || 'n/a'}</p>
          <p style="margin:0"><strong>Service:</strong> ${service || 'n/a'}</p>
        </div>
        <p style="margin:16px 0 8px"><strong>Your message:</strong></p>
        <pre style="white-space:pre-wrap;background:#0b0b0d;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:12px">${message}</pre>
        <p style="margin:16px 0;color:#a1a1a1">Call us at <a href="tel:+12673099000" style="color:#E5E4E2;text-decoration:none">(267) 309‑9000</a> or reply to this email.</p>
      </td></tr>
      <tr><td style="padding:16px;border-top:1px solid rgba(255,255,255,.08);text-align:center;color:#a1a1a1">© Keystone Notary Group, LLC · Hellertown, PA</td></tr>
    </table>
  </div>`;

    if (SENDGRID_API_KEY && SENDGRID_TEMPLATE_OWNER && SENDGRID_TEMPLATE_CLIENT) {
      try{
        await sgMail.send({ to: process.env.EMAIL_TO || 'owner@example.com', from: (process.env.EMAIL_FROM || 'no-reply@example.com'), templateId: SENDGRID_TEMPLATE_OWNER, dynamicTemplateData: { name, email, phone, service, message } });
        if (email) await sgMail.send({ to: email, from: (process.env.EMAIL_FROM || 'no-reply@example.com'), templateId: SENDGRID_TEMPLATE_CLIENT, dynamicTemplateData: { name, service } });
      }catch(err){ console.error('SendGrid error', err); }
    } else if (transporter) {
      const icalEvent = buildICS('Prospective Notary Appointment', `${name} – ${service || 'General'}\nPhone: ${phone || 'n/a'}\nEmail: ${email}`);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@example.com',
        to: process.env.EMAIL_TO || 'owner@example.com',
        subject: 'Keystone Notary — Contact form',
        text,
        icalEvent: { content: icalEvent }
      });
    } else {
      console.log('[DEMO] Email to owner would be sent with:\n', text);
    }
    if (transporter && email) {
      const icalEvent = buildICS('Prospective Notary Appointment', `${name} – ${service || 'General'}\nPhone: ${phone || 'n/a'}\nEmail: ${email}`);
      await transporter.sendMail({ from: process.env.EMAIL_FROM || 'no-reply@example.com', to: email, subject: 'We received your message — Keystone Notary Group', html, icalEvent: { content: icalEvent } });
    } else if (email) {
      console.log('[DEMO] Confirmation email to', email, 'with HTML template.');
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to send');
  }
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
// Create Google Calendar event if configured
async function createCalendarEvent({ name, email, phone, service, message, address, preferredDate, preferredTime, uploads }){
  if (!process.env.CALENDAR_ID) return null;
  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!creds) return null;
  try{
    const data = JSON.parse(creds);
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    const auth = new google.auth.JWT(data.client_email, undefined, data.private_key, scopes);
    const calendar = google.calendar({ version: 'v3', auth });

    // Build start/end in America/New_York
    const tz = 'America/New_York';
    let start = new Date(Date.now() + 60*60*1000); // default 1h later
    if (preferredDate && preferredTime){
      start = new Date(`${preferredDate}T${preferredTime}:00`);
    }
    const end = new Date(start.getTime() + 60*60*1000);

    const safeUploads = Array.isArray(uploads)
      ? uploads.map(u => (u || '').toString().replace(/\r?\n/g, '').trim()).filter(Boolean)
      : [];
    const uploadsSection = safeUploads.length ? ('\n\nLoan Docs:\n' + safeUploads.join('\n')) : '';
    const event = {
      calendarId: process.env.CALENDAR_ID,
      requestBody: {
        summary: `Notary Request — ${name}`,
        location: address || 'TBD',
        description: `Service: ${service || 'General'}\nPhone: ${phone || 'n/a'}\nEmail: ${email}\nAddress: ${address || 'TBD'}\n\nMessage:\n${message}${uploadsSection}`,
        start: { dateTime: start.toISOString(), timeZone: tz },
        end: { dateTime: end.toISOString(), timeZone: tz },
        attendees: email ? [{ email }] : [],
        reminders: { useDefault: true }
      }
    };
    const resp = await calendar.events.insert(event);
    return resp.data;
  }catch(e){ console.error('Calendar error', e); return null; }
}


app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};
  try {

    if (!OPENAI_API_KEY) {
      return res.json({ reply: 'Hi! This is the Keystone Notary demo assistant. I can answer general questions about mobile notarization and booking. For specific documents or legal guidance, call (267) 309‑9000 or email info@keystonenotarygroup.com.' });
    }
    const userMsg = (message || '').toString().slice(0, 2000);

    const sys = `You are a friendly, concise support agent for Keystone Notary Group, LLC.
Location: Hellertown, PA. Services: mobile notary, NNA certified & insured signing agents.
Phone: (267) 309-9000. Email: info@keystonenotarygroup.com. Avoid legal advice; suggest contacting us for specifics.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userMsg }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const t = await response.text();
      return res.status(500).json({ error: 'Upstream error', detail: t.slice(0,500) });
    }
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || 'Sorry, no reply.';
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Chat failed' });
  }
});

const PORT = Number(process.env.PORT || 8787);
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

export default app;
