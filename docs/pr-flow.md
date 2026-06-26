# Penetron on a Pull Request

How Penetron runs **on a real PR** — diff-driven Layer 1 → prove/discard Layer 2 → PR comment →
(optional) UiPath Maestro governance.

## Trigger
`.github/workflows/penetron-pr.yml` runs on any PR that touches `target-app/**` (or `pentests/**`),
and on manual `workflow_dispatch`.

## What runs

```
PR opened/updated
  → Layer 1  (pentests/src/layer1/analyze.ts)
       reads the PR diff (origin/<base>...HEAD), finds risky sinks INSIDE the changed lines,
       maps each to its HTTP route, emits:
         engine/generated/candidate-findings.json   (only the changed endpoints)
         engine/generated/attack-surface.json
         pentests/scenarios-generated/pr-scenarios.json   (Layer 2 input)
  → Layer 2  (npm run exploit:pr, regenerate mode)
       runs ONLY those PR-scoped scenarios against the running app → proves or discards each
  → Gate + reports  (npm run report) → OPEN_TICKET / CLEAN
  → PR comment       "Flagged N → proved X, discarded Y" + verdict table
  → Evidence artifact uploaded
  → (optional) UiPath Maestro process started for governed approval + Jira/Slack
```

## Why it's diff-scoped (the point)
Penetron does **not** re-scan the whole app every PR. Layer 1 only flags sinks whose lines are in
the diff, so Layer 2 only attacks what changed. Proven locally:

```bash
# touch only the /api/search line  ->  Layer 1 emits exactly ONE candidate
PENETRON_DIFF_RANGE=HEAD npm run layer1
#   • [high] sqli  GET /api/search  (target-app/server/index.js:58)
#   1 candidate finding(s)
```

## Run it locally (the whole on-PR pipeline)

```bash
cd target-app && npm start            # the running app (another shell)
cd pentests
npm run layer1                         # SAST on the diff (or whole app if no range) -> candidates
npm run exploit:pr                     # Layer 2 regenerate against Layer-1 scenarios
npm run report                         # gate -> OPEN_TICKET
# or all three:
npm run pr
```

Scope the analysis to a real diff with `PENETRON_DIFF_RANGE` (e.g. `origin/main...HEAD`) or
`PENETRON_CHANGED_FILES="target-app/server/index.js"`.

## Detectors (heuristic taint rules, deterministic, no API key)
| Class | Rule | Maps to |
|---|---|---|
| sqli | SQL string built by interpolation/concatenation | the route's endpoint |
| sqli (safe control) | user input reaches a *parameterized* query → low-confidence; Layer 2 discards it | proves no false positives |
| xss-reflected | `res.send(...)` interpolates `req.query/params` into HTML | the route |
| xss-stored | client `dangerouslySetInnerHTML`/`innerHTML` of stored content | `/api/comments` |
| idor | `:id` route does a `req.params` lookup with no `req.user` ownership check | the route |
| broken-auth | `jwt.decode(...)` instead of `jwt.verify(...)` | `/api/admin/users` |

> The output contract (`candidate-finding.schema.json` + `attack-surface.schema.json`) is identical
> whether Layer 1 is these heuristic rules or Claude Code in `regenerate` mode — so the downstream
> gate → reports → Test Manager path never changes.

## Optional UiPath handoff
Set repo secrets `UIPATH_ORCH_TOKEN`, `UIPATH_ORCH_START_URL`, `UIPATH_RELEASE_KEY`,
`UIPATH_PROCESS_NAME` to have the Action start the **Penetron Security Gate** Maestro process
(governed approval → Jira/Slack) after the scan. Without them, the Action just posts the PR comment.
