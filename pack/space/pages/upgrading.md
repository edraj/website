A new release installs over the old one, keeps `config.env` and the data, and brings the database up to date itself when it starts.

## Before you upgrade

- **Back up.** On SQLite, copy the database file (`/var/lib/dmart/dmart.db` for the packages) while the service is stopped; on PostgreSQL, take a `pg_dump`. [`dmart export`](/cli#5-export) also writes each space out as files.
- **Several nodes** sharing one PostgreSQL database are upgraded together; see [Running several nodes](/technical#running-several-nodes).
- **New settings go in after the upgrade.** dmart refuses to start when `config.env` holds a key it does not know. So a setting a release adds goes into the file only once that release is installed, and comes out again before a rollback to an older one. A key a release retires is only warned about at start.
- **Read [Before restarting on 1.7.17](#before-restarting-on-1717)** first: a plugin's refusal now reaches the caller, so check what your plugins say.

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

## Before restarting on 1.7.17

- **Check what your plugins refuse with.** A `before` hook's error `message` now reaches the caller, as "plugin rejected update: <message>" (see [Plugins](/plugins)). Write it for the person who made the request, without paths, stack traces or other internals.
- **`DATA_ASSET_SQL` and the `DATA_ASSET_SQL_*` settings are new** (see [Settings](/settings#sql-over-sqlite-datasets-opt-in)). They go into `config.env` only once 1.7.17 is installed, and come out again before a rollback, since an older release does not start with a key it does not know. Without them, SQL over datasets stays off.
