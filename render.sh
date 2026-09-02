#!/bin/bash
# Jednoduchá terminálová ovládačka pro jednorázové skripty na Renderu (free tier
# nemá Shell, takže se skript spouští přes dočasnou změnu Start Command + deploy).
#
# Použití:
#   export RENDER_API_KEY="rnd_xxxxxxxxxxxx"
#   ./render.sh import-contacts
#
# API klíč získáš na dashboard.render.com -> ikona profilu vpravo nahoře
# -> Account Settings -> API Keys -> Create API Key.

set -e

if [ -z "$RENDER_API_KEY" ]; then
  echo "Chybí RENDER_API_KEY. Spusť nejdřív: export RENDER_API_KEY=\"rnd_...\""
  exit 1
fi

SERVICE_NAME="crm-backend"
API="https://api.render.com/v1"
NORMAL_CMD="npm run prisma:push && npm run start:prod"

echo "Hledám service ID pro $SERVICE_NAME..."
SERVICE_ID=$(curl -sf -H "Authorization: Bearer $RENDER_API_KEY" "$API/services?name=$SERVICE_NAME&limit=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['service']['id'])")
echo "Service ID: $SERVICE_ID"

set_start_command() {
  curl -sf -X PATCH "$API/services/$SERVICE_ID" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"serviceDetails\":{\"envSpecificDetails\":{\"startCommand\":\"$1\"}}}" > /dev/null
}

trigger_deploy() {
  curl -sf -X POST "$API/services/$SERVICE_ID/deploys" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"
}

wait_for_deploy() {
  local deploy_id=$1
  while true; do
    STATUS=$(curl -sf "$API/services/$SERVICE_ID/deploys/$deploy_id" \
      -H "Authorization: Bearer $RENDER_API_KEY" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
    echo "  stav deploye: $STATUS"
    if [ "$STATUS" = "live" ]; then
      echo "Deploy hotovy."
      break
    fi
    if [[ "$STATUS" == *"failed"* || "$STATUS" == "canceled" ]]; then
      echo "Deploy selhal (stav: $STATUS). Zkontroluj Logs na dashboard.render.com."
      exit 1
    fi
    sleep 10
  done
}

case "$1" in
  import-contacts)
    RUN_CMD="npm run import-contacts && npm run prisma:push && npm run start:prod"
    ;;
  rename-admin)
    RUN_CMD="npm run rename-admin && npm run prisma:push && npm run start:prod"
    ;;
  rename-agents)
    RUN_CMD="npm run rename-agents && npm run prisma:push && npm run start:prod"
    ;;
  backfill-old-website)
    RUN_CMD="npm run prisma:push && npm run backfill-old-website && npm run start:prod"
    ;;
  set-august-targets)
    RUN_CMD="npm run prisma:push && npm run set-august-targets && npm run start:prod"
    ;;
  migrate-lead-status-pipeline)
    RUN_CMD="npm run prisma:push && npm run migrate-lead-status-pipeline && npm run start:prod"
    ;;
  *)
    echo "Použití: ./render.sh <import-contacts|rename-admin|rename-agents|backfill-old-website|set-august-targets|migrate-lead-status-pipeline>"
    exit 1
    ;;
esac

echo "1) Nastavuji docasny Start Command: $RUN_CMD"
set_start_command "$RUN_CMD"

echo "2) Spoustim deploy..."
DEPLOY_ID=$(trigger_deploy)
echo "   Deploy ID: $DEPLOY_ID"
wait_for_deploy "$DEPLOY_ID"

echo "3) Vracim Start Command zpatky na normalni provoz..."
set_start_command "$NORMAL_CMD"

echo "4) Spoustim jeste jeden deploy, aby se normalni Start Command aplikoval..."
DEPLOY_ID2=$(trigger_deploy)
echo "   Deploy ID: $DEPLOY_ID2"
wait_for_deploy "$DEPLOY_ID2"

echo ""
echo "Hotovo. Zkontroluj v zalozce Logs na dashboard.render.com, ze se vypsalo"
echo "'Hotovo, vytvoreno leadu: 12', a pak se koukni do CRM."
