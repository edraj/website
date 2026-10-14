All configurable settings for DMART. Bound to the strongly-typed `DmartSettings` record and loaded from a `config.env` dotenv file and/or environment variables. Values are read **once at boot** and validated before the server starts — there is no hot reload and no file watcher.

## Loading Order

Sources are layered with a strict precedence (later wins): `appsettings.json` < `config.env` < environment variables (`Dmart__Xxx`).

The `config.env` file is located with a first-match-wins lookup:

1. The path in the `BACKEND_ENV` (or `DMART_ENV`) environment variable — used for dev/CI, e.g. a repo-local file

2. `~/.dmart/config.env` — per-user install

3. `/etc/dmart/config.env` — system-wide RPM/DEB install

A cwd-relative `./config.env` is _not_ looked up implicitly. Because the file may carry `JWT_SECRET` and `DATABASE_PASSWORD`, DMART refuses to read it when it is world-writable, and warns at every start when it is world-readable.

**Strict validation.** Configuration is bound and validated at startup (`ValidateOnStart`). Any **unknown key is rejected** and aborts startup — there is no silent fallthrough for typos. Keys of settings that no longer exist — `REDIS_HOST`/`PORT`/`PASSWORD`/`CONNECTION`, `ACTIVE_DATA_DB`, `WEBSITE_URL` and `WEBSITE_DIR` — are unknown keys and stop the boot. `ALLOW_PASSWORD_RESET_RESEND_AFTER` is ignored with a warning.

## General Configuration

| Setting | Description | Default |
|---|---|---|
| `APP_URL` | Public base URL of the server, put in front of the short links `/managed/shortening/…` hands out. Empty makes them host-relative. | `""` |
| `MANAGEMENT_SPACE` | Name of the space that holds users, roles, groups and permissions | `"management"` |
| `MAX_QUERY_LIMIT` | Hard cap on the number of records returned by a query | `10000` |
| `QUERY_TOTAL_CAP` | Largest exact `total` a query computes. Above it, `total` is the cap and `total_is_lower_bound` is `true`. 0 = unlimited. | `100000` |
| `RETRIEVE_TOTAL_DEFAULT` | Whether a query that omits `retrieve_total` is counted. A skipped count reports `total` as `-1`. `/public/query` counts only when asked. | `true` |
| `ENABLE_SMART_SEARCH` | Plain words in a search match whole and partial words in entry values, with spelling correction, best match first. False keeps the plain substring match. | `true` |
| `UNIQUENESS_MAX_PROBES` | Most searches one uniqueness rule may run for a single write; past it the write is refused | `1000` |
| `EVENTS_LOG_MAX_BYTES` | Size at which a space's `events.jsonl` rolls over (one previous file is kept). 0 = never. | `52428800` (50 MiB) |
| `URL_SHORTER_EXPIRES` | Short-link expiration (seconds) | `3600` |
| `REQUEST_TIMEOUT` | Seconds a request may run before DMART stops it and answers 504 | `35` |
| `JQ_TIMEOUT` | Timeout (seconds) for the `jq` subprocess used by join sub-queries carrying a `jq_filter` | `2` |
| `JQ_MAX_CONCURRENCY` | How many `jq` subprocesses may run at once, process-wide | `4` |
| `JQ_QUEUE_TIMEOUT_SECONDS` | Seconds a request waits for a free `jq` slot before it fails | `5` |

## Server & Network

| Setting | Description | Default |
|---|---|---|
| `LISTENING_HOST` | Hostname/IP the Kestrel server binds to | `"0.0.0.0"` |
| `LISTENING_PORT` | Port the server listens on (HTTP + WebSocket share this port) | `8282` |
| `CXB_URL` | URL path prefix for the embedded CXB admin SPA. Set to `/` to serve it at the root. | `"/cxb"` |
| `CAT_URL` | URL path prefix for the embedded Catalog SPA | `"/cat"` |
| `ALLOWED_CORS_ORIGINS` | Comma-separated origins allowed to make cross-site requests. Empty allows only the same-host origin. | `""` |
| `TRUSTED_PROXIES` | Comma-separated IPs/CIDRs whose `X-Forwarded-For` is trusted (for real client IP behind nginx/an LB) | `""` |
| `FORWARDED_FOR_HOP_COUNT` | Number of proxy hops in front of DMART | `1` |
| `OTLP_ENDPOINT` | OpenTelemetry collector endpoint for metrics/traces. Empty disables observability entirely. | `""` |

