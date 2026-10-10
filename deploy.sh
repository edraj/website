#!/usr/bin/env bash
#
# Build dmart.cc from the live dmart's public API and publish it.
#
#   ./deploy.sh              build, verify, upload, switch
#   ./deploy.sh --dry-run    build and verify only
#
# Caddy serves the site from disk: SITE_DIR/current is a symlink to the live
# build (infra-ansible, role dmart, `landing_static`); dmart is not involved at
# runtime, only at build time, through its public API. So publishing is: copy
# the build into SITE_DIR/builds/<stamp>/ and rename a new `current` symlink
# over the old one. Caddy serves it from the next request, and the previous
# builds stay for rollback:
#   ssh i1 "sudo -u imx ln -sfn builds/<older> /var/www/dmart.cc/.c && sudo -u imx mv -Tf /var/www/dmart.cc/.c /var/www/dmart.cc/current"
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="${DEPLOY_HOST:-i1}"                              # ssh host
RUN_AS="${DEPLOY_USER:-imx}"                           # owns the site directory
SITE_DIR="${SITE_DIR:-/var/www/dmart.cc}"              # what Caddy serves
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
echo "== publishing $stamp to $HOST:$SITE_DIR"
# The remote login shell may not be POSIX (it is fish on i1), so the remote
# side is a bash script on stdin, fed the archive through a heredoc-free pipe.
# umask 022: Caddy reads the files through the directory's group (caddy).
tar -C dist/client -czf - . | ssh "$HOST" "sudo -u $RUN_AS bash -c 'set -euo pipefail
  umask 022
  d=\"$SITE_DIR/builds/$stamp\"
  mkdir -p \"\$d\"
  tar -xzf - -C \"\$d\"
  ln -sfn \"builds/$stamp\" \"$SITE_DIR/.current.tmp\"
  mv -Tf \"$SITE_DIR/.current.tmp\" \"$SITE_DIR/current\"
  ls -1dt \"$SITE_DIR\"/builds/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
  echo \"   live: \$(readlink \"$SITE_DIR/current\")\"'"

base="${SITE_URL:-https://dmart.cc}"
for path in / /data-model; do
    printf '   %-14s %s\n' "$path" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$base$path")"
done
