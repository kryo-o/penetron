# Register Penetron as a Remote MCP Server in UiPath

Goal: make the locally-running Penetron MCP server reachable from the UiPath cloud
so an Agent Builder agent can call its tools.

## 1. Run the MCP server over HTTP (locally)
```bash
cd pentests
# generate a bearer token once and store it in ../.env
#   echo "PENETRON_MCP_TOKEN=$(openssl rand -hex 32)" >> ../.env
npm run mcp:http            # listens on :7337/mcp, requires Authorization: Bearer <token>
```
The server is **stateful Streamable HTTP** at `POST /mcp`. With `PENETRON_MCP_TOKEN`
set it requires `Authorization: Bearer <token>` (401 otherwise). Secret masking and the
token will move to an Orchestrator Credential Asset for the deployed runner.

## 2. Expose it with an HTTPS tunnel
Pick one (no account needed for a quick cloudflared tunnel):
```bash
cloudflared tunnel --url http://localhost:7337      # prints https://<random>.trycloudflare.com
# or:  ngrok http 7337
```
Public MCP endpoint = `https://<random>.trycloudflare.com/mcp`.
> The hostname changes each run for quick tunnels. For a stable demo URL use a named
> cloudflared tunnel or a reserved ngrok domain, and re-point the UiPath connection if it rotates.

## 3. Register the Remote MCP in UiPath
In the tenant (Agent Builder / Integration Service → MCP / Connections):
- **Type:** Remote MCP Server (Streamable HTTP)
- **URL:** `https://<random>.trycloudflare.com/mcp`
- **Auth header:** `Authorization: Bearer <PENETRON_MCP_TOKEN>`
- **Tools exposed (auto-discovered, 7):**
  - `run_exploits` — dynamic exploit validation → per-scenario verdicts
  - `generate_reports` — exploitability gate + two reports
  - `get_gate` — read current gate decision (no recompute)
  - `sync_test_manager` — push verdicts to Test Manager (project PEN)
  - `run_full_pipeline` — exploit → gate → TM sync in one call
  - `file_jira_ticket` — file a Jira Bug (**gated**: only after human approval; dry-run if creds absent)
  - `notify_slack` — post the Block Kit summary (**gated**: only after human approval; dry-run if webhook absent)

## 4. Verify
From the UiPath connection test (or the agent playground), call `get_gate` — it should
return the latest gate summary JSON. That confirms cloud → tunnel → MCP connectivity.

## Notes
- The MCP's write tools (`file_jira_ticket`, `notify_slack`) are **gated**: the agent is
  instructed to call them only after the human-approval step, and they dry-run when creds
  are absent. The approval gate itself is designed in Maestro but currently blocked (see
  `../../PROJECT-PLAN.md` M8e), so writes are not auto-triggered in the green run.
- Non-production only: `run_exploits` targets the staging app, never production.
