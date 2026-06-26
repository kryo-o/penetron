# Maestro BPMN — "Penetron Security Gate"

The hero artifact: a BPMN 2.0 process authored in Studio Web that orchestrates the
full flow and provides the audit trail + human governance. Maestro orchestrates;
it does not itself drive a browser (that is the Penetron MCP via the agent).

## Process variables
| Variable | Type | Source |
|---|---|---|
| `targetUrl` | string | trigger payload (default `http://localhost:4000`) |
| `environment` | string | trigger payload (`staging`) |
| `mode` | string | `replay` (demo) / `regenerate` |
| `prRef` | string | trigger payload |
| `coordinatorResult` | json | output of the Agent Builder agent |
| `decision` | string | `coordinatorResult.decision` |

## Stages (BPMN)
1. **Start event** — message start (deploy webhook) or manual/Slack trigger. (Triggers = M9.)
2. **Intake** (Service / script task) — normalize the payload into the process variables.
3. **Layer 2 — Penetron Coordinator** (Agent task: *Start and wait for agent*) →
   the Agent Builder agent calls the Penetron MCP and returns `coordinatorResult`.
   (Layer 1 SAST is folded into the replay candidate set for the demo; can be a prior
   Agent/Service task when regenerate mode is wired.)
4. **Exploitability gate** (Exclusive gateway on `decision`):
   - `OPEN_TICKET` → continue to reports + approval + writes.
   - `CLEAN` → Slack "all clear" → End.
5. **Two reports** — already produced by `generate_reports` during the agent run;
   surfaced as links (Exploitable Vulnerabilities, Suggested Improvements).
6. **Human approval** (User Task → Action Center) — pauses until a human approves the
   external writes. This is the governance checkpoint. (M8e.)
7. **Notify** (Service task → API workflow / REST):
   - Slack: post Block Kit summary + links (reports · Test Manager dashboard), priority = `jiraPriority`.
   - *(v2: automated defect ticketing — e.g. Jira Bug with assignee/priority/PoC — gated behind the same approval.)*
8. **End event** — full Maestro audit trail retained.

## Task-type mapping
| Stage | Maestro construct |
|---|---|
| Trigger | Message start event (Integration Service webhook) / manual start |
| Layer 2 | Agent task — *Start and wait for agent* (Penetron Coordinator) |
| Gate | Exclusive gateway (DMN optional) on `decision` |
| Approval | User Task (Action Center) |
| Slack notify (Jira ticketing → v2) | Service task → API workflow (HTTP Request) |

## Governance
- One mandatory approval before any external write (Slack now; defect ticketing in v2).
- All platform actions under a least-privilege identity (Orchestrator External App).
- Secrets (Slack webhook, MCP bearer; v2 Jira token) live in Orchestrator Credential Assets.

## Determinism for the demo
Pin the demo PR + commit the scenario set; agent runs `mode=replay` at low temperature.
Same input → same verdicts → same gate → same ticket every run.

## Deploy
Authored in Studio Web; published to Orchestrator in `DefaultTenant`. The `uip` CLI
(logged into staging) packs/publishes supporting API workflows; see `uipath/README.md`.