## Database & Storage

**DMART keeps all runtime data in one SQL database: PostgreSQL (via Npgsql) or SQLite.** PostgreSQL is the full tier. SQLite is a reduced tier for a single node, the edge, development and CI, and the default for the RPM, DEB and APK packages and the container. There is no Redis and no filesystem runtime store; all caches are in-process.

| Setting | Description | Default |
|---|---|---|
| `DATABASE_DRIVER` | `postgresql` or `sqlite`. Unset, DMART picks PostgreSQL when any PostgreSQL connection setting is configured and SQLite when none is; the startup log says which and why. | `""` (inferred) |
| `SQLITE_PATH` | The SQLite database file, used only on SQLite. Relative paths resolve against the working directory; the packages use `/var/lib/dmart/dmart.db`. Keep it on a local disk, not NFS. | `"dmart.db"` |
| `AUTH_CACHE_TTL` | Seconds the per-request user and session lookups are cached. 0 = check the database on every request. | `5` |
| `AUTHZ_CACHE_TTL` | Seconds a user's resolved permissions are cached. The node that changes them evicts at once; this bounds how stale other replicas can be. 0 = no TTL. | `60` |

On PostgreSQL, provide a full connection string with `POSTGRES_CONNECTION`, or leave it unset and let DMART assemble one from the individual `DATABASE_*` components below.

### PostgreSQL Connection

| Setting | Description | Default |
|---|---|---|
| `POSTGRES_CONNECTION` | Full Npgsql connection string. When set, the component settings below are ignored. | `""` (unset) |
| `DATABASE_HOST` | Database hostname | `"localhost"` |
| `DATABASE_PORT` | Database port | `5432` |
| `DATABASE_USERNAME` | Database username | `"dmart"` |
| `DATABASE_PASSWORD` | Database password | `""` |
| `DATABASE_NAME` | Database name | `"dmart"` |
| `DATABASE_POOL_SIZE` | Connection pool size | `10` |
| `DATABASE_MAX_OVERFLOW` | Max overflow connections | `10` |
| `DATABASE_POOL_TIMEOUT` | Pool timeout (seconds) | `30` |
| `DATABASE_POOL_RECYCLE` | Pool recycle time (seconds) | `1800` |
| `DATABASE_KEEPALIVE` | Seconds of socket inactivity before a keepalive probe is sent. 0 disables. | `30` |
| `DATABASE_MAX_AUTO_PREPARE` | How many of the most-reused statements Npgsql prepares per connection. 0 disables. Ignored with `POSTGRES_CONNECTION`. | `200` |

### Spaces Folder (import/export only)

The on-disk `spaces/` + `.dm/meta.*.json` layout is a transfer/backup format used only by `import`, `export` and `seed` — never as a live store. `SPACES_FOLDER` defaults empty and, when set, is also the root for an optional append-only `events.jsonl.log` audit trail (disabled unless configured).

## Security & Authentication

Authentication is JWT Bearer (HS256, symmetric key from `JWT_SECRET`) with Argon2id password hashing. With `ENABLE_MCP=true` DMART also runs an OAuth 2.1 authorization server for MCP clients, and with `OIDC_ISSUER` set, an OpenID Connect provider that signs its tokens with its own RSA key. DMART's own tokens are always HS256; that is not configurable.

### JWT & Sessions

| Setting | Description | Default |
|---|---|---|
| `JWT_SECRET` | Symmetric signing key (min 32 bytes). **Required — the server refuses to start on the placeholder value.** | `"change-me…"` |
| `JWT_ISSUER` | Expected `iss` claim | `"dmart"` |
| `JWT_AUDIENCE` | Expected `aud` claim | `"dmart"` |
| `JWT_ACCESS_EXPIRES` | Access-token lifetime (seconds) | `2592000` (30d) |
| `JWT_REFRESH_DAYS` | Refresh-token lifetime (days) | `30` |
| `JWT_REQUIRE_TOKEN_USE` | Reject JWTs lacking the `token_use` claim (access vs refresh separation) | `false` |
| `MAX_SESSIONS_PER_USER` | Max concurrent sessions per user | `5` |
| `SESSION_INACTIVITY_TTL` | Idle seconds before a JWT is rejected and its session deleted (0 = disabled) | `0` |
| `SESSION_MAX_LIFETIME_SECONDS` | Hard cap on the refresh-token chain from original login (0 = disabled) | `0` |
| `LOGOUT_ON_PWD_CHANGE` | Invalidate all sessions on password change | `true` |
| `CSRF_PROTECT_COOKIE_AUTH` | Gate cookie-borne auth against cross-site requests (bearer-header callers unaffected) | `true` |

