`dmart` is a single self-contained Native-AOT binary that is both the server and the CLI client. The same executable starts the ASP.NET Core / Kestrel HTTP server and exposes subcommands for managing data, applying schema migrations, seeding sample spaces, running health checks, and more.

## Usage

```
dmart [subcommand] [options]
```

With no subcommand, `dmart` prints its help. Configuration is resolved once at startup from `$BACKEND_ENV` (or `$DMART_ENV`) → `~/.dmart/config.env` → `/etc/dmart/config.env`, then overlaid with environment variables. A `./config.env` in the current directory is never read.

**Global options** (any subcommand): `--no-color`, or `--color=always|never|auto` (default `auto`: color only on a terminal, and only when `NO_COLOR` is unset).

## Available Commands

### 1. serve

Starts the DMART HTTP server (ASP.NET Core Minimal APIs on Kestrel). `serve` also runs when the first argument is an option rather than a subcommand.

**Options:**

- `--cxb-config <path>`: Path to the CXB admin UI `config.json` file.

```
dmart serve --cxb-config my_cxb_config.json
```

### 2. migrate

Creates or updates the database schema, on PostgreSQL or SQLite, without starting the server, and adds the `meta_schema` and `folder_rendering` schemas if they are missing. Idempotent — safe to run repeatedly. `-q` / `--quiet` prints only the summary.

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

```
dmart seed
dmart seed files-only
dmart seed db-only --force
```

### 4. import

Loads a zip or folder export into the database. By default, existing rows are skipped (idempotent).

**Options:**

- `-r` / `--replace`: overwrite existing rows.

- `--fast`, `--fast-parallelism=N`, `--batch-size=N`: tune throughput.

- `--resume`: resume a crashed filesystem import from a sidecar checkpoint (`<source>/.dmart-import-checkpoint.json`, or `--checkpoint-file=PATH`).

- `--type=zip|fs`: say what the source is instead of letting DMART infer it.

- `--space=NAME --subpath=PATH`: drop a folder of content into an existing space at that subpath (folder sources only).

- `--spaces=a,b`: import only these spaces from a folder of spaces.

- `--since=ISO-DATE`: skip entries whose files are older than the date.

- `--skip-history`, `--no-validate`, `--issues-file=PATH`: leave out history, turn off the import-time checks, or move their report.

- `--tag=VALUE`: tag every imported entry (repeatable), e.g. to find a migration batch later.

- `--from-list=FILE`, `--save-list=FILE`: import from a saved work-list instead of walking the folder, or save the list elsewhere.

- `--drop-indexes`: drop the search indexes for the load and rebuild them after. Much faster on very large loads, but queries are slow until it finishes; use it in a maintenance window.

- `--parquet`: load a Parquet export (`--no-verify` skips its checksum check).

`--fast-parallelism` needs `--fast`.

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

- `--subpath <path>`: export one folder and everything under it.

- `--parquet`: write the columnar Parquet layout (a directory) instead of a zip. `--all --parquet` exports every space as a full backup.

- `--since <previous-export-dir>`: with `--parquet`, export only what changed since that earlier export.

- `--gc-blobs [--dry-run]`: with `--parquet`, remove attachment files in the output directory that the new export no longer references.

- `--no-verify`: with `--parquet`, skip re-reading every file and rehashing every attachment after the export.

```
dmart export school
dmart export school --output .
dmart export school --output snapshots/school.zip
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

Sets the password for a user (Argon2-hashed). The shortname may be passed positionally; passwords are read from a prompt, never the command line.

```
dmart passwd
dmart passwd dmart
```

### 9. check

Runs health checks on a space (alias: `health-check`). `hard` and `all` add sample paths for each finding.

```
dmart check
dmart check school hard
```

### 10. selfcheck

Smoke-tests the running HTTP surface (login + CRUD + query) against a live server.

```
dmart selfcheck --url http://localhost:8282 --admin dmart --password-stdin
```

### 11. fix-folder-rendering

Repairs legacy folder payload bodies to match the canonical `folder_rendering` schema (strips unknown fields, adds required-but-missing ones, widens policy arrays). Content is never touched. Dry-run by default; pass `--apply` to write.

```
dmart fix-folder-rendering school
dmart fix-folder-rendering school --apply
```

### 12. update_query_policies

Recomputes `query_policies` and updates rows whose stored value drifted (e.g. owner / is_active changed outside the write path). Entries only, unless `--all-tables` is given.

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

Backfills each user's personal folders (`notifications`, `private`, `protected`, `public`, `inbox`). Idempotent — existing folders are left untouched.

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

Initializes `~/.dmart` with config files, generating a fresh random `JWT_SECRET`.

```
dmart init
```

### 19. cli

Interactive CLI client for talking to a running DMART server. Supports a REPL, a single command, or a script.

```
dmart cli
dmart cli c myspace /folder ls
dmart cli s ./script.txt
```

### 20. version

Prints version and build info as JSON (version, branch, build date, and .NET runtime).

```
dmart version
```

### 21. help

Prints the list of available subcommands.

```
dmart help
```
