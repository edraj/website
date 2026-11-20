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

## Before restarting on 1.8.0

- **Change the grants that reach records through their owner group.** `own` now reaches only the records the caller owns by name. A grant that reached records through their owner group (`owner_group_shortname` among the caller's `groups`) needs `own_group` instead, or a second grant with `own_group` beside it to reach both (see [Conditions](/access-control#3-contextual-conditions)). Change those grants in the same upgrade. To find them, look for records with an owner group (`owner_group_shortname` set on entries or attachments), and the `own` grants of the roles that their groups' members hold.
- **Four new settings, all optional:** `JWT_SIGNING_ALG` (default `HS256`), `JWT_ACCEPT_HS256` (default `true`), `OIDC_SIGNING_KEY_PREVIOUS_FILE` and `INTROSPECT_RATE_LIMIT_PER_MINUTE` (default `600`). The defaults keep today's tokens; [Moving to RS256](/settings#moving-to-rs256) has the steps for a deployment and its services. Like any new setting, they go into `config.env` only after the upgrade.
- **The first start adds `management/integrations`**, the built-in `integration` schema, and the `integration` type in `super_manager`'s grant. Nothing issues a token from it until an account of type `admin` that is also a global admin creates a record there.
- **Clients that read management** meet the new `integration` resource type there, though only admin-type global admins see it. CXB and the C# SDKs know it. A client built on another SDK that parses resource types strictly may fail on it until that SDK learns the type.
- **Rolling back to 1.7.19:**
  - Remove the new settings from `config.env` first, or 1.7.19 refuses to start.
  - With `JWT_SIGNING_ALG=RS256`, every session ends, since 1.7.19 accepts only HS256 session tokens: everyone signs in again.
  - 1.7.19 cannot read a record of type `integration`, so any read or listing that meets one fails. Delete the records in `management/integrations` before going back; the folder and the schema can stay.
  - 1.7.19 does not know `own_group`, and lists every row an `own_group` grant would reach without the condition. Put those grants back to `own`.
