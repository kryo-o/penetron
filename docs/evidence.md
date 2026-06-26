# Penetron — Live Run Evidence

Machine-verifiable evidence that the spine ran end-to-end on UiPath Automation Cloud. (Screenshots are kept
locally and are **not** committed; this file captures the reproducible facts.)

## Tenant / project
- Tenant: `hackathon26_879` / `DefaultTenant`
- Test Manager project: **Penetron** (prefix **PEN**)
- Dashboard: `https://staging.uipath.com/hackathon26_879/DefaultTenant/testmanager_/PEN/dashboard`

## Maestro orchestrated run (2026-06-25/26)
- Process: **Penetron Security Gate** (solution `Penetron` v1.0.3)
- Instance shape: `Start event → Validate exploits (Coordinator, ~48s) → End` — status **Successful**
- Agent output (process variable `content`):
  `{ "decision": "OPEN_TICKET", "exploitedCount": 6, "discardedCount": 1, "hardeningCount": 4, "jiraPriority": "Highest" }`

## Test Manager executions (dryRun: false)
| Execution id | Test set | Passed | Failed | Source |
|---|---|---|---|---|
| `f689d631-7511-0c00-9ad6-0b49d00e1878` | Penetron — staging @ 2026-06-26T01:40 | 1 | 6 | Maestro orchestrated run |
| `fe3f6e8d-6f11-0c00-b9cd-0b49d0065058` | (agent Debug run) | 1 | 6 | Agent Builder Debug |

## Gate decision (latest)
- Decision: **OPEN_TICKET**
- Exploited: **6** · Discarded: **1** · Hardening: **4**
- Highest severity: **critical** → Jira priority **Highest**

## Proven exploits (6) + safe control (1)
| ID | Class | Verdict |
|---|---|---|
| PNT-EXP-001 | SQLi (auth bypass) | exploited |
| PNT-EXP-002 | SQLi (UNION) | exploited |
| PNT-EXP-003 | Reflected XSS | exploited |
| PNT-EXP-004 | Stored XSS | exploited |
| PNT-EXP-005 | IDOR / BOLA | exploited |
| PNT-EXP-006 | Broken auth (no JWT verify) | exploited |
| PNT-EXP-007 | SQLi safe control | **discarded** (no false positive) |

## Reproduce locally
```bash
cd pentests
npm run exploit   # 6/7 proven exploitable, 1 discarded — schema-valid
npm run report    # gate -> OPEN_TICKET, priority Highest
```
Raw artifacts (git-ignored binaries excluded): `pentests/evidence/verdicts.json`, `gate-summary.json`,
`tm-sync-result.json`, `exploitable-vulnerabilities.md`, `suggested-improvements.md`.
