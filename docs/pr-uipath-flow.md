# PR → UiPath → Block (the UiPath-run gate)

> **Status (2026-06-28): the trigger half is LIVE and verified; only the GitHub status-callback remains.**
> A GitHub **Pull Request Created** event (UiPath **Integration Service** GitHub connector, polling) now
> **auto-starts the `Penetron Security Gate` Maestro process** → Agent Builder Coordinator → MCP → real
> exploits → gate → **live Test Manager execution** (`47c525b7…`, 6 Failed/1 Passed). So "PR triggers the
> UiPath-run validation" is done. What remains is the **reverse callback** — UiPath writing the verdict back
> to GitHub as a commit status to block the merge (today the GitHub-Action path in [`pr-flow.md`](pr-flow.md)
> does the merge-blocking). The `triggerGate.ts`/`penetron-uipath.yml` approach below is one way to add that
> callback; the connector-native **trigger** is already wired.

## ▶ The one remaining piece — wire the commit-status callback (step-by-step)

The PR **trigger** is live (connector → Maestro). To let the **UiPath verdict block the merge**, add an outbound
write-back. Do it connector-native (no extra PAT needed if the GitHub connection can create statuses):

1. **Capture PR context on the trigger.** In the Message Start Event ("Pull Request Created"), map the connector
   output into process variables: `commitSha` (PR **head** SHA), `prNumber`, `repoFullName` (`owner/repo`). These
   feed the callback. *(Today nothing is mapped — the agent runs replay regardless.)*
2. **Add a "Create commit status" step after the gate.** On each gateway branch add a **GitHub connector →
   Create commit status** activity (or an HTTP Request task — shape in §4 below):
   - `repo` = `vars.repoFullName` · `sha` = `vars.commitSha` · `context` = `penetron/uipath`
   - **OPEN_TICKET branch** → `state = failure`, description = `Penetron proved {exploitedCount} exploit(s) — OPEN_TICKET`
   - **CLEAN branch** → `state = success`, description = `CLEAN — no proven exploits`
   - `target_url` = the Test Manager dashboard (or the Maestro instance link)
3. **(Optional) Set `pending` at the start.** Right after Intake, a Create-commit-status with `state = pending`
   so the PR shows Penetron running while the agent works.
4. **Auth.** Prefer the **existing GitHub connection** if it exposes "Create commit status". Otherwise a
   fine-grained **PAT** (scope: *Commit statuses → Read and write* on this repo) stored in an Orchestrator
   **Credential Asset**, referenced by the HTTP task.
5. **Branch protection.** GitHub → repo **Settings → Branches → branch protection (`main`)** → require the status
   check **`penetron/uipath`**. Now a `failure` from UiPath = **merge blocked by the UiPath verdict**.

**End state:** PR opened → connector starts Maestro (~5-min poll) → agent proves/exploits → gate → UiPath sets
`penetron/uipath` red/green on the commit → branch protection enforces it. A fully UiPath-owned PR gate.
*(Keep the existing GitHub-Action `penetron` check too — belt-and-suspenders; see the safety-net note at the end.)*

The pure-UiPath path: a PR triggers the **UiPath Maestro** process, the **Agent Builder agent (Claude)**
runs the Penetron tools and verifies the change, and UiPath **reports the verdict back to GitHub** to block
(or allow) the merge — then notifies Slack. GitHub only triggers and gates; **UiPath does the work.** *(Automated Jira ticketing: v2 roadmap.)*

```
PR opened / synchronize
  → GitHub Action (thin trigger)
       1. OAuth client-credentials token from UiPath Identity (External App)
       2. Orchestrator StartJob "Penetron Security Gate"  inputs: { prNumber, commitSha, repo }
       3. set GitHub commit status  context="penetron/uipath"  state=pending
  → UiPath Maestro (the brain)
       agent → MCP tools → real exploits → exploitability gate
       → human approval → Slack notify   (Jira ticketing → v2)
  → UiPath HTTP task (callback)
       POST https://api.github.com/repos/<owner>/<repo>/statuses/<commitSha>
            { state: "failure"|"success", context: "penetron/uipath", description, target_url }
  → branch protection requires status "penetron/uipath" → red = MERGE BLOCKED
```

**Why callback (UiPath → GitHub) instead of the Action polling UiPath:** reading a Maestro instance's
internal verdict over the API is the fiddly part; one outbound HTTP call from Maestro to GitHub's status API
is trivial and fully decoupled. UiPath owns the verdict end-to-end.

