'use strict';

/**
 * In-memory SQLite (Node built-in `node:sqlite`) — no native build required.
 * Re-seeded fresh on every start, so the demo is deterministic.
 */

// Suppress the cosmetic "SQLite is an experimental feature" warning (must patch before require).
const _emitWarning = process.emitWarning;
process.emitWarning = function (warning, ...rest) {
  if (String(warning).includes('SQLite is an experimental')) return;
  return _emitWarning.call(process, warning, ...rest);
};

const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      item TEXT NOT NULL,
      total REAL NOT NULL,
      ship_address TEXT
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT,
      body TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT,
      category TEXT,
      price REAL
    );
  `);

  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return;

  const insUser = db.prepare('INSERT INTO users (id, username, password, role, email) VALUES (?, ?, ?, ?, ?)');
  insUser.run(1, 'alice', 'alice123', 'user', 'alice@acme.test');
  insUser.run(2, 'bob', 'bob123', 'user', 'bob@acme.test');
  insUser.run(3, 'admin', 's3cr3t-admin', 'admin', 'admin@acme.test');

  const insOrder = db.prepare('INSERT INTO orders (id, user_id, item, total, ship_address) VALUES (?, ?, ?, ?, ?)');
  insOrder.run(1001, 1, 'Mechanical Keyboard', 129.99, '12 Oak St, Springfield');
  insOrder.run(1002, 2, 'Noise-Cancelling Headphones', 299.5, '88 Privet Drive, Little Whinging'); // Bob's — IDOR target
  insOrder.run(1003, 1, 'USB-C Hub', 39.0, '12 Oak St, Springfield');

  const insComment = db.prepare('INSERT INTO comments (author, body, created_at) VALUES (?, ?, ?)');
  insComment.run('carol', 'Great keyboard, very clicky!', '2026-06-01T10:00:00Z');
  insComment.run('dave', 'Shipping was fast.', '2026-06-02T12:30:00Z');

  const insProduct = db.prepare('INSERT INTO products (id, name, category, price) VALUES (?, ?, ?, ?)');
  insProduct.run(1, 'Mechanical Keyboard', 'peripherals', 129.99);
  insProduct.run(2, 'Noise-Cancelling Headphones', 'audio', 299.5);
  insProduct.run(3, 'USB-C Hub', 'peripherals', 39.0);
  insProduct.run(4, '4K Monitor', 'displays', 449.0);
}

init();

if (require.main === module) {
  const users = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const orders = db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;
  console.log(`Seeded in-memory DB: ${users} users, ${orders} orders.`);
}

module.exports = { db, init };
