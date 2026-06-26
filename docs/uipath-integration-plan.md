# Penetron ↔ UiPath — Connection & Integration Plan

> Docs-grounded plan for wiring Penetron into the UiPath Automation Cloud ecosystem.
> Prepared in advance so setup is mechanical once Test Cloud / Maestro / Agent Builder access lands.
> Sources are official `docs.uipath.com` pages, linked at the bottom. Items we must confirm in-tenant are tagged **[verify in tenant]**.

---

## 1. The four connection directions (the mental model)

Penetron runs as an **external engine** (Node/TS runner + Claude Code + Playwright + Chromium) on a host we control. It connects to UiPath in **four distinct directions** — getting these straight is the whole game:

| # | Direction | Mechanism | Auth |
|---|-----------|-----------|------|
| **D1** | **UiPath → Penetron** (a Maestro agent calls Penetron's exploit tools) | **Remote MCP Server** registered in Orchestrator, pointing at Penetron's MCP endpoint | Header bearer token, value from an Orchestrator **Asset** (auto-masked) |
| **D2** | **Penetron → UiPath** (push test results to Test Manager, read Assets, optionally start jobs) | **REST APIs** (Orchestrator OData + Test Manager API) | **External Application** OAuth2 **client credentials** → bearer token |
| **D3** | **Deploy event → UiPath** (start the pentest on a deployment to staging) | **Integration Service HTTP Webhook** → Maestro **message start event** (fallback: Orchestrator `StartJobs`) | Webhook callback URL (+ optional signature) |
| **D4** | **Claude Code → UiPath** (build/deploy the UiPath artifacts — the coding-agent bonus, "Role B") | **`uip` CLI** (UiPath for Coding Agents skills) | External Application client credentials (or interactive `uip login`) |

Everything below is organized around these four.

---

## 2. Topology

```
                         ┌──────────────────────── UiPath Automation Cloud ───────────────────────┐
 deploy to staging       │                                                                        │
  (GitHub Actions) ──D3──►  Integration Service (HTTP Webhook)  ──►  Maestro process (BPMN)        │
                         │                                              │  governance · audit · HITL│
   Slack /pentest ──D3──►  (message start event)                       │                           │
                         │                                              ▼                           │
                         │                                   Agent Builder agent (Layer 2 coord.)   │
                         │                                              │  "Add tool → MCP Server"   │
                         │                                              ▼                           │
                         │                                   Remote MCP Server  ──D1──┐             │
                         │   Test Manager  ◄──D2(results)──┐                          │             │
                         │   Orchestrator Assets/Jobs ◄─D2─┤                          │             │
                         └──────────────────────────────── │ ─────────────────────── │ ────────────┘
                                                            │                         │ (HTTPS + bearer)
                                ┌───────────────────────────┴─────────────────────────▼───────────┐
                                │            PENETRON HOST  (VM / CI runner / robot host)           │
                                │  MCP server  →  Layer 2 runner (TS + Playwright + Chromium)       │
                                │              →  Claude Code (Layer 1 SAST + regenerate)           │
                                │              →  gate + reports → Jira / Slack REST                 │
                                └──────────────────────────────────────────────────────────────────┘
```

---

## 3. The MCP decision (D1) — why Remote MCP Server

UiPath supports five MCP server types; **where each executes** is the deciding factor, because Penetron needs a **real browser** (Playwright/Chromium):

| MCP type | Runs on | Fit for Penetron |
|----------|---------|------------------|
| **Remote** | **External infra** (public internet, or on-prem via UiPath **Relay**) | ✅ **Primary** — Playwright + Claude run on our host; Orchestrator proxies to it |
| Self-Hosted | User infra, registered via `uipath run` | ✅ Alternative to Remote (registered via CLI instead of URL) |
| Command | UiPath **Serverless** (runs `npx` packages) | ❌ no real browser / heavy deps |
| Coded | UiPath **Serverless** (Python `.nupkg`) | ❌ same limitation |
| UiPath | UiPath Platform (exposes UiPath artifacts as tools) | ↔ reverse direction (D4-ish), optional |

**Decision: Penetron is a Remote MCP Server.** We host an MCP endpoint on the Penetron host; register it in Orchestrator (Remote type); a Maestro Agent Builder agent adds it as a tool. The agent reasons ("validate these candidates"); Penetron's MCP tools do the exploiting and return verdicts.

**Registration (Orchestrator → MCP Servers → Add → Remote):**
- Name (3–50 chars, alphanumeric + hyphens). Preview URL auto-generates as
  `https://cloud.uipath.com/{org}/{tenant}/agenthub_/mcp/{FolderID}/{MCPServerName}`.
- **Remote URL** = Penetron's public MCP endpoint (or via **UiPath Relay** if the host is private). **[verify in tenant]** transport (streamable HTTP/SSE).
- **Headers** for auth — e.g. `Authorization: %ASSETS/PenetronMcpToken%` (asset reference; values containing `token`/`secret`/`api_key` are auto-masked).

**MCP tools Penetron will expose** (to build):
- `validate_exploits(targetUrl, scenarios[])` → `verdicts[]` (runs Layer 2, returns exploit-verdict schema)
- `run_full_pentest(targetUrl, prRef)` → `gate-summary` (Layer 1 regenerate + Layer 2 + gate)
- `get_evidence(scenarioId)` → screenshot/trace handles

**Fallback (D1-alt): Orchestrator Job (Pattern-1).** If exposing an endpoint is undesirable, Maestro uses a **Service Task → "Start and wait for RPA/API workflow"**, which calls Orchestrator `StartJobs` to run Penetron as a job on a **robot host**. Less "agentic," no inbound exposure. Keep as fallback.

---

## 4. Authentication & keys (D2/D4) — External Application (client credentials)

Service-to-service calls from Penetron to UiPath use a **confidential External Application** with **application scopes** (client-credentials flow against the Identity Server).

**Token request:**
```
POST https://cloud.uipath.com/{org}/identity_/connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={APP_ID}&client_secret={APP_SECRET}&scope={scopes}
```
→ `{ access_token, token_type: "Bearer", expires_in: 3600, scope }`. **No refresh token; 1-hour expiry → re-auth.**

**Calling Orchestrator:**
```
GET/POST https://cloud.uipath.com/{org}/{tenant}/orchestrator_/odata/{resource}
Authorization: Bearer {access_token}
X-UIPATH-FolderKey: {folderKey}          # or X-UIPATH-FolderPath
```

**Scopes to request** (minimal viable set; pick at app registration):

| Scope | Why |
|-------|-----|
| `OR.Execution` | list processes/releases (ListReleases) — required to enumerate tools/processes |
| `OR.Jobs` | start jobs (`StartJobs`) — needed if we trigger processes / Pattern-1 |
| `OR.Folders` | resolve folder keys for the headers |
| `OR.Assets` | read Jira/Slack/target Credential & Text assets |
| `OR.Monitoring` | poll job status |
| `OR.TestSets`, `OR.TestSetExecutions` | test automation (if we drive test sets) |
| `OR.Machines.Read`, `OR.Robots.Read` | resolve robots for job strategy (if Pattern-1) |

> `OR.Default` is a wildcard giving role-based fine-grained access if you prefer per-role control over org-wide scopes.

**Test Manager** uses a **separate S2S client** (not the Orchestrator External App):
- Enable **Test Automation** in Orchestrator; generate an **installation token** (Identity Management).
- Register via the **Test Manager provisioning tool** (`TestManagerProvisioner` → `register third-party-s2sclient`) **or** Identity Management external client, selecting **Test Manager** scopes (`TM.Projects`, `TM.Requirements.Read`, …). → yields **ClientID/ClientSecret**.
- Report results by querying/writing **TestExecution** objects (→ `TestCaseLogs`) via the Test Manager REST API (`…/testmanager_/…`); **poll results every ≥20s**. Automated tests appear in Test Manager only if **associated with a Test Manager test case in the same tenant**. A **defect-creation webhook** can file the Jira bug from a failed test. **[verify in tenant]** exact TM API paths from the TM API reference.

---

## 5. Trigger (D3) — deploy event & Slack → Maestro

**Primary:** Integration Service **HTTP Webhook** connector.
- In Orchestrator → **Open Event Triggers** → add trigger → select the Maestro process → **Connector: HTTP Webhook**. It generates a **dynamic public callback URL**.
- Put that URL in GitHub Actions (on deploy-to-staging) and in the Slack slash-command config. Integration Service evaluates **event data filters** and starts the process.
- Maestro side: a **message start event** ("triggered by an event from Integration Service") kicks off the process.

**Fallback:** a tiny relay (or GH Action step) calls Orchestrator `StartJobs` directly with the External App token:
```
POST …/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs
{ "startInfo": { "ReleaseKey": "{guid}", "Strategy": "ModernJobsCount", "JobsCount": 1,
                 "InputArguments": "{\"targetUrl\":\"https://staging…\",\"prRef\":\"…\"}" } }
```
Get `ReleaseKey`: `GET …/odata/Releases?$filter=ProcessKey eq '{ProcessName}'`. Get folder key: `GET …/odata/Folders`.
**Last-resort demo:** start the Maestro process manually in the UI.

---

## 6. Build/deploy via Claude Code (D4) — the coding-agent bonus ("Role B")

Two CLIs (don't confuse them):
- **`@uipath/cli` → `uip`** (Node) — auth, pack/publish/deploy, jobs, test sets, **and the coding-agent skills**.
- **`uipath`** (Python SDK CLI) — `uipath run` (used to register **Self-Hosted** MCP servers / Python coded agents).

Penetron (Node/TS) uses **`uip`**. Coding-agent flow:
```
npm i -g @uipath/cli
uip login --client-id env.UIPATH_CLIENT_ID --client-secret env.UIPATH_CLIENT_SECRET \
          --tenant "$UIPATH_TENANT" [--organization "$UIPATH_ORG"] [--scope "$SCOPES"]
uip skills install --agent claude            # UiPath for Coding Agents — teaches Claude Code the uip CLI
uip tools install @uipath/orchestrator-tool @uipath/solution-tool   # pre-install in CI

# package + deploy the Penetron UiPath solution (Maestro process, agent, API workflows)
uip solution pack ./uipath ./dist --name penetron --version "$V"
uip solution publish "./dist/penetron.$V.zip"
uip solution deploy run --name penetron-staging --package-name penetron --package-version "$V" \
                        --folder-name Penetron --folder-path Shared

# tests (Test Manager from CLI)
uip tm testsets run … ; uip tm wait … ; uip tm report get …
```
Capture the prompt logs/screenshots of Claude Code driving `uip` into `docs/coding-agent-evidence/` — that's the documented evidence the bonus requires.

---

## 7. Secrets & keys matrix

| Secret | Purpose | Stored where | Used by |
|--------|---------|--------------|---------|
| `UIPATH_CLIENT_ID` / `UIPATH_CLIENT_SECRET` | External App OAuth (D2/D4) | Penetron host env / CI secret | Penetron REST calls; `uip` CLI |
| `UIPATH_ORG`, `UIPATH_TENANT` | URL routing | env (non-secret) | all UiPath calls |
| TM `CLIENT_ID` / `CLIENT_SECRET` | Test Manager API (D2) | Penetron host env | Test Manager sync |
| `PenetronMcpToken` | UiPath→Penetron MCP auth (D1) | **Orchestrator Asset** (Credential) + Penetron MCP validates it | Remote MCP header |
| `JIRA_*`, `SLACK_*` | file bug / notify | **Orchestrator Credential Assets** → injected to runner | Jira/Slack integration |
| `PENETRON_TARGET_URL` | staging app under test | Orchestrator **Text Asset** | Layer 2 runner |

Principle: **all secrets live in Orchestrator Assets** (Credential assets are vault-backed); the runner reads them at job start (or they're set as env on the host). Nothing hardcoded. Remote MCP header secrets are auto-masked by Orchestrator.

---

## 8. Setup runbook (execute when access lands)

1. **Org/tenant**: note `{org}` and `{tenant}` slugs; pick/create a **Folder** (e.g. `Penetron`).
2. **External Application** (Admin → External Applications): confidential, application scopes = §4 list → save **App ID/Secret**.
3. **Assets** (Orchestrator): `JIRA_API_TOKEN`, `SLACK_WEBHOOK_URL`, `PenetronMcpToken` (Credential); `JIRA_BASE_URL`, `JIRA_PM_ACCOUNT_ID`, `PENETRON_TARGET_URL` (Text).
4. **Test Manager**: enable Test Automation; provision the **S2S client** (§4) → TM ClientID/Secret; create a **Penetron** TM project + a Test Set; map our exploit scenarios to TM test cases.
5. **Penetron host**: deploy the engine + **MCP server**; set env (External App creds, TM creds, Jira/Slack); install `claude` + `@playwright/cli` + Chromium; expose the MCP endpoint (public URL or **Relay**).
6. **Remote MCP Server** (Orchestrator → MCP Servers → Add → Remote): point at the endpoint; header `Authorization: %ASSETS/PenetronMcpToken%`.
7. **Agent Builder agent** (Layer 2 coordinator): Add tool → MCP Server → select Penetron tools; system prompt = "validate candidate findings, call Penetron tools, return verdicts."
8. **Maestro process** (BPMN): message start event → Layer 1 → Service Task "Start and wait for agent" (the agent above) → exploitability gate (DMN/exclusive) → two report tasks → **User Task** (Action Center approval) → API workflows (Jira/Slack). Publish via `uip solution …`.
9. **Triggers**: Integration Service HTTP Webhook trigger on the process → URL into GitHub Actions + Slack slash command.
10. **Smoke**: fire the webhook → watch the Maestro instance → verify verdicts, Test Manager results, the approval pause, and the Jira/Slack outputs.

---

## 9. Open decisions

1. **Remote MCP vs Self-Hosted MCP vs Pattern-1 Job** for D1 — recommend **Remote MCP** (most agentic + governed); Self-Hosted if registering via CLI is preferred; Pattern-1 Job if we must avoid exposing an endpoint.
2. **Penetron host** — public VM (direct Remote URL) vs private (UiPath **Relay**) vs CI runner vs robot host. Drives §5/§3 wiring.
3. **Jira filing path** — direct REST from an API workflow vs **Test Manager defect webhook**. (We already have direct REST built.)
4. **One umbrella Jira ticket vs one per exploit** — currently umbrella with priority = highest severity.

---

## Sources (official UiPath docs)
- External Applications (OAuth): https://docs.uipath.com/automation-cloud/automation-cloud/latest/api-guide/accessing-uipath-resources-using-external-applications
- Orchestrator auth methods / scopes: https://docs.uipath.com/orchestrator/automation-cloud/latest/api-guide/authentication-methods · https://docs.uipath.com/orchestrator/standalone/2023.10/api-Guide/scopes-and-permissions
- Jobs / StartJobs: https://docs.uipath.com/orchestrator/automation-cloud/latest/api-guide/jobs-requests
- MCP Servers (about / remote / command / coded): https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-mcp-servers · https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/creating-a-remote-mcp-server
- Agents consuming MCP: https://docs.uipath.com/agents/automation-cloud/latest/user-guide/mcp-servers
- Maestro events / service task: https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/events · https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/service-task
- Integration Service HTTP Webhook: https://docs.uipath.com/integration-service/automation-cloud/latest/user-guide/uipath-http-webhook
- Test Manager API integration: https://docs.uipath.com/test-manager/automation-cloud/latest/user-guide/test-manager-api-integration
- uip CLI (auth / deploy from CI / login): https://docs.uipath.com/uipath-cli/standalone/latest/user-guide/authentication · https://docs.uipath.com/uipath-cli/standalone/latest/user-guide/howto-deploy-from-ci
