A new release installs over the old one, keeps `config.env` and the data, and brings the database up to date itself when it starts.

## Before you upgrade

- **Back up.** On SQLite, copy the database file (`/var/lib/dmart/dmart.db` for the packages) while the service is stopped; on PostgreSQL, take a `pg_dump`. [`dmart export`](/cli#5-export) also writes each space out as files.
- **Several nodes** sharing one PostgreSQL database are upgraded together; see [Running several nodes](/technical#running-several-nodes).
- **New settings go in after the upgrade.** dmart refuses to start when `config.env` holds a key it does not know. So a setting a release adds goes into the file only once that release is installed, and comes out again before a rollback to an older one. A key a release retires is only warned about at start.
- **Read [Before restarting on 1.7.12](#before-restarting-on-1712)** first: where clients send a payload schema for their users, a new setting must be in place.

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

## Before restarting on 1.7.12

- **Set `USER_PAYLOAD_SCHEMA` if your clients send a payload schema for their users.** A user no longer chooses their own record's schema: a sign-up, profile save or update of their own record that names a schema other than the record's, clears it, or changes the payload's `content_type` is refused with `PROTECTED_FIELD` (210), and a record with no schema may take only `USER_PAYLOAD_SCHEMA` (see [User Profile Protection](/access-control#6-user-profile-protection)). If your apps send one, such as `user`, set `USER_PAYLOAD_SCHEMA` to it in `config.env` once 1.7.12 is installed and before restarting, or their sign-ups and profile saves are refused. On a host that may roll back, set it as `Dmart__UserPayloadSchema` in the service's environment instead: `Environment=Dmart__UserPayloadSchema=user` under `[Service]` in a drop-in (`sudo systemctl edit dmart`, see [The packaged service](/installation#the-packaged-service)), since an older release does not start with a key it does not know in `config.env`; or take the line out before downgrading. An admin giving a user a schema through `/managed/request` is unaffected.
- **`/managed/reindex-embeddings` embeds only what the `semantic_indexer` plugin embeds,** the spaces and entries its filters match. The shipped filters cover every space and type, so a default install sees no change; narrower filters make a smaller reindex. A body key it does not know, such as `subpaths`, is now refused with `INVALID_DATA` rather than dropped.
