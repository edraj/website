`dmart` is a single self-contained Native-AOT binary that is both the server and the CLI client. The same executable starts the ASP.NET Core / Kestrel HTTP server and exposes subcommands for managing data, applying schema migrations, seeding sample spaces, running health checks, and more.

## Usage

```
dmart [subcommand] [options]
```

With no subcommand, `dmart` prints its help; an unknown subcommand exits with status 1. Configuration is resolved once at startup from `$BACKEND_ENV` (or `$DMART_ENV`) → `~/.dmart/config.env` → `/etc/dmart/config.env`, then overlaid with environment variables. A `./config.env` in the current directory is never read.

**Global options** (any subcommand): `--no-color`, or `--color=always|never|auto` (default `auto`: color only on a terminal, and only when `NO_COLOR` is unset).

## Available Commands

### 1. serve

Starts the DMART HTTP server (ASP.NET Core Minimal APIs on Kestrel). `serve` also runs when the first argument is an option rather than a subcommand (other than `-h`/`--help` and `-v`/`--version`).

**Options:**

- `--cxb-config <path>`: Path to the CXB admin UI `config.json` file.

```
dmart serve --cxb-config my_cxb_config.json
```

### 2. migrate

Creates or updates the database schema, on PostgreSQL or SQLite, without starting the server. It also moves every schema kept outside a space's `/schema` folder into it (one whose name `/schema` already holds is left in place and reported), and adds the `meta_schema` and `folder_rendering` schemas if they are missing. Idempotent — safe to run repeatedly. `-q` / `--quiet` prints only the summary.

```
dmart migrate
dmart migrate -q
```

### 3. seed

Seeds the bundled sample spaces and/or populates the database. The sample spaces are embedded in the binary, so seeding works standalone.

**Modes:**

- no argument: copy bundled spaces to the spaces folder _and_ import them into the database.

- `files-only`: copy bundled spaces to the spaces folder (fallback `~/.dmart/spaces`).

- `db-only`: import the spaces folder into the database.

- `--force`: overwrite existing files / upsert existing rows (default: skip both).

The seed creates no accounts: the database half refuses any user in the spaces folder that carries a password, roles or groups, and exits with status 2. Move real accounts with `dmart import`.

```
dmart seed
dmart seed files-only
dmart seed db-only --force
```

### 4. import

Loads a zip or folder export into the database. By default, existing rows are skipped (idempotent).

**Options:**

- `-r` / `--replace`: overwrite existing rows.

- `--fast`, `--fast-parallelism=N`, `--batch-size=N`: tune throughput. `--fast` and `--fast-parallelism` are PostgreSQL-only.

- `--resume`: resume a crashed filesystem import from a sidecar checkpoint (`<source>/.dmart-import-checkpoint.json`, or `--checkpoint-file=PATH`).

- `--type=zip|fs`: say what the source is instead of letting DMART infer it.

- `--space=NAME --subpath=PATH`: drop a folder of content into an existing space at that subpath.

- `--spaces=a,b`: import only these spaces from a folder of spaces.

- `--since=ISO-DATE`: skip entries whose files are older than the date.

- `--skip-history`, `--no-validate`, `--issues-file=PATH`: leave out history, turn off the import-time checks, or move their report.

- `--tag=VALUE`: tag every imported entry (repeatable), e.g. to find a migration batch later.

- `--from-list=FILE`, `--save-list=FILE`: import from a saved work-list instead of walking the folder, or save the list elsewhere.

- `--drop-indexes`: drop the GIN indexes on entries and attachments for the load and rebuild them after (PostgreSQL only). Much faster on very large loads, but queries are slow until it finishes; use it in a maintenance window, together with `--resume`.

- `--parquet`: load a Parquet export. `-r` and `--drop-indexes` apply; afterwards the database is checked against the archive, which `--no-verify` skips.

`--fast-parallelism` needs `--fast`. `--resume`, the work-lists, `--spaces`, `--space`/`--subpath` and `--drop-indexes` need a folder source.

Entries of a space the instance does not have are refused, so create the space before loading one folder's archive. When rows of a zip or folder fail, the command exits with status 2 and writes their details to a `<source>.import-failures-<time>.jsonl` file beside the source; a Parquet load that loses rows, or fails its check, exits with status 1.