---

## Pieces & owners

| # | Piece | Owner | Notes |
|---|---|---|---|
| 1 | **Orchestrator External App** (confidential, client-credentials) | you (Admin GUI) | scopes: `OR.Jobs`, `OR.Execution.Read` (+`OR.Folders.Read`). Yields App ID + Secret. → GitHub secrets. |
| 2 | GitHub secrets: `UIPATH_ORCH_CLIENT_ID/SECRET`, `UIPATH_ORG_URL`, `UIPATH_FOLDER_ID`, `UIPATH_PROCESS_NAME` | you (repo settings) | from step 1 + the Solution folder id. |
| 3 | **Trigger script** `triggerGate.ts` (auth → resolve release → StartJobs → set pending status) | me | reuses existing `getAccessToken` pattern. |
| 4 | **GitHub Action** `penetron-uipath.yml` (runs the trigger on PR) | me | sets `penetron/uipath` = pending. |
| 5 | Maestro: accept inputs `prNumber, commitSha, repo` | you (BPMN, small) | Data Manager → Inputs. |
| 6 | Maestro: final **HTTP Request task** → GitHub status callback | you (BPMN) + me (exact spec) | needs a GitHub PAT in an Orchestrator **Credential asset**. |
| 7 | **GitHub PAT** (fine-grained: *Commit statuses → Read and write* on this repo) | you | stored as Orchestrator asset `GitHubToken`. |
| 8 | Branch protection: require status **`penetron/uipath`** | you | replaces the current `penetron` check requirement. |

---

## API reference (verified shapes)

### 1. Token (host-level Identity, client-credentials)
```
POST https://staging.uipath.com/identity_/connect/token
Content-Type: application/x-www-form-urlencoded
grant_type=client_credentials&client_id=...&client_secret=...&scope=OR.Jobs OR.Execution.Read
```
(Send a browser `User-Agent` — Cloudflare 403s default clients.)

### 2. Resolve the release key (folder-scoped)
```
GET {ORG_URL}/orchestrator_/odata/Releases?$filter=Name eq '{PROCESS_NAME}'
Authorization: Bearer <token>
X-UIPATH-OrganizationUnitId: {FOLDER_ID}
→ value[0].Key   (the ReleaseKey)
```

### 3. Start the job, passing PR context
```
POST {ORG_URL}/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs
Authorization: Bearer <token>
X-UIPATH-OrganizationUnitId: {FOLDER_ID}
Content-Type: application/json
{
  "startInfo": {
    "ReleaseKey": "<key>",
    "Strategy": "ModernJobsCount",
    "JobsCount": 1,
    "InputArguments": "{\"prNumber\":42,\"commitSha\":\"<sha>\",\"repo\":\"kryo-o/penetron\"}"
  }
}
```
> ⚠️ **The one thing to verify in-product:** whether the Maestro BPMN process is startable via this classic
> `StartJobs` endpoint (it should appear under `Releases` once the solution is deployed). If Maestro requires
> its own start API, we adjust step 3 only — everything else is unchanged. We verify the moment the External
> App exists.

### 4. Maestro → GitHub status callback (the block signal)
HTTP Request task at the end of the process:
```
POST https://api.github.com/repos/kryo-o/penetron/statuses/{commitSha}
Authorization: Bearer {GitHubToken asset}
Accept: application/vnd.github+json
{
  "state": "failure",                      // "success" when gate == CLEAN
  "context": "penetron/uipath",
  "description": "Penetron proved 6 exploits — OPEN_TICKET",
  "target_url": "<Test Manager dashboard or Maestro instance link>"
}
```

---

## Build/verify order
1. **You:** create the External App (step 1) → drop the 5 GitHub secrets (step 2).
2. **Me + you:** run `triggerGate.ts` once to **verify StartJobs reaches the Maestro process** (the only risk).
3. **You:** add the Maestro inputs + the HTTP callback task (steps 5–7).
4. **Me:** finalize the GitHub Action.
5. **You:** point branch protection at `penetron/uipath`.
6. End-to-end test on a PR (local stack up).

## Safety net (recording insurance)
Keep the existing self-contained **`penetron`** check (heuristic Layer 1/2) so the PR is *always* gated even if
the UiPath round-trip hiccups mid-recording. The UiPath path is the "wow" upgrade, not a single point of failure.
