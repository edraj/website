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

Creates or updates the database schema, on PostgreSQL or SQLite, without starting the server. It creates what the server creates at every start, where missing: the `dmart` admin, the `management` space with its `users`, `roles`, `groups`, `permissions` and `schema` folders, and the built-in roles and permissions. It also moves every schema kept outside a space's `/schema` folder into it (one whose name `/schema` already holds is left in place and reported), and adds the `meta_schema` and `folder_rendering` schemas if they are missing. Idempotent — safe to run repeatedly. `-q` / `--quiet` prints only the summary.

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

A zip holds a media attachment's bytes only when its `payload.body` names the attachment's own file, `<shortname>.<ext>`, the name DMART gives an upload. For any other attachment with bytes, the zip carries the metadata alone and the export logs a warning; `--parquet` keeps the bytes whatever the name.

The files an export writes are readable by their owner only. An export that misses entries says so and exits with status 1.

```
dmart export school
dmart export school --output .
dmart export school --subpath /reports --output snapshots/reports.zip
dmart export --all --parquet --output backups/
```

### 6. preflight

Checks a legacy filesystem export (a folder of spaces) before `dmart import`, and by default rewrites the files in place to fix what it can. It needs no database and no server.

- **Duplicate UUIDs:** fixed. The first meta file in sorted path order keeps its UUID; the others get new ones.
- **Unknown owners:** fixed. An `owner_shortname` that names no user in the export becomes `dmart`.
- **Schema violations:** reported, not fixed. Each payload that breaks the schema it names (as found in the export) is listed in `schema-violations.jsonl`.

**Options:**

- `--dry-run`: report only, change nothing.
- `--output-dir <dir>`: where the reports go (`summary.json`, and `schema-violations.jsonl` when there are any); default `./preflight-<timestamp>`.
- `--workers <N>`: files parsed in parallel; default one per CPU.
- `--sample <N>`: sample paths per issue in the summary; default 20.
- `-v`: more logging.

It exits with status 0 when the export is clean or every issue was fixed, 1 when issues remain (anything found under `--dry-run`, or schema violations), and 2 on a tool error such as an unreadable path.

```
dmart preflight ./spaces --dry-run
dmart preflight --workers 4 --output-dir /tmp/pf ./spaces
```

### 7. settings

Prints the effective settings as JSON (secrets redacted). Shares its projection with `GET /info/settings` so CLI and API output stay in sync.

```
dmart settings
```

### 8. passwd

Sets the password for a user (Argon2-hashed), held to the same password rule as every other way of setting one (`regex.json`). The shortname may be passed positionally; the password is read from a prompt, never the command line. It also reactivates and unlocks the account (`is_active` true, `attempt_count` 0) and ends all of its sessions.

It sets the password of an account that exists, and exits with status 1 when there is none:

- **Before the server's first start**, which creates the database and the `dmart` admin, it says to start the server once and run it again. It creates no database file and applies no schema.
- **On a server that has started**, an unknown name is `User <name> not found`.
- **Where no `config.env` could be read** (a packaged `/etc/dmart/config.env` is readable by root and the `dmart` group only), it has looked at the built-in defaults rather than the server's database, and its refusal says so: run it with `sudo`, or point `BACKEND_ENV` at the server's `config.env`.

```
dmart passwd
sudo dmart passwd dmart
```

### 9. check

Runs the health checks on one space, or on every space when none is named (alias: `health-check`), and prints the number of findings of each check as JSON. They are the checks `GET /managed/health` runs: `orphan_attachments`, `dangling_owner`, `stale_locks`, `missing_payload_body`, `missing_schema_reference`, `misplaced_schema`, `folder_content_violations`, `folder_body_schema_violations`, `payload_schema_violations`, `invalid_content_type`, `content_type_body_mismatch`, `media_bytes_mismatch` and `missing_folder`. `hard` and `all` add sample paths for each finding.

```
dmart check
dmart check school hard
```

### 10. selfcheck

Smoke-tests a running server over HTTP. It asks `/health/ready` first, and stops there with the server's reason (`database unreachable`, a directory replica not synced yet) when the server is not ready. Then it signs in, reads `/info/manifest` and prints the server's version, lists spaces, creates, queries, updates and deletes a test entry, and signs out. It signs in as `--admin` (default `ADMIN_SHORTNAME`, else `dmart`), which must be a global admin.

