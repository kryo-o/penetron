# Penetron — Devpost Submission

> Paste these into the Devpost project page fields. Tagline, then the standard sections.

## Tagline
Agentic penetration testing that **proves** exploitability — and reports only what it actually exploited — governed end-to-end by UiPath.

---

## Inspiration
Security tooling has a precision problem. SAST scanners and dependency checkers flag **hundreds of *possible*** vulnerabilities, and overwhelmed teams have no time to verify which are real. The result is alert fatigue: real bugs get buried under unproven noise, and security becomes a late, manual gate that slows everyone down.

We wanted to flip it: instead of *flagging* candidates, **prove or discard each one by actually exploiting the running app** — and wrap the whole thing in UiPath's orchestration and governance so it's automated where it should be and human-approved where it matters.

## What it does
Penetron is a two-layer agentic security gate:

- **Layer 1 — SAST + change-impact:** reads the PR diff, finds risky sinks *inside the changed lines*, and emits candidate findings scoped to the change (it doesn't re-scan the whole app every PR).
- **Layer 2 — dynamic exploit validation:** a **UiPath Agent Builder agent (Claude Sonnet)** calls Penetron's exploit engine over a **Remote MCP server** and runs *real* attacks — SQL injection, reflected/stored XSS, IDOR/BOLA, broken authentication — against the running app. It asserts on a genuine **exploitation signal** (payload renders unescaped, auth bypassed, another user's data returned `200`), not a string match.
- **Exploitability gate:** only `exploited == true` advances. The deliberately-safe endpoint is correctly discarded — **no false positives.**
- **Evidence:** every verdict is synced to **UiPath Test Manager** as a red (exploited) or green (resisted) test result, with screenshots and Playwright traces.
- **Governance:** a human approves before any external action; **UiPath Maestro** keeps the full audit trail; **Slack** posts a prioritized summary.
- **Dev workflow:** Penetron runs on every pull request and **blocks the merge** when it proves an exploit.

Headline result on the demo PR: **Flagged 7 → proved 6, discarded 1.**

## How we built it
- **Target:** an intentionally-vulnerable Express + React app ("Acme Demo Shop") with 6 planted OWASP bugs + 1 safe control + a `VULNS.md` ground-truth file (so we can prove *precision*).
- **Engine:** TypeScript + Playwright exploit runner, exploitability gate, two-report generator, contract JSON schemas (finding · attack-surface · verdict).
- **UiPath components:**
  - **Agent Builder** — the "Penetron Coordinator" agent (Claude Sonnet 4.6, autonomous, temp 0) that runs the verification.
  - **Remote MCP Server** — a stateful Streamable-HTTP MCP server (7 tools) bridging the cloud agent to the engine; method-scoped auth (discovery open, execution gated by bearer **or** UiPath org id).
  - **Test Manager / Test Cloud** — S2S sync of verdicts to a test set + execution (live on tenant `hackathon26_879`, project PEN).
  - **Maestro** — a BPMN process orchestrating Start → agent verification → exploitability gate → end, with the audit trail.
  - **Orchestrator** — solution packaging/deploy, folders, External Application (client-credentials) identity.
- **Coding agent (the bonus):** **Claude Code** is used in two roles — **(A)** Penetron's analysis/exploit brain, and **(B)** the build-time engineer that wrote the engine + MCP server + Test Manager sync and **drove the UiPath Studio Web / Orchestrator GUI** (via Playwright MCP) to register the MCP server, bind the agent, and deploy the Maestro process.
- **PR integration:** a GitHub Action runs Layer 1 → Layer 2 on each PR, posts a verdict comment, and fails the required check on a proven exploit (with branch protection → merge blocked).

## Challenges we ran into
- **Remote MCP over a rotating tunnel:** UiPath's agenthub proxy forwards an org-id but not our bearer at discovery time, so we built **method-scoped auth** (open discovery, gated execution). Tunnel URL rotation and a stale-agenthub-GUID 502 each needed a clean recovery playbook.
- **Maestro Flow is preview/early:** publishing a Studio Web solution that contains a Maestro flow + an Action-app is buggy on the current platform (UiPath flagged Maestro Flow as not recommended for heavy AgentHack use). We worked around it by keeping the agent path as the reliable verification engine and documenting the Maestro orchestration.
- **CI correctness:** background app processes don't survive across GitHub-Action steps; `node:sqlite` needs Node ≥22; and a "no vulnerable change" PR must resolve to **CLEAN**, not error. We fixed each.

## Accomplishments we're proud of
- A working **"prove, don't flag"** gate: 6 exploited / 1 discarded, every result reproducible.
- A **UiPath agent that runs real exploits** and writes audit-grade **Test Manager** evidence — live.
- A PR that **gets its merge blocked** because Penetron proved an exploit — shift-left security, automated.
- Claude Code building *and deploying* the UiPath integration (the documented +2 bonus).

## What we learned
- Dynamic proof beats static flagging for precision — and pairs perfectly with an LLM agent: **AI proposes, execution disposes.**
- UiPath Test Manager is a natural "evidence locker" for security results, not just functional tests.
- Designing around a stable contract (the JSON schemas) let the heuristic and AI versions of Layer 1 be interchangeable behind the gate.

## What's next (v2)
- **Automated defect ticketing (Jira)** — prototype already built, gated behind approval.
- **Live `regenerate` Layer 1** — Claude Code generates exploits from the diff (heuristic ships today).
- **Native PR→UiPath auto-trigger** — GitHub starts the Maestro pipeline (trigger script + design committed).
- **Hardening** — stable named tunnel, MCP bearer + secrets in Orchestrator Credential Assets.

## Built with
`uipath-agent-builder` · `uipath-test-manager` · `uipath-maestro` · `uipath-orchestrator` · `model-context-protocol` · `claude` · `claude-code` · `typescript` · `playwright` · `node` · `express` · `react` · `github-actions`

## Links
- **Repo:** https://github.com/kryo-o/penetron (MIT)
- **Demo video:** [add link]
- **Deck:** `docs/deck.md`
- **Architecture:** `docs/architecture.md` · **Run-of-show:** `docs/demo-plan.md`
