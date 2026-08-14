#!/bin/bash
# Seed notifications test data for the Notifications page live verification.
set -e
BASE=http://localhost:8080/api
PASS='Test@1234'
P() { python -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null || echo ""; }

login() {
  curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}"
}

register() {
  curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\",\"fullName\":\"$2\",\"username\":\"$3\"}"
}

# ── Users ────────────────────────────────────────────────
OWNER_JSON=$(register "owner.notif@devsync.test" "Owner Notif" "ownernotif")
OWNER_TOKEN=$(echo "$OWNER_JSON" | P "['accessToken']")
if [ -z "$OWNER_TOKEN" ]; then
  OWNER_TOKEN=$(login "owner.notif@devsync.test" | P "['accessToken']")
fi
GUEST_JSON=$(register "guest.notif@devsync.test" "Guest Notif" "guestnotif")
GUEST_TOKEN=$(echo "$GUEST_JSON" | P "['accessToken']")
if [ -z "$GUEST_TOKEN" ]; then
  GUEST_TOKEN=$(login "guest.notif@devsync.test" | P "['accessToken']")
fi
GUEST_ID=$(echo "$GUEST_JSON" | P "['user']['id']")
if [ -z "$GUEST_ID" ]; then
  GUEST_ID=$(login "guest.notif@devsync.test" | P "['user']['id']")
fi
echo "owner token: ${OWNER_TOKEN:0:12}...  guest token: ${GUEST_TOKEN:0:12}...  guest id: $GUEST_ID"
echo "$OWNER_TOKEN" > /tmp/notif_owner_token.txt
echo "$GUEST_TOKEN" > /tmp/notif_guest_token.txt

# ── Project 1 + task assignment ──────────────────────────
P1=$(curl -s -X POST "$BASE/projects" -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Notification Center","description":"Live test of the redesigned notifications page","visibility":"PRIVATE"}')
P1_ID=$(echo "$P1" | P "['id']")
echo "project1: $P1_ID"

INV1=$(curl -s -X POST "$BASE/projects/$P1_ID/invite" -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" -d "{\"userId\":\"$GUEST_ID\",\"message\":\"Join Notification Center\"}")
INV1_ID=$(echo "$INV1" | P "['id']")
echo "invite1: $INV1_ID"

# Guest accepts → membership + PROJECT_INVITE_ACCEPTED to owner
curl -s -X PUT "$BASE/invitations/$INV1_ID/accept" -H "Authorization: Bearer $GUEST_TOKEN" > /dev/null
echo "guest accepted invite1"

# Owner creates a board + task assigned to guest → TASK_ASSIGNED to guest
BOARD=$(curl -s -X POST "$BASE/boards?name=Board&projectId=$P1_ID&columns=To%20Do,In%20Progress,Done" \
  -H "Authorization: Bearer $OWNER_TOKEN")
COL_ID=$(echo "$BOARD" | python -c "import sys,json;d=json.load(sys.stdin);print(d['columns'][0]['id'])" 2>/dev/null)
echo "column: $COL_ID"
curl -s -X POST "$BASE/boards/tasks" -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Design the notification cards\",\"description\":\"Match the reference design\",\"columnId\":\"$COL_ID\",\"assigneeId\":\"$GUEST_ID\",\"priority\":\"HIGH\"}" > /dev/null
echo "task assigned to guest"

# ── Project 2 + pending invite (for in-browser Accept) ───
P2=$(curl -s -X POST "$BASE/projects" -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Second Project","description":"Invite stays pending for the browser test","visibility":"PRIVATE"}')
P2_ID=$(echo "$P2" | P "['id']")
curl -s -X POST "$BASE/projects/$P2_ID/invite" -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" -d "{\"userId\":\"$GUEST_ID\",\"message\":\"Join Second Project\"}" > /dev/null
echo "project2 pending invite sent"

# ── Guest notification state ─────────────────────────────
sleep 1
curl -s "$BASE/notifications?limit=50" -H "Authorization: Bearer $GUEST_TOKEN" > /tmp/notif_list.json
python -c "
import json
d = json.load(open('/tmp/notif_list.json'))
for n in d:
    print(n['type'], '|', n['read'], '|', (n['message'] or '')[:70])
print('TOTAL', len(d), 'UNREAD', sum(1 for n in d if not n['read']))
"

# Mark the oldest (PROJECT_INVITE for project 1) as read for filter testing
OLDEST_ID=$(python -c "import json;d=json.load(open('/tmp/notif_list.json'));print(d[-1]['id'])" 2>/dev/null)
curl -s -X PUT "$BASE/notifications/$OLDEST_ID/read" -H "Authorization: Bearer $GUEST_TOKEN" > /dev/null
echo "marked oldest notification read"

echo "=== FINAL STATE ==="
curl -s "$BASE/notifications?limit=50" -H "Authorization: Bearer $GUEST_TOKEN" | python -c "
import sys,json
d = json.load(sys.stdin)
for n in d:
    print(n['type'], '|', 'READ' if n['read'] else 'NEW ', '|', (n['message'] or '')[:70])
print('TOTAL', len(d), 'UNREAD', sum(1 for n in d if not n['read']))
"
echo "DONE"
