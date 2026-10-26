---
name: dmart
description: Work with a dmart instance (the dmart data platform) through its REST API, its MCP tools or the `dmart` CLI. Covers signing in, spaces, folders, JSON schemas, entries, attachments, tickets and workflows, users/roles/permissions, and dmart's `@field:value` search syntax, aggregation and sorting. Use it whenever the user mentions dmart, a dmart server or URL, cxb or catalog, dmart spaces, subpaths, shortnames, entries or tickets, or wants to create, query, import, export or secure data in dmart, even if they never say "API".
---

# dmart

dmart is a headless data platform: one self-contained binary that is both the server and its CLI, storing everything in PostgreSQL or SQLite. Every record is an **entry** addressed by `space_name` + `subpath` (its folder) + `shortname` + `resource_type`. An entry's data is its `payload`, usually JSON checked against a JSON Schema kept in the same space. Who may do what is decided by roles and permissions, and every way in (REST, MCP, CLI) runs under the caller's own permissions.

This file has the rules and recipes that get most tasks done. The `references/` folder holds the full documentation; open the page that matches the task when you need more than what is here (see the end of this file).

{{build_note}}

## Pick a way in

| Way | Use it when | Notes |
|---|---|---|
| **REST API** | Default. Anything scripted or repeatable. | Base URL is the server, e.g. `http://localhost:8282`; behind a proxy it is often `https://<host>/dmart`. JSON over HTTP with a bearer token. |
| **MCP tools** (`dmart_query`, `dmart_read`, `dmart_create`, `dmart_update`, `dmart_delete`, `dmart_schema`, `dmart_history`, …) | The dmart MCP server is already connected to your client. | Only when the server runs with `ENABLE_MCP=true`. A query returns at most 50 records per call. Its sign-in refuses `admin` accounts; integrations use a `bot` account. |
| **`dmart cli`** | You have a shell on the server host. | `dmart cli c <space> /<subpath> <command>` (e.g. `ls`, `cat <name>`). On the server host it signs in without a password. Operator commands (`dmart export`, `import`, `check`, `selfcheck`) also need that shell. |

## Sign in

```bash
DMART=${DMART:-http://localhost:8282}
TOKEN=$(curl -s -X POST "$DMART/user/login" -H 'content-type: application/json' \
  -d "{\"shortname\":\"${DMART_USER:-dmart}\",\"password\":\"$DMART_PASSWORD\"}" \
  | jq -r '.records[0].attributes.access_token')
dm() { curl -s -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' "$@"; }
dm "$DMART/user/profile" | jq -c '{status, shortname: .records[0].shortname}'
```

- Ask the user for credentials; never guess passwords. Failed sign-ins count toward an account lockout, and sign-in routes are rate-limited (10 a minute per address by default), so don't retry in a loop.
- An account of type `admin` signs in with its password **and** a one-time code: the password alone answers error code `115` (`OTP_NEEDED`) and sends the code; ask the user for it, then send `password` and `otp` together.
- Keep the token out of files, commits and logs; it is a credential.

## Five rules that prevent most mistakes

1. **Names.** Shortnames and space names are letters, digits and `_` only (Arabic letters and digits too): **no dashes, dots or spaces**, at most 64 characters (32 for a space). A dash is refused with `invalid shortname`. Send `"shortname": "auto"` to let the server pick one.
2. **Folders and schemas first.** Create a space, then its folders (`resource_type: folder`), then schemas (`resource_type: schema` under subpath `schema`), then entries. An entry names its schema with `payload.schema_shortname`; without one, its body is stored unchecked.
3. **Users, roles, permissions and groups live in the `management` space**, under `users`, `roles`, `permissions` and `groups`.
4. **Check every write's answer.** `/managed/request` takes several records at once. If any fails, the others are still written, and the answer is `status: failed` with code `430`. `error.info[0].failed` lists each failed record with its reason. HTTP `401` also means "not allowed", not only "not signed in".
5. **Tickets move through their workflow.** A ticket (`resource_type: ticket`) names a `workflow_shortname`. Change its state with `PUT /managed/progress-ticket/...`, never by writing `state` in an update.

## Writing: `POST /managed/request`

```json
{ "space_name": "library", "request_type": "create",
  "records": [ { "resource_type": "content", "subpath": "books", "shortname": "dune",
                 "attributes": { "is_active": true, "tags": ["fiction"],
                                 "payload": { "content_type": "json", "schema_shortname": "book",
                                              "body": { "title": "Dune", "year": 1965 } } } } ] }
```