### Brute-force & Rate Limiting

| Setting | Description | Default |
|---|---|---|
| `MAX_FAILED_LOGIN_ATTEMPTS` | Wrong passwords and codes before an account is auto-locked (0 = never lock) | `5` |
| `LOCKOUT_COOLDOWN_SECONDS` | Seconds with no sign-in attempt before a locked account unlocks (0 = locked until an admin unlocks) | `900` |
| `AUTH_RATE_LIMIT_PER_MINUTE` | Per-address cap on the sign-in, code and token routes per 60s (HTTP 429 beyond it) | `10` |
| `PUBLIC_RATE_LIMIT_PER_MINUTE` | Per-address cap on all `/public` calls per 60s. Behind a proxy it needs `TRUSTED_PROXIES`, or every visitor shares one bucket. 0 disables. | `600` |
| `MAX_OTP_VERIFY_ATTEMPTS` | Wrong guesses allowed against one OTP code before it is invalidated (0 = uncapped) | `5` |
| `LOCK_PERIOD` | Seconds a `PUT /managed/lock` stays held before another user can take it | `300` |
| `REPAIR_LEGACY_LOCKOUTS_ON_START` | At startup, release the account locks an older release wrote as `is_active=false`. A no-op once repaired. | `true` |

These limits are server-wide. They apply the same way to web, mobile and admin accounts; bot accounts are never locked by `MAX_FAILED_LOGIN_ATTEMPTS`, though their failures are still counted.

#### One sign-in attempt

```mermaid
flowchart TD
    start(["Sign-in attempt"]) --> atmax{"Locked?"}
    atmax -- yes --> quiet{"Cool-down<br/>over?"}
    quiet -- no --> touch["Restart the cool-down"]
    touch --> locked(["USER_ACCOUNT_LOCKED"])
    quiet -- yes --> clear["Unlock:<br/>attempt_count = 0"]
    clear --> cred
    atmax -- no --> cred{"Password<br/>or code right?"}
    cred -- yes --> ok(["Signed in,<br/>attempt_count = 0"])
    cred -- no --> inc["attempt_count + 1"]
    inc --> reached{"Limit<br/>reached?"}
    reached -- yes --> locked
    reached -- no --> wrong(["Wrong password<br/>or code"])
```

*Locked* means `attempt_count` has reached `MAX_FAILED_LOGIN_ATTEMPTS`. *Cool-down over* means no attempt for more than `LOCKOUT_COOLDOWN_SECONDS`. A wrong code also uses up one of that code's own `MAX_OTP_VERIFY_ATTEMPTS`. Wrong passwords at the login, OIDC and MCP sign-in forms, wrong codes at login and password reset, a wrong current password on a profile change, and failed LDAP binds all add to the same counter.

#### The account over time

```mermaid
stateDiagram-v2
    state "No failures" as Clean
    state "Some failures" as Counting
    state "Locked" as Locked
    [*] --> Clean
    Clean --> Counting : wrong
    Counting --> Counting : wrong
    Counting --> Clean : right
    Counting --> Locked : wrong, limit reached
    Locked --> Locked : any attempt restarts the cool-down
    Locked --> Clean : cool-down passes, or admin unlocks
```

The cool-down counts from the **last** attempt, not from when the lock started, so every attempt while locked starts it again, even one with the correct password. With the defaults:

| Time | What happens | Result |
|---|---|---|
| 10:00–10:02 | 5 wrong passwords | The 5th locks the account |
| 10:10 | The correct password | Refused: still locked, and the 15 minutes now run to 10:25 |
| 10:26 | The correct password | Unlocked and signed in |

A lock does not sign the user out: access tokens already issued keep working until they expire, but refreshing them at `/oauth/token` is refused. An admin unlocks an account early by saving the user with `attempt_count` set to `0` (the "clear on save" box in CXB).

