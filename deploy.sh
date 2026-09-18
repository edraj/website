#!/usr/bin/env bash
#
# Build dmart.cc from main and publish it to the directory Caddy serves.
#
#   ./deploy.sh              # build and deploy
#   ./deploy.sh --dry-run    # everything except the publish + verify
#
# Served by Caddy from /var/www/html/www/ with `try_files {path} /index.html`
# (see /etc/caddy/Caddyfile.d/dmart.conf). That fallback is what makes deep
# links work for the SPA router; nothing here should change it.
#
# WHAT THE PREVIOUS VERSION DID, AND WHY EACH LINE CHANGED
#
#   rm yarn.lock        Deleted the lockfile on every deploy, so `yarn` resolved
#                       fresh versions each time and the deployed build could
#                       differ from anything tested. It is also why the checkout
#                       here sat permanently dirty. Now: --frozen-lockfile, which
#                       fails loudly if package.json and yarn.lock disagree.
#   git merge           No argument and no clean-tree check, so it merged
#                       whatever upstream happened to be and stopped on the
#                       dirty tree left by the line above. Now: an explicit
#                       --ff-only against origin/main, which refuses to invent a
#                       merge commit on a deploy box.
#   (no set -e)         Every step's failure was ignored -- including `yarn
#                       build`. The rsync --delete then published whatever was
#                       in dist/, or emptied the site. That was the real hazard
#                       here, and `set -euo pipefail` is most of the fix.
#   rsync ... --delete  Ran unconditionally. Now it runs only after the build is
#                       verified to have produced a real index.html and asset
#                       bundle, and the previous release is kept for rollback.
#
set -euo pipefail

# Defaults match the dmart.cc host; override per environment.
REPO_DIR="${REPO_DIR:-/home/imx/website}"
WEB_ROOT="${WEB_ROOT:-/var/www/html/www}"
BACKUP_DIR="${BACKUP_DIR:-/home/imx/website-releases}"
SITE_URL="${SITE_URL:-https://dmart.cc}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

say() { printf '\n\033[1;35m==>\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31mFAILED:\033[0m %s\n' "$*" >&2; exit 1; }

cd "$REPO_DIR"

# ---------------------------------------------------------------- source ----
say "Updating from origin/main"
git fetch --quiet origin

# A deploy box should build exactly what is on main. Anything else here is
# either a leftover from the old `rm yarn.lock` or someone editing in place,
# and both should be noticed rather than silently built and shipped.
if ! git diff --quiet || ! git diff --cached --quiet; then
  git status --short
  die "working tree is dirty. Commit, or 'git checkout -- .' to discard, then re-run."
fi

BEFORE=$(git rev-parse --short HEAD)
git merge --ff-only origin/main \
  || die "cannot fast-forward to origin/main (local commits here?). Resolve manually."
AFTER=$(git rev-parse --short HEAD)

if [[ "$BEFORE" == "$AFTER" ]]; then
  say "Already at origin/main ($AFTER) — rebuilding anyway"
else
  say "Updated $BEFORE -> $AFTER"
  git --no-pager log --oneline --no-merges "$BEFORE..$AFTER"
fi

# ----------------------------------------------------------------- build ----
say "Installing dependencies (frozen lockfile)"
yarn install --frozen-lockfile \
  || die "yarn install failed. If package.json changed, regenerate yarn.lock and commit it."

say "Type-checking"
yarn run check || die "svelte-check/tsc failed — not deploying a broken build."

say "Building"
yarn build || die "build failed."

# The build is only trustworthy if it actually produced something. Publishing an
# empty or partial dist/ over the live site with --delete is the worst outcome
# available to this script, so check before, not after.
[[ -f dist/index.html ]]                   || die "dist/index.html missing after build."
[[ -s dist/index.html ]]                   || die "dist/index.html is empty."
compgen -G "dist/assets/index-*.js" >/dev/null || die "no entry bundle in dist/assets."
grep -q "<div id=\"app\">" dist/index.html || die "dist/index.html does not look like the app shell."

ENTRY_JS=$(ls -1 dist/assets/index-*.js | head -1)
say "Build OK — entry bundle $(du -h "$ENTRY_JS" | cut -f1) ($(basename "$ENTRY_JS"))"

if [[ $DRY_RUN -eq 1 ]]; then
  say "--dry-run: stopping before publish"
  exit 0
fi

# --------------------------------------------------------------- publish ----
# Keep the outgoing release so a bad deploy can be undone without a rebuild.
if [[ -d "$WEB_ROOT" ]]; then
  mkdir -p "$BACKUP_DIR"
  STAMP=$(date +%Y%m%d-%H%M%S)
  say "Backing up current release to $BACKUP_DIR/$STAMP"
  cp -a "$WEB_ROOT" "$BACKUP_DIR/$STAMP"
  # Keep the last five; this is a deploy box, not an archive.
  ls -1dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf
fi

say "Publishing to $WEB_ROOT"
rsync -a --checksum --delete dist/ "$WEB_ROOT/"

# ---------------------------------------------------------------- verify ----
# `curl -f` alone would be satisfied by Caddy's fallback serving a stale
# index.html, so assert on content that only THIS build produces.
say "Verifying $SITE_URL"
sleep 2
HTML=$(curl -fsS --max-time 20 "$SITE_URL/" 2>/dev/null) || die "$SITE_URL did not respond."

EXPECTED_JS=$(basename "$ENTRY_JS")
grep -q "$EXPECTED_JS" <<<"$HTML" \
  || die "live index.html does not reference $EXPECTED_JS — the publish did not take effect."

curl -fsS -o /dev/null --max-time 20 "$SITE_URL/$EXPECTED_JS" 2>/dev/null \
  || curl -fsS -o /dev/null --max-time 20 "$SITE_URL/assets/$EXPECTED_JS" \
  || die "entry bundle is not fetchable from the live site."

# The SPA fallback is what makes shared links work; a Caddy change could break
# it without touching anything in this repo, so confirm it on every deploy.
DEEP=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 20 "$SITE_URL/technical") || true
[[ "$DEEP" == "200" ]] || die "deep link /technical returned $DEEP — SPA fallback is not working."

say "Deployed $AFTER and verified live at $SITE_URL"
