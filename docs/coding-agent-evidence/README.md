# Coding-Agent Evidence — Claude Code (UiPath for Coding Agents bonus)

Penetron uses **Claude Code** in two distinct, documented roles. This folder is the evidence trail for the
AgentHack coding-agent bonus.

## Role A — Penetron's brain (the product)
Claude Code *is* the analysis/exploit intelligence:
- **Layer 1** — SAST + PR impact analysis → candidate findings + change attack-surface map.
- **Layer 2** — generates/interprets exploit scenarios scoped to the change; drives **Playwright** for browser
  exploits and a TS HTTP client for API exploits; asserts on exploitation signals.
- **Reports** — produces the two reports (Exploitable Vulnerabilities · Suggested Improvements).

The same deterministic engine is exposed to UiPath via the Remote MCP server, so a human (CLI) and the UiPath
Agent Builder agent run identical logic.

## Role B — build-time platform engineer (the +2 bonus)
Claude Code built and deployed the project:
- Scaffolded the repo, the **TS/Playwright exploit engine**, the **exploitability gate**, the two report
  generators, and the **Jira/Slack** integrations.
- Built the **Remote MCP server** (`pentests/src/mcp/server.ts`, 7 tools, stateful Streamable HTTP, method-scoped
  auth) and the smoke tests.
- Wired the **Test Manager S2S** sync (`syncVerdicts.ts`) — verified live against tenant `hackathon26_879`,
  project PEN.
- Drove the **UiPath Studio Web / Orchestrator GUI via Playwright MCP**: registered the Remote MCP server, bound
  the Agent Builder agent to its 7 tools, built the Action approval app, and **published + ran the Maestro
  process** end-to-end.

## Notable engineering Claude Code did (selected)
- Diagnosed UiPath's **agenthub proxy auth model** (discovery sends no bearer; runtime supplies the org-id) and
  implemented **method-scoped auth** so design-time discovery works while `tools/call` stays gated.
- Resolved the **Remote-MCP recovery playbook** after tunnel rotation: `/mcp` suffix, stale-agenthub-GUID 502 →
  clean single-server rebuild, duplicate-server-slug deploy failures, detached BPMN sequence flows.
- Verified the full live spine: agent Debug → real exploits → Test Manager executions `f689d631…`, `fe3f6e8d…`.

## What to capture here before submission
- [ ] Screenshots: the Maestro green run trace (Validate exploits 48s → End), the `content = OPEN_TICKET` variable.
- [ ] Screenshot: Test Manager PEN dashboard (6 Failed / 1 Passed).
- [ ] Screenshot: MCP server terminal showing `tools/call` during the agent run.
- [ ] A short prompt-log excerpt (this build session) showing Claude Code driving the UiPath GUI.

See `docs/evidence.md` for the machine-readable run evidence (execution ids, gate summary, verdicts).
