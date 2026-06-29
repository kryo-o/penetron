# Penetron — Presentation Deck

> Slide-by-slide content for the UiPath AgentHack (Track 3) submission. Drop each slide into
> Google Slides / PowerPoint, or render with Marp/reveal.js. Speaker notes in *italics*.

---

## Slide 1 — Title
# Penetron
### Agentic Penetration Testing, Governed by UiPath
**Proves exploitability. Reports only what it actually exploited.**

UiPath AgentHack · Track 3 (Agentic Testing with Test Cloud)
🔗 github.com/kryo-o/penetron

*Speaker: "Penetron turns security from a late manual checkpoint into a continuous, governed gate — and it only reports vulnerabilities it has actually exploited."*

---

## Slide 2 — The problem
### Security tools cry wolf
- SAST / scanners flag **hundreds of *possible*** vulnerabilities.
- Teams drown in noise → real bugs get buried, alerts get ignored.
- "Is this finding *actually* exploitable?" — answered manually, late, by overloaded security teams.

*Speaker: "Most tools tell you what *might* be wrong. Nobody has time to verify them all."*

---

## Slide 3 — The thesis (the differentiator)
### Don't flag it. Prove it.
> Static analysis proposes **candidates**. A dynamic AI agent **proves or discards** each one against the running app.

# Flagged 7 → proved 6, discarded 1
Only what's **actually exploitable** advances. The safe control is correctly dismissed — **no false positives.**

*Speaker: "This is the whole product in one line. We attack the running app and report only real, proven exploits."*

---

## Slide 4 — How it works
### Two layers, one exploitability gate — orchestrated by UiPath

```
PR / deploy ─► UiPath Maestro (orchestration · governance · audit)
   ├─ Layer 1: SAST + PR-impact (diff-scoped)        → candidate findings
   ├─ Layer 2: UiPath Agent → MCP → Playwright/HTTP   → PROVEN verdicts
   │            exploits the RUNNING app                + Test Manager evidence
   ├─ Exploitability gate (only exploited == true advances)
   ├─ Human approval (designed checkpoint — Action Center; see repo Status)
   └─ Slack notification     (defect ticketing → v2)
```

*Speaker: "Layer 1 scopes to the change. Layer 2 — a UiPath agent — runs real attacks and proves them. The gate filters the noise."*

---

## Slide 5 — Built on UiPath Automation Cloud
### The UiPath footprint (Platform breadth)
| Component | Role |
|---|---|
| **Agent Builder** | The verification brain — Claude Sonnet agent runs the exploit tools |
| **Remote MCP Server** | Bridges the cloud agent to Penetron's engine (7 tools) |
| **Test Manager / Test Cloud** | System of record — red/green exploit evidence |
| **Maestro (BPMN)** | Orchestration, gate, human-approval (designed), audit trail |
| **Orchestrator** | Solution packaging, folders, identity, secrets |

*Speaker: "The agent, the evidence, and the governance all live on UiPath."*

---

## Slide 6 — Layer 1: scoped to the change
### SAST + change-impact analysis
- Reads the **PR diff** → finds risky sinks **inside the changed lines only**.
- Emits **candidate findings** + an **attack-surface map** (which routes/queries/auth-checks the PR touched).
- **Diff-scoped:** touch only `/api/search` → Penetron attacks only `/api/search`. *(Mirrors Test Cloud Autopilot change-impact.)*

*Speaker: "It doesn't re-scan the whole app every PR — only what changed. Fast, targeted."*

---

## Slide 7 — Layer 2: prove it (the differentiator in action)
### Dynamic exploit validation
- A UiPath **Agent Builder agent (Claude Sonnet 4.6)** calls Penetron's tools over **Remote MCP**.
- Runs **real attacks** via Playwright + HTTP: SQLi, reflected/stored XSS, IDOR/BOLA, broken-auth.
- Asserts on an **exploitation signal** — payload renders unescaped, auth bypassed, cross-user data returned 200 — **not** a source string-match.
- **AI proposes; dynamic execution disposes.** (Unlike LLM reviewers that just opine.)

*Speaker: "The agent doesn't guess — it exploits. A finding is only 'real' if the attack actually worked."*

---

## Slide 8 — The evidence: Test Manager
### Red = proven exploit · Green = safe control resisted
- Each run creates a **test set + execution** in UiPath Test Manager.
- Latest live run (our UiPath staging tenant, project **PEN**): **6 Failed / 1 Passed.**
- Screenshots + Playwright traces attached → the **red/green exploit locker**.

*[Insert screenshot: PEN dashboard execution 6 fail / 1 pass]*

*Speaker: "Every proven exploit is a red test result. This is the audit-grade evidence."*

---

## Slide 9 — It meets developers at the PR
### Shift-left: the gate blocks a real merge
- Penetron runs on every PR → posts a verdict comment → **a proven exploit turns the required check RED → merge blocked.**
- Two surfaces: a fast **GitHub-native** check (reach) **+** the **UiPath-governed** pipeline (depth). Same engine.
- **UiPath-native trigger (live):** a GitHub PR auto-starts the Maestro Security Gate via the Integration Service connector → agent → exploits → Test Manager evidence.

*[Insert screenshot: PR with red check + "Merge blocked" + "flagged 1 → proved 1 → OPEN_TICKET"]*

*Speaker: "A developer's vulnerable change never reaches main — Penetron proved the exploit and stopped it."*

---

## Slide 10 — Governance & audit
### Human approval by design; UiPath records everything
- Exploitability gate → **human approval** before any external action *(designed in Maestro; Action Center provisioning blocked in the hackathon tenant — see repo Status)*.
- **Slack** notification with prioritized summary + evidence links.
- **Maestro** retains the full audit trail; least-privilege Orchestrator identity.

*Speaker: "Automated where it should be, governed where it matters."*

---

## Slide 11 — The coding-agent bonus (Claude Code)
### Claude Code is the brain *and* the builder
- **Role A — the product:** SAST + impact, exploit interpretation, report generation.
- **Role B — the engineer:** built the TS/Playwright engine, the MCP server, the Test Manager sync, and **drove the UiPath GUI** to deploy the agent + Maestro process.

*Speaker: "Claude Code didn't just analyze — it built and deployed the whole UiPath integration."*

---

## Slide 12 — Business impact
### Why it matters
- **Precision:** only proven exploits → no alert fatigue, no wasted triage.
- **Speed:** PR-scoped, automated, continuous — security at dev pace.
- **Governance:** human-approval checkpoint by design, audited on UiPath.
- **Evidence:** every claim backed by a reproducible red/green result.

*Speaker: "Fewer false positives, faster feedback, full audit trail."*

---

## Slide 13 — Roadmap (v2)
- **Automated defect ticketing (Jira)** — prototype already built, gated behind approval.
- **Live `regenerate` Layer 1** — Claude Code generates exploits from the diff.
- **UiPath→GitHub status callback** — UiPath sets the PR check to block the merge (the PR→UiPath trigger + run are already live).
- **Stable named tunnel + Credential Assets** hardening.

*Speaker: "The architecture is built; these are the next hardening steps."*

---

## Slide 14 — Close
# Penetron
### Proves exploitability. Filters the noise. Lets UiPath govern the fix.

**Flagged 7 → proved 6, discarded 1.**

🔗 github.com/kryo-o/penetron · 🎥 [demo video] · 🛡️ Track 3

*Speaker: "Penetron — security that proves itself, governed by UiPath."*