```
dmart import school.zip
dmart import ./spaces --fast --replace
```

### 5. export

Exports a space to a zip archive in the DMART on-disk layout (`spaces/` + `.dm/meta.*.json`). This layout is a transfer/backup format — the database remains the source of truth.

**Output resolution:**

- `--output` unset → `./<space>.zip`

- `--output .` → `./<space>.zip`

- `--output some/dir/` → `some/dir/<space>.zip`

- `--output snap.zip` → `snap.zip`

**Other options:**

- `--subpath <path>`: export one folder, its own record included, and everything under it. Such an archive carries no record of the space itself, so the space must exist where it is imported.

- `--parquet`: write the columnar Parquet layout, a directory (`./<space>-parquet` unless `--output` names one), instead of a zip. One space's export holds its content without the space's own record, so it restores only where the space exists (exporting `management` adds the spaces, users, groups, roles and permissions); `--all --parquet` exports every space as a full backup, into `./dmart-backup` by default.

- `--since <previous-export-dir>`: with `--parquet`, export only what changed since that earlier export.

- `--gc-blobs [--dry-run]`: with `--parquet`, remove attachment files in the output directory that the new export no longer references.

- `--no-verify`: with `--all --parquet`, skip re-reading every file and rehashing every attachment after the export.

The files an export writes are readable by their owner only. An export that misses entries says so and exits with status 1.

```
dmart export school
dmart export school --output .
dmart export school --subpath /reports --output snapshots/reports.zip
dmart export --all --parquet --output backups/
```

### 6. preflight

Scans a legacy filesystem export for integrity issues (duplicate UUIDs, missing owners, schema-noncompliant payloads) and auto-fixes them before `dmart import`.

```
dmart preflight ./spaces
dmart preflight --dry-run --workers 4 ./spaces
```

### 7. settings

Prints the effective settings as JSON (secrets redacted). Shares its projection with `GET /info/settings` so CLI and API output stay in sync.

```
dmart settings
```

### 8. passwd

Sets the password for a user (Argon2-hashed), held to the same password rule as every other way of setting one (`regex.json`). The shortname may be passed positionally; the password is read from a prompt, never the command line. It also reactivates and unlocks the account (`is_active` true, `attempt_count` 0) and ends all of its sessions.

```
dmart passwd
dmart passwd dmart
```

### 9. check

Runs the health checks on one space, or on every space when none is named (alias: `health-check`), and prints the number of findings of each check as JSON. They are the checks `GET /managed/health` runs: `orphan_attachments`, `dangling_owner`, `stale_locks`, `missing_payload_body`, `missing_schema_reference`, `misplaced_schema`, `folder_content_violations`, `folder_body_schema_violations`, `payload_schema_violations`, `invalid_content_type`, `content_type_body_mismatch`, `media_bytes_mismatch` and `missing_folder`. `hard` and `all` add sample paths for each finding.

```
dmart check
dmart check school hard
```

### 10. selfcheck

Smoke-tests a running server over HTTP. It asks `/health/ready` first, and stops there with the server's reason (`database unreachable`, a directory replica not synced yet) when the server is not ready. Then it signs in, reads `/info/manifest` and prints the server's version, lists spaces, creates, queries, updates and deletes a test entry, and signs out. It signs in as `--admin` (default `ADMIN_SHORTNAME`, else `dmart`), which must be a global admin.

Given no password (`--password`, `--password-stdin` or `DMART_PWD`), it signs in without one, as `dmart cli` does: a token minted from `JWT_SECRET` in config.env, with a session row it removes when it exits. That needs read access to config.env and the database, PostgreSQL or SQLite.

- `--ready-only`: only the readiness check — no sign-in, and no database access from this host.

- `--wait <seconds>`: ask `/health/ready` again every 2 seconds until the server is ready or the time is up.

- `--url <url>`: the server (default `http://<LISTENING_HOST>:<LISTENING_PORT>`, with 127.0.0.1 for a wildcard host such as `0.0.0.0`).

- `--space`, `--subpath`: where to create the test entry; `--keep` leaves it there; `-v` shows more detail.

It exits with status 0 when every check passes, 1 when one fails or the server is not ready, and 2 on an unknown or malformed argument. After restarting a node, `dmart selfcheck --ready-only --wait 600` is the check to pass before moving on to the next. Through a reverse proxy, the proxy must pass `/health/ready` too.