- `request_type`: `create`, `update`, `patch` (the same as `update`), `delete`, `move`, `assign`, `update_acl`.
- **Update merges.** Fields you send replace those fields. `payload.body` merges key by key, like a JSON merge patch: a key set to `null` is removed, keys you leave out stay. Lists such as `tags` are replaced whole.
- A create answers with the records it wrote; an update answers with none. Read the entry back if you need it.
- `move` renames or moves: `attributes: {src_subpath, src_shortname, dest_subpath, dest_shortname}`.
- `delete` of a non-empty folder needs `"force": true` at the top level. Add `"dry_run": true` first to see what would go.

## Reading

- One entry: `GET /managed/entry/{resource_type}/{space}/{subpath}/{shortname}?retrieve_json_payload=true` returns the record's own JSON, not the `{status, records}` envelope. Add `&retrieve_attachments=true` for its attachments. A missing or unreadable entry is HTTP `404`.
- Many entries: `POST /managed/query`.

```json
{ "type": "search", "space_name": "library", "subpath": "/books",
  "search": "@payload.body.year:>2000", "filter_types": ["content"],
  "sort_by": "payload.body.year", "sort_type": "descending",
  "retrieve_json_payload": true, "limit": 20, "offset": 0 }
```

- `type`: `search` (most things), `subpath` (list a folder; add `"exact_subpath": true` for its own entries only), `aggregation`, `history`, `events`, `tags`, `spaces`, `attachments`.
- `subpath` covers the folder **and every folder below it** unless `exact_subpath` is true.
- `limit` defaults to **10**. `-1` asks for the server maximum (10,000 by default). Page with `offset`. `attributes.total` is the full count (`-1` when `retrieve_total` is false).
- `retrieve_json_payload: true` is needed to get `payload.body` back.
- Answers leave out fields that are null, so a query that matches nothing has no `records` key at all: read it as `(.records // [])` in jq.
- `sort_by` takes a column (`shortname`, `created_at`, `updated_at`, `owner_shortname`, …) or a payload path (`payload.body.year`). An unknown name silently falls back to `updated_at`.

### Search syntax (`search`)

| You want | Write |
|---|---|
| Words anywhere in the entry (partial words, spelling slips, Arabic) | `dune herbert` |
| A field equals | `@shortname:dune`, `@payload.body.author:"Frank Herbert"` |
| Any of several values | `@payload.body.genre:scifi\|fantasy` |
| Prefix / glob | `@shortname:dune*` |
| Range, inclusive | `@payload.body.year:[1960 1999]` |
| Comparison | `@payload.body.year:>=2000`, `@created_at:>2026-01-01` |
| Field present | `@payload.body.isbn:*` |
| Not | `-@shortname:dune` (prefix any selector with `-`) |
| OR between selectors | `@shortname:dune or @shortname:piranesi` (whitespace is AND, which binds tighter) |
| Inside an array of objects | `@payload.body.authors[].name:Herbert` |
| Tags | `@tags:fiction`, or the query field `"filter_tags": ["fiction"]` |

Negation, booleans, `[]` paths and engine differences have sharp edges. Before relying on a negated search or a search over arrays, read `references/query-search.md`.

### Aggregation

```json
{ "type": "aggregation", "space_name": "library", "subpath": "/books", "filter_types": ["content"],
  "aggregation_data": {
    "group_by": ["@payload.body.author"],
    "reducers": [ { "reducer_name": "count", "alias": "n", "args": [] },
                  { "reducer_name": "max", "alias": "latest", "args": ["@payload.body.year"] } ] } }
```

Each group comes back as a record whose `attributes` hold the group keys and the aliases. A group key's name is its path with the dots turned to `_`, e.g. `payload_body_author`. Reducers: `count`, `count_distinct`, `sum`, `avg`, `min`, `max`, and others in the reference.

## Recipes

These run as written against a fresh dmart, after the sign-in block above. dmart.cc's build runs them on every change.

### A space with a folder and a schema

