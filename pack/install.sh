#!/usr/bin/env bash
#
# Install the `website` pack into a dmart: its space (pages, site settings,
# schemas) and the role + permission that let anonymous visitors read it.
#
#   pack/install.sh                    import; existing rows are skipped
#   pack/install.sh --replace          import, overwriting existing rows
#   pack/install.sh --public           also grant the anonymous user `website_public`
#   pack/install.sh --dry-run          show what would be imported, change nothing
#
# The layout is csdmart's pack format (pack.json + space/ + management/), so
# csdmart's packs/install.sh can install it too once packs can come from
# outside that repo. Until then this script does the two steps a pack this
# small needs.
#
# Environment:
#   BACKEND_ENV           config.env of the dmart to install into (the CLI never
#                         reads ./config.env from the current directory)
#   DMART_BIN             the dmart binary (default: `dmart` on PATH)
#   DMART_URL             API base URL, for --public (e.g. http://127.0.0.1:8282)
#   DMART_ADMIN           admin shortname, for --public (default: dmart)
#   DMART_ADMIN_PASSWORD  admin password, for --public
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DMART="${DMART_BIN:-dmart}"
URL="${DMART_URL:-}"
ADMIN="${DMART_ADMIN:-dmart}"
REPLACE=0
PUBLIC=0
DRY=0

for arg in "$@"; do
    case "$arg" in
        --replace) REPLACE=1 ;;
        --public)  PUBLIC=1 ;;
        --dry-run) DRY=1 ;;
        -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
        *) echo "unknown option: $arg" >&2; exit 1 ;;
    esac
done

SPACE="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["space"])' "$HERE/pack.json")"

# The importer takes a directory of spaces: the pack's space under its own
# name, and the management overlay (roles, permissions) beside it. The
# overlay carries no space meta, so the management space itself is untouched.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -a "$HERE/space" "$STAGE/$SPACE"
mkdir -p "$STAGE/management"
cp -a "$HERE/management/." "$STAGE/management/"

echo "== website pack $(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$HERE/pack.json") → space '$SPACE'"
echo "   $(find "$STAGE/$SPACE" -type f | wc -l) space files, $(find "$STAGE/management" -type f | wc -l) management files"

if [ "$DRY" = 1 ]; then
    (cd "$STAGE" && find . -type f | sort | sed 's|^\./|   |')
    exit 0
fi

args=(import --type=fs)
[ "$REPLACE" = 1 ] && args+=(-r)
"$DMART" "${args[@]}" "$STAGE"

if [ "$PUBLIC" = 1 ]; then
    role="$(python3 -c 'import json,sys; print(" ".join(json.load(open(sys.argv[1]))["provides"]["public_roles"]))' "$HERE/pack.json")"
    if [ -z "$URL" ] || [ -z "${DMART_ADMIN_PASSWORD:-}" ]; then
        echo "== public: skipped — set DMART_URL and DMART_ADMIN_PASSWORD to grant '$role' to the anonymous user" >&2
        exit 0
    fi
    echo "== public: granting the anonymous user '$role'"
    token="$(curl -fsS -m 15 -X POST "$URL/user/login" -H 'Content-Type: application/json' \
        -d "$(python3 -c 'import json,os,sys; print(json.dumps({"shortname": sys.argv[1], "password": os.environ["DMART_ADMIN_PASSWORD"]}))' "$ADMIN")" \
      | python3 -c 'import json,sys; print(json.load(sys.stdin)["records"][0]["attributes"]["access_token"])')"
    # Union, never overwrite: `anonymous` already holds `world`, and dropping
    # it would stop the world permission resolving at all.
    current="$(curl -fsS -m 15 "$URL/managed/entry/user/management/users/anonymous" -H "Authorization: Bearer $token" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print(" ".join(d.get("attributes", d).get("roles") or []))')"
    body="$(python3 -c '
import json, sys
roles = sorted(set(sys.argv[1].split()) | set(sys.argv[2].split()))
print(json.dumps({"space_name": "management", "request_type": "update", "records": [
    {"resource_type": "user", "shortname": "anonymous", "subpath": "users", "attributes": {"roles": roles}}]}))' "$current" "$role")"
    curl -fsS -m 15 -X POST "$URL/managed/request" -H 'Content-Type: application/json' \
        -H "Authorization: Bearer $token" -d "$body" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print("   " + d.get("status", "?"))'
fi
