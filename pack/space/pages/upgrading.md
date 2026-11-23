A new release installs over the old one, keeps `config.env` and the data, and brings the database up to date itself when it starts.

## Before you upgrade

- **Back up.** On SQLite, copy the database file (`/var/lib/dmart/dmart.db` for the packages) while the service is stopped; on PostgreSQL, take a `pg_dump`. [`dmart export`](/cli#5-export) also writes each space out as files.
- **Several nodes** sharing one PostgreSQL database are upgraded together; see [Running several nodes](/technical#running-several-nodes).
- **New settings go in after the upgrade.** dmart refuses to start when `config.env` holds a key it does not know. So a setting a release adds goes into the file only once that release is installed, and comes out again before a rollback to an older one. A key a release retires is only warned about at start.

## Upgrading

A package upgrade does not restart the service, so restart it yourself:

```bash
sudo dnf upgrade dmart && sudo systemctl restart dmart
sudo apt update && sudo apt install --only-upgrade dmart && sudo systemctl restart dmart
sudo apk upgrade dmart && sudo rc-service dmart restart
```

- **What the package keeps:** `/etc/dmart/config.env` is written on the first install only, so your edits stay; the unit file is replaced, so keep your changes in a drop-in (see [The packaged service](/installation#the-packaged-service)).
- **The container:** pull `ghcr.io/edraj/csdmart:latest` again and start a new container on the same `/root/.dmart` volume.
- **A tarball:** replace the binary (and, on the glibc builds, the libraries beside it) and restart the server.
- **At its first start,** the new version runs schema initialization, the search-text fill and any one-time `query_policies` rewrite the release brings, and builds any index it adds, which on a large `entries` table takes a while. On PostgreSQL several nodes take turns at these; see [Running several nodes](/technical#running-several-nodes), which also covers rolling back.
- **The repositories** carry the five most recent releases.

## Before restarting on 1.8.1

- **Look for services that verify or make DMART's tokens with `JWT_SECRET`.** Session tokens are RS256 from this release on, signed with a key DMART makes itself, so such a service stops working until it verifies them from `/oidc/jwks` and, if it signs its own, moves to a token of its own ([`client_credentials`](/api-docs#a-services-own-token-client_credentials)). Until each has, add `JWT_SIGNING_ALG=HS256` to `config.env`; 1.8.0 knows it, so it can go in before the upgrade. That line alone signs and accepts tokens as 1.8.0 did, bots' and services' included, and stores sessions and one-time codes under 1.8.0's hashes, for a service that looks a session up in `sessions`, or a code in `otps`, itself. [Moving off HS256](/settings#moving-off-hs256) has the steps; 1.9.0 removes HS256.
- **Nobody is signed out.** People's HS256 tokens keep working while their sessions last, refresh tokens included, and the session and code hashes made with `JWT_SECRET` still match. Keep `JWT_SECRET` in `config.env` until 1.9.0.
- **Bots and services holding an HS256 token sign in again,** unless `JWT_SIGNING_ALG=HS256` is set: an HS256 token with no session row is refused, and signing in again gives an RS256 one. Each refusal logs a warning naming its account, at most once an hour per account: "Refused an HS256 token with no session row".
- **Each node makes its signing key at its first start,** in `KEYS_DIR` (`/var/lib/dmart/keys` for the RPM and DEB packages), and registers the public half in the database, so several nodes need nothing copied between them (see [Keys](/settings#keys)). Keep `KEYS_DIR` with the backups. A deployment whose `OIDC_SIGNING_KEY_FILE` names a key keeps signing with it.
- **`dmart cli` and `dmart selfcheck`** without a password now sign with that key, so run them as the account DMART runs as (`sudo -u dmart`).
- **Security keys, passkeys and authenticator apps are opt-in:** nothing changes until an account adds one, and the first start creates their four tables. A client that cannot do the second step cannot sign in an account that has one, and neither can a code or social sign-in. CXB and the OpenID Connect and MCP sign-in pages do it, and so do [pydmart, tsdmart and flutterdmart](/drivers). Catalog does not, so an account with a key or an app signs in through CXB. Where users sign in through an app that does not do it yet, set `PASSKEYS_FOR=admins` and `TOTP_FOR=admins` or `none` after the upgrade (see [Security Keys and Authenticator Apps](/settings#security-keys-and-authenticator-apps)).
- **Several nodes need the same authenticator apps' key.** Each node makes `KEYS_DIR/totp-key` at its first start when it is missing, so copy one node's file to the others, or write the same file to each, before they serve app sign-ins. Each logs the key's id at start, for comparing. Back it up apart from the database: without it no app's secret opens, and every account adds its app again.
- **New settings, all optional:** `KEYS_DIR`, `PASSKEYS_FOR`, `TOTP_FOR`, `ADMIN_PASSKEY_REQUIRED`, `WEBAUTHN_RP_ID`, `WEBAUTHN_ANDROID_APPS` and `WEBAUTHN_IOS_APPS`. `JWT_SIGNING_ALG` now defaults to `RS256`, and `JWT_ACCEPT_HS256` takes `sessions` (the default), `false` or `true`. Like any new setting, they go into `config.env` only after the upgrade.
- **Users no longer set their own tags.** Sign-up ignores a registrant's `tags`, and an account's change to its own is refused. An app that tagged accounts at sign-up has an admin, or a plugin, tag them instead.
- **A record's owner group must exist** when a create names it or an attachment update changes it: a missing one answers `OBJECT_NOT_FOUND`.
- **Rolling back to 1.8.0:**
  - Remove `KEYS_DIR`, the second-factor settings and any `JWT_ACCEPT_HS256=sessions` from `config.env` first, or 1.8.0 refuses to start.
  - With `JWT_SIGNING_ALG=HS256` set, sessions carry over. Without it, 1.8.0 accepts an RS256 token only with the OpenID Connect provider on and the same key, so without that everyone signs in again; and sessions made on 1.8.1 are stored under a hash 1.8.0 does not read, so those sign in again too.
  - Accounts with a key or an app sign in with their password alone, as before.
  - The `server_keys` table and the second-factor tables can stay.
