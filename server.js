import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'codes.json');
const PORT      = process.env.PORT || 3001;

// Unambiguous alphanumeric: no 0/O/1/I/L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// ── IST helpers ────────────────────────────────────────────────
// IST = UTC + 5h 30m
function getISTDateString() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ── Persistent JSON store ───────────────────────────────────────
function defaultData() {
  return {
    lastReset:  getISTDateString(),
    maxCodes:   100,
    codes:      {},   // { [code]: { claimedAt: ts, used: false | ts } }
    totalCodes: 0,
    usedCodes:  0,
  };
}

function load() {
  if (!existsSync(DATA_FILE)) return defaultData();
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return defaultData();
  }
}

// Synchronous write — safe for single-process Node.js
function save() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// In-memory database (loaded once on startup, written on every mutation)
let db = load();

// ── Daily IST reset ─────────────────────────────────────────────
function maybeReset() {
  const today = getISTDateString();
  if (db.lastReset !== today) {
    db.codes      = {};
    db.totalCodes = 0;
    db.usedCodes  = 0;
    db.lastReset  = today;
    save();
    console.log(`[reset] Daily IST reset triggered — new day: ${today}`);
  }
}

// ── Code generation ─────────────────────────────────────────────
function makeCode() {
  const buf = randomBytes(4);
  return Array.from(buf).map(b => CHARS[b % CHARS.length]).join('');
}

// ── Express app ─────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Serve built React app in production (when dist/ exists)
if (existsSync(join(__dirname, 'dist'))) {
  app.use(express.static(join(__dirname, 'dist')));
}

// Check daily reset on every API call
app.use('/api', (_req, _res, next) => { maybeReset(); next(); });

// POST /api/claim — issue a new code
app.post('/api/claim', (_req, res) => {
  if (db.totalCodes >= db.maxCodes) {
    return res.status(403).json({ error: 'limit_reached' });
  }

  let code;
  let tries = 0;
  do {
    code = makeCode();
    if (++tries > 50) return res.status(500).json({ error: 'generation_failed' });
  } while (db.codes[code]);

  db.codes[code] = { claimedAt: Date.now(), used: false };
  db.totalCodes += 1;
  save();

  return res.json({ code });
});

// POST /api/validate — validate + mark as used
app.post('/api/validate', (req, res) => {
  const raw = (req.body?.code ?? '').toUpperCase().trim().slice(0, 4);
  if (!/^[A-Z0-9]{4}$/.test(raw)) return res.json({ status: 'invalid' });

  const entry = db.codes[raw];
  if (!entry)      return res.json({ status: 'invalid' });
  if (entry.used)  return res.json({ status: 'used', usedAt: entry.used });

  db.codes[raw] = { ...entry, used: Date.now() };
  db.usedCodes += 1;
  save();

  return res.json({ status: 'valid' });
});

// GET /api/settings — stats + config
app.get('/api/settings', (_req, res) => {
  maybeReset();
  res.json({
    maxCodes:   db.maxCodes,
    totalCodes: db.totalCodes,
    usedCodes:  db.usedCodes,
    lastReset:  db.lastReset,
  });
});

// POST /api/settings — update max codes
app.post('/api/settings', (req, res) => {
  const val = parseInt(req.body?.maxCodes);
  if (isNaN(val) || val < 1 || val > 99999) {
    return res.status(400).json({ error: 'invalid_value' });
  }
  db.maxCodes = val;
  save();
  res.json({ success: true, maxCodes: val });
});

// SPA fallback (production) — regex form required for path-to-regexp v8+
if (existsSync(join(__dirname, 'dist'))) {
  app.get(/(.*)/, (_req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Corner Walk server → http://localhost:${PORT}`);
  console.log(`Staff portal       → http://localhost:${PORT}/staff`);
  console.log(`Current IST date   : ${getISTDateString()}`);
});