```bash
dm -X POST "$DMART/managed/request" -d '{"space_name":"library","request_type":"create","records":[
  {"resource_type":"space","subpath":"/","shortname":"library","attributes":{"is_active":true}}]}' | jq -c '{status, error: .error.message}'
dm -X POST "$DMART/managed/request" -d '{"space_name":"library","request_type":"create","records":[
  {"resource_type":"folder","subpath":"/","shortname":"books","attributes":{"is_active":true}},
  {"resource_type":"schema","subpath":"schema","shortname":"book","attributes":{"is_active":true,
    "payload":{"content_type":"json","body":{"type":"object","required":["title","author","year"],
      "properties":{"title":{"type":"string"},"author":{"type":"string"},"year":{"type":"integer"}}}}}}]}' | jq -c '{status, error: .error.message}'
```

### Entries, then a query

```bash
dm -X POST "$DMART/managed/request" -d '{"space_name":"library","request_type":"create","records":[
  {"resource_type":"content","subpath":"books","shortname":"dune","attributes":{"is_active":true,"tags":["fiction"],
    "payload":{"content_type":"json","schema_shortname":"book","body":{"title":"Dune","author":"Frank Herbert","year":1965}}}},
  {"resource_type":"content","subpath":"books","shortname":"piranesi","attributes":{"is_active":true,"tags":["fiction"],
    "payload":{"content_type":"json","schema_shortname":"book","body":{"title":"Piranesi","author":"Susanna Clarke","year":2020}}}}]}' \
  | jq -c '{status, error: .error.message}'
dm -X POST "$DMART/managed/query" -d '{"type":"search","space_name":"library","subpath":"/books",
  "search":"@payload.body.year:>2000","sort_by":"payload.body.year","sort_type":"descending","retrieve_json_payload":true}' \
  | jq -c '{status, total: .attributes.total, books: [.records[] | {shortname, year: .attributes.payload.body.year}]}'
```

A body that breaks its schema is refused per record:

```bash
# expect: failed
dm -X POST "$DMART/managed/request" -d '{"space_name":"library","request_type":"create","records":[
  {"resource_type":"content","subpath":"books","shortname":"bad_year","attributes":{
    "payload":{"content_type":"json","schema_shortname":"book","body":{"title":"X","author":"Y","year":"1999"}}}}]}' \
  | jq -c '{status, code: .error.code, failed: .error.info[0].failed}'
```

### Update one field

```bash
dm -X POST "$DMART/managed/request" -d '{"space_name":"library","request_type":"update","records":[
  {"resource_type":"content","subpath":"books","shortname":"dune","attributes":{"payload":{"content_type":"json","body":{"year":1966}}}}]}' \
  | jq -c '{status, error: .error.message}'
dm "$DMART/managed/entry/content/library/books/dune?retrieve_json_payload=true" | jq -c '{shortname, body: .payload.body}'
```

### A workflow and a ticket

A workflow is a `content` entry in the ticket's own space, under `/workflows`. Its body is the state machine. Leave `next` out of a final state: only a state without a `next` key closes the ticket, while `"next": []` leaves it open.

```bash
dm -X POST "$DMART/managed/request" -d '{"space_name":"library","request_type":"create","records":[
  {"resource_type":"folder","subpath":"/","shortname":"workflows","attributes":{"is_active":true}},
  {"resource_type":"folder","subpath":"/","shortname":"loans","attributes":{"is_active":true}}]}' | jq -c '{status, error: .error.message}'
dm -X POST "$DMART/managed/request" -d '{"space_name":"library","request_type":"create","records":[
  {"resource_type":"content","subpath":"workflows","shortname":"loan","attributes":{"is_active":true,"payload":{"content_type":"json","body":{
    "initial_state":"requested",
    "states":[
      {"state":"requested","next":[{"action":"approve","state":"lent"},{"action":"reject","state":"rejected","resolution_required":true}]},
      {"state":"lent","next":[{"action":"return","state":"returned"}]},
      {"state":"rejected"},{"state":"returned"}]}}}}]}' | jq -c '{status, error: .error.message}'
dm -X POST "$DMART/managed/request" -d '{"space_name":"library","request_type":"create","records":[
  {"resource_type":"ticket","subpath":"loans","shortname":"loan_1","attributes":{"is_active":true,"workflow_shortname":"loan",
    "payload":{"content_type":"json","body":{"book":"dune","member":"alice"}}}}]}' | jq -c '{status, error: .error.message}'
dm -X PUT "$DMART/managed/progress-ticket/library/loans/loan_1/approve" -d '{}' | jq -c '{status, error: .error.message}'
dm "$DMART/managed/entry/ticket/library/loans/loan_1" | jq -c '{state, is_open}'
```

