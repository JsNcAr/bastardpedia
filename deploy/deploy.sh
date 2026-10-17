#!/usr/bin/env bash
# Build the site from a checkout on the server and publish it to the folder
# Caddy serves (docs/DEPLOYMENT.md, "Deploying from the server"). Run it from
# the checkout, as the user that owns it:
#
#   deploy/deploy.sh                 # the latest main
#   deploy/deploy.sh v0.1.0          # a tag or any commit
#   FORCE=1 deploy/deploy.sh <older> # roll back on purpose
#
# Paths and the host come from project.config.json. Settings, all optional:
#   TARGET            where the site is published (default: <deployPath>/dist)
#   SITE              the host to check afterwards (default: the config's host;
#                     empty skips the check)
#   SITE_AUTH         user:password for that check while the site is private;
#                     without it the check only expects a 401
#   NVM_DIR           the deploying user's nvm (default: ~/.nvm)
#   DEPLOY_LOCK_WAIT  seconds to wait for another deploy to finish (default 600)
#
# Node comes from .nvmrc through the deploying user's nvm, never the system
# node, which other software on the server may depend on.
#
# vite empties its output folder when it starts, so it builds into
# .deploy/dist and the result is swapped into TARGET at the end: the live site
# never shows a half-built or empty dist/. Caddy needs no reload.
#
# The whole script is one function, read in full before it runs, so checking
# out another commit cannot change it mid-run. After the checkout it runs
# again from that commit, so a change to this script applies to the deploy
# that brings it.
set -euo pipefail

