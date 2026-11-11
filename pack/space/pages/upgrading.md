A new release installs over the old one, keeps `config.env` and the data, and brings the database up to date itself when it starts.

## Before you upgrade

- **Back up.** On SQLite, copy the database file (`/var/lib/dmart/dmart.db` for the packages) while the service is stopped; on PostgreSQL, take a `pg_dump`. [`dmart export`](/cli#5-export) also writes each space out as files.
- **Several nodes** sharing one PostgreSQL database are upgraded together; see [Running several nodes](/technical#running-several-nodes).
- **New settings go in after the upgrade.** dmart refuses to start when `config.env` holds a key it does not know. So a setting a release adds goes into the file only once that release is installed, and comes out again before a rollback to an older one. A key a release retires is only warned about at start.
- **Read [Before restarting on 1.7.14](#before-restarting-on-1714)** first: API responses leave empty values out of payloads, and semantic search needs every entry embedded again.

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

## Before restarting on 1.7.14

- **Payloads come back without their empty values.** A response leaves out every `""`, `null`, `[]` and `{}` inside a payload's body, its relationships and a history diff, as it does in the metadata (see [the response envelope](/api-docs#response-envelope)), and so does an entry's body on the payload route. A client that treats an absent field and an empty one alike needs nothing; one that reads `"last_name": ""` and refuses a missing `last_name` must accept both. Stored data is unchanged, and an attachment's file still downloads as it was uploaded.
- **Embed every entry again for semantic search.** Entries are now embedded by their text rather than their markup, and the short fields come first (see [`/managed/semantic-search`](/api-docs)). Entries keep their old embeddings until embedded again, so after the restart a global admin runs `POST /managed/reindex-embeddings` with `{"only_missing": false}`, which covers every space the `semantic_indexer` filters cover, and follows it on `GET /managed/reindex-embeddings/status`.