Given no password (`--password`, `--password-stdin` or `DMART_PWD`), it signs in without one, as `dmart cli` does: a token minted from `JWT_SECRET` in config.env, with a session row it removes when it exits. That needs read access to config.env and the database, PostgreSQL or SQLite. The token goes only to this host's own dmart: a `--url` (or `DMART_URL`) that is not a loopback address (`localhost`, `127.0.0.0/8`, `::1`) or the configuration's `LISTENING_HOST`:`LISTENING_PORT` is refused, with status 1, before any token is minted. Check another server with a password.

- `--ready-only`: only the readiness check — no sign-in, and no database access from this host.

- `--wait <seconds>`: ask `/health/ready` again every 2 seconds until the server is ready or the time is up.

- `--url <url>`: the server (default `DMART_URL`, else `http://<LISTENING_HOST>:<LISTENING_PORT>`, with 127.0.0.1 for a wildcard host such as `0.0.0.0`).

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

That record is a `query_policies_v2` row in the `maintenance_runs` table. After rolling back and upgrading again, or restoring a database taken before the upgrade, it no longer holds: delete that row so the next start redoes the rewrite, or run `dmart update_query_policies --all-tables`.

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

Deletes history rows that record no change (an empty or NULL `diff`), written by older releases. `--space <name>` limits it to one space. Each deleted row gets a tombstone, so incremental Parquet exports learn of the deletion; a large prune therefore adds as many rows to the deletions table as it removes.

Nothing runs it for you. Run it once after upgrading, and again after importing an old archive.

```
dmart prune-empty-histories --dry-run
dmart prune-empty-histories --space school
```

### 17. prune-tombstones

Deletes the records of deletions (tombstones) older than `--older-than <days>`, so that table stops growing. The window has no default. Nothing runs the command for you.

It also raises the retention floor to the same cutoff. An incremental Parquet export (`--since`) whose previous export is older than the floor then warns `DELETIONS MAY HAVE BEEN LOST`; take a full export to resynchronize. Pick a window longer than your incremental export interval.

When you run both prune commands, prune the empty histories first, let your incremental exports carry the tombstones that writes, then prune the tombstones.

```
dmart prune-tombstones --older-than 90 --dry-run
```

### 18. init

Initializes `~/.dmart`: a `config.env` with a fresh random `JWT_SECRET`, the `config.json` the web UIs read, and a `cli.ini` pointing at the configured port. `config.env` and `cli.ini` are readable by their owner only; a file that is already there is left as it is.

- **`config.env`** is a copy of `config.env.sample` when that file sits beside the binary, as in the tarballs. Otherwise (the packages keep the sample in `/usr/share/dmart/`) it is a short file of PostgreSQL connection settings. Either way it selects PostgreSQL. The sample's values are not all the built-in defaults: among others it sets `JWT_ACCESS_EXPIRES=3600` (built in: 30 days), `DATABASE_DRIVER="postgresql"` (built in: inferred) and `ADMIN_EMAIL="admin@example.com"` (built in: none).
- **`cli.ini`** holds no password: a commented `# password=` line says where one goes. Without one (or `DMART_PASSWORD`), `dmart cli` signs in from the server's configuration, which works on the server's own host.

```
dmart init
```

### 19. cli

Interactive CLI client for talking to a running DMART server: a REPL, a single command, or a script.

It reads `cli.ini` (the first of `$DMART_CLI_CONFIG`, `./cli.ini` and `~/.dmart/cli.ini`, refused unless only its owner has access, as with mode 0600), overridden by `DMART_URL`, `DMART_SHORTNAME` and `DMART_PASSWORD`. With no password from either, it signs in where the server runs: it mints a token from `JWT_SECRET` in the server's config.env, with a session row in the database that it removes when it exits, and, given no URL, talks to that configuration's own server (`LISTENING_HOST`:`LISTENING_PORT`, a wildcard host read as 127.0.0.1). That needs read access to config.env and the database, which can already sign any token. A URL it is given (`URL` in `cli.ini`, or `DMART_URL`) must be that server too: a loopback address (`localhost`, `127.0.0.0/8`, `::1`) or that listen address. Any other is refused, with why and status 1, before a token is minted; sign in there with a password.

`dmart cli c <space> [/subpath] <command>` runs the command in that folder, as if you had switched and `cd`'d there. A space is named exactly, or by a prefix only one space has; an unknown or ambiguous name exits with status 1 and runs nothing. `switch`, `cd @space` and `ls @space` likewise refuse such a name rather than carry on in the current space. `ls` lists the folder's own entries (up to `QUERY_LIMIT` from `cli.ini`, 100 by default), not those of the folders below, and `cd`, `cat`, `print` and `rm` look names up in that listing. `--json` prints data only.

