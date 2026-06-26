# Penetron — Demo Narration (voiceover script)

What to read aloud while screen-recording the live demo. Flow: **Studio → Debug → MCP server →
back to Studio → Test Manager → Slack → GitHub.** Stage directions in **[brackets]**; the rest is spoken.
Total read time ~3 min (leaves room for an intro + closing slide, under 5:00).

---

**[STUDIO — agent open, before clicking Debug]**

> "This is Penetron. Most security tools just *flag* possible vulnerabilities and leave you drowning in noise. Penetron is different — it **proves** them, by actually exploiting your running app. It's built as a **UiPath Agent Builder agent**, running Claude Sonnet, on UiPath Automation Cloud. Let me run it — I'll hit **Debug**."

**[Click Debug. While it runs (~45s), keep talking:]**

> "While that runs, here's what's happening underneath. The agent is calling Penetron's tools over a **Remote MCP server** — and bound to the agent is **Playwright**, a real browser. So for every suspected vulnerability, the agent doesn't guess — it spins up a browser and *attacks* the live app: SQL injection, cross-site scripting, broken access control, broken authentication."

**[Switch to the MCP-server terminal]**

> "This is that Remote MCP server. You can see the agent's tool calls coming in live — run the exploits, build the reports, apply the gate, and sync to Test Manager. This is the UiPath agent reaching through a tunnel into Penetron's engine and running the real attacks."

**[Switch back to Studio — run finishing / done]**

> "And back in Studio, the agent's finished. Here's its verdict: **decision — OPEN_TICKET**. Out of seven candidates, it **proved six exploitable and discarded one** — the safe control — with no false positive. That's the whole idea: **flagged seven, proved six, discarded one.** Only real, proven exploits."

**[Switch to Test Manager — PEN dashboard]**

> "Every verdict is recorded in **UiPath Test Manager** — the system of record. **Six failed, one passed.** Red is a proven exploit; green means the app resisted. Screenshots and browser traces are attached as evidence — an audit-grade exploit locker."

**[Switch to Slack]**

> "The moment it proves real exploits, the agent posts to **Slack** — a prioritized summary with links to the evidence. The team knows immediately, with proof, not noise."

**[Switch to GitHub — the blocked PR]**

> "And here's where it meets developers. This is a real pull request that touched a vulnerable endpoint. Penetron proved a SQL injection — so the required check went **red**, and the **merge is blocked**. A vulnerable change never reaches main. That's shift-left security — automated, and governed by UiPath."

**[Close]**

> "Penetron — it proves exploitability, filters the noise, and lets UiPath govern the fix."

---

## Delivery tips
- The **MCP-terminal segment is the time-filler** while the ~45s Debug runs — stretch or trim it to match the run.
- Practice the Studio → MCP → Studio switch once so the agent finishes right as you return.
- Hide secrets on screen (no `.env`, no bearer token).
- Optional intro slide before this: the problem + "Flagged 7 → proved 6, discarded 1." Optional closing slide: recap + roadmap + repo link.
