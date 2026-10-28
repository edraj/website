A folder in DMART is deceptively simple — and quietly one of the most powerful concepts in the platform. It is at once a **structural node** (the thing that makes a subpath browsable) and a **declarative control panel** that tells an admin UI how to list, sort and edit everything inside it, and tells the backend exactly what is allowed to live there. All of that lives in one small JSON body validated against a schema called `folder_rendering`. This page dissects every property.

## 1. A folder is just an entry

There is no special `Folder` class with dozens of fields. A folder is an [entry](/data-model) like any other, with `resource_type = folder`. It inherits the exact same Meta as a user or a blog post — uuid, shortname, ownership, tags, timestamps. It adds **no fields of its own**.

All of a folder's "rendering" power lives entirely in its **payload body**, a JSON object whose `schema_shortname` is `folder_rendering`. That body is the subject of this whole page.

```mermaid
graph TD
    F["Folder entry<br/>(resource_type = folder)"] --> M["Meta<br/>uuid, shortname, owner, tags…"]
    F --> P["Payload"]
    P --> SS["schema_shortname:<br/>folder_rendering"]
    P --> B["body = the rendering config<br/>index_attributes, allow_*, query, icons…"]
    B --> UI["Admin UI reads it → renders the listing"]
    B --> BE["Backend reads it → enforces what may be created here"]
```

