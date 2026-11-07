A new release installs over the old one, keeps `config.env` and the data, and brings the database up to date itself when it starts.

## Before you upgrade

- **Back up.** On SQLite, copy the database file (`/var/lib/dmart/dmart.db` for the packages) while the service is stopped; on PostgreSQL, take a `pg_dump`. [`dmart export`](/cli#5-export) also writes each space out as files.
- **Several nodes** sharing one PostgreSQL database are upgraded together; see [Running several nodes](/technical#running-several-nodes).
- **New settings go in after the upgrade.** dmart refuses to start when `config.env` holds a key it does not know. So a setting a release adds goes into the file only once that release is installed, and comes out again before a rollback to an older one. A key a release retires is only warned about at start.
- **Read [Before restarting on 1.7.9](#before-restarting-on-179)** first: this release needs a step between installing and restarting.

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

## Before restarting on 1.7.9

1.7.9 limits the management space (see [The Management Space](/access-control#the-management-space)):
- **Users, roles, permissions and groups** count only for accounts of type `admin`, the built-in `dmart`, and the accounts and roles you exempt. Any other account loses those records, with their attachments and history, whatever its roles say.
- **What every caller holds,** that is grants of anonymous callers, `logged_in` and the sign-up default role, reaches nothing in management.
- **There is no switch** to turn this off. An exemption is the way to keep access.

So between installing the package and restarting:

1. **Install without restarting:** `sudo dnf upgrade dmart`, or the `apt` or `apk` line above without its restart.
2. **See what the limit takes away:** `sudo dmart check management hard`.
   - Under `management_admin_only` it names each role whose grants on those records stop counting, and how many accounts that are not admins hold it, by type.
   - Under `everyone_grant_in_management` it names the grants every caller holds there. Move data that every user reads, and its schemas, out of management into a space of its own.
3. **Exempt what must keep its access:**
   - Add the roles to `MANAGEMENT_EXEMPT_ROLES` and the bot accounts to `MANAGEMENT_EXEMPT_ACCOUNTS` in `config.env` (see [Settings](/settings)). The server refuses to start when the accounts name `anonymous`, or the roles name `world`, `logged_in` or the sign-up default role.
   - The check reads them: run it again until it lists only the roles you mean to limit.
4. **Restart.** At every start the server logs `MANAGEMENT_ADMIN_ONLY` with any role still limited.

For the container, run the check from the new image against the same volume, before replacing the container: `podman run --rm -v dmart-data:/root/.dmart ghcr.io/edraj/csdmart:latest dmart check management hard`. Add the settings to the volume's `config.env`. For a tarball, run the new binary's `dmart check management hard` before restarting.

**Clients are told the grants without these limits.** The permissions map an app reads at sign-in (`/user/profile`, `/user/permissions`) lists grants as the roles hold them, so an app may offer a user-management screen that the server then refuses (see [The Management Space](/access-control#the-management-space)).

**Rolling back** to an earlier release: first take `MANAGEMENT_EXEMPT_ROLES` and `MANAGEMENT_EXEMPT_ACCOUNTS` out of `config.env`. An older release refuses to start with keys it does not know.

**Catalog's polls** read their schema from the `poll` space's `/schema` folder. If yours is only in management, copy it there.

**A container first started by an older image** keeps its `config.env`, which lacks `MOCK_SMPP_LOG_OTP=true`, so its log shows each mocked SMS code as `[redacted]`. Add that line to the volume's `config.env` and restart the container.
