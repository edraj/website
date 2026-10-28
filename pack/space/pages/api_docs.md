Comprehensive reference for the DMART API. All endpoints, data structures, and usage examples.

## Base URL & Authentication

The API is served by the self-contained DMART binary (.NET 10 Native AOT) on ASP.NET Core / Kestrel. The base URL for all API requests is typically: `http://localhost:8282` (or as configured via `LISTENING_HOST` / `LISTENING_PORT`). `GET /` answers `{"status":"success","message":"DMART-CS API"}`.

Most endpoints require authentication with a JWT bearer token (HS256), supplied either as a header or a cookie:

**Header** `Authorization: Bearer <your_token>`

**Cookie** `auth_token=<your_token>` — set by every sign-in as `HttpOnly; SameSite=Lax; Path=/` (plus `Secure` over HTTPS), with a `Max-Age` of `JWT_ACCESS_EXPIRES`. It is accepted only on same-site requests (judged by the browser's `Sec-Fetch-Site`) or with an `X-Requested-With` header, unless `CSRF_PROTECT_COOKIE_AUTH=false`.

**A browser front end must be on its backend's site**, the same registrable domain (`cat.example.com` and `api.example.com` are one site; `example.com` and `example.org` are two), because a browser sends a `SameSite=Lax` cookie only there. cxb and catalog authenticate by the cookie alone, so the `backend` in their `config.json` (see [Settings](/settings#loading-order)) must be blank (the page's own origin), a path such as `/dmart` (the API under the page's own origin), or a sibling subdomain, with the page's origin listed in `ALLOWED_CORS_ORIGINS`. A catalog on another site signs in, then is anonymous on every later call. A client on another site sends a bearer token instead.

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

The server sets `owner_shortname`, `created_at` and `updated_at`; a write ignores them. A create makes the caller the owner, an update keeps the owner, and only an `assign` request changes it. `owner_group_shortname` is stored as sent, but a create may name only a group its creator belongs to: any other group needs `assign` at the record's address, through a grant without a row filter, or the create is refused with `NOT_ALLOWED` (see [Access Control](/access-control#3-contextual-conditions)).

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

- **`search`** is an expression in DMART's search syntax (see [Query & Search](/query-search)). To list everything, leave it out: `"*"` is a plain word, and matches only records that contain a literal asterisk.
- **`retrieve_json_payload`** is `false` by default, so entries come back with their `payload` (`content_type`, `schema_shortname`, `checksum`) but without its `body`. Users, roles, groups, permissions, spaces and attachments always carry their body.
- **`retrieve_attachments: true`** adds the attachments the caller may read to each record, as `attachments: {<resource_type>: [records]}`.
- **`retrieve_lock_status: true`** adds `attributes.locked: {"owner_shortname": …}` to each record someone holds a lock on.
- **`include_fields`, `exclude_fields` and `highlight_fields`** are accepted and ignored.

## Enums & Possible Values

| Enum | Values |
|---|---|
| **ResourceType** (30) | `user`, `group`, `folder`, `schema`, `content`, `log`, `acl`, `comment`, `media`, `data_asset`, `locator`, `relationship`, `alteration`, `history`, `space`, `permission`, `role`, `ticket`, `json`, `lock`, `post`, `reaction`, `reply`, `share`, `plugin_wrapper`, `notification`, `csv`, `jsonl`, `sqlite`, `parquet` |
| **RequestType** (7) | `create`, `update`, `patch`, `update_acl`, `assign`, `delete`, `move` |
| **ContentType** (22) | `text`, `comment`, `reaction`, `markdown`, `html`, `json`, `image`, `image_jpeg`, `image_png`, `image_svg`, `image_gif`, `image_webp`, `python`, `pdf`, `audio`, `video`, `csv`, `parquet`, `jsonl`, `apk`, `sqlite`, `binary` |
| **ActionType** (11) | `query`, `view`, `update`, `create`, `delete`, `attach`, `assign`, `move`, `progress_ticket`, `lock`, `unlock` |
| **QueryType** (12) | `search`, `subpath`, `events`, `history`, `tags`, `random`, `spaces`, `counters`, `reports`, `aggregation`, `attachments`, `attachments_aggregation` |
| **Language** (5) | `arabic`, `english`, `kurdish`, `french`, `turkish` These full spellings are the persisted enum wire values (e.g. `space.languages`). The `displayname` / `description` translation maps are keyed by 2-letter codes, and keep only `en`, `ar` and `ku`: any other key is dropped on write, and a plain string is stored as `en`. Those keys are not Language enum values. |
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

The `/managed`, `/public`, and `/user` endpoints return the same envelope, except where they hand back a record or a file itself: a read of one record (`/entry`, `byuuid`, `byslug`) returns that record's own JSON, and the payload, CSV and export routes return the file. A success carries `records` and an `attributes` block (with `total` / `returned` counts on queries); a failure carries a single `error` object, sometimes with an `info` list of details. `error.code` is DMART's own error code, not the HTTP status (see [Error codes](#error-codes)).

**Empty values are left out.** In a JSON response of 1 MB or less, every object property whose value is `null`, `""`, `[]` or `{}` is removed, at any depth, `payload.body` included. The `payload` and `relationships` keys are kept even when empty, what a `failed` field holds is left as it is, and elements of a list are never removed. A larger response is sent as built and can carry empty values. A client treats an absent field and an empty one as the same.

**Headers.** Every response carries `x-server-time`, the server's local time in ISO 8601, which a browser client on another origin may read. `X-Correlation-ID` echoes the request's own, or is a new id when the request sent none; the access log records it, and a `500` names it in its message as `Reference: <id>`.

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

As a rule the HTTP status follows `error.code`: `401` for authentication and permission refusals, `404` for a record that is not there, `409` for a name or unique value already taken, `403` for a refused password change, `423` for an entry someone else has locked, `503` while the password-hashing budget is full, and `400` for anything else. The tables below give each code's status. `/user/login` and the social sign-in routes answer every refusal with HTTP `401`, whatever its code.

**A refused write answers as a missing record would.** Update, patch, assign, update_acl, move, delete, lock and unlock are judged first on the address, as if nothing were stored there. A caller the address refuses gets `NOT_ALLOWED`, whether or not the record exists. A caller the address admits, but refused for what is stored (the record's ACL denies it the action, an entry is stored as another type than the request names, or a [row filter](/access-control#row-filters) of its grants leaves the record out), gets what a missing record at that address gets (`OBJECT_NOT_FOUND`, `SHORTNAME_DOES_NOT_EXIST`, or a success that removes nothing), and nothing is written. A user, role, group or permission is judged in its folder of the management space (`management:/users`, `/roles`, `/groups`, `/permissions`), and a space at its own root, whatever coordinates the request names. A refusal by a condition (`own`, `is_active`) or a field limit stays `NOT_ALLOWED`, as it is for a missing record. Reads by name work the same way: a record the caller may not read answers `404`.

### Error codes

Some codes look like HTTP statuses and are not: `400` is a name already taken (HTTP `409`), `404` a missing shortname, and `401` a refused permission.

| `code` | Name | HTTP | When |
|---|---|---|---|
| 402 | `INVALID_DATA` | 400 | A body, field, file or route value fails validation: a schema, a shortname or subpath pattern, a search the parser refuses. Also a relationship target that is missing or that the caller may not read ("relationship target not found"), and a user's mailbox or alias that another account holds, or email or phone that an account in another folder holds ("already in use"). |
| 202 | `MISSING_DATA` | 400 | A required field or file is missing. |
| 220 | `OBJECT_NOT_FOUND` | 404 | The record, schema or folder named is not there, or is hidden from the caller (see above). |
| 400 | `SHORTNAME_ALREADY_EXIST` | 409 | A record already holds the name, or another unique column (the message names the column). |
| 404 | `SHORTNAME_DOES_NOT_EXIST` | 404 | The ticket, attachment, user, role, group, permission, space or saved query named is not there, or is hidden from the caller. |
| 415 | `DATA_SHOULD_BE_UNIQUE` | 409 | A folder's `unique_fields` is taken, or a user's email (in any case) or phone is another account's in the same folder. The message names the field, as `@email:<value>`. |
| 401 | `NOT_ALLOWED` | 401 | The caller's permissions refuse the action, whether or not the record exists. Also an admin signing in from outside `ADMIN_IP_ALLOWLIST`. |
| 204 | `CANNT_DELETE` | 400 | A non-empty folder without `force`, a record other records relate to, the management space, or a user who owns it. |
| 31 | `LOCKED_ENTRY` | 423 | Another user holds the entry's lock. |
| 30 | `LOCK_UNAVAILABLE` | 423 | The embeddings re-index worker is busy. |
| 217 | `NOT_SUPPORTED_TYPE` | 400 | A resource or query type the route does not take (a space, user, role, group or permission sent to a route that writes entries, say), or semantic search that is not configured. |
| 206 | `NOT_ALLOWED_LOCATION` | 400 | An anonymous write to a `space.schema` pair `ALLOWED_SUBMIT_MODELS` does not list. |
| 203 | `INVALID_SPACE_NAME` | 400 | A missing or malformed space name. |
| 205 | `ALREADY_EXIST_SPACE_NAME` | 409 | Creating a space that exists. |
| 213 | `MISSING_DESTINATION_OR_SHORTNAME` | 400 | A `move` without `dest_subpath` and `dest_shortname`. |
| 409 | `CONFLICT` | 409 | A user account changed while the request ran; send it again. |
| 430 | `SOMETHING_WRONG` | 400 / 500 | `400`: a `/managed/request` batch in which some records failed, or a check the server could not complete (uniqueness, the embedding provider). `500`: a server or database fault. |
| 120 | `JQ_TIMEOUT` | 400 | A `jq_filter` ran too long, or every jq slot was busy. |
| 121 | `JQ_ERROR` | 400 | A `jq_filter` that is invalid or fails, or no `jq` on the server. |
| 230 | `INVALID_ROUTE` | 422 / 405 | No such route, or a method the route does not take. |
| 504 | `REQUEST_TIMEOUT` | 504 | The request ran past `REQUEST_TIMEOUT`. |

Sign-in and tokens:

| `code` | Name | HTTP | When |
|---|---|---|---|
| 10 | `INVALID_USERNAME_AND_PASS` | 401 | Unknown user, wrong password, or a soft-deleted account. Also a wrong code at a code sign-in that would register the address (`ENABLE_OTP_IMPLICIT_REGISTRATION`). |
| 11 | `USER_ISNT_VERIFIED` | 401 | Sign-in by an email or phone that is not verified. |
| 13 | `PASSWORD_NOT_VALIDATED` | 401 | A code sign-in with a wrong password, or an admin's code without one. |
| 100 | `OTP_ISSUE` | 401 | A code sign-in naming no identifier or more than one; an admin with no phone or email to send a code to. |
| 110 | `USER_ACCOUNT_LOCKED` | 401 | The account is deactivated, locked by failed attempts, or locked to another device (`locked_to_device`). |
| 115 | `OTP_NEEDED` | 401 | The sign-in needs a one-time code: an admin's right password (the code is sent), a `mobile` account on a new device, or an admin through a social provider. |
| 307 | `OTP_INVALID` | 401 / 400 | A wrong or spent code, one a newer code has replaced, or one out of guesses. `400` outside `/user/login`. |
| 308 | `OTP_EXPIRED` | 401 / 400 | The code issued, sent after it expired. `400` outside `/user/login`. |
| 50 | `SESSION` | 401 | `/user/create` refused: registration is off, a field is missing or invalid, or the code is wrong. |
| 47 | `INVALID_TOKEN` | 401 | A token that fails to verify, or whose session has ended, whose account is inactive, or (an admin's) used from outside `ADMIN_IP_ALLOWLIST`. |
| 48 | `EXPIRED_TOKEN` | 401 | A token past its `exp`. |
| 49 | `NOT_AUTHENTICATED` | 401 | No token on a route that needs one. |
| 17 | `INVALID_PASSWORD_RULES` | 400 | A new password that fails the password rule. |
| 102 | `PASSWORD_RESET_ERROR` | 403 | A `/user/profile` password change without `old_password`, or a first password set there. |
| 19 | `UNMATCHED_DATA` | 401 | A wrong current password at `/user/profile` or `/user/verify-contact`. |
| 503 | `PASSWORD_HASHING_BUSY` | 503 | The password-hashing budget stayed full past `PASSWORD_HASH_QUEUE_TIMEOUT_SECONDS`; retry after `Retry-After`. |

`OTP_EXPIRED` (308) answers only the code that was issued, sent after it expired: at a code sign-in on `/user/login` (one that registers under `ENABLE_OTP_IMPLICIT_REGISTRATION` included), at `/user/password-reset-confirm` and `/user/create`, and at `/user/verify-contact` for its `code` and its `current_code`. Every other failed code keeps its own answer, so the reply tells nothing to someone who does not hold the code: `OTP_INVALID`, or `INVALID_USERNAME_AND_PASS` at a sign-in that would register, `SESSION` at `/user/create`, and `USER_ACCOUNT_LOCKED` at a sign-in on an account that failed attempts have locked. A wrong code sent while an expired one is outstanding is a wrong code. An expired code is never redeemed, and counts as a failed attempt wherever a wrong code does. Each code takes `MAX_OTP_VERIFY_ATTEMPTS` guesses (5), whether or not it has expired; past them it answers as a wrong code, the right one included.

`error.type` is one of `auth` (sign-in and accounts), `jwtauth` (tokens), `request` (bad input, the most common), `db` (storage conflicts and missing rows), `create` (registration), `exception` (an unhandled error), `server` (the request deadline or the hashing budget), `restriction` (a protected profile field), `internal`, `media`, `attachment`, `qr`, and `channel_auth` (`ENABLE_CHANNEL_AUTH` refused the request).

## User Management `/user`

GET `/user/check-existing`

Checks if a user with specific fields already exists. Open without a session, and rate-limited per address. Answers `attributes.unique`, and when something is taken, `attributes.field` names the first one found.

**Query Params:** `shortname`, `msisdn`, `email` (all optional)

POST `/user/create`

Registers a new user and signs them in: the answer carries an `access_token` and sets the `auth_token` cookie. Self-registration is off unless `IS_REGISTRABLE=true`, and takes only the channels in `REGISTRATION_ENABLED_CHANNELS`. The server assigns the shortname, and ignores roles and groups in the body (`USER_CREATE_DEFAULT_ROLE` / `USER_CREATE_DEFAULT_GROUP` apply instead). With the default `IS_OTP_FOR_CREATE_REQUIRED=true`, first request a code with `/user/otp-request` and `purpose: "register"`, and send it as `email_otp` (or `msisdn_otp`); a wrong code answers `SESSION` (50), and the issued one sent after it expired `OTP_EXPIRED` (308). A password must meet the password rule (see [Access Control](/access-control)).

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

Authenticates a user and returns a token. The identifier is one of `shortname`, `email` or `msisdn`; signing in by email or phone needs that address verified. With a password, `email` may also be the account's hosted `mailbox`, which needs no verification; a one-time code never signs in by mailbox. The answer's record carries `access_token`, `type`, `roles` and `groups`, `displayname` when the account has one, and `"created": true` when this sign-in created the account (`ENABLE_OTP_IMPLICIT_REGISTRATION`). The server also sets the `auth_token` cookie. A refused sign-in answers HTTP `401`.

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

A `mobile` account that has signed in from a device must send that device's `device_id`; from another device, or none, the password is answered with `OTP_NEEDED` (115) and the user signs in with a code. An account with `locked_to_device` set signs in, by password or code, only from its stored device, and is refused elsewhere with `USER_ACCOUNT_LOCKED` (110); see [Access Control](/access-control#account-types). Mobile clients may also send a `firebase_token` for the session. It is cleared from the user's other sessions, and with a `device_id` so are that device's older tokens, so a device gets each push once.

Accounts of type `admin` sign in with their password **and** a one-time code. The password alone, once it checks out, sends the code and answers `OTP_NEEDED` (115); the sign-in then completes with `password` and `otp` sent together. `/user/otp-request` sends an admin no login code. Wrong passwords and codes count toward the account lockout (see [Access Control](/access-control#lockout)). An account that failed attempts have locked still signs in with a right code; a wrong one answers `USER_ACCOUNT_LOCKED` (110), and the issued code sent after it expired `OTP_EXPIRED` (308).

The access token has no `kid` header. Its claims are `sub` (the shortname), `iss` (`JWT_ISSUER`), `aud` (`JWT_AUDIENCE`), `iat`, `exp`, `token_use` (`access`), `jti`, `roles`, `data` (`shortname`, `type`) and `expires`. `/user/login` issues no refresh token.

GET `/user/profile`

Retrieves the profile of the currently logged-in user: contact details, `type`, `roles`, `groups`, `payload`, and the avatar attachment when there is one. The profile's `attributes.permissions` is deprecated; read the map from `/user/permissions`.

GET `/user/permissions`

Returns the caller's permission map as `attributes.permissions`, keyed `space:subpath:resource_type`, with `allowed_actions`, `conditions`, `restricted_fields`, `allowed_fields_values` and `filter_fields_values` for each key. It includes the grants of the implicit `logged_in` role. A row filter comes back with the caller's own names in place of `__current_user__` and `__current_user__owner__`. A grant whose filter names one that does not resolve for the caller (`__current_user__owner__` for an account no one created, say) is left out, and so is a space whose subpaths list is empty. The answer carries an `ETag` and `Cache-Control: private, no-cache`, so a client that sends `If-None-Match` gets `304` with no body while the map is unchanged.

POST `/user/profile`

Updates the profile of the currently logged-in user: `displayname`, `description`, `language` and `payload`. A new `password` needs the current one in `old_password`, also under `force_password_change`: without it the answer is `PASSWORD_RESET_ERROR` (HTTP `403`), and a wrong one answers `UNMATCHED_DATA` (HTTP `401`) and counts toward the lockout. An account with no password cannot set one here (`PASSWORD_RESET_ERROR` too); it gets its first one through a password reset. Email and phone change only through `/user/verify-contact`, the device only by signing in from it, and payload fields listed in `USER_PROFILE_PAYLOAD_PROTECTED_FIELDS` not at all. The `payload` is checked against its schema only when the update changes it, so a request that sends none, or sends the stored one back, is not refused because the schema has since tightened; a user update through `/managed/request` is checked the same way.

POST `/user/logout`

Ends the session of the token the request carries (the header's and the cookie's) and clears the `auth_token` cookie.

POST `/user/delete`

Deletes the current user's account as `USER_DELETION_MODE` says (`soft` by default; see [Settings](/settings)). Under `hard` it deletes only the entries and attachments the account owns that a delete request from it could delete, and removes the account when nothing it owns is left. When records stay, the account is soft-deleted instead, and the answer carries `attributes.soft_deleted: true`, `attributes.records_kept` (how many stayed) and a `message`. A user who owns the management space cannot be hard-deleted (`CANNT_DELETE`). See [Deleting a user](/entity-lifecycle#deleting-a-user).

POST `/user/otp-request`

Sends a one-time code. Body: one of `email`, `msisdn` or `shortname`, and a `purpose`: `login`, `reset`, `register` (for `/user/create`) or `verify-contact` (signed in only). A code works only for the purpose it was issued for. A code asked for by shortname goes to the account's phone, else its email. A `reset` may also name the account by its hosted mailbox in `email`; that code goes to the phone, else the contact email, never to the mailbox, and `/user/password-reset-confirm` takes the same mailbox. Every well-formed request answers `200`, whether or not a code went out, so the answer says nothing about which addresses have accounts; a resend within `ALLOW_OTP_RESEND_AFTER`, or past `MAX_OTP_REQUESTS_PER_DAY`, sends nothing. An admin gets a `reset` code only while another admin has set `force_password_change` on the account; otherwise its own phone or email gets a notice saying so.

POST `/user/password-reset-confirm`

Sets a new password with a `reset` code. Body: the same identifier, `otp` and `password`, which must meet the password rule. A right code works on an account that failed attempts have locked, and clears its count. A wrong code answers `OTP_INVALID` and counts toward the lockout; the issued code sent after it expired answers `OTP_EXPIRED`, and counts too. With `LOGOUT_ON_PWD_CHANGE` (on by default) the reset ends the account's sessions.

POST `/user/verify-contact`

Signed in: proves the caller controls an email or phone with a `verify-contact` code, and makes it theirs, verified. Body: `code` and `email` or `msisdn`. Confirming the address already on the account needs nothing more. Changing to a new one also needs the current `password` (a wrong one counts toward the lockout), or, on an account without a password, `current_code`: a `verify-contact` code sent to the phone or email the account already has. A wrong `code` or `current_code` answers `OTP_INVALID`, and the issued one sent after it expired `OTP_EXPIRED`.

POST `/user/validate_password`

Checks if the provided password is correct for the current user, answering `attributes.valid`. A wrong one counts toward the lockout.

### Social Login

GET `/user/google/login`, GET `/user/facebook/login`

Start a web sign-in with the provider: they set an `oauth_state` cookie (10 minutes) and redirect to the provider with a matching `state`. `GOOGLE_OAUTH_CALLBACK` / `FACEBOOK_OAUTH_CALLBACK` must be the absolute URL of `/user/google/callback` / `/user/facebook/callback`, registered with the provider as a redirect URI; without it, `/login` answers with an error that names the missing setting.

GET `/user/google/callback`, GET `/user/facebook/callback`

Google and Facebook OAuth callbacks. A web sign-in must start at `/login`: a callback with a missing or mismatched `state` is refused. A sign-in sets the `auth_token` cookie and answers with the sign-in record (`access_token`, `type`, `roles`).

POST `/user/apple/callback`

Apple OAuth callback (Apple posts the form). Takes a `code`, which DMART exchanges with Apple, or an `id_token`. A sign-in sets the `auth_token` cookie and redirects to `APPLE_OAUTH_CALLBACK`, with no token in the URL.

POST `/user/google/mobile-login`, `/user/facebook/mobile-login`, `/user/apple/mobile-login`

Sign in from a mobile app with a token the app got from the provider. Body: `token` (the ID token for Google and Apple, the access token for Facebook) and an optional `device_id`.

A provider sign-in only finds an existing account, by the provider's id or a verified email. It never creates one, and answers `401` when none matches. Accounts of type `admin` cannot sign in this way.

## Managed Content `/managed`

Endpoints for authenticated management of content and resources.

In a route that ends `{subpath}/{shortname}`, an entry at the root of a space is addressed by leaving the subpath out (`/managed/entry/content/data/my_entry`) or with `__root__` (`/managed/entry/content/data/__root__/my_entry`).

POST `/managed/request`

Performs batch operations (create, update, delete, etc.). A `shortname` of `auto` has the server pick one. Update and patch answer with no records; the other request types return the records written. When any record fails, the others are still applied and the request answers `SOMETHING_WRONG` (430). Its `error.info[0]` lists the records that succeeded under the key `successfull` (spelled so), and those that failed under `failed`, each as its `record` (the shortname), `error_code` and `error` (the message).

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
  "limit": 5
}
```

Without a `search`, it lists the records under the subpath (and below it, unless `exact_subpath` is true).

`type: spaces`, with `space_name` `management` and `subpath` `/`, lists the spaces in which the caller holds an active grant with `view` or `query`, leaving out a space whose ACL denies the caller either. A grant to `create` alone lists no space, and neither does one that reaches nothing there: one with an empty subpaths list, with only subpaths naming `__current_user__` for the anonymous caller, or with a row filter that does not resolve for the caller.

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

Imports data from a ZIP file. Body: `multipart/form-data` with `zip_file`, or the ZIP itself as the body. Global admins only. It is not cut off at `REQUEST_TIMEOUT`: it runs as long as the archive takes, and stops if the client hangs up. The answer counts what was inserted (`entries_inserted`, `users_inserted`, …), `skipped` and `failed_count`, and lists each failed row in `failed`. Rows of a space the instance does not have, and the archive does not create, are refused and reported with `"kind": "space-missing"`. Rows that already exist are replaced from the archive, and every record keeps the owner the archive names. The server's own `dmart import` command instead skips existing rows unless given `-r` (see [CLI](/cli)).

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

Gets the raw payload of a resource: an entry's payload body as JSON, or an attachment's file. JPEG, PNG, GIF and WebP images, PDF, MP3 and MP4, and plain text, Markdown and CSV are shown inline, and JSON is sent with no disposition. Any other type, SVG and HTML included, is sent as a download, and `?download=1` downloads any of them. Range requests are supported. The file name may also be `{shortname}.{schema}.{ext}`; the schema part is ignored. A payload that is not there and one the caller may not read both answer an empty `404`. An attachment's is refused when the caller may not read the attachment, and also when the record it hangs off denies the caller `view` or `query` in its ACL, or a row filter of the caller's grants leaves that record out.

An inline response carries `X-Frame-Options: SAMEORIGIN`; every other response of the API carries `X-Frame-Options: DENY`. Every payload but a PDF also carries a sandboxing `Content-Security-Policy`. So only a page on the API's own origin can frame a payload: a front end on another origin cannot show a PDF or a video from this route in an `<iframe>`.

POST `/managed/resource_with_payload`

Uploads a file as payload. Body: `multipart/form-data` with `payload_file`, `request_record` (the record, as a JSON file part), `space_name`, and an optional `sha`.

- **Attachments** (`media`, `data_asset`, `comment`, `reply`, `reaction`, `json`, `share`, `relationship`, `alteration`, `lock`) store the file's bytes. `payload.body` becomes `<shortname>.<ext>`, and `content_type` comes from the part's MIME type, else the file's extension, else `binary`. Uploading to an existing attachment of the same type overwrites it in place: that needs `update` on it, and keeps its owner, owner group and ACL. An attachment of another type at that address answers `SHORTNAME_ALREADY_EXIST`.
- **Every other type** (`content`, `ticket`, `schema`, and also `csv`, `jsonl`, `sqlite` and `parquet`) takes a JSON file, which becomes `payload.body`; any other file answers `INVALID_DATA`.
- **Not** `space`, `user`, `role`, `group` or `permission`: those are written through `/managed/request`, and this route answers them `NOT_SUPPORTED_TYPE` (217) before it reads the file.
- **Checksum.** `payload.checksum` is the file's SHA-256. A `sha` that does not match it answers `INVALID_DATA`; one that matches is stored as `payload.client_checksum`.

POST `/managed/resources_from_csv/{resource_type}/{space}/{subpath}/{schema}`

Creates resources from a CSV file. Body: `multipart/form-data` with `resources_file`. `{resource_type}` must be an entry type: an attachment type, `space`, `user`, `role`, `group` or `permission` answers `NOT_SUPPORTED_TYPE` (217) once, for the whole file. The schema in the URL must exist (`OBJECT_NOT_FOUND`), and each row's body is validated against it. `?is_update=true` updates the existing records instead: each row's body is merged into the entry's, and the merged body is validated. A row naming an entry that is not there fails with `OBJECT_NOT_FOUND` when the caller may update there, and `NOT_ALLOWED` when it may not. A row that fails is listed in `failed` and the rest import. The answer carries `inserted`, `failed_count` and `failed`, each failure with its `row`, `shortname`, `error` and `code`, and for a body that fails its schema, the first failing field as `key` and `value`.

- **A hand-made file** names each row in its `shortname` column (header in any case), and every other column is a body field. A blank or `auto` shortname gets the first 8 hex digits of a new UUID, which is also the record's uuid; under `is_update` a blank shortname fails the row with `MISSING_DATA`. A shortname `/managed/request` would refuse fails the row with `INVALID_DATA`.
- **A file `/managed/csv` exported** is recognised by a `resource_type`, `uuid` or `payload` header. Each row's body comes from its `payload` column, and the entry's own columns (`uuid`, `created_at`, `tags`, `displayname.en`, `is_active`, …) are not applied. Any other column, and any column the schema declares, is a body field.
- **A folder with `csv_columns`** (see [Folders](/folders)): a header that is one of its columns is read through the column's key, so `payload.body.a.b` fills that body path.
- **Cells** follow RFC 4180: a quoted cell may hold commas, doubled quotes (`""`) and line breaks. A cell that starts with `[` or `{` is parsed as JSON. A column the schema types as `number`, `integer` or `boolean` is converted (booleans: `true`/`false` in any case, `yes`/`no`, `1`/`0`), and a blank cell there is left out. Blank lines are skipped, and a row whose field count differs from the header's fails.
- **Limits.** A file holds at most 100,000 rows. Row numbers count rows, not lines, as a spreadsheet numbers them.
- **Resuming.** An upload cut off at `REQUEST_TIMEOUT` answers `504`, with `inserted`, `failed_count`, `failed` (at most 1,000, with `failed_truncated: true` past that) and `resume_row` in `error.info`. Send the same file again with `?start_row=<resume_row>`, or send only the header and the rows still to do with `?first_row=<resume_row>`, which keeps row numbers counting in the original file.

GET `/managed/entry/{resource_type}/{space}/{subpath}/{shortname}`

Gets the metadata of a resource: the record's own JSON, not wrapped in the envelope. `?retrieve_json_payload=true` adds the payload body, `?retrieve_attachments=true` the attachments the caller may read (none when the record's ACL denies the caller `query`), and `?retrieve_lock_status=true` the lock holder. `resource_type` may also be `space`, `user`, `role` or `permission`. A record that is missing, or that the caller may not read, answers `404`. This route, `byuuid` and `byslug` read entries, not attachments: read an attachment through its parent's `retrieve_attachments`, a query of `type` `attachments`, or the payload route.

GET `/managed/byuuid/{uuid}`

Gets an entry by UUID, as its own JSON, or `404`.

GET `/managed/byslug/{slug}`

Gets an entry by slug, as its own JSON, or `404`. Slugs are neither unique nor checked for format. The route reads the first entry with that slug in any space, in no set order, and answers `404` when the caller may not read that one, even if another entry it may read has the same slug. A folder's `unique_fields` can hold `slug` unique within the folder (see [Folders](/folders#uniqueness)).

GET `/managed/health/{health_type}/{space}`

Runs the health checks on a space and answers `total_issues` and, for each check, its `name` and `count`; `hard` adds `samples` of the records found. Types: `soft`, `hard`. Global admins only.

PUT `/managed/lock/{resource_type}/{space}/{subpath}/{shortname}`

**Acquires** an entry lock for the caller, held for `LOCK_PERIOD` seconds (300 by default), and answers `locked_by` and `lock_period`. It needs `lock` or `update` on the entry. An address with no entry can be locked too. Where the address alone would admit the lock but the entry's ACL, or a row filter of the caller's grants, refuses it, the answer is the one a lock of an empty address gets, and no lease is taken. While a lock is held, `update` and `delete` from any user other than the lock holder are rejected; the holder may re-lock (extend) their own lock. An entry someone else has locked answers `LOCKED_ENTRY` (HTTP `423`). Query results can surface the current holder via `retrieve_lock_status` (see the `Query` shape above).

DELETE `/managed/lock/{space}/{subpath}/{shortname}`

**Releases** a lock. The caller's own lock is released with no further check. Otherwise the caller needs `lock`, `update` or `unlock` on the entry before anything is answered, and without one is refused (`NOT_ALLOWED`) alike whether the entry is locked, unlocked or missing. With one, an entry that holds no live lock answers success, and releasing a lock another user holds needs `unlock`.

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

On a directory primary: the user and group feed a replica pulls, password hashes included. Readable only by active bot accounts listed in `DIRECTORY_FEED_READERS`; anyone else, a global admin included, gets `403`. Off when that setting is empty.

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

Submits data to a public endpoint (e.g. a form). The path takes three forms: `/public/submit/{space}/{schema}/{subpath}`, `/public/submit/{space}/{resource_type}/{schema}/{subpath}`, and, for tickets, `/public/submit/{space}/ticket/{workflow}/{schema}/{subpath}`. The segment after the space is the resource type only when it is `content` or `ticket`; otherwise it is the schema and the type is `content`. The `space.schema` pair must be listed in `ALLOWED_SUBMIT_MODELS`, which is empty — closed — by default, and is matched exactly, case included. The anonymous user still needs a `create` grant there. The entry is created inactive, owned by `anonymous`, under a name the server picks, and the answer carries its `uuid` and `shortname`. The body becomes the entry's `payload.body` and sets nothing else: a field in it named `shortname` or `owner_group_shortname` is data like any other.

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

Returns process and runtime metrics; `?format=prometheus` answers in the Prometheus text format. `gc_heap_hard_limit_bytes` is `0` unless a heap limit is set (`DOTNET_GCHeapHardLimit`), and `gc_total_available_bytes` is the memory the runtime may use: that limit, else the machine's or container's memory. Comparing `gc_heap_bytes` with `process_working_set_bytes` separates managed growth from native growth (password hashing, database drivers, `jq`).

## Health `/health`

GET `/health/live`, GET `/health/ready`

Liveness and readiness probes, open without authentication. `ready` checks the database, and on a directory replica that it has synced; when the server is not ready it answers `503`, with the reason in `error.message`.

## OpenID Connect

With `OIDC_ISSUER` set, DMART is an OpenID Connect provider: discovery at `{issuer}/.well-known/openid-configuration`, and `/oidc/authorize`, `/oidc/token`, `/oidc/userinfo` and `/oidc/jwks`. Its relying parties are the clients listed in `OIDC_CLIENTS_FILE` (see [LDAP and OpenID Connect](/settings#directory-ldap-replicas-and-openid-connect)), and it issues them RS256 tokens of its own, never a DMART session token. It runs the authorization code flow, with PKCE for a client that has no secret.

| Scope | Claims |
|---|---|
| `openid` (required) | `sub`: the user's uuid, stable across renames |
| `profile` | `name` (the display name, else the shortname), `preferred_username` (the shortname), `locale`, `updated_at` |
| `email` | `email`: the hosted mailbox, else the contact email; `email_verified` |
| `phone` | `phone_number`, `phone_number_verified` |
| `groups` | `groups`: the user's DMART groups |

The claims are in the ID token as well as at `/oidc/userinfo`.

- **Single sign-on.** A browser with a live DMART session (the `auth_token` cookie) is not asked again, and a sign-in through the form opens that session. `prompt=login` and `max_age` force a fresh sign-in; `prompt=none` without a session answers `login_required`.
- **Who may sign in.** A client that lists `services` admits only users who hold one of them. An account with `force_password_change` set gets a page asking it to change its password in DMART first. Bots never sign in, and an admin only by single sign-on, from inside `ADMIN_IP_ALLOWLIST`, since the form takes no code.
- **One instance.** Authorization codes live 60 seconds in the process's memory, so run the provider on one instance, or route `/oidc/*` to one.
- **Not supported:** refresh tokens and a logout endpoint (`end_session_endpoint`).

## Plugin Routes

Each API plugin mounts its own routes under `/{plugin_shortname}`. They require authentication. The built-in `db_size_info` plugin answers `GET /db_size_info/` with each table's size, to global admins only.

## Realtime & WebSockets `/ws`

DMART pushes live updates over WebSocket connections. A built-in notifier plugin broadcasts entry changes to subscribed clients.

GET `/ws`

Opens an authenticated WebSocket connection for realtime notifications. The JWT is passed as a query param (`ws://host/ws?token=JWT`) or via the `auth_token` cookie, which is not taken from a cross-site browser handshake (one whose `Origin` is neither this host nor listed in `ALLOWED_CORS_ORIGINS`). The handshake is refused with HTTP `401` if the token is invalid, the user is inactive, or the session has been revoked, and an open socket is closed when its session ends.

After connecting, the client subscribes by sending a `notification_subscription` message with at least `space_name` and `subpath`. Subscribing needs `view` there, and the server answers with a `notification_subscription` message whose `status` is `success` or `failed`; a `notification_unsubscribe` message drops every subscription. DMART builds a channel name of the form `space:subpath:schema:action:state`, defaulting any omitted segment to the `__ALL__` wildcard. The realtime notifier plugin then broadcasts every matching CRUD event to subscribed clients, each judged when the event is sent: a subscriber hears only of the records it may read, and of an attachment only when it may also read the record the attachment hangs off.

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

// server -> client on a change
{ "type": "notification_subscription",
  "message": { "title": "updated", "space": "data", "subpath": "/tickets",
               "shortname": "t_1001", "action_type": "update",
               "owner_shortname": "jdoe" } }
```

`title` is always `updated`; `action_type` says what happened, and `owner_shortname` names the user who made the change.

- **Subpaths.** A subscription's `subpath` is used exactly as sent, and events are published on subpaths with a leading slash and no trailing one: subscribe to `"/tickets"`, since `"tickets"` and `"/tickets/"` hear nothing. An event is published on every folder above it too, so `"/a"` hears changes anywhere under `/a`.
- **The space root is never published.** A subscription to `"/"` hears nothing, and a change to an entry at the root of a space notifies no one.
- **One socket, one subscription.** A user holds one socket: a new connection closes the old one. A new `notification_subscription` replaces the previous one.
- **One instance.** Notifications reach only the clients connected to the instance that handled the write.

POST `/send-message/{user}`

Sends a message to a specific connected user. Global admins only.

POST `/broadcast-to-channels`

Broadcasts a message to subscribers of one or more channels. Global admins only.

GET `/ws-info`

Returns information about active WebSocket connections. Global admins only.

## Model Context Protocol `/mcp`

DMART ships a built-in **MCP server** (Streamable HTTP transport, spec `2025-03-26`) so AI agents can query and mutate entries as tools. It is **off by default** — set `ENABLE_MCP=true` to expose it; otherwise `/mcp` and the OAuth 2.1 endpoints are unmapped and answer `INVALID_ROUTE` (HTTP 422). All requests are authenticated — the caller's JWT flows through to each tool handler. Sessions are tracked via the `Mcp-Session-Id` header. Pair it with the OAuth 2.1 Authorization Server for automatic client onboarding. Its sign-in form takes a password only, so it refuses accounts of type `admin`; an integration signs in as a `bot` account.

- **Discovery.** A request to `/mcp` without a valid token answers `401` with `WWW-Authenticate: Bearer realm="dmart-mcp", resource_metadata="<base>/.well-known/oauth-protected-resource"`, which starts a client's OAuth discovery.
- **`JWT_ISSUER`.** When it is an absolute `http(s)` URL, it is the base of the `/.well-known/oauth-*` and `/oauth/*` URLs; otherwise they are built from the request's host. Under a path prefix, set it to the public base URL (e.g. `https://host.example/dmart`). Every token carries it as `iss`, so changing it invalidates every token already issued.
- **Registered clients** (`/oauth/register`) are kept in memory: they are lost on restart and dropped 24 hours after registering, and each may register at most 8 redirect URIs.
- **Refresh tokens** come only from `/oauth/token`; `/user/login` issues none. Each is single-use: a refresh answers a new access token and a new refresh token. It lasts `JWT_REFRESH_DAYS`, and with `SESSION_MAX_LIFETIME_SECONDS` set the chain ends that many seconds after the first sign-in. An admin account's refresh is refused.
- **Change notices.** Each session gets, on its SSE stream, `notifications/resources/updated` for every create, update, delete and progress-ticket, with the record's `dmart://` URI, the `action`, the `owner` (the user who made the change) and the `resource_type`. A session hears only of the records its user may read when the notice is sent, and of an attachment only when the user may also read the record the attachment hangs off.
- **Behind a proxy**, the SSE stream must not be buffered. DMART sends `X-Accel-Buffering: no`, which nginx honours; Caddy needs `flush_interval -1`.

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
| `dmart_spaces` | List the spaces in which the caller holds a `view` or `query` grant, as `type: spaces` does on `/managed/query`. |
| `dmart_query` | Search / list entries. Results are hard-capped at **50** records per call; without a `limit` it returns `DEFAULT_QUERY_LIMIT`. |
| `dmart_read` | Read a single entry (metadata + payload). |
| `dmart_schema` | Fetch a schema definition for a space/subpath. |
| `dmart_create` | Create a new entry. `resource_type` must be an entry type: a space, user, role, group, permission or attachment type is refused. |
| `dmart_update` | Update / patch an existing entry, of an entry type as for `dmart_create`. |
| `dmart_delete` | Delete an entry. With `confirm: true` it deletes without asking; without it, a client that supports **elicitation** is asked to confirm, and any other client is refused. Folders take an optional `force` flag to cascade-delete non-empty contents. |
| `dmart_history` | Retrieve the change history of an entry. |
| `dmart_download` | Download the raw payload / attachment of an entry. An attachment the caller may not read answers the tool error `attachment not found`, as a missing one does. |
| `dmart_semantic_search` | Natural-language vector search (requires pgvector + an embedding provider, same as `/managed/semantic-search`). |

**Limits.** `dmart_download` refuses a payload over 5 MB, and returns text (`text/*` and JSON) as UTF-8 and anything else as base64. `dmart_history` returns the newest changes first, at most 50 (`DEFAULT_QUERY_LIMIT` unless `limit` says otherwise). A delete confirmation waits up to 2 minutes for the client's answer. A session's SSE outbox holds 256 messages, and past that drops the oldest.

### Resources

`resources/read` takes `dmart://` URIs:

| URI | Reads |
|---|---|
| `dmart://spaces` | Up to 50 spaces in which the caller holds a `view` or `query` grant. |
| `dmart://<space>` | Up to 50 entries at the space's root. |
| `dmart://<space>/<subpath>/` | Up to 50 entries under the subpath. The trailing slash marks a listing. |
| `dmart://<space>/<subpath>/<shortname>` | The entry of that shortname, of any type, at exactly that subpath, with its body; never one of the same name in a folder below. A `?…` suffix is part of the shortname. |

`resources/list` returns only `dmart://spaces`.