A transition the workflow doesn't allow from the current state, or for the caller's roles, answers code `300`. One marked `resolution_required` needs `{"resolution": "..."}` in the body.

### Attachments

A comment, and a file attached to `books/dune`. An attachment's subpath is its parent's `subpath/shortname`.

```bash
dm -X POST "$DMART/managed/request" -d '{"space_name":"library","request_type":"create","records":[
  {"resource_type":"comment","subpath":"books/dune","shortname":"auto","attributes":{"is_active":true,
    "payload":{"content_type":"json","body":{"body":"A classic","state":"commented"}}}}]}' | jq -c '{status, error: .error.message}'
printf 'cover image bytes' > /tmp/cover.png
printf '{"resource_type":"media","subpath":"books/dune","shortname":"cover","attributes":{"is_active":true}}' > /tmp/cover.json
curl -s -H "authorization: Bearer $TOKEN" -X POST "$DMART/managed/resource_with_payload" \
  -F space_name=library -F "request_record=@/tmp/cover.json;type=application/json" \
  -F "payload_file=@/tmp/cover.png;type=image/png" | jq -c '{status, error: .error.message}'
```

The file comes back from `GET /managed/payload/media/library/books/dune/cover.png`.

### A read-only user

A permission grants actions on resource types under subpaths; a role bundles permissions; a user holds roles. All three live in `management`.

```bash
dm -X POST "$DMART/managed/request" -d '{"space_name":"management","request_type":"create","records":[
  {"resource_type":"permission","subpath":"permissions","shortname":"library_read","attributes":{"is_active":true,
    "subpaths":{"library":["books"]},"resource_types":["content","folder"],"actions":["query","view"],"conditions":[]}},
  {"resource_type":"role","subpath":"roles","shortname":"library_reader","attributes":{"is_active":true,"permissions":["library_read"]}},
  {"resource_type":"user","subpath":"users","shortname":"reader1","attributes":{"is_active":true,
    "password":"Reader-pass-42","roles":["library_reader"]}}]}' | jq -c '{status, error: .error.message}'
```

A permission on a folder covers everything below it. A password must meet the server's rule (by default 8 to 64 characters with a digit and a capital letter). For conditions (`own`, `is_active`), field limits and row filters, read `references/access-control.md`.

### Deleting safely

```bash
dm -X POST "$DMART/managed/request" -d '{"space_name":"library","request_type":"delete","dry_run":true,"force":true,"records":[
  {"resource_type":"folder","subpath":"/","shortname":"loans","attributes":{}}]}' | jq -c '{status, report: [.records[]?.attributes.report]}'
```

The report counts what would go, per table (`entries` includes the folder itself). Drop `dry_run` to delete for real. Without `force`, a non-empty folder is refused.

## Before you answer

- Report what dmart actually answered, including failures listed in `error.info`. Don't assume a write succeeded.
- Prefer one request with several records over many requests; dmart writes each record on its own and lists the failures.
- If you were asked to change data and the instance looks like production (real users, many entries), say what you will change before you change it, and use `dry_run` for deletes.

## Reference pages

Open the page that matches the task; each is the dmart.cc documentation page of the same name.

| Page | Read it for |
|---|---|
| `references/api-docs.md` | Every route, request and response; sign-in and OTP flows; error codes; WebSocket; MCP tools |
| `references/query-search.md` | The full search syntax, negation, arrays, sorting, paging, totals, CSV export, aggregation, joins |
| `references/data-model.md` | Entries, resource types, payloads, schemas, attachments, history |
| `references/folders.md` | Folder settings, what the admin UI reads, uniqueness rules |
| `references/entity-lifecycle.md` | Create, update, move and delete in detail; dry runs; import and export |
| `references/tickets.md` | Workflows, transitions, roles, resolutions, assignment, locks |
| `references/access-control.md` | Permissions, roles, groups, ACLs, conditions, row filters, account rules |
| `references/settings.md` | Server configuration keys and their defaults |
| `references/cli.md` | Every `dmart` subcommand, including `cli`, `export`, `import`, `check`, `selfcheck` |
| `references/plugins.md` | Hook and API plugins, the subprocess protocol |
| `references/drivers.md` | Client libraries (Python, TypeScript, Dart, C#) |
| `references/technical.md` | Architecture overview |