main() {
  # TARGET and SITE stay global: the caller may set them.
  local REPO REF BUILD OWNER
  REPO="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "deploy: run this from inside the repository" >&2
    exit 1
  }
  cd "$REPO"
  REF="${1:-origin/main}"

  if [ -z "${DEPLOY_REEXEC:-}" ]; then
    # Files written by anyone else would be left with the wrong owner, and git
    # refuses to work in a checkout another user owns.
    OWNER="$(stat -c %U "$REPO")"
    if [ "$(id -un)" != "$OWNER" ]; then
      echo "deploy: $REPO belongs to $OWNER; run this as that user:" >&2
      echo "deploy:   sudo -u $OWNER -H bash -lc 'cd $REPO && deploy/deploy.sh ${1:-}'" >&2
      exit 1
    fi

    # One deploy at a time, whoever starts it; a second one waits its turn.
    mkdir -p "$REPO/.deploy"
    exec 9>"$REPO/.deploy/lock"
    flock -w "${DEPLOY_LOCK_WAIT:-600}" 9 || {
      echo "deploy: another deploy is still running after ${DEPLOY_LOCK_WAIT:-600} s" >&2
      exit 1
    }

    if ! git diff --quiet || ! git diff --cached --quiet; then
      echo "deploy: the checkout at $REPO has local changes; refusing to deploy" >&2
      exit 1
    fi

    git fetch --prune --tags origin
    local NEW DEPLOYED
    NEW="$(git rev-parse --verify --quiet "$REF^{commit}")" || {
      echo "deploy: $REF is not a commit, branch or tag here" >&2
      exit 1
    }
    # The re-run below needs the script in the commit being deployed.
    git cat-file -e "$NEW:deploy/deploy.sh" 2>/dev/null || {
      echo "deploy: ${NEW:0:7} predates deploy/deploy.sh; deploy it from a build instead" >&2
      exit 1
    }
    # Two deploys can run out of order. Never replace a newer deploy with an
    # older commit unless asked to. Checked here, before the older commit's
    # own (possibly older) script would take over.
    DEPLOYED="$(cat "$REPO/.deploy/deployed" 2>/dev/null || true)"
    if [ -n "$DEPLOYED" ] && [ "$DEPLOYED" != "$NEW" ] && [ "${FORCE:-0}" != "1" ] &&
      git cat-file -e "$DEPLOYED^{commit}" 2>/dev/null &&
      git merge-base --is-ancestor "$NEW" "$DEPLOYED"; then
      echo "deploy: ${NEW:0:7} is older than the deployed ${DEPLOYED:0:7}; nothing to do (FORCE=1 rolls back)"
      exit 0
    fi
    git checkout --quiet --detach "$NEW"
    # Continue with this commit's version of the script; the lock (fd 9) is
    # inherited, so nothing can start in between.
    DEPLOY_REEXEC=1 exec bash "$REPO/deploy/deploy.sh" "$NEW"
  fi

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    echo "deploy: no nvm at $NVM_DIR; Node $(cat .nvmrc) is required (docs/DEPLOYMENT.md)" >&2
    exit 1
  fi
  # nvm is not written for -e or -u.
  set +eu
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use --silent >/dev/null
  local nvm_status=$?
  set -eu
  if [ "$nvm_status" != 0 ]; then
    echo "deploy: Node $(cat .nvmrc) is not installed for $(id -un); run: nvm install $(cat .nvmrc)" >&2
    exit 1
  fi

  local DEPLOY_PATH PRIVATE HEAD
  config() {
    node -e 'const c = JSON.parse(require("fs").readFileSync("project.config.json", "utf8"));
      process.stdout.write(String(c[process.argv[1]]))' "$1"
  }
  DEPLOY_PATH="$(config deployPath)"
  PRIVATE="$(config private)"
  TARGET="${TARGET:-$DEPLOY_PATH/dist}"
  SITE="${SITE-$(config host)}"
  BUILD="$REPO/.deploy/dist"
  HEAD="$(git rev-parse HEAD)"
  echo "deploy: $(git describe --tags --always) into $TARGET with Node $(node -v)"

  # The committed Caddyfile must match the config, and parse with this
  # server's Caddy: a broken one would break the shared Caddy at its next
  # reload. Installing it stays an admin's job.
  node scripts/deploy-config.mjs --check
  if command -v caddy >/dev/null 2>&1; then
    caddy adapt --config deploy/Caddyfile --adapter caddyfile >/dev/null
  fi
  if ! cmp -s deploy/Caddyfile "$DEPLOY_PATH/deploy/Caddyfile"; then
    echo "deploy: note: $DEPLOY_PATH/deploy/Caddyfile differs from deploy/Caddyfile;" >&2
    echo "deploy: an admin needs to copy it and reload Caddy (docs/DEPLOYMENT.md)" >&2
  fi

  export HUSKY=0
  npm ci --no-audit --no-fund
  npm run tags:validate
  npm run build:catalog
  rm -rf "$BUILD"
  npm run build -- --outDir "$BUILD" --emptyOutDir

  # An empty or partial build would swap in cleanly and serve nothing.
  local required
  for required in index.html data/catalog.json; do
    if [ ! -s "$BUILD/$required" ]; then
      echo "deploy: the build has no $required; refusing to publish it" >&2
      exit 1
    fi
  done

  # --delay-updates swaps every file in at the end, so nobody loads half a
  # deploy; --delete-after then removes what the new build no longer has.
  # --chmod keeps the /opt convention: setgid, group-writable.
  mkdir -p "$TARGET"
  rsync -a --chmod=D2775,F664 --delete-after --delay-updates "$BUILD/" "$TARGET/"
  echo "$HEAD" >"$REPO/.deploy/deployed"

  if [ -z "$SITE" ]; then
    echo "deploy: published $(git rev-parse --short HEAD) to $TARGET (no site check)"
    return
  fi

  # The page Caddy serves must be the one just built. The files are already
  # published at this point; a failure here is about Caddy, not the build.
  local status live="$REPO/.deploy/live.html" auth=()
  if [ -n "${SITE_AUTH:-}" ]; then auth=(-u "$SITE_AUTH"); fi
  status="$(curl -s -o "$live" -w '%{http_code}' "${auth[@]}" --resolve "$SITE:443:127.0.0.1" "https://$SITE/" || true)"

  if [ "$PRIVATE" = "true" ] && [ -z "${SITE_AUTH:-}" ]; then
    if [ "$status" = "401" ]; then
      echo "deploy: published $(git rev-parse --short HEAD); https://$SITE/ asks for a login as it should (SITE_AUTH also compares the page)"
      return
    fi
    echo "deploy: published to $TARGET, but https://$SITE/ answered ${status:-nothing} instead of 401." >&2
    echo "deploy: check that the imported Caddyfile is current and Caddy has been reloaded." >&2
    exit 2
  fi

  if [ "$status" != "200" ] || ! cmp -s "$live" "$TARGET/index.html"; then
    echo "deploy: published to $TARGET, but https://$SITE/ answered ${status:-nothing} with a different page." >&2
    echo "deploy: check that Caddy's site root is $TARGET (grep 'root \*' in the imported Caddyfile)," >&2
    echo "deploy: that the caddy user can read it, and 'journalctl -u caddy'. Then re-run; no rebuild is needed to check." >&2
    exit 2
  fi
  echo "deploy: https://$SITE/ now serves $(git rev-parse --short HEAD)"
}

main "$@"
exit