### Registration, OTP & Profiles

| Setting | Description | Default |
|---|---|---|
| `IS_REGISTRABLE` | Allow self-registration via `POST /user/create` | `true` |
| `IS_OTP_FOR_CREATE_REQUIRED` | Require a verified OTP for account creation | `true` |
| `OTP_TOKEN_TTL` | One-time-password time-to-live (seconds) | `300` |
| `ALLOW_OTP_RESEND_AFTER` | Minimum seconds between OTP re-sends to one destination (covers every purpose; replaces the retired `ALLOW_PASSWORD_RESET_RESEND_AFTER`) | `60` |
| `MAX_OTP_REQUESTS_PER_DAY` | Cap on OTPs sent to one destination in a rolling 24 hours (0 = no cap) | `10` |
| `OTP_HISTORY_RETENTION_DAYS` | Days used and expired codes are kept before they are purged (at least 1) | `2` |
| `REGISTRATION_ENABLED_CHANNELS` | Channels self-registration accepts: `email` and/or `msisdn`. Empty closes self-registration. | `"email,msisdn"` |
| `ENABLE_OTP_IMPLICIT_REGISTRATION` | Let a code sign-in with an unknown email or phone create the account instead of failing | `false` |
| `REGEX_CONFIG_PATH` | JSON file overriding the `email` and `msisdn` patterns and the password rule (`password`, with the `password_hint` a refused password is told). Empty = `~/.dmart/regex.json`. The built-in rule is 8–64 characters with a digit and an uppercase letter. | `""` |
| `USER_CREATE_DEFAULT_ROLE` | Single role assigned to every self-created user (self-service create ignores roles in the body) | `""` (none) |
| `USER_CREATE_DEFAULT_GROUP` | Single group assigned to every self-created user | `""` (none) |
| `USER_PROFILE_PAYLOAD_PROTECTED_FIELDS` | CSV of payload fields users cannot update via `POST /user/profile` | `""` |
| `ALLOWED_SUBMIT_MODELS` | CSV of `space.schema` pairs allowed for public `/submit` endpoints (empty = none) | `""` |
| `USER_DELETION_MODE` | `soft` keeps a deleted user's row, marked deleted and stripped of contacts and password; `hard` deletes it with the user's entries, attachments, sessions and locks | `"soft"` |

### Admin Accounts

Accounts of type `admin` sign in with a one-time code.

| Setting | Description | Default |
|---|---|---|
| `ADMIN_IP_ALLOWLIST` | IPs and CIDR ranges admin accounts may sign in and work from, checked at sign-in and on every request. Empty = no address limit. Behind a proxy it needs `TRUSTED_PROXIES`. An entry that does not parse stops startup. | `""` |

### Password Hashing

These set how new hashes are made. A stored hash keeps its own parameters, so changing them never invalidates a password.

