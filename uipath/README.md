# Penetron × UiPath — orchestration & governance layer

This directory holds the UiPath-side artifacts that make Penetron an orchestrated,
governed security gate. Execution stays in TypeScript/Playwright (the `pentests/`
engine); UiPath provides orchestration (Maestro), the agentic coordinator
(Agent Builder), evidence/management (Test Manager), human governance
(Action Center), and identity/secrets (Orchestrator).

## Environment (verified 2026-06-24)
- Host: **`staging.uipath.com`** (NOT `cloud.uipath.com` — that is a different deployment)
- Org: **`hackathon26_879`** (OrganizationId `9d5888d3-00a1-4e5a-8702-78ace2906474`)
- Tenant: **`DefaultTenant`** (`f036116e-4ef7-4ff7-a396-508c5f5626d4`)
- CLI: `uip` v1.196 — always `uip login --authority https://staging.uipath.com`

## Chosen integration architecture (Remote MCP + tunnel)
```
deploy / Slack trigger
  → Maestro BPMN  (orchestration · governance · audit)
      → Agent Builder agent "Penetron Coordinator"
          → Remote MCP Server  ──HTTPS tunnel──▶  Penetron MCP @ localhost:7337
                                                   (pentests/src/mcp/server.ts)
      → exploitability gate (only exploited==true advances)
      → Test Manager evidence (already live: project PEN)
      → Action Center approval  (User Task · designed; blocked — see M8e)
      → Jira bug + Slack notify
```

## Files
- `mcp/register-remote-mcp.md` — how to expose the MCP (tunnel) and register it in UiPath.
- `agents/penetron-coordinator.agent.md` — Agent Builder agent spec (prompt, tools, output contract).
- `maestro/penetron-process.md` — Maestro BPMN process spec (stages, gateway, variables, task mapping).

## Status
- M8c MCP server: ✅ built (`npm run mcp` stdio / `npm run mcp:http`).
- M8d Maestro + agent: 🟡 specs here; authored in Studio Web / Agents UI.
- M8e Action Center approval: ⛔ blocked — approval app built, but Maestro→AppTasks 404 (Action Center not provisioned for the debug identity in the Solution folder); removed from the green run. See `../PROJECT-PLAN.md` M8e.
