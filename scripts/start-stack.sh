#!/usr/bin/env bash
# Penetron local stack for the UiPath demo:
#   1. target app        (:4000)  — the intentionally-vulnerable app under test
#   2. MCP server (http)  (:7337)  — Remote MCP bridge the UiPath agent calls
#   3. cloudflared tunnel          — public HTTPS URL -> :7337
#
# NOTE: trycloudflare quick-tunnel URLs ROTATE each run. After starting, copy the
# printed https URL and update it in UiPath: Orchestrator -> MCP Servers -> Penetron
# -> Edit -> Remote URL = <printed-url>/mcp   (then Refresh tools in the agent).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/tmp

echo "Stopping any previous stack..."
pkill -f "server/index" 2>/dev/null || true
pkill -f "src/mcp/server.ts" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

echo "1/3 target app -> :4000"
( cd "$ROOT/target-app" && [ -d client/dist ] || npm run build:client >/dev/null 2>&1; \
  nohup npm start > "$LOG/penetron-target.log" 2>&1 & )

echo "2/3 MCP server -> :7337"
# PENETRON_MCP_ALLOWED_ACCOUNT (your UiPath org id, the design-time auth path) is read
# from the repo-root .env by the server's loadEnv — set it there, not here.
( cd "$ROOT/pentests" && \
  nohup env PENETRON_MCP_TRANSPORT=http PENETRON_MCP_PORT=7337 \
    ./node_modules/.bin/tsx src/mcp/server.ts > "$LOG/penetron-mcp.log" 2>&1 & )

echo "3/3 cloudflared tunnel"
nohup cloudflared tunnel --url http://localhost:7337 > "$LOG/penetron-cf.log" 2>&1 &

# wait for services + tunnel URL
sleep 5
URL=""
for i in $(seq 1 20); do
  URL=$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG/penetron-cf.log" | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done

echo
echo "==================== Penetron stack up ===================="
curl -s -o /dev/null -w "  target app   : http://localhost:4000  (HTTP %{http_code})\n" http://localhost:4000/ || true
echo "  MCP server   : http://localhost:7337/mcp"
echo "  PUBLIC MCP   : ${URL:-<not found, check $LOG/penetron-cf.log>}/mcp"
echo
echo "  >> Update UiPath MCP Server 'Penetron' Remote URL to:  ${URL}/mcp"
echo "     then Refresh tools in the agent."
echo "  logs: $LOG/penetron-{target,mcp,cf}.log"
echo "==========================================================="