| Setting | Description | Default |
|---|---|---|
| `PASSWORD_HASH_MEMORY_KB` / `PASSWORD_HASH_ITERATIONS` / `PASSWORD_HASH_PARALLELISM` | Argon2id cost (OWASP's recommended settings) | `19456` / `2` / `1` |
| `PASSWORD_HASH_MEMORY_BUDGET_MB` | Ceiling on the hashing memory in use at once; hashes past it wait. 0 = half the memory available to the process. | `0` |
| `PASSWORD_HASH_QUEUE_TIMEOUT_SECONDS` | How long a hash waits for budget before the request gets a 503 with `Retry-After` | `30` |
| `PASSWORD_REHASH_ON_LOGIN` | After a successful login, rehash a password stored with other parameters | `true` |
| `MAX_PASSWORD_RECORDS_PER_REQUEST` | Most records carrying a password in one `/managed/request`. 0 disables. | `50` |

### Admin Bootstrap

| Setting | Description | Default |
|---|---|---|
| `ADMIN_EMAIL` | Email seeded for the `dmart` admin on first boot only | `""` |
| `ADMIN_PASSWORD` | First-boot admin password. Intentionally omitted from `config.env`; the recommended flow is `dmart passwd dmart`, which prompts for the password. Honoured via `Dmart__AdminPassword` if provided. | `""` (unset) |

## Email & Notifications

### SMTP

| Setting | Description | Default |
|---|---|---|
| `MAIL_HOST` | SMTP server host. Empty sends nothing; a code is then logged only at `debug` level. | `""` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USERNAME` | SMTP username | `""` |
| `MAIL_PASSWORD` | SMTP password | `""` |
| `MAIL_USE_TLS` | Use TLS for the SMTP connection | `true` |
| `MAIL_FROM_ADDRESS` | From email address | `"noreply@admin.com"` |
| `MAIL_FROM_NAME` | From name | `""` |
| `MOCK_SMTP_API` | Send no email (dev/test). Each code is still random, and is written to the server log at `warning` level. | `false` |

### SMS Gateway

| Setting | Description | Default |
|---|---|---|
| `SEND_SMS_OTP_API` | POST endpoint for OTP SMS delivery. Empty sends nothing; a code is then logged only at `debug` level. | `""` |
| `SEND_SMS_API` | POST endpoint for general SMS delivery | `""` |
| `SMS_SENDER` | Optional sender ID / from-name inlined into the SMS request body | `""` |
| `SMPP_AUTH_KEY` | Value of the `auth-key` header sent to the SMS gateway | `""` |
| `MOCK_SMPP_API` | Send no SMS (dev/test). Each code is still random, and is written to the server log at `warning` level. | `false` |
| `MOCK_OTP_FIXED` | Make every code sent over a mocked channel the fixed `MOCK_OTP_CODE`. Test servers only: anyone who knows an account's email or phone can then sign in as it. The server refuses to start with it on and no code. | `false` |
| `MOCK_OTP_CODE` | The fixed code; used only with `MOCK_OTP_FIXED=true` | `""` |

## Logging

| Setting | Description | Default |
|---|---|---|
| `LOG_FORMAT` | `"text"` (human-readable) or `"json"` (structured JSON lines) | `"text"` |
| `LOG_LEVEL` | `trace`, `debug`, `information`, `warning`, `error`, `critical`, `none` | `"information"` |
| `LOG_FILE` | Log file path. Empty = stdout only (container/journald friendly). | `""` |
| `LOG_MAX_BYTES` | Max file size before rotation. 0 disables rotation. | `1073741824` (1 GB) |
| `LOG_BACKUP_COUNT` | Rotated archive retention (< 0 unlimited, 0 truncate, > 0 keep N) | `-1` |

## Third-Party Integrations

### OAuth / Social Login

Leaving a provider’s `CLIENT_ID` blank disables it cleanly — its endpoints return a "provider not configured" error instead of attempting an outbound call.

| Setting | Description |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_OAUTH_CALLBACK` | Google OAuth credentials + redirect URI |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` / `FACEBOOK_OAUTH_CALLBACK` | Facebook OAuth credentials + redirect URI |
| `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_P8_PRIVATE_KEY` / `APPLE_OAUTH_CALLBACK` | Apple Sign In. The client secret is a short-lived ES256 JWT that DMART mints on the fly from the .p8 key. |

### Embeddings (semantic search, opt-in)

When the `pgvector` extension is installed _and_ `EMBEDDING_API_URL` is set, DMART embeds every entry on create/update and exposes `POST /managed/semantic-search` plus the `dmart_semantic_search` MCP tool. The endpoint is OpenAI-compatible.

| Setting | Description | Default |
|---|---|---|
| `EMBEDDING_API_URL` | Embeddings endpoint. Empty keeps semantic search off. | `""` |
| `EMBEDDING_API_KEY` | Bearer token for the embeddings endpoint | `""` |
| `EMBEDDING_MODEL` | Model name sent in the request body | `"text-embedding-3-small"` |

### Directory: LDAP, Replicas and OpenID Connect

DMART can serve its users as a read-only LDAP directory, keep a replica of another instance's users, and act as an OpenID Connect provider. All three are off by default.

| Setting | Description | Default |
|---|---|---|
| `LDAP_PORT` / `LDAPS_PORT` | Plain LDAP (with StartTLS once a certificate is set) and implicit-TLS ports. 0 = off. | `0` / `0` |
| `LDAP_HOST` | Address the LDAP listeners bind to | `"127.0.0.1"` |
| `LDAP_TLS_CERT_FILE` / `LDAP_TLS_KEY_FILE` | PEM certificate chain and key; re-read when they change on disk | `""` |
| `LDAP_TRUSTED_PEERS` | Addresses of the deployment's own directory clients: exempt from the failed-bind limit, and may bind over cleartext | `"127.0.0.0/8,::1"` |
| `LDAP_BASE_DN` | Base of the tree: users under `ou=people`, groups under `ou=groups` | `"dc=dmart"` |
| `LDAP_SERVICE_ACCOUNTS` | Bot users that may bind as `cn=<name>,ou=services` and read the whole directory | `""` |
| `LDAP_EXTRA_USER_OBJECT_CLASSES` | `objectClass` values added to every user entry | `""` |
| `LDAP_SIZE_LIMIT` / `LDAP_MAX_SCAN` | Most entries an unpaged search returns / most rows a search on an unindexed attribute examines | `500` / `100000` |
| `USER_SERVICES` | Services a user can be granted (e.g. `mail,matrix`). Empty accepts any lowercase name. | `""` |
| `USER_MAIL_DOMAINS` | Mail domains a user's mailbox and aliases must be in. Empty accepts any. | `""` |
| `USER_SERVICE_GRANTERS` | `service:role` pairs naming who may grant each service. A service with no pair is global-admin only. | `""` |
| `DIRECTORY_FEED_READERS` | On a primary: bot users that may read `/managed/directory-feed`, password hashes included. Empty turns the feed off. | `""` |
| `DIRECTORY_REPLICA_OF` | On a replica: the primary's base URL. Empty = not a replica. | `""` |
| `DIRECTORY_REPLICA_SHORTNAME` / `DIRECTORY_REPLICA_PASSWORD` | The bot account the replica signs in to the primary as | `""` |
| `DIRECTORY_REPLICA_INTERVAL_SECONDS` | Seconds between polls of the primary | `30` |
| `DIRECTORY_REPLICA_MAX_STALENESS_HOURS` | Hours a replica keeps answering binds after its last good sync. 0 = no limit. | `24` |
| `OIDC_ISSUER` | Public base URL of the OpenID Connect provider. Empty = off. | `""` |
| `OIDC_SIGNING_KEY_FILE` | PEM RSA key that signs ID and access tokens; created on first start when missing | `""` |
| `OIDC_CLIENTS_FILE` | JSON list of relying parties; re-read when it changes | `""` |
| `OIDC_TOKEN_SECONDS` | Lifetime of ID and access tokens | `3600` |

### Channel Authentication

| Setting | Description | Default |
|---|---|---|
| `ENABLE_CHANNEL_AUTH` | Gate requests on the `x-channel-key` header | `false` |
| `CHANNELS_CONFIG_PATH` | Path to the channels JSON file (empty = `~/.dmart/channels.json`) | `""` |

## Miscellaneous

| Setting | Description | Default |
|---|---|---|
| `ENFORCE_FOLDER_CONTENT_POLICY` | Enforce a folder’s content-policy arrays on create/update/move. False = dry-run (violations warn-logged but allowed). | `true` |
| `ENABLE_INNER_JOIN_PUSHDOWN` | Push eligible inner joins into SQL as correlated EXISTS semi-joins. False forces the in-memory fallback. | `true` |
| `ENABLE_MCP` | Expose the Model Context Protocol surface: `/mcp`, the OAuth 2.1 authorization server (`/oauth/*`) and its `/.well-known/oauth-*` discovery documents. False leaves all of them unmapped (`INVALID_ROUTE`, HTTP 422). | `false` |
| `IMPORT_MAX_ENTRIES` | Reject zip imports declaring more than this many entries (decompression-bomb guard). 0 disables. | `500000` |
| `IMPORT_MAX_UNCOMPRESSED_BYTES` | Reject zip imports whose declared uncompressed size exceeds this. 0 disables. | `2147483648` (2 GiB) |
| `PARQUET_ROW_GROUP_ROWS` | Rows per row group in a Parquet export | `50000` |
| `PARQUET_ATTACHMENT_PAGE_SIZE` / `PARQUET_HISTORY_PAGE_SIZE` | Attachments / history rows fetched per page during a Parquet export | `500` / `10000` |
| `PARQUET_BULK_BATCH_SIZE` | Rows per bulk batch when restoring a Parquet export | `10000` |
