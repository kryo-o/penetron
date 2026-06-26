# Target App — Ground-Truth Vulnerabilities

This is an **intentionally vulnerable** demo app ("Acme Demo Shop") used as Penetron's pen-test fixture. It is for authorized security testing only and must **never** be deployed to production or exposed publicly.

This file is the **ground truth**: it lets the demo prove Penetron's *precision* — every `exploited: true` should map to a real bug below, and the safe control should come back `exploited: false`.

## Exploitable (should appear in the Exploitable Vulnerabilities report + Jira)

| ID | Class | CWE | Endpoint | How to exploit | Exploit signal |
|----|-------|-----|----------|----------------|----------------|
| VULN-SQLI-1 | SQL injection (auth bypass) | CWE-89 | `POST /api/login` | `username = admin'--` (comments out the password check) with any password; generic bypass `' OR 1=1--` | Login succeeds as **admin** without a valid password (token with `role=admin`) |
| VULN-SQLI-2 | SQL injection (UNION) | CWE-89 | `GET /api/search?q=` | `q = ' UNION SELECT id,username,password,role FROM users-- -` | Response leaks user rows / credentials |
| VULN-XSS-1 | Reflected XSS | CWE-79 | `GET /welcome?name=` | `name = <script>window.__pntxss='<nonce>'</script>` | Injected script executes in the rendered page (DOM marker set) |
| VULN-XSS-2 | Stored XSS | CWE-79 | `POST /api/comments` then view in UI | Submit `body = <img src=x onerror="window.__pntxss='<nonce>'">` | Payload executes when any user views the comments list |
| VULN-IDOR-1 | IDOR / BOLA | CWE-639 | `GET /api/orders/:id` | Log in as **alice** (id 1), request order **1002** (bob's) | 200 OK returns another user's order data |
| VULN-AUTH-1 | Broken auth (no sig verify) | CWE-287 / CWE-345 | `GET /api/admin/users` | Forge an unsigned JWT `{sub:1,role:"admin"}` (server uses `jwt.decode`, not `verify`) | Forged token grants admin data access |

## Safe control (should appear as `exploited: false` — proves no false positive)

| ID | Endpoint | Why it's safe |
|----|----------|---------------|
| SAFE-PRODUCTS | `GET /api/products?category=` | Parameterized query, no reflection. SQLi/XSS attempts must fail. |

## Hardening findings (belong in the *Suggested Improvements* report, not necessarily "exploitable")

| ID | Issue | CWE |
|----|-------|-----|
| IMP-PLAINTEXT-PW | Passwords stored in plaintext | CWE-256 |
| IMP-ERR-LEAK | Verbose SQL errors returned to the client (`detail`, `sql`) | CWE-209 |
| IMP-WEAK-SECRET | Hardcoded/weak JWT secret `penetron-demo-secret` | CWE-798 |
| IMP-NO-HEADERS | Missing security headers (CSP, X-Frame-Options, etc.) | CWE-693 |

## Seed data (for reference)

- Users: `alice/alice123` (id 1, user), `bob/bob123` (id 2, user), `admin/s3cr3t-admin` (id 3, admin)
- Orders: 1001 → alice, **1002 → bob (IDOR target)**, 1003 → alice