```
dmart selfcheck
dmart selfcheck --ready-only --wait 600
dmart selfcheck --url http://localhost:8282 --admin dmart --password-stdin
```

### 11. fix-folder-rendering

Repairs legacy folder payload bodies to match the canonical `folder_rendering` schema (strips unknown fields, adds required-but-missing ones, widens policy arrays). Content is never touched. Dry-run by default; pass `--apply` to write.

```
dmart fix-folder-rendering school
dmart fix-folder-rendering school --apply
```

### 12. update_query_policies

Recomputes `query_policies` and updates rows whose stored value drifted (e.g. owner / is_active changed outside the write path). Entries only, unless `--all-tables` is given. With `--all-tables` it also marks as done the rewrite the server otherwise runs in the background after an upgrade that changes these values, so a large instance can do that work in a maintenance window instead.

```
dmart update_query_policies
dmart update_query_policies --batch-size 500
```

### 13. fix_query_policies

Backfills `query_policies` for rows written before write-time population landed, across all six tables that carry the column. It fills empty arrays only; `update_query_policies` repairs stale ones. Idempotent.

```
dmart fix_query_policies
dmart fix_query_policies school --dry-run
```

### 14. create-users-folders

Backfills each user's personal folders under `personal/people/<shortname>` (`notifications`, `private`, `protected`, `public`, `inbox`), which users loaded by an import arrive without. Idempotent — existing folders are left untouched.

```
dmart create-users-folders
```

### 15. import-ldif

Moves an LDAP directory (`slapcat` output) into DMART's users, keeping `{SSHA}`, `{SHA*}` and `{ARGON2}` password hashes until each owner's first sign-in. A dry run by default.

- `--apply`: write.

- `--update`: also update accounts that already exist.

```
dmart import-ldif directory.ldif
dmart import-ldif directory.ldif --apply
```

### 16. prune-empty-histories

Deletes history rows that record no change, written by older releases. The deletions are recorded, so incremental exports stay consistent.

```
dmart prune-empty-histories --dry-run
dmart prune-empty-histories --space school
```

### 17. prune-tombstones

Deletes the records of deletions older than a window, so that table stops growing. Pick a window longer than your incremental export interval.

```
dmart prune-tombstones --older-than 90 --dry-run
```

### 18. init

Initializes `~/.dmart`: a `config.env` with a fresh random `JWT_SECRET`, the `config.json` the web UIs read, and a `cli.ini` pointing at the configured port. `config.env` and `cli.ini` are readable by their owner only; a file that is already there is left as it is.

```
dmart init
```

### 19. cli

Interactive CLI client for talking to a running DMART server: a REPL, a single command, or a script.

It reads `cli.ini` (the first of `$DMART_CLI_CONFIG`, `./cli.ini` and `~/.dmart/cli.ini`, refused unless only its owner has access, as with mode 0600), overridden by `DMART_URL`, `DMART_SHORTNAME` and `DMART_PASSWORD`. With no password from either, it signs in where the server runs: it mints a token from `JWT_SECRET` in the server's config.env, with a session row in the database that it removes when it exits, and, given no URL, talks to that configuration's own server (`LISTENING_HOST`:`LISTENING_PORT`, a wildcard host read as 127.0.0.1). That needs read access to config.env and the database, which can already sign any token.

`dmart cli c <space> [/subpath] <command>` runs the command in that folder, as if you had switched and `cd`'d there. A space is named exactly, or by a prefix only one space has; an unknown or ambiguous name exits with status 1 and runs nothing. `switch`, `cd @space` and `ls @space` likewise refuse such a name rather than carry on in the current space. `ls` lists the folder's own entries (up to `QUERY_LIMIT` from `cli.ini`, 100 by default), not those of the folders below, and `cd`, `cat`, `print` and `rm` look names up in that listing. `--json` prints data only.

```
dmart cli
dmart cli c myspace /folder ls
dmart cli c management create space website
dmart cli s ./script.txt
```

### 20. version

Prints version and build info as JSON (version, branch, build date, and .NET runtime). Also `-v` / `--version`.

```
dmart version
```

### 21. help

Prints the list of available subcommands. Also `-h` / `--help`.

```
dmart help
```
