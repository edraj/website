Comprehensive reference for the DMART API. All endpoints, data structures, and usage examples.

## Base URL & Authentication

The API is served by the self-contained DMART binary (.NET 10 Native AOT) on ASP.NET Core / Kestrel. The base URL for all API requests is typically: `http://localhost:8282` (or as configured via `LISTENING_HOST` / `LISTENING_PORT`).

Most endpoints require authentication with a JWT bearer token (HS256), supplied either as a header or a cookie:

**Header** `Authorization: Bearer <your_token>`

**Cookie** `auth_token=<your_token>` — accepted only on same-site requests (judged by the browser's `Sec-Fetch-Site`) or with an `X-Requested-With` header, unless `CSRF_PROTECT_COOKIE_AUTH=false`.

Tokens are obtained via `/user/login` (password or OTP), `/user/create` (self-registration signs the new user in), or through OAuth social login (Google, Facebook, Apple). With `ENABLE_MCP=true`, DMART also runs an **OAuth 2.1 Authorization Server** for automatic onboarding of MCP clients: discovery at `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`, Dynamic Client Registration at `/oauth/register`, and `/oauth/authorize` and `/oauth/token`.

Interactive API documentation is available as **Swagger UI** at `/docs`, with the raw OpenAPI schema at `/docs/openapi.json` (both served by ASP.NET Core).

**Limits.** Every request runs under `REQUEST_TIMEOUT` (35 s by default) and is answered `504` when it runs out; WebSockets, `/mcp`, `/managed/import` and `/managed/export` have no such deadline. The sign-in, code and token routes, and the anonymous write routes, are limited per client address by `AUTH_RATE_LIMIT_PER_MINUTE` (10 a minute), and every `/public` route by `PUBLIC_RATE_LIMIT_PER_MINUTE` (600 a minute); past either the answer is HTTP `429`. The routes that take a file accept up to `MAX_UPLOAD_SIZE_MB` (50 MB by default).

## Common Data Structures

### Record

Represents a resource in the system. This is the primary object for creating or updating entities.

```json
{
  "resource_type": "content",
  "shortname": "my_article",
  "subpath": "/blog",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "attributes": {
    "is_active": true,
    "slug": "my-article-slug",
    "displayname": { "en": "My Article" },
    "description": { "en": "A description" },
    "tags": ["news", "tech"],
    "owner_shortname": "jdoe",
    "owner_group_shortname": "editors",
    "created_at": "2023-10-01T12:00:00",
    "updated_at": "2023-10-01T12:00:00",
    "payload": {
      "content_type": "json",
      "schema_shortname": "article",
      "body": { "title": "Hello World", "content": "..." }
    },
    "acl": [
      {
        "user_shortname": "jane",
        "allowed_actions": ["view", "update"]
      },
      {
        "user_shortname": "bob",
        "denied": ["view", "query"]
      }
    ],
    "relationships": [
      {
        "related_to": {
          "space_name": "data",
          "type": "user",
          "subpath": "users",
          "shortname": "jane"
        },
        "attributes": { "role": "editor" }
      }
    ]
  }
}
```

### Request

Used for batch operations (create, update, delete, etc.).

```json
{
  "space_name": "data",
  "request_type": "create",
  "records": [ ... list of Record objects ... ]
}
```

### Query

Used for searching and filtering resources. Supports full-text search, aggregation, joins, and JQ filters.

```json
{
  "type": "search",
  "space_name": "data",
  "subpath": "/blog",
  "exact_subpath": false,
  "filter_types": ["content"],
  "filter_schema_names": ["article"],
  "filter_shortnames": [],
  "filter_tags": ["tech"],
  "search": "@payload.body.title:Hello*",
  "from_date": "2023-01-01T00:00:00",
  "to_date": "2023-12-31T23:59:59",
  "exclude_fields": ["payload.body"],
  "include_fields": ["shortname", "displayname"],
  "highlight_fields": { "description.en": "" },
  "sort_by": "created_at",
  "sort_type": "descending",
  "retrieve_json_payload": true,
  "retrieve_attachments": false,
  "retrieve_total": true,
  "retrieve_lock_status": false,
  "jq_filter": ". | select(.attributes.is_active == true)",
  "limit": 10,
  "offset": 0,
  "aggregation_data": {
    "group_by": ["@tags"],
    "reducers": [
      { "reducer_name": "count_distinct", "alias": "count", "args": ["@shortname"] }
    ]
  },
  "join": [
    {
      "join_on": "owner_shortname:shortname",
      "alias": "author_details",
      "query": { "...nested Query..." }
    }
  ]
}
```

A query that leaves out `limit` gets `DEFAULT_QUERY_LIMIT` rows (10 by default). `-1` asks for `MAX_QUERY_LIMIT` (10,000 by default), and no query returns more than that.

## Enums & Possible Values

| Enum | Values |
|---|---|
| **ResourceType** (30) | `user`, `group`, `folder`, `schema`, `content`, `log`, `acl`, `comment`, `media`, `data_asset`, `locator`, `relationship`, `alteration`, `history`, `space`, `permission`, `role`, `ticket`, `json`, `lock`, `post`, `reaction`, `reply`, `share`, `plugin_wrapper`, `notification`, `csv`, `jsonl`, `sqlite`, `parquet` |
| **RequestType** (7) | `create`, `update`, `patch`, `update_acl`, `assign`, `delete`, `move` |
| **ContentType** (22) | `text`, `comment`, `reaction`, `markdown`, `html`, `json`, `image`, `image_jpeg`, `image_png`, `image_svg`, `image_gif`, `image_webp`, `python`, `pdf`, `audio`, `video`, `csv`, `parquet`, `jsonl`, `apk`, `sqlite`, `binary` |
| **ActionType** (11) | `query`, `view`, `update`, `create`, `delete`, `attach`, `assign`, `move`, `progress_ticket`, `lock`, `unlock` |
| **QueryType** (12) | `search`, `subpath`, `events`, `history`, `tags`, `random`, `spaces`, `counters`, `reports`, `aggregation`, `attachments`, `attachments_aggregation` |
| **Language** (5) | `arabic`, `english`, `kurdish`, `french`, `turkish` These full spellings are the persisted enum wire values (e.g. `space.languages`). The 2-letter keys `ar` / `en` / `ku` / `fr` / `tr` are ONLY keys inside `displayname` / `description` translation maps — they are NOT Language enum values. |
| **SortType** (2) | `ascending`, `descending` |
| **UserType** (4) | `web`, `mobile`, `bot`, `admin` |
| **PluginType** (2) | `hook`, `api` |
| **EventListenTime** (2) | `before`, `after` |
| **JoinType** (4) | `left`, `right`, `inner`, `outer` |
| **PublicSubmitResourceType** (2) | `content`, `ticket` The only two resource types accepted by `/public/submit`. |
| **Status** (2) | `success`, `failed` The response-envelope `status` field (see below). |
| **TaskType** (1) | `query` |

### String conventions (NOT typed enums)

The following values are string **conventions** — they are validated/handled as plain strings and have _no_ backing C# enum. Only the two permission condition constants (`own`, `is_active`) are real string constants; reaction kinds, the lock action string, and notification type/priority are inherited Python-era conventions.

| Convention | Values |
|---|---|
| **Permission conditions** (real string constants) | `own`, `is_active` |
| **Reaction kinds** (convention) | `like`, `dislike`, `love`, `care`, `laughing`, `sad` |
| **Lock action** (convention) | `lock`, `unlock` (acquire/release via the `/managed/lock` routes) |
| **Notification type** (convention) | `admin`, `system` |
| **Notification priority** (convention) | `high`, `medium`, `low` |

### Response envelope

The `/managed`, `/public`, and `/user` endpoints return the same envelope, except where they hand back a record or a file itself: a read of one record (`/entry`, `byuuid`, `byslug`) returns that record's own JSON, and the payload, CSV and export routes return the file. A success carries `records` and an `attributes` block (with `total` / `returned` counts on queries); a failure carries a single `error` object, sometimes with an `info` list of details. Fields that are null are left out. `error.code` is DMART's own error code, not the HTTP status.

On queries, `total` is `-1` when the count was skipped (`retrieve_total: false`; `/public/query` skips it unless asked). Above `QUERY_TOTAL_CAP`, `total` is the cap and `total_is_lower_bound` is `true`.

```
// success
{
  "status": "success",
  "records": [ /* ...Record objects... */ ],
  "attributes": { "total": 128, "returned": 10 }
}

// failure
{
  "status": "failed",
  "error": {
    "type": "jwtauth",
    "code": 49,
    "message": "Not authenticated [1]"
  }
}
```

As a rule the HTTP status follows `error.code`: `401` for authentication and permission refusals, `404` for a record that is not there, `409` for a name or unique value already taken, `403` for a refused password change, `423` for an entry someone else has locked, `503` while the password-hashing budget is full, and `400` for anything else. A route that does not exist answers `INVALID_ROUTE` (230) with HTTP `422`.

## User Management `/user`

GET `/user/check-existing`

Checks if a user with specific fields already exists. Open without a session, and rate-limited per address. Answers `attributes.unique`, and when something is taken, `attributes.field` names the first one found.

**Query Params:** `shortname`, `msisdn`, `email` (all optional)

POST `/user/create`

Registers a new user and signs them in: the answer carries an `access_token` and sets the `auth_token` cookie. Self-registration is off unless `IS_REGISTRABLE=true`, and takes only the channels in `REGISTRATION_ENABLED_CHANNELS`. The server assigns the shortname, and ignores roles and groups in the body (`USER_CREATE_DEFAULT_ROLE` / `USER_CREATE_DEFAULT_GROUP` apply instead). With the default `IS_OTP_FOR_CREATE_REQUIRED=true`, first request a code with `/user/otp-request` and `purpose: "register"`, and send it as `email_otp` (or `msisdn_otp`). A password must meet the password rule (see [Access Control](/access-control)).

```json
{
  "attributes": {
    "email": "jdoe@example.com",
    "email_otp": "482913",
    "password": "StrongPassword123!",
    "displayname": { "en": "John Doe" }
  }
}
```

POST `/user/login`

Authenticates a user and returns a token. The identifier is one of `shortname`, `email` or `msisdn`; signing in by email or phone needs that address verified. The answer's record carries `access_token`, `type`, `roles` and `groups`, and the server also sets the HttpOnly `auth_token` cookie. A refused sign-in answers HTTP `401`.

```json
{
  "shortname": "jdoe",
  "password": "StrongPassword123!"
}
```

Or via OTP (requested with `purpose: "login"`):

```json
{
  "msisdn": "1234567890",
  "otp": "482913"
}
```

A `mobile` account that has signed in from a device must send that device's `device_id`; from another device, or none, the password is answered with `OTP_NEEDED` (115) and the user signs in with a code. Mobile clients may also send a `firebase_token` for the session.

Accounts of type `admin` sign in with their password **and** a one-time code. The password alone, once it checks out, sends the code and answers `OTP_NEEDED` (115); the sign-in then completes with `password` and `otp` sent together. `/user/otp-request` sends an admin no login code. Wrong passwords and codes count toward the account lockout (see [Access Control](/access-control)).

GET `/user/profile`

Retrieves the profile of the currently logged-in user: contact details, `type`, `roles`, `groups`, `payload`, and the avatar attachment when there is one. The profile's `attributes.permissions` is deprecated; read the map from `/user/permissions`.

GET `/user/permissions`

Returns the caller's permission map as `attributes.permissions`, keyed `space:subpath:resource_type`, with `allowed_actions`, `conditions`, `restricted_fields`, `allowed_fields_values` and `filter_fields_values` for each key. It includes the grants of the implicit `logged_in` role. The answer carries an `ETag` and `Cache-Control: private, no-cache`, so a client that sends `If-None-Match` gets `304` with no body while the map is unchanged.

POST `/user/profile`

Updates the profile of the currently logged-in user: `displayname`, `description`, `language` and `payload`. A new `password` needs the current one in `old_password` (a wrong one counts toward the lockout); an account with no password gets its first one through a password reset. Email and phone change only through `/user/verify-contact`, the device only by signing in from it, and payload fields listed in `USER_PROFILE_PAYLOAD_PROTECTED_FIELDS` not at all.

POST `/user/logout`

Ends the session of the token the request carries (the header's and the cookie's) and clears the `auth_token` cookie.

POST `/user/delete`

Deletes the current user's account (`USER_DELETION_MODE`, `soft` by default).

POST `/user/otp-request`

Sends a one-time code. Body: one of `email`, `msisdn` or `shortname`, and a `purpose`: `login`, `reset`, `register` (for `/user/create`) or `verify-contact` (signed in only). A code works only for the purpose it was issued for. A code asked for by shortname goes to the account's phone, else its email. Every well-formed request answers `200`, whether or not a code went out, so the answer says nothing about which addresses have accounts; a resend within `ALLOW_OTP_RESEND_AFTER`, or past `MAX_OTP_REQUESTS_PER_DAY`, sends nothing. An admin gets a `reset` code only while another admin has set `force_password_change` on the account; otherwise its own phone or email gets a notice saying so.

POST `/user/password-reset-confirm`

Sets a new password with a `reset` code. Body: the same identifier, `otp` and `password`, which must meet the password rule. A wrong code counts toward the lockout. With `LOGOUT_ON_PWD_CHANGE` (on by default) the reset ends the account's sessions.

POST `/user/verify-contact`

Signed in: proves the caller controls an email or phone with a `verify-contact` code, and makes it theirs, verified. Body: `code` and `email` or `msisdn`. Confirming the address already on the account needs nothing more. Changing to a new one also needs the current `password` (a wrong one counts toward the lockout), or, on an account without a password, `current_code`: a `verify-contact` code sent to the phone or email the account already has.

POST `/user/validate_password`

Checks if the provided password is correct for the current user, answering `attributes.valid`. A wrong one counts toward the lockout.

### Social Login

GET `/user/google/login`, GET `/user/facebook/login`

Start a web sign-in with the provider.

GET `/user/google/callback`, GET `/user/facebook/callback`

Google and Facebook OAuth callbacks.

POST `/user/apple/callback`

Apple OAuth callback (Apple posts the form). Takes a `code`, which DMART exchanges with Apple, or an `id_token`. A sign-in sets the `auth_token` cookie and redirects to `APPLE_OAUTH_CALLBACK`, with no token in the URL.

POST `/user/google/mobile-login`, `/user/facebook/mobile-login`, `/user/apple/mobile-login`

Sign in from a mobile app with a token the app got from the provider. Body: `token` (the ID token for Google and Apple, the access token for Facebook) and an optional `device_id`.

A provider sign-in only finds an existing account, by the provider's id or a verified email. It never creates one, and answers `401` when none matches. Accounts of type `admin` cannot sign in this way.

## Managed Content `/managed`

Endpoints for authenticated management of content and resources.

POST `/managed/request`

Performs batch operations (create, update, delete, etc.). A `shortname` of `auto` has the server pick one. Update and patch answer with no records; the other request types return the records written. When any record fails, the others are still applied and the request answers `SOMETHING_WRONG` (430), with `error.info` listing the records that succeeded (under the key `successfull`, spelled so) and those that failed, each with its error.

```json
{
  "space_name": "data",
  "request_type": "create",
  "records": [
    {
      "resource_type": "content",
      "shortname": "new_item",
      "subpath": "/items",
      "attributes": {
        "displayname": {"en": "New Item"},
        "payload": {
          "content_type": "json",
          "body": {"key": "value"}
        }
      }
    }
  ]
}
```

**Delete with `force` / `dry_run`:** a `delete` request accepts two top-level flags. `force: true` cascade-deletes a non-empty folder (and all its contents); a plain delete of a non-empty folder is rejected. `dry_run: true` projects the full cascade and returns an affected-count report _without removing anything_.

```json
{
  "space_name": "data",
  "request_type": "delete",
  "force": true,
  "dry_run": true,
  "records": [
    { "resource_type": "folder", "shortname": "archive", "subpath": "/" }
  ]
}
// -> success envelope; each record's attributes carry a per-category
//    "report" of what WOULD be deleted, plus "dry_run": true (nothing removed).
```

POST `/managed/query`

Executes a query against the database.

```json
{
  "type": "search",
  "space_name": "data",
  "subpath": "/content",
  "search": "*",
  "limit": 5
}
```

POST `/managed/semantic-search`

Natural-language (vector) search — embeds the query and returns the top-N most similar entries by cosine distance over `entries.embedding`. Requires the pgvector extension _and_ a configured embedding provider (`EMBEDDING_API_URL`); when either is missing it returns a clean `400` failure envelope. Each hit is checked as a read of that entry, and only the hits the caller may read are returned and counted in `matched`; a `space_name` the caller cannot read returns no matches. `limit` is clamped to a max of 100.

```
// request
{
  "query": "how do refunds work",
  "space_name": "data",        // optional
  "subpath": "/articles",       // optional prefix
  "resource_types": ["content"],// optional
  "limit": 10                    // optional (default 10, max 100)
}

// success -> each record's attributes carry space_name, similarity (0..1), uri
{
  "status": "success",
  "records": [
    {
      "resource_type": "content",
      "shortname": "refund_policy",
      "subpath": "/articles",
      "attributes": { "space_name": "data", "similarity": 0.83,
                      "uri": "dmart://data/articles/refund_policy" }
    }
  ],
  "attributes": { "returned": 1, "matched": 3 }
}

// not configured
{ "status": "failed",
  "error": { "type": "request", "code": 217,
             "message": "semantic search not configured — set EMBEDDING_API_URL ..." } }
```

POST `/managed/reindex-embeddings`

Admin tool that (re)embeds entries into the pgvector column — used to backfill or rebuild the semantic-search index. Runs as a background job. Global admins only. Optional body: `space_name`, `only_missing` (default `true`) and `max_per_space`.

GET `/managed/reindex-embeddings/status`

Global admins only. Returns the live progress of the current or last re-index run.

POST `/managed/import`

Imports data from a ZIP file. Body: `multipart/form-data` with `zip_file`, or the ZIP itself as the body. Global admins only. It is not cut off at `REQUEST_TIMEOUT`: it runs as long as the archive takes, and stops if the client hangs up. The answer counts what was inserted (`entries_inserted`, `users_inserted`, …), `skipped` and `failed_count`, and lists each failed row in `failed`. Rows of a space the instance does not have, and the archive does not create, are refused and reported with `"kind": "space-missing"`.

POST `/managed/export`

Exports data based on a `Query` object, as a ZIP. Global admins only, and not cut off at `REQUEST_TIMEOUT`. Send `"limit": -1` to export everything the query matches; without a `limit` the export holds the page a query would return. Only an export of the whole space (subpath `/`, with no type, shortname, tag, date or search filter) carries the space's own record, so a folder's archive imports only into a space that already exists.

POST `/managed/csv`, POST `/managed/csv/{space}`

Exports query results as CSV, at most `MAX_QUERY_LIMIT` rows to a file. With `?preview=1` it answers, instead of the file, what the CSV for the same body would hold: `exported`, `total`, `limit`, `truncated`, the `reason` when it was cut short, and a `message`. `/managed/csv/{space}` also takes a saved query's record as its body.

PUT `/managed/progress-ticket/{space}/{subpath}/{shortname}/{action}`

Moves a ticket along its workflow: `{action}` names one of the transitions its workflow allows from the ticket's current state, for the caller's roles. Needs `progress_ticket` on the ticket. The body is optional, except on a transition that requires a `resolution`.

```json
{
  "resolution": "Fixed",
  "comment": "Done"
}
```

GET `/managed/payload/{resource_type}/{space}/{subpath}/{shortname}.{ext}`

Gets the raw payload of a resource: an entry's payload body as JSON, or an attachment's file. Images, PDF, MP3 and MP4, and plain text, Markdown and CSV are shown inline; any other type is sent as a download, and `?download=1` downloads any of them. Range requests are supported.

POST `/managed/resource_with_payload`

Uploads a file as payload. Body: `multipart/form-data` with `payload_file`, `request_record` (the record, as a JSON file part), `space_name`.

POST `/managed/resources_from_csv/{resource_type}/{space}/{subpath}/{schema}`

Creates resources from a CSV file. Body: `multipart/form-data` with `resources_file`. `?is_update=true` updates the existing records instead. A row that fails is listed in `failed` and the rest import. An upload cut off at `REQUEST_TIMEOUT` says where it stopped: send the same file again with `?start_row=N` to carry on from there.

GET `/managed/entry/{resource_type}/{space}/{subpath}/{shortname}`

Gets the metadata of a resource: the record's own JSON, not wrapped in the envelope. `?retrieve_json_payload=true` adds the payload body, `?retrieve_attachments=true` the attachments the caller may read, and `?retrieve_lock_status=true` the lock holder. `resource_type` may also be `space`, `user`, `role` or `permission`. A record that is missing, or that the caller may not read, answers `404`.

GET `/managed/byuuid/{uuid}`

Gets an entry by UUID, as its own JSON, or `404`.

GET `/managed/byslug/{slug}`

Gets an entry by slug, as its own JSON, or `404`.

GET `/managed/health/{health_type}/{space}`

Runs the health checks on a space and answers `total_issues` and, for each check, its `name` and `count`; `hard` adds `samples` of the records found. Types: `soft`, `hard`. Global admins only.

PUT `/managed/lock/{resource_type}/{space}/{subpath}/{shortname}`

**Acquires** an entry lock for the caller, held for `LOCK_PERIOD` seconds (300 by default). It needs `lock` or `update` on the entry. While a lock is held, `update` and `delete` from any user other than the lock holder are rejected; the holder may re-lock (extend) their own lock. An entry someone else has locked answers `LOCKED_ENTRY` (HTTP `423`). Query results can surface the current holder via `retrieve_lock_status` (see the `Query` shape above).

DELETE `/managed/lock/{space}/{subpath}/{shortname}`

**Releases** the lock the caller holds on an entry. Releasing a lock another user holds needs `unlock`.

GET `/managed/reload-security-data`

Reloads the in-process permissions and roles cache from the database, and drops the compiled schemas. Global admins only.

POST `/managed/execute/{task_type}/{space}`

Runs a **saved query** task. The only defined `task_type` is `query`: DMART loads a saved query entry by `shortname`, parses its `payload.body` as a `Query`, and executes it. `query_overrides` merge into the loaded query, and any `$param` placeholders inside the query's `search` string (e.g. `@status:$state`) are substituted from the overrides; unresolved `@field:$param` fragments are stripped before execution.

The misspelled legacy path `/managed/excute/{task_type}/{space}` is also mapped for client compatibility.

```json
{
  "shortname": "open_tickets",
  "subpath": "/tasks",
  "query_overrides": { "state": "open", "limit": 20 }
}
```

POST `/managed/apply-alteration/{space}/{alteration_name}`

Runs a saved alteration: the entry `{alteration_name}` in the space's `/alterations` folder, whose body holds a `target_query` (on the same space) and a `patch`. Every entry the query returns (10, unless the query sets a `limit`) is updated with the patch, under the caller's own permissions. The answer counts `matched` and `updated`, and lists each entry that failed.

GET `/managed/shortening/{space}/{**rest}`

**Creates** a short link to an entry and returns a random `token` and its `short_url`. The link points at the entry's `/managed/entry/content/…` URL under `APP_URL`, and the token expires after `URL_SHORTER_EXPIRES` seconds (an hour by default).

```
// -> attributes: { "token": "9f86d081884c7d659a2feaa0c55ad015",
//                  "short_url": "https://app.example.com/managed/s/9f86d081884c7d659a2feaa0c55ad015" }
```

GET `/managed/directory-feed`

On a directory primary: the user and group feed a replica pulls, password hashes included. Readable only by the bots in `DIRECTORY_FEED_READERS`; off when that is empty.

GET `/managed/s/{token}`

Resolves a short token and issues a `302` redirect to its original URL (anonymous-accessible, rate-limited).

## Public Access `/public`

Endpoints for unauthenticated or public access (if configured).

POST `/public/query`

Executes a query publicly, as the anonymous user: it sees what the `world` permission grants (see [Access Control](/access-control)). The `events` feed is not served here.

GET `/public/query/{type}/{space}/{subpath}`

Public query via URL params: `limit`, `offset` and `search`.

GET `/public/entry/{resource_type}/{space}/{subpath}/{shortname}`

Retrieves a public entry, as `/managed/entry` returns it (without the lock status).

GET `/public/payload/{resource_type}/{space}/{subpath}/{shortname}.{ext}`

Retrieves a public payload, served as `/managed/payload` serves it.

POST `/public/submit/{space}/{**rest}`

Submits data to a public endpoint (e.g. a form). The path takes three forms: `/public/submit/{space}/{schema}/{subpath}`, `/public/submit/{space}/{resource_type}/{schema}/{subpath}`, and, for tickets, `/public/submit/{space}/ticket/{workflow}/{schema}/{subpath}`. The segment after the space is the resource type only when it is `content` or `ticket`; otherwise it is the schema and the type is `content`. The `space.schema` pair must be listed in `ALLOWED_SUBMIT_MODELS`, which is empty — closed — by default, and is matched exactly, case included. The anonymous user still needs a `create` grant there. The entry is created inactive, owned by `anonymous`, under a name the server picks, and the answer carries its `uuid` and `shortname`.

POST `/public/attach/{space}`

Attaches an attachment (a comment, media, a reaction, …) to a record anonymously, in a space `ALLOWED_SUBMIT_MODELS` names. Body: `multipart/form-data` with `record` (the attachment's record, as JSON) and an optional `payload_file`. A schema it names must form a listed `space.schema` pair. What it creates is inactive, owned by `anonymous`, under a name the server picks.

POST `/public/resource_with_payload`

Anonymous variant of `/managed/resource_with_payload`. Like `/public/submit`, it writes only to `space.schema` pairs listed in `ALLOWED_SUBMIT_MODELS`: an entry must be content or a ticket, and its body is validated against the schema. Whatever it creates is inactive.

POST `/public/excute/{task_type}/{space}`

Runs a saved query task (see `/managed/execute`) as the anonymous user.

GET `/public/client-config`

The server's values a frontend needs, for one that DMART does not serve itself: `otp_length`, `otp_resend_after`, `otp_token_ttl`, `max_upload_size_mb`, `default_query_limit`, `max_query_limit`, `ui_list_limit`, `password_rule_custom` and, when one is set, `password_hint`, plus `backend_timeout` in milliseconds (`REQUEST_TIMEOUT` plus 5 s), a floor for the client's own timeout.

GET `/public/byuuid/{uuid}`

Gets a public entry by UUID.

GET `/public/byslug/{slug}`

Gets a public entry by slug.

## QR Codes `/qr`

Note: both `/qr` endpoints are mapped but not implemented; they answer `501 Not Implemented`.

GET `/qr/generate/{resource_type}/{space}/{subpath}/{shortname}`

Generates a QR code for a resource.

POST `/qr/validate`

Validates a scanned QR code.

```json
{
  "resource_type": "user",
  "space_name": "data",
  "subpath": "/users",
  "shortname": "jdoe",
  "qr_data": ""
}
```

## System Info `/info`

Every `/info` route except `/info/me` is for global admins only (see [Access Control](/access-control): an active permission over all spaces and subpaths with create and update, covering users, roles, permissions and groups, with no conditions, field limits or row filter).

GET `/info/me`

Returns the caller's `shortname`. Open to any signed-in user.

GET `/info/settings`

Gets the effective settings, secrets redacted.

GET `/info/manifest`

Returns the server's name, version and API version, and the active plugins.

GET `/info/plugins`

Lists the loaded plugins with their version, type and status; a plugin that failed to load is listed with status `failed`.

GET `/info/metrics`

Returns process and runtime metrics; `?format=prometheus` answers in the Prometheus text format.

## Health `/health`

GET `/health/live`, GET `/health/ready`

Liveness and readiness probes, open without authentication. `ready` checks the database, and on a directory replica that it has synced; when the server is not ready it answers `503`, with the reason in `error.message`.

## OpenID Connect

With `OIDC_ISSUER` set, DMART is an OpenID Connect provider: discovery at `{issuer}/.well-known/openid-configuration`, and `/oidc/authorize`, `/oidc/token`, `/oidc/userinfo` and `/oidc/jwks`. Its relying parties are the clients listed in `OIDC_CLIENTS_FILE`, and it issues them RS256 tokens of its own, never a DMART session token.

## Plugin Routes

Each API plugin mounts its own routes under `/{plugin_shortname}`. They require authentication. The built-in `db_size_info` plugin answers `GET /db_size_info/` with each table's size, to global admins only.

## Realtime & WebSockets `/ws`

DMART pushes live updates over WebSocket connections. A built-in notifier plugin broadcasts entry changes to subscribed clients.

GET `/ws`

Opens an authenticated WebSocket connection for realtime notifications. The JWT is passed as a query param (`ws://host/ws?token=JWT`) or via the `auth_token` cookie, which is not taken from a cross-site browser handshake (one whose `Origin` is neither this host nor listed in `ALLOWED_CORS_ORIGINS`). The handshake is refused with HTTP `401` if the token is invalid, the user is inactive, or the session has been revoked, and an open socket is closed when its session ends.

After connecting, the client subscribes by sending a `notification_subscription` message with at least `space_name` and `subpath`. Subscribing needs `view` there, and the server answers with a `notification_subscription` message whose `status` is `success` or `failed`; a `notification_unsubscribe` message drops every subscription. DMART builds a channel name of the form `space:subpath:schema:action:state`, defaulting any omitted segment to the `__ALL__` wildcard. The realtime notifier plugin then broadcasts every matching CRUD event to subscribed clients, each judged when the event is sent: a subscriber hears only of the records it may read.

```
// client -> server: subscribe (omit fields to wildcard them)
{
  "type": "notification_subscription",
  "space_name": "data",
  "subpath": "/tickets",
  "schema_shortname": "ticket",   // optional -> __ALL__
  "action_type": "update",         // optional -> __ALL__
  "ticket_state": "open"           // optional -> __ALL__
}
// -> channel "data:/tickets:ticket:update:open"

// server -> client on connect
{ "type": "connection_response", "message": { "status": "success" } }
```

POST `/send-message/{user}`

Sends a message to a specific connected user. Global admins only.

POST `/broadcast-to-channels`

Broadcasts a message to subscribers of one or more channels. Global admins only.

GET `/ws-info`

Returns information about active WebSocket connections. Global admins only.

## Model Context Protocol `/mcp`

DMART ships a built-in **MCP server** (Streamable HTTP transport, spec `2025-03-26`) so AI agents can query and mutate entries as tools. It is **off by default** — set `ENABLE_MCP=true` to expose it; otherwise `/mcp` and the OAuth 2.1 endpoints are unmapped and answer `INVALID_ROUTE` (HTTP 422). All requests are authenticated — the caller's JWT flows through to each tool handler. Sessions are tracked via the `Mcp-Session-Id` header. Pair it with the OAuth 2.1 Authorization Server for automatic client onboarding. Its sign-in form takes a password only, so it refuses accounts of type `admin`; an integration signs in as a `bot` account.

POST `/mcp`

Sends a JSON-RPC MCP request (initialize, list/call tools, etc.).

GET `/mcp`

Opens the server-sent-events (SSE) stream for the MCP session.

DELETE `/mcp`

Terminates the current MCP session.

### Available tools (11)

The MCP server exposes these tools to agents. Every tool runs under the caller's JWT, so DMART's permission model is enforced identically to the HTTP API — there is no admin escape hatch.

| Tool | Purpose |
|---|---|
| `dmart_me` | Return the authenticated caller's profile. |
| `dmart_spaces` | List the spaces the caller can access. |
| `dmart_query` | Search / list entries. Results are hard-capped at **50** records per call; without a `limit` it returns `DEFAULT_QUERY_LIMIT`. |
| `dmart_read` | Read a single entry (metadata + payload). |
| `dmart_schema` | Fetch a schema definition for a space/subpath. |
| `dmart_create` | Create a new entry. |
| `dmart_update` | Update / patch an existing entry. |
| `dmart_delete` | Delete an entry. With `confirm: true` it deletes without asking; without it, a client that supports **elicitation** is asked to confirm, and any other client is refused. Folders take an optional `force` flag to cascade-delete non-empty contents. |
| `dmart_history` | Retrieve the change history of an entry. |
| `dmart_download` | Download the raw payload / attachment of an entry. |
| `dmart_semantic_search` | Natural-language vector search (requires pgvector + an embedding provider, same as `/managed/semantic-search`). |
