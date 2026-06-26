import React, { useEffect, useState } from 'react';

const api = (path, opts = {}) =>
  fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const saveToken = (t, u) => {
    localStorage.setItem('token', t || '');
    setToken(t || '');
    setUser(u || null);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>🛒 Acme Demo Shop</h1>
        <div data-testid="auth-state">
          {user ? (
            <>signed in as <b>{user.username}</b> ({user.role}){' '}
              <button onClick={() => saveToken('', null)}>log out</button></>
          ) : (
            <i>not signed in</i>
          )}
        </div>
      </header>
      <p style={{ color: '#a00' }}>⚠️ Intentionally vulnerable demo — authorized testing only.</p>

      <LoginPanel onLogin={saveToken} />
      <SearchPanel />
      <CommentsPanel />
      <OrdersPanel token={token} />
      <AdminPanel token={token} />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, margin: '16px 0' }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

function LoginPanel({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const res = await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (res.ok) onLogin(data.token, data.user);
    else setErr(data.error || 'login failed');
  };
  return (
    <Section title="Sign in">
      <form onSubmit={submit} data-testid="login-form" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input data-testid="login-username" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input data-testid="login-password" placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Log in</button>
        {err && <span data-testid="login-error" style={{ color: 'crimson' }}>{err}</span>}
      </form>
    </Section>
  );
}

function SearchPanel() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [results, setResults] = useState([]);
  const run = async (e) => {
    e.preventDefault();
    const res = await api(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSubmitted(q);
    setResults(data.results || []);
  };
  return (
    <Section title="Product search">
      <form onSubmit={run} style={{ display: 'flex', gap: 8 }}>
        <input data-testid="search-input" placeholder="search products" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit">Search</button>
      </form>
      {/* Reflected XSS (client): query echoed via dangerouslySetInnerHTML — event-handler payloads execute */}
      {submitted !== '' && (
        <h3 data-testid="search-heading" dangerouslySetInnerHTML={{ __html: `Results for: ${submitted}` }} />
      )}
      <ul>
        {results.map((r) => (
          <li key={r.id}>{r.name} — ${r.price} <small>({r.category})</small></li>
        ))}
      </ul>
    </Section>
  );
}

function CommentsPanel() {
  const [comments, setComments] = useState([]);
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');
  const load = async () => setComments(await (await api('/api/comments')).json());
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    await api('/api/comments', { method: 'POST', body: JSON.stringify({ author, body }) });
    setAuthor('');
    setBody('');
    load();
  };
  return (
    <Section title="Product reviews">
      <form onSubmit={add} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="your name" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <input data-testid="comment-body" placeholder="write a review" value={body} onChange={(e) => setBody(e.target.value)} style={{ flex: 1 }} />
        <button type="submit">Post</button>
      </form>
      <ul data-testid="comments-list">
        {comments.map((c) => (
          <li key={c.id}>
            <b>{c.author}</b>:{' '}
            {/* Stored XSS: comment body rendered unescaped */}
            <span dangerouslySetInnerHTML={{ __html: c.body }} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function OrdersPanel({ token }) {
  const [id, setId] = useState('1002');
  const [out, setOut] = useState(null);
  const lookup = async (e) => {
    e.preventDefault();
    const res = await api(`/api/orders/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${token}` } });
    setOut(await res.json());
  };
  return (
    <Section title="Order lookup">
      <form onSubmit={lookup} style={{ display: 'flex', gap: 8 }}>
        <input data-testid="order-id" placeholder="order id" value={id} onChange={(e) => setId(e.target.value)} />
        <button type="submit" disabled={!token}>Look up</button>
      </form>
      {!token && <p><i>sign in first</i></p>}
      {out && (
        <pre data-testid="order-result" style={{ background: '#f6f6f6', padding: 8, overflowX: 'auto' }}>
          {JSON.stringify(out, null, 2)}
        </pre>
      )}
    </Section>
  );
}

function AdminPanel({ token }) {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState('');
  const load = async () => {
    setErr('');
    const res = await api('/api/admin/users', { headers: { authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setUsers(data);
    else { setUsers(null); setErr(data.error || 'forbidden'); }
  };
  return (
    <Section title="Admin · users">
      <button onClick={load} disabled={!token}>Load users</button>
      {err && <span style={{ color: 'crimson' }}> {err}</span>}
      {users && (
        <table data-testid="admin-users" style={{ marginTop: 8, borderCollapse: 'collapse' }}>
          <thead><tr><th>id</th><th>username</th><th>role</th><th>email</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}><td>{u.id}</td><td>{u.username}</td><td>{u.role}</td><td>{u.email}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
