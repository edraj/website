#!/usr/bin/env bash
#
# Build dmart.cc from the live dmart's public API and publish it.
#
#   ./deploy.sh              build, verify, upload, switch
#   ./deploy.sh --dry-run    build and verify only
#
# The site is served by the dmart instance itself: WebsiteMiddleware serves
# WEBSITE_DIR/<current build> under /website, and Caddy rewrites dmart.cc's root
# onto it (infra-ansible, role dmart, `landing_website`). So publishing is: copy
# the build into WEBSITE_DIR/builds/<stamp>/ and rename a one-line `current`
# pointer over the old one. The server picks it up on its next request, and the
# previous builds stay for rollback (write an older name into `current`).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="${DEPLOY_HOST:-i1}"                              # ssh host
RUN_AS="${DEPLOY_USER:-imx}"                           # the dmart instance's user
WEBSITE_DIR="${WEBSITE_DIR:-/home/imx/.dmart/website}" # that instance's WEBSITE_DIR
export DMART_URL="${DMART_URL:-https://dmart.cc/dmart}"
KEEP=3
DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1

cd "$HERE/app"
yarn install --frozen-lockfile --silent
yarn -s build
yarn -s verify
[ "$DRY" = 1 ] && { echo "dry run: built into app/dist/client, nothing published"; exit 0; }

stamp="$(date -u +%Y%m%dT%H%M%S)Z-$(git -C "$HERE" rev-parse --short HEAD)"
echo "== publishing $stamp to $HOST:$WEBSITE_DIR"
# The remote login shell may not be POSIX (it is fish on i1), so the remote
# side is a bash script on stdin, fed the archive through a heredoc-free pipe.
tar -C dist/client -czf - . | ssh "$HOST" "sudo -u $RUN_AS bash -c 'set -euo pipefail
  d=\"$WEBSITE_DIR/builds/$stamp\"
  mkdir -p \"\$d\"
  tar -xzf - -C \"\$d\"
  printf %s \"$stamp\" > \"$WEBSITE_DIR/.current.tmp\"
  mv -f \"$WEBSITE_DIR/.current.tmp\" \"$WEBSITE_DIR/current\"
  ls -1dt \"$WEBSITE_DIR\"/builds/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
  echo \"   live: \$(cat \"$WEBSITE_DIR/current\")\"'"

base="${SITE_URL:-https://dmart.cc}"
for path in / /data-model; do
    printf '   %-14s %s\n' "$path" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$base$path")"
done
