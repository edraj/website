A new release installs over the old one, keeps `config.env` and the data, and brings the database up to date itself when it starts.

## Before you upgrade

- **Back up.** On SQLite, copy the database file (`/var/lib/dmart/dmart.db` for the packages) while the service is stopped; on PostgreSQL, take a `pg_dump`. [`dmart export`](/cli#5-export) also writes each space out as files.
- **Several nodes** sharing one PostgreSQL database are upgraded together; see [Running several nodes](/technical#running-several-nodes).
- **New settings go in after the upgrade.** dmart refuses to start when `config.env` holds a key it does not know. So a setting a release adds goes into the file only once that release is installed, and comes out again before a rollback to an older one. A key a release retires is only warned about at start.
- **Read [Before restarting on 1.7.10](#before-restarting-on-1710)** first: this release refuses to start with open registration that takes no code, and changes how accounts get their passwords.

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

## Before restarting on 1.7.10

1.7.10 leaves passwords and verified addresses to their owners: no admin's request sets either (see [Managing User Accounts](/access-control#managing-user-accounts)).

- **Open registration needs codes.** The server does not start with `IS_REGISTRABLE=true` and `IS_OTP_FOR_CREATE_REQUIRED=false`. Before restarting, set `IS_OTP_FOR_CREATE_REQUIRED=true` (the default) or `IS_REGISTRABLE=false` in `config.env`.
- **A script that creates users with a `password`** now gets `INVALID_DATA`, and the user is not created. Create the user without one. A person then signs in with a code and sets a password with a reset code. A bot's password is set on the host: `printf '%s\n' "$PASSWORD" | sudo dmart passwd <shortname>`. Existing accounts keep their passwords.
- **Users an admin creates, and addresses an admin changes, start unverified.** A password sign-in that names such an email or phone gets `USER_ISNT_VERIFIED` (11) until the user's first code, a sign-in by code or a password reset by code; a sign-in by shortname is unaffected. A client that creates users and signs them in by email or phone with a password should answer 11 with a code prompt.
- **An admin's change of an email or phone** also costs a `mobile` account its trusted device, and a `web` account too under `WEB_DEVICE_OTP`, so its next sign-in asks for a code. An account locked to its device keeps it.
- **A server with no mail or SMS channel** cannot verify an address by code. Its users sign in by shortname, or whoever runs the server marks an address verified with [`dmart mark-verified`](/cli#24-mark-verified).
- **The request log masks more headers:** each whose name contains `key`, `auth`, `token`, `secret`, `password`, `passwd`, `cookie`, `session`, `signature` or `credential` reads `******`, so a log search that read one finds the mask.