```
dmart cli
dmart cli c myspace /folder ls
dmart cli c management create space website
dmart cli s ./script.txt
```

**`cli.ini` keys** (`key=value`, one per line):

| Key | Meaning | Default |
|---|---|---|
| `URL` | the server | `http://localhost:8282` |
| `SHORTNAME` | the user to sign in as | `dmart` |
| `PASSWORD` | that user's password; empty or absent, the CLI signs in from the server's configuration, as above | none |
| `DEFAULT_SPACE` | the space a session starts in | `management` |
| `QUERY_LIMIT` | entries `ls` loads, and results `find` returns | `100` |
| `PAGINATION` | rows per page of `ls` output | `50` |
| `RETRIEVE_JSON_PAYLOAD` | whether `ls` and `find` load each entry's body, which `cat` prints. `true` or `1` loads it; any other value lists meta only, and `cat` then prints no body | `true` |

Keys are matched whatever their case, and a line starting with `#` is a comment.

**Commands:**

| Command | What it does |
|---|---|
| `ls [path] [page]` | list the folder's own entries, `page` rows at a time |
| `cd <folder>`, `cd ..`, `cd @space/sub` | move to a folder, up one, or to another space |
| `switch <space>` (`s`), `pwd` | change space; print the current space and folder |
| `whoami`, `version` | user, server and location; the CLI build and the server's version |
| `print <name>` (`p`) | an entry's metadata |
| `cat <name>`, `cat path/name`, `cat *` (`c`) | an entry as listed, one in another folder, or the whole listing |
| `find <pattern> [--type <rt>] [--limit N]` | search the current space from the current folder down |
| `mkdir <name>` | create a folder here |
| `create <name> <type>` | create an entry of that resource type here |
| `create space <name>` | create a space (run it in `management`) |
| `move <type> <src> <dst>` (`mv`) | move or rename; a path without a leading `/` is in the current folder |
| `rm [--dry-run] [-f] <name>`, `rm *`, `rm space <name>` | delete an entry, every listed entry, or a space |
| `attach <sn> <entry> <type> <file>` | upload a file as attachment `<sn>` of `<entry>`, of resource type `<type>` (`media`, `json`, …); `--name-en`, `--name-ar`, `--name-ku` set its display name and `--desc-en`, `--desc-ar`, `--desc-ku` its description |
| `attach --batch <entry> <type> <glob>` | upload every matching file, each named after its file |
| `upload schema <name> <file>` | add a JSON schema to the space's `/schema` folder |
| `upload csv <type> <subpath> <schema> <file> [--update] [--start-row N]` | create entries from a CSV, or update them with `--update` |
| `request <json_file>` | send the file to `/managed/request` as it is |
| `progress <subpath> <shortname> <action>` | apply a workflow action to a ticket |
| `import <zip>` | load a zip through `/managed/import` |
| `export [csv] <query.json>` | export what a saved query matches, to a zip or with `csv` to a CSV |
| `export [csv] --space S [--subpath P] [--type T] [--limit N] [--from D] [--to D] [--search Q] [--all] [--include-self] [--out P]` | the same, with the query built from flags |
| `help [command]` | the command list, or one command's usage |

- **Deleting:** `rm` asks before it deletes a folder, every listed entry (`rm *`) or a space, and deletes any other entry without asking; `-f` skips the question, and `--dry-run` (`-n`) prints what would go. Where there is no one to ask (a script, redirected input or `--json`), those deletions are refused without `-f`.
- **CSV uploads:** when `REQUEST_TIMEOUT` stops an upload part-way, the CLI sends the rest from the row the server names, until the whole file is in, and prints one summary. A failed run names the row to resume from with `--start-row`.
- **Tickets:** `progress` sends no body, so it cannot take a transition marked `resolution_required`, which needs a `resolution_reason`; send that one to `PUT /managed/progress-ticket` directly (see [Tickets & Workflows](/tickets)).
- **Exports:** a flag-built export covers the current space from `/` (up to 10,000 entries unless `--limit` or `--all` says otherwise). `--include-self` adds the `--subpath` folder's own record to a zip. Without `--out`, the file goes to `~/Downloads/<space>.zip` (or `.csv`).
- **Scripts:** `VAR <name> <value>` declares a variable and `${name}` uses it; `#` and `//` lines and `/* … */` blocks are comments. A script runs every line and exits 0 even when commands fail, unless `--strict` (`dmart cli --strict s <file>`) stops it at the first failure with status 1.
- **Session:** a 401 in the middle of a session signs in again and retries once, without a word. The REPL keeps 1,000 lines of history in `~/.dmart/cli_history`.

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
