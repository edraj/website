#!/usr/bin/env bash
#
# Runs every ```bash block of SKILL.md, in order, against a dmart, and fails
# when a recipe does not do what the skill says it does.
#
#   DMART=http://127.0.0.1:8282 DMART_PASSWORD=... skill/test-recipes.sh
#
# Point it at a throwaway dmart: the recipes create a `library` space and a
# `reader1` user. CI runs it after the website pack is installed.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${DMART:?set DMART to the dmart base URL}" "${DMART_PASSWORD:?set DMART_PASSWORD for the admin}"
export DMART DMART_PASSWORD

script="$(mktemp)"
trap 'rm -f "$script"' EXIT
python3 -I - "$HERE/SKILL.md" > "$script" <<'PY'
import re, sys
blocks = re.findall(r"```bash\n(.*?)```", open(sys.argv[1]).read(), re.S)
print("set -euo pipefail")
for i, block in enumerate(blocks, 1):
    print(f'echo "== recipe block {i}"')
    print(block)
PY

out="$(bash "$script" 2>&1)" || { echo "$out"; echo "FAIL: a recipe block exited non-zero"; exit 1; }
echo "$out"

failures=0
fail() { echo "FAIL: $*"; failures=$((failures + 1)); }
expect() { grep -qF -- "$1" <<< "$out" || fail "expected $2: $1"; }

# Every answer printed is a success, except the blocks marked `# expect: failed`.
want_failed=$(grep -c '^# expect: failed' "$HERE/SKILL.md" || true)
got_failed=$(grep -c '"status":"failed"' <<< "$out" || true)
[ "$got_failed" = "$want_failed" ] || fail "$got_failed answers failed, the skill expects $want_failed"
grep -q '"status":null' <<< "$out" && fail "an answer had no status (a non-JSON or empty response)"

expect '{"status":"success","shortname":"dmart"}' "sign-in and profile"
expect '"books":[{"shortname":"piranesi","year":2020}]' "the year query to find Piranesi only"
expect '"code":430' "the schema refusal to answer 430"
expect '"body":{"title":"Dune","author":"Frank Herbert","year":1966}' "the update to merge one field"
expect '{"state":"lent","is_open":true}' "the ticket to move to lent"
expect '"report":[{"entries":2' "the dry run to count the folder and its ticket"

reader=$(curl -s -X POST "$DMART/user/login" -H 'content-type: application/json' \
  -d '{"shortname":"reader1","password":"Reader-pass-42"}' | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["records"][0]["attributes"]["access_token"])')
can_read=$(curl -s -H "authorization: Bearer $reader" -H 'content-type: application/json' -X POST "$DMART/managed/query" \
  -d '{"type":"search","space_name":"library","subpath":"/books","search":""}' | python3 -I -c 'import json,sys; print(len(json.load(sys.stdin)["records"]))')
[ "$can_read" -ge 2 ] || fail "reader1 should read the books, saw $can_read"
can_write=$(curl -s -H "authorization: Bearer $reader" -H 'content-type: application/json' -X POST "$DMART/managed/request" \
  -d '{"space_name":"library","request_type":"create","records":[{"resource_type":"content","subpath":"books","shortname":"x","attributes":{}}]}' \
  | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["status"])')
[ "$can_write" = failed ] || fail "reader1 should not write, got $can_write"

if [ "$failures" -gt 0 ]; then echo "test-recipes: $failures failure(s)"; exit 1; fi
echo "test-recipes: every recipe in SKILL.md does what it says"
