'use strict';

/**
 * Acme Demo Shop — INTENTIONALLY VULNERABLE app.
 * Penetron's pen-test fixture. Authorized testing only — never deploy to production.
 * Each planted vulnerability is tagged VULN-* and documented in ../VULNS.md.
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { db } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

// VULN-AUTH-2 (hardening): weak, hardcoded JWT secret. CWE-798.
const JWT_SECRET = 'penetron-demo-secret';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----- Insecure auth middleware -----
// VULN-AUTH-1: token signature is NOT verified (jwt.decode instead of jwt.verify).
// Any forged/unsigned token is accepted -> auth bypass + privilege escalation. CWE-287 / CWE-345.
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token) return res.status(401).json({ error: 'missing token' });
  const payload = jwt.decode(token); // <-- no signature verification
  if (!payload) return res.status(401).json({ error: 'invalid token' });
  req.user = payload;
  next();
}

// ===== Auth =====
// VULN-SQLI-1: string-concatenated SQL in login -> auth bypass via ' OR '1'='1. CWE-89.
app.post('/api/login', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  try {
    const user = db.prepare(sql).get();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    // VULN-INFO-1 (hardening): verbose SQL error leaked to client. CWE-209.
    res.status(500).json({ error: 'query failed', detail: err.message, sql });
  }
});

// ===== Search =====
// VULN-SQLI-2: string-concatenated LIKE query -> UNION-based injection. CWE-89.
app.get('/api/search', (req, res) => {
  const q = req.query.q || '';
  const sql = `SELECT id, name, category, price FROM products WHERE name LIKE '%${q}%'`;  // search: PR-trigger demo #2 (post-publish)
  try {
    const rows = db.prepare(sql).all();
    res.json({ query: q, results: rows });
  } catch (err) {
    res.status(500).json({ error: 'query failed', detail: err.message, sql });
  }
});

// ===== Reflected XSS (server-rendered) =====
// VULN-XSS-1: query param reflected unescaped into HTML. CWE-79.
app.get('/welcome', (req, res) => {
  const name = req.query.name || 'guest';
  res.set('Content-Type', 'text/html');
  res.send(`<!doctype html><html><head><title>Welcome</title></head>
<body><h1>Welcome, ${name}!</h1><p>Thanks for visiting the Acme demo shop.</p></body></html>`);
});

// ===== Comments (stored XSS sink is in the React client) =====
// Storage is parameterized (safe); VULN-XSS-2 is that the client renders body via
// dangerouslySetInnerHTML, so stored markup executes for any viewer. CWE-79.
app.get('/api/comments', (req, res) => {
  res.json(db.prepare('SELECT id, author, body, created_at FROM comments ORDER BY id DESC').all());
});
app.post('/api/comments', (req, res) => {
  const { author = 'anon', body = '' } = req.body || {};
  const info = db
    .prepare('INSERT INTO comments (author, body, created_at) VALUES (?, ?, ?)')
    .run(author, body, new Date().toISOString());
  res.json({ ok: true, id: Number(info.lastInsertRowid) });
});

// ===== Orders =====
// VULN-IDOR-1: no ownership check -> any authenticated user reads any order. CWE-639 / CWE-284.
app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  res.json(order);
});
// Legitimate "my orders" — used to obtain a valid low-priv session for the IDOR test.
app.get('/api/my/orders', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM orders WHERE user_id = ?').all(req.user.sub));
});

// ===== Admin =====
// Gated only by the broken authMiddleware -> a forged role:admin token grants access. CWE-287.
app.get('/api/admin/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  res.json(db.prepare('SELECT id, username, role, email FROM users').all());
});

// ===== SAFE CONTROL (true negative) =====
// Parameterized query + no reflection -> Penetron should attempt SQLi here and FAIL.
app.get('/api/products', (req, res) => {
  const category = req.query.category;
  const rows = category
    ? db.prepare('SELECT * FROM products WHERE category = ?').all(category)
    : db.prepare('SELECT * FROM products').all();
  res.json(rows);
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ===== Static React client (served if built) =====
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && req.path !== '/welcome') {
    return res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) {
        res
          .status(200)
          .send('Penetron target app API is running. Build the client with `npm run build:client`.');
      }
    });
  }
  next();
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Penetron target app listening on http://localhost:${PORT}`);
  });
}

module.exports = { app };