The folder does not store its children. It stores _the rules and the view_ for its children. The children are ordinary entries that happen to share its subpath. Moving a folder takes its whole subtree with it, deleting one that is not empty needs `force`, and a folder cannot be moved into itself or a folder beneath it (see [Moving and renaming](/entity-lifecycle#moving-and-renaming)).

## 2. Anatomy: where the config actually lives

At runtime a folder is a single row in the database like any entry, but when a space is exported to disk (DMART's import / export & seed format) the split between a folder's _meta_ and its _body_ becomes physically visible. The meta sits inside the subpath's `.dm` directory; the body is a sibling JSON file named after the folder, one level up.

```
spaces/management/
├── schema.json                       ← the BODY  (the folder_rendering config)
└── schema/                           ← the /schema subpath
    └── .dm/
        └── meta.folder.json          ← the META  (points at ../schema.json as body)
```

The meta simply references the body file and names the schema:

```
// management/schema/.dm/meta.folder.json
{
  "uuid": "b9b2b289-7f7c-4d40-a5a5-e896a9c146b4",
  "shortname": "schema",
  "is_active": true,
  "owner_shortname": "dmart",
  "payload": {
    "content_type": "json",
    "schema_shortname": "folder_rendering",   // ← validated against THE schema
    "body": "schema.json"                      // ← the sibling file with the config
  }
}
```

## 3. The `folder_rendering` schema — centralized & exact

Every folder body that names `folder_rendering` as its schema (cxb's folder editor always does) is validated against a **single** canonical schema that lives in the `management` space at `management/schema/folder_rendering`. Every start creates that schema when it is missing, and never overwrites an edited copy. Two design decisions make it strict and safe:

**Centralized** The schema validator special-cases the shortname `folder_rendering` and always resolves it from the `management` space — so one definition governs all spaces, and you never copy it per space.

**Exact** `additionalProperties: false` at every level; only the objects inside `filter` are free-form. An unknown or _misspelled_ field is rejected, not silently ignored — you find the typo immediately instead of debugging a prop that "does nothing".

**Minimal required** The only required property is `index_attributes`. A folder with nothing but one index attribute is valid; everything else is optional and defaulted.

Because validation is exact, the props below are the **complete** vocabulary. There is no hidden `columns`, `render_type` or `list_columns` — those don't exist here. What you see is what a folder can declare.

## 4. Props — display & columns

These control what the listing (the "index page") looks like: which columns appear, their headers, the folder's icons, and the label for the shortname column.

| Property | Type | What it does |
|---|---|---|
| `index_attributes` _(required)_ | `[{key, name}]` | The star of the show. Each item is a column: `key` is the entry field/attribute to read, `name` is the header text shown. Order = column order. Must be unique. See §8. |
| `shortname_title` | `string` | The header label meant for the shortname column (e.g. "Permission Shortname", "API Name") — lets a technical `shortname` read as a friendly noun. |
| `search_columns` | `[{key, name}]` | The columns meant for the search/results view when searching within the folder. Same `{key, name}` shape as index_attributes. |
| `csv_columns` | `[{key, name}]` | The columns, and their headers, of the folder's CSV download. The server writes exactly these, each read by its key as in §8, and a CSV upload to the folder reads a file of that shape back. |
| `icon` | `string` | The folder's main icon, for the tree/sidebar. |
| `icon_opened` | `string` | Icon for the folder when expanded. |
| `icon_closed` | `string` | Icon for the folder when collapsed. |
| `enable_pdf_schema_shortnames` | `string[]` | Entries using one of these schemas are meant to get a "download as PDF" icon. |

Of these, the bundled admin UIs (cxb and catalog) act on `index_attributes` and `csv_columns`; the others are kept for any front end that reads them, and cxb's folder editor sets them all.

## 5. Props — what may live here (server-enforced)

These four are not just UI hints — the **backend** enforces them on the folder's direct children: all four whenever a record is created in the folder or an entry in it is updated, and the three content arrays also when an entry is moved into it. An empty (or absent) array means "no restriction". See §10 for the enforcement details.

| Property | Type | What it restricts |
|---|---|---|
| `content_resource_types` | `string[]` (enum) | A child's `resource_type` must be one of these. Values are drawn from the full resource-type enum (`content`, `ticket`, `folder`, `media`, …). |
| `content_schema_shortnames` | `string[]` | A child that declares a `payload.schema_shortname` must use one of these. Also drives which form the UI loads (see §9). |
| `workflow_shortnames` | `string[]` | A `ticket` created here that declares a `workflow_shortname` must use one of these. |
| `unique_fields` | `string[][]` | A list of composite uniqueness constraints. Each inner list is a set of fields that together must be unique across all entries in the folder — e.g. `[["payload.body.email"], ["payload.body.first_name","payload.body.last_name"]]`. See §10 for the fields a path can name. |

## 6. Props — action toggles

Booleans meant to show or hide the corresponding buttons/affordances in an admin UI for this folder. They shape what an operator _can do_ from the listing. Of the bundled UIs, catalog acts on `allow_csv` and `allow_upload_csv`; cxb's folder editor sets every toggle, but neither UI acts on the others, which are there for front ends that read them.

| Property | Default | Effect |
|---|---|---|
| `allow_view` | `true` | Allow opening/viewing a resource inside the folder. |
| `allow_create` | `true` | Allow creating resources from the listing. |
| `allow_create_category` | `false` | Allow creating a _sub-folder_ (a "category") inside this folder. |
| `allow_update` | `true` | Allow editing existing resources. |
| `allow_delete` | `false` | Allow deleting resources. |
| `allow_csv` | `false` | Show the CSV **download** button (export the displayed list). |
| `allow_upload_csv` | `false` | Show the CSV **upload** feature (batch-create from a CSV). |
| `use_media` | `false` | Declares that entries here carry a media attachment. |

These are UI hints for a smooth operator experience — they are _not_ a security boundary. Real authorization is always enforced by [RBAC + ACLs](/access-control) on the server regardless of what a folder's toggles say.

## 7. Props — query, sort, filter & behavior

These decide _which_ entries the listing loads, in what order, and how it behaves.

| Property | Type | What it does |
|---|---|---|
| `query` | `{type, search, filter_types}` | `type` is `"subpath"` or `"search"`. When `type` and `search` are both set, cxb adds `search` (a [query string](/query-search)) to the folder's listing, together with whatever the operator types; the listing is still the folder's own. `filter_types` (resource types) is in the schema, but neither bundled UI reads it. |
| `append_subpath` | `string` | A string meant to be appended to the query subpath; neither bundled UI reads it. |
| `sort_by` | `string` | The field cxb first orders the listing by (e.g. `created_at`, `shortname`); without one, `shortname`. |
| `sort_type` | `"ascending" \| "descending"` | The direction of that sort; without one, ascending. |
| `filter` | `object[]` | Additional filter options meant for above the listing; neither bundled UI reads it. |
| `disable_filter` | `boolean` | Meant to hide the search/filter icon for this folder; neither bundled UI reads it. |
| `expand_children` | `boolean` | Both bundled UIs then list the folder's whole subtree, not just the entries directly inside it. |
| `stream` | `boolean` | Enables a folder-level **websocket watch**: cxb subscribes to the folder and flags its Refresh button when an entry changes. Only subscribers who may read the changed record hear of it. |

## 8. `index_attributes` in depth

This is the one required property and the heart of folder rendering. It is an ordered array of column descriptors, each a two-field object:

```
"index_attributes": [
  { "key": "shortname",        "name": "API Name"  },   // column 1
  { "key": "subpath",          "name": "Sub path"  },   // column 2
  { "key": "end_point",        "name": "End point" },   // column 3  (a payload.body field)
  { "key": "verb",             "name": "Verb"      }    // column 4  (a payload.body field)
]
```

**key** Which value to read from each entry. It can be a Meta field (`shortname`, `created_at`, `owner_shortname`) or a field inside the entry's `payload.body` (`end_point`, `verb`). A bare key is looked up in the entry's `payload.body` first, then its payload, its meta and the record itself; a dotted key (`payload.body.verb`) is a path. cxb also reads `status`, `author` and `displayname` specially.

**name** The human-friendly column header rendered in the table. Purely presentational.

### Fallback columns

If a folder somehow has no usable index attributes, the admin UI falls back to a sensible default set so the listing is never blank. cxb shows shortname, resource type, schema, created and updated; catalog shows:

```json
[
  { "key": "status",     "name": "Status" },
  { "key": "created_at", "name": "Created At" },
  { "key": "updated_at", "name": "Updated At" },
  { "key": "author",     "name": "Author" }
]
```

### Editing columns live

Operators don't hand-edit JSON. Catalog exposes a **column-settings modal** that adds, removes and edits `index_attributes` visually, then writes them back into `payload.body.index_attributes` via a folder `update` request; cxb's folder form edits them along with the folder's other display, sort and toggle props. The folder config is data you edit through the same CRUD API as everything else.

## 9. How the admin UI renders a folder

Putting the props together, here is the pipeline the admin SPAs (CXB / Catalog) run when you open a folder:

```mermaid
sequenceDiagram
    participant UI as Admin UI
    participant API as DMART API
    UI->>API: GET folder entry (meta + payload.body)
    API-->>UI: folder_rendering config
    UI->>UI: fill missing props with defaults
    UI->>UI: build columns from index_attributes (or fallback)
    UI->>API: query the folder (its subtree with expand_children), sort_by, sort_type, query.search
    API-->>UI: page of entries
    UI->>UI: render table — one column per index_attribute
    UI->>UI: CSV buttons gated by allow_csv / allow_upload_csv
    Note over UI: click "Create" → load form from content_schema_shortnames
```

1. **Load** the folder entry and read `payload.body`.

2. **Default** every missing property (see §11) — a stored value of the right type is kept, so an explicit `false` from the server is preserved, not overwritten by a truthy default.

3. **Columns** from `index_attributes`, or the fallback set.

4. **Fetch** entries: the folder's own entries, or its whole subtree with `expand_children`. In cxb, `sort_by`/`sort_type` give the starting order (default `shortname` / `ascending`) and `query.search` narrows the list.

5. **Toolbar**: in catalog, CSV download appears only if `allow_csv`, and CSV upload only if `allow_upload_csv`.

6. **Create form**: driven by `content_schema_shortnames` — _zero_ schemas → a free-form entry; _one_ → that schema's form is auto-loaded and rendered; _many_ → the user picks which schema first. cxb's create dialog offers only the resource types and schemas the folder lists, when it lists any.

## 10. Content policy is enforced on the server

The three content arrays plus uniqueness are not merely UI conveniences. When a record is created in a folder, when an entry in it is updated, and when an entry is moved into it, the backend reads the _parent folder's_ config and validates the child against it:

- `content_resource_types` — the child's resource type must be allowed.

- `content_schema_shortnames` — a schema-declaring child must use an allowed schema.

- `workflow_shortnames` — a ticket's workflow must be allowed.

Semantics that matter in practice:

**Empty = open** An empty or absent array imposes no restriction. Restrictions are opt-in.

**Declared values only** A child that names no schema passes `content_schema_shortnames`, and a ticket without a workflow passes `workflow_shortnames`. Pair them with `content_resource_types` when a folder must be airtight.

**Direct children** A folder's policy covers the records directly inside it, not those in its sub-folders, which follow their own folder.

**Fails open** If the parent folder can't be read, enforcement is skipped rather than blocking the write.

**Toggleable** Global enforcement is controlled by `ENFORCE_FOLDER_CONTENT_POLICY` (default `true`). Set to `false`, a violation is logged and the write goes through; either way `dmart check` lists content that breaks its folder's policy (`folder_content_violations`).

### Uniqueness

`unique_fields` is checked on every create and update in the folder. Each inner list is a compound key: a write is refused (`DATA_SHOULD_BE_UNIQUE`) when another record in the folder already holds the same values for every field of it.

- A field is `payload.body.<path>` for a body field, or one of `shortname`, `slug`, `owner_shortname`, `tags`, `displayname.<lang>` and `description.<lang>`. In a folder of users, roles or permissions it names the record's own attribute, such as `email` or `msisdn`.

- A list value counts each of its elements, and `[]` reaches into a list of objects: `payload.body.variants[].sku`. Only one `[]` per path is supported: a path with two, such as `a[].b[].c`, is not enforced, and the server only logs a warning.

- Values are compared exactly as written, except a user's `email`, which matches in any case. They are compared against every record in the folder, whether or not the writer can read it, so a write can be refused over a record the writer cannot see.

- A user is always held unique by `email` and `msisdn`, whatever the folder declares. An update that keeps the account's own email, in any case, is not checked for it.

- A compound with list values runs one search per combination of them. A write that would need more than `UNIQUENESS_MAX_PROBES` searches (default `1000`, see [Settings](/settings)) is refused with `INVALID_DATA`.

- Uniqueness fails closed, unlike the content policy: when the check cannot run (the folder cannot be read, or a search fails), the write is refused with "uniqueness could not be verified" (`SOMETHING_WRONG`).

## 11. Default values

When a property is absent, the admin UI applies these defaults (a stored value of the right type is kept, so a real `false`/empty value is never clobbered):

| Group | Default |
|---|---|
| `allow_view`, `allow_create`, `allow_update` | `true` |
| `allow_delete`, `allow_create_category`, `allow_csv`, `allow_upload_csv`, `use_media`, `stream`, `expand_children`, `disable_filter` | `false` |
| `index_attributes`, `content_schema_shortnames`, `content_resource_types`, `*_columns`, `workflow_shortnames`, `enable_pdf_schema_shortnames` | `[]` |
| `query` | `{ type: "", search: "", filter_types: [] }` |
| `icon`, `icon_opened`, `icon_closed`, `shortname_title`, `sort_by`, `sort_type` | `""` |

## 12. Worked examples (real seed folders)

### a. Minimal, read-only listing — `management/permissions`

One column, every edit toggle off. Meant as a pure browse view.

```json
{
  "shortname_title": "Permission Shortname",
  "content_schema_shortnames": [],
  "index_attributes": [
    { "key": "shortname", "name": "Permission Shortname" }
  ],
  "allow_create": false,
  "allow_update": false,
  "allow_delete": false,
  "use_media": false,
  "filter": [],
  "allow_view": true
}
```

### b. Rich, editable listing — `applications/api`

Four columns (two of them payload fields), every edit toggle on, CSV export, a listing of its whole subtree (`expand_children`), constrained to one schema and the `content` type.

```json
{
  "shortname_title": "API Name",
  "content_schema_shortnames": ["api"],
  "content_resource_types": ["content"],
  "index_attributes": [
    { "key": "shortname",  "name": "name" },
    { "key": "subpath",    "name": "Sub path" },
    { "key": "end_point",  "name": "End point" },
    { "key": "verb",       "name": "Verb" }
  ],
  "expand_children": true,
  "allow_create": true,
  "allow_update": true,
  "allow_delete": true,
  "allow_csv": true,
  "use_media": false,
  "allow_view": true
}
```

### c. Distinct search view — `management/notifications`

Two schemas allowed, and a bespoke `search_columns` set that differs from the index columns.

```json
{
  "shortname_title": "ID",
  "content_schema_shortnames": ["system_notification_request", "admin_notification_request"],
  "content_resource_types": ["content"],
  "index_attributes": [
    { "key": "shortname",  "name": "Shortname" },
    { "key": "on_subpath", "name": "On Subpath" },
    { "key": "on_action",  "name": "On Action" },
    { "key": "on_state",   "name": "On State" },
    { "key": "priority",   "name": "Priority" }
  ],
  "search_columns": [
    { "key": "shortname",  "name": "username" },
    { "key": "on_subpath", "name": "On Subpath" }
  ],
  "allow_create": true,
  "allow_update": true,
  "allow_delete": true,
  "allow_view": false
}
```

### d. Sorted folder with a query — `management/health_check`

A `search`-type `query` with an empty search, so cxb adds nothing to the listing, and opens it oldest first (`sort_by`/`sort_type`).

```json
{
  "index_attributes": [ { "key": "shortname", "name": "name" } ],
  "sort_by": "created_at",
  "sort_type": "ascending",
  "query": { "type": "search", "search": "" },
  "content_schema_shortnames": [],
  "content_resource_types": [],
  "workflow_shortnames": [],
  "enable_pdf_schema_shortnames": [],
  "allow_create": false,
  "allow_view": false
}
```

## 13. Validation, strictness & the auto-fixer

Because the schema is exact, a folder body that names it is rejected when it is saved if it contains an unknown field or misses `index_attributes`. `dmart check [space]` counts the folders whose bodies break the schema, whatever schema they name (`folder_body_schema_violations`; `hard` adds sample paths). To repair legacy folders that predate the tightened schema, DMART ships a CLI:

```
dmart fix-folder-rendering [space] [--apply]
```

- **Strips** fields that aren't in the canonical schema (kills typos and dead props).

- **Fills** a required-but-missing `index_attributes` with `[]`.

- **Widens** non-empty content-policy arrays so they still cover the folder's existing direct children (won't retroactively orphan data).

- **Reports** invalid `content_resource_types` enum values without silently deleting them.

Run it without `--apply` for a dry-run report; add `--apply` to write the fixes. Without a space it goes through every space. It never touches the folders' content. See the [CLI reference](/cli).
