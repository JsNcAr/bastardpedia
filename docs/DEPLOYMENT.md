# Deployment

The site is static files served by Caddy on any server. There's no
application process. The layout is `/opt/<slug>/dist` for the files and
`/opt/<slug>/deploy` for the Caddy configuration.

| Path on the server                   | Content                                                     |
| ------------------------------------ | ----------------------------------------------------------- |
| `/opt/bastardpedia/dist`             | `npm run build` output, rsynced by CI (`deploy`) or by hand |
| `/opt/bastardpedia/deploy/Caddyfile` | copy of `deploy/Caddyfile`, imported by the main Caddyfile  |

## The Caddyfile is generated

`deploy/Caddyfile` is generated from `project.config.json` by
`npm run deploy:config`. CI fails when the committed copy is stale. It provides:

- automatic HTTPS for the host;
- **history-routing fallback**: `try_files {path} /index.html` (ADR 0002);
- `immutable` caching for `/assets/*`, and `no-cache` for the HTML, service worker,
  manifest and `/data/*` (the catalog);
- a strict CSP with no `unsafe-inline` for scripts or styles. ESLint bans inline
  `style` attributes so this keeps holding;
- while `"private": true`: **basic auth** and `X-Robots-Tag: noindex, nofollow`.

## First-time server setup (admin)

1. DNS: point `bastardpedia.ramsus.site` at the server.
2. Create the folders, owned by the user that deploys (here `deploy`):
   `sudo install -d -o deploy -g deploy -m 2775 /opt/bastardpedia/{dist,deploy}`
3. Copy `deploy/Caddyfile` to `/opt/bastardpedia/deploy/` and add
   `import /opt/bastardpedia/deploy/Caddyfile` to the main Caddyfile.
4. Basic-auth credentials (while private): add to Caddy's environment, e.g. a
   systemd drop-in for the caddy service:
   ```
   BASTARDPEDIA_AUTH_USER=<user>
   BASTARDPEDIA_AUTH_HASH=<output of: caddy hash-password>
   ```
   The variable prefix is the slug in upper case.
5. `caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`
6. GitHub Actions deploy settings (variable, environment and secrets): see
   [CI.md](CI.md).

To validate the generated file locally without installing Caddy:

```sh
docker run --rm -i -e BASTARDPEDIA_AUTH_USER=u -e BASTARDPEDIA_AUTH_HASH='$2a$14$...' caddy:2 \
  sh -c 'cat > /tmp/Caddyfile && caddy validate --config /tmp/Caddyfile' < deploy/Caddyfile
```

## Going public

1. Set `"private": false` in `project.config.json` and run `npm run deploy:config`.
2. Commit, release, copy the new Caddyfile to the server and reload Caddy.
3. Remove the `SITE_AUTH` secret from the `production` environment.

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
