# Deployment

The site is static files served by Caddy on any server. There's no
application process. The layout is `/opt/<slug>/dist` for the files and
`/opt/<slug>/deploy` for the Caddy configuration.

| Path on the server                   | Content                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `/opt/bastardpedia/dist`             | `npm run build` output, rsynced by CI (`deploy`) or built on the server by `deploy.sh` |
| `/opt/bastardpedia/deploy/Caddyfile` | copy of `deploy/Caddyfile`, imported by the main Caddyfile                             |
| `/opt/bastardpedia/repo`             | optional checkout for [deploying from the server](#deploying-from-the-server)          |

There are two ways to ship a build, and both publish to the same `dist/`:

- **CI** (`release.yml`): a version tag builds and tests `dist/` on GitHub, then
  rsyncs that exact folder to the server ([CI.md](CI.md)).
- **From the server** (`deploy/deploy.sh`): the deploy user builds a commit in
  its checkout and swaps the result in. Use it for the first deploy, when CI is
  unavailable, or to roll back.

## The Caddyfile is generated

`deploy/Caddyfile` is generated from `project.config.json` by
`npm run deploy:config`. CI fails when the committed copy is stale. It provides:

- automatic HTTPS for the host;
- **history-routing fallback**: `try_files {path} /index.html` (ADR 0002);
- **precompressed files**: `file_server { precompressed br zstd gzip }` serves
  the `.br`, `.zst` and `.gz` files the build writes, so Caddy never compresses
  at request time;
- `immutable` caching for `/assets/*` and the hashed catalogue
  (`/data/catalog.<hash>.json`), a week for the icons, and `no-cache` for
  everything else: the HTML (app routes included), the service worker, the
  manifest and the plain `/data/catalog.json`;
- an access log that rolls at 50 MiB and keeps 5 files;
- a strict CSP with no `unsafe-inline` for scripts or styles. ESLint bans inline
  `style` attributes so this keeps holding;
- only while `"private": true`: **basic auth** and `X-Robots-Tag: noindex, nofollow`.
  The site is public; [Making it private](#making-it-private) covers switching.

It works with Caddy 2.6 and later. Basic auth is written `basicauth` because
the newer `basic_auth` spelling needs Caddy 2.8.

## Serving under load

Every request is a plain file read. These are the parts that keep it cheap:

- **No compression at request time.** The build writes brotli, zstd and gzip
  copies of every text file of 1 KiB or more (the `precompress` plugin in
  `vite.config.ts`, using `scripts/lib/compress-core.mjs`). Caddy picks the
  best one the browser accepts. Only files under 1 KiB, such as `index.html`,
  are compressed on the fly.
- **Cache forever where names change.** Vite fingerprints `assets/`, and the
  build also ships the catalogue as `data/catalog.<hash>.json`. The app fetches
  that name (`__CATALOG_URL__`), so it's cached for a year and, by the service
  worker, cache-first. A release changes the name.
- **Repeat visits stay in the browser.** The service worker precaches the app
  and serves it offline-first. A returning visitor sends no requests for assets
  or data, only the browser's background check for a newer service worker.
- **Small first visit.** Only the Latin and Latin Extended font subsets ship
  (`src/styles/fonts.css`), and the library database code (Dexie) loads only
  when a story page or the Library needs it.
- **No per-request password cost.** While the site is private, Caddy caches the
  basic-auth hash check, so bcrypt runs once per password, not per request.

Measured on a local Caddy limited to 2 CPUs (64 connections, 15 s per URL), the
main bundle went from 523 to 9,554 requests a second and the catalogue from 374
to 7,541 once compression moved to build time. At those rates the network link
runs out long before the CPU.

On the server:

- **HTTP/3:** open UDP 443 as well as TCP 443. Caddy serves HTTP/3 by default,
  but it needs UDP to reach clients.
- **Ship whole builds:** `deploy.sh` and CI rsync the whole build, so the
  compressed copies and the hashed catalogue go with it. A hand-made deploy
  must too: `rsync -a --delete dist/ ...`.

## First-time server setup (admin)

1. DNS: point `bastardpedia.ramsus.site` at the server.
2. Create the folders, owned by the user that deploys (here `deploy`):
   `sudo install -d -o deploy -g deploy -m 2775 /opt/bastardpedia /opt/bastardpedia/{dist,deploy}`
3. Copy `deploy/Caddyfile` to `/opt/bastardpedia/deploy/` and add
   `import /opt/bastardpedia/deploy/Caddyfile` to the main Caddyfile.
4. `caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`
5. Ship a first build: [from the server](#deploying-from-the-server), or by
   copying a local `dist/` into `/opt/bastardpedia/dist/` as the deploy user.
6. GitHub Actions deploy settings (variable, environment and secrets): see
   [CI.md](CI.md).

To validate the generated file locally without installing Caddy, with the
oldest Caddy it supports:

```sh
docker run --rm -i caddy:2.6 \
  sh -c 'cat > /tmp/Caddyfile && caddy validate --config /tmp/Caddyfile' < deploy/Caddyfile
```

## Deploying from the server

`deploy/deploy.sh` builds a commit in a checkout on the server and publishes
it to `<deployPath>/dist`:

1. **Single deploys only.** It takes a lock, refuses a checkout with local
   changes, and won't replace a newer deploy with an older commit unless
   `FORCE=1` is set.
2. **Build and checks.** It checks out the commit, re-runs that commit's copy of
   itself, then runs `npm ci`, `tags:validate`, `build:catalog` and `build` into
   `.deploy/dist`.
3. **Publish.** It rsyncs the build into place in one swap, so nobody loads half
   a deploy.
4. **Verify.** It checks that Caddy serves the new `index.html`.

It also checks that `deploy/Caddyfile` parses and is current, and warns when
the installed copy differs. Installing the Caddyfile stays an admin's job, so a
pull can't change the shared Caddy configuration on its own.

### Setup (once, as the deploy user)

Node comes from `.nvmrc` through the deploy user's own nvm. Don't upgrade the
system Node for this: other software on the server may build with it.

```sh
sudo -u deploy -H bash

# nvm, without touching any shell startup file. Nothing else this user runs
# (cron jobs, other projects' deploys over SSH) changes Node version, because
# only deploy.sh loads nvm.
export NVM_DIR="$HOME/.nvm"
git clone --depth 1 --branch v0.40.3 https://github.com/nvm-sh/nvm.git "$NVM_DIR"
. "$NVM_DIR/nvm.sh" && nvm install 24

# The checkout. The repository is public, so HTTPS needs no key. If it goes
# private, use a read-only GitHub deploy key for this repository only.
git clone https://github.com/JsNcAr/bastardpedia.git /opt/bastardpedia/repo
```

When `.nvmrc` moves to a new major version, run `nvm install <version>` as
the deploy user before the next deploy. The script stops and says so until
you do.

### Deploying

```sh
sudo -u deploy -H bash -lc 'cd /opt/bastardpedia/repo && deploy/deploy.sh'          # latest main
sudo -u deploy -H bash -lc 'cd /opt/bastardpedia/repo && deploy/deploy.sh v0.1.0'   # a tag
sudo -u deploy -H bash -lc 'cd /opt/bastardpedia/repo && FORCE=1 deploy/deploy.sh v0.1.0'  # roll back
```

| Setting            | Default                | Meaning                                                 |
| ------------------ | ---------------------- | ------------------------------------------------------- |
| `TARGET`           | `<deployPath>/dist`    | where the build is published                            |
| `SITE`             | `host` from the config | host to check afterwards; empty skips the check         |
| `SITE_AUTH`        | none                   | `user:password` for the check while the site is private |
| `NVM_DIR`          | `~/.nvm`               | the deploy user's nvm                                   |
| `DEPLOY_LOCK_WAIT` | `600`                  | seconds to wait for another deploy to finish            |

State lives in `.deploy/` in the checkout (gitignored): the lock, the build,
and the last deployed commit. Exit code 2 means the files were published but
Caddy didn't serve them as expected. Fix Caddy and re-run; nothing needs
rebuilding.

## Making it private

The site is public. To put it behind a login, for instance if traffic gets
too heavy for the server:

1. Set `"private": true` in `project.config.json`, run `npm run deploy:config`,
   and commit. This also brings back `X-Robots-Tag: noindex, nofollow`.
2. On the server, give Caddy the credentials with a systemd drop-in
   (`sudo systemctl edit caddy`), then `sudo systemctl daemon-reload`:
   ```
   [Service]
   Environment=BASTARDPEDIA_AUTH_USER=<user>
   Environment=BASTARDPEDIA_AUTH_HASH=<output of: caddy hash-password>
   ```
   The variable prefix is the slug in upper case. Without these variables Caddy
   answers 401 to every request, so a missing step locks everyone out rather
   than leaving the site open.
3. Install the new Caddyfile, validate and reload Caddy (first-time setup,
   steps 3 and 4).
4. Add the `SITE_AUTH` secret (`user:password`) to the `production`
   environment so CI's live check can log in.

To go public again, reverse it: `"private": false`, regenerate, commit,
install, reload, and remove the `SITE_AUTH` secret.

## Renaming the project

Everything name-dependent comes from `project.config.json`: `name`, `slug`,
`shortName`, `description`, `host`, `deployPath` and `repository`.

1. Edit `project.config.json`.
2. `npm run deploy:config`, then commit.
3. On the server: create the new `deployPath`, install the new Caddyfile, and
   rename the auth environment variables to the new slug prefix.
4. Update `environment.url` in `.github/workflows/release.yml`. Actions can't
   read it from a file.
5. Optionally rename `name` in `package.json` and the GitHub repository (then
   update `repository.url`).

The app's title, PWA manifest, Caddyfile, deploy job paths and release URLs all
follow from the config.
