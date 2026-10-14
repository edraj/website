The `search` field on the `Query` body (`POST /managed/query`, `POST /public/query`) accepts a small RediSearch-flavoured expression language. The name is historical: this is purely a **syntax** — the parser compiles it straight into SQL `WHERE` clauses, on PostgreSQL (pg_trgm wildcards + GIN jsonb containment) or SQLite. There is no Redis or RediSearch engine anywhere in the stack; every query runs against the database. This page covers **every operator** and **every value form**, with worked examples for each.

## At a glance

```json
{
  "type": "search",
  "space_name": "my_space",
  "subpath": "items",
  "search": "@is_active:true @payload.body.price:[10 100] -@payload.body.status:archived"
}
```

The `search` string above means: _active items whose payload price is between 10 and 100, excluding any whose status is `archived`_. The rest of this page explains how each token contributes.

## When `search` runs

The `search` field is consulted when `type` is one of:

| `type` | Effect of `search` |
|---|---|
| `search` | Primary use — full RediSearch-style expression. |
| `subpath` | Same parser; combined with the subpath narrowing. |
| `aggregation` | Filters the rows before aggregation. |
| `attachments_aggregation` | Same, for the attachments table. |
| `tags` | Filters which entries' tags are counted. |
| `attachments` | Filters attachments under a parent subpath. |
| `random` | Filters the row pool before `ORDER BY RANDOM()`. |
| `counters` | Filters the rows whose count is returned. |

The `search` field is **ignored** for `type` = `spaces` and `history`. For `events` it is a plain, case-sensitive substring matched against each raw event line.

## Kinds of token

The parser recognises these tokens, separated by whitespace:

1. **Plain word** — anything that isn't `@…:…`, `(`, `)`, or the keywords `and` / `or`. Treated as free-text.

2. **Field selector** — `@field:value` or `-@field:value`.

3. **Group delimiters** — `(` and `)` for paren grouping.

4. **The keyword `or`.**

Whitespace means AND; `or` means OR, and AND binds tighter than OR. The literal word `and` is a no-op synonym for whitespace: inserting it for readability does not change behaviour.

```
"foo bar"           → two plain words, both required
"foo @x:1"          → one plain word AND one field selector
"foo and @x:1"      → identical to the line above
"foo or @x:1"       → the plain word OR the field selector
```

## Plain-text search

A plain word searches an entry's **values**: its shortname, display names and descriptions in every language, tags, and every string and number in `payload.body` at any depth. JSON key names are not searched.

Each word is matched:

- **as a word**, in any of its forms: `fryers` finds "fryer", `library` finds "libraries". Case, accents and Arabic diacritics are ignored;

- **as part of a word**: `phil` finds "Philips", `book` finds "notebook";

- **with its spelling corrected** against the words the space's entries use: `philps` finds "Philips";

- **as Arabic typed on an English keyboard layout**: `sghl` finds "سلام";

- **typed joined or apart**: `airfrayer` finds "Air Fryer".

Every typed word must match. Results come back best match first — whole words, then parts of words, then corrections — unless the query sets `sort_by`.

A word with a digit (`x200`), a single letter, or a fragment of more than 200 of the space's words is matched as a plain substring of the entry's values, without corrections. A word that starts with `-` is matched literally. With `ENABLE_SMART_SEARCH=false`, every plain word is a case-insensitive substring match.

```
hello                  ⇒ entries whose values contain "hello" as a word, part of a word, or a near spelling
foo bar                ⇒ entries matching "foo" AND "bar"
```

Plain words and field selectors can be freely mixed:

```
web01 @payload.body.dc:us-east
                       ⇒ rows where shortname/displayname/description/tags/payload
                          contain "web01"  AND  payload.body.dc == "us-east"
```

## Field selectors `@field:value`

`field` is the column name (e.g. `shortname`, `is_active`) or a dotted jsonb path (e.g. `payload.body.email`). A field that is not a column — `@title:x`, `@BadName:x` — is a `400` (`INVALID_DATA`) naming the problem; it is never silently dropped. Custom data lives under `@payload.body.<field>`.

The behaviour depends on which **category** `field` falls into:

| Category | Examples | Behaviour |
|---|---|---|
| Plain text column | `shortname`, `subpath`, `slug`, `space_name`, `owner_shortname`, `state` | Exact `=` match; `*` in value falls back to `ILIKE` glob. |
| Owner contact | `email`, `msisdn` | Matched through the entry owner's user record; whole values only. |
| Boolean column | `is_active`, `is_open` | Cast to boolean before compare. |
| JSONB array column | `tags`, `roles`, `groups` | `@>` containment (does the array contain this value?). |
| TEXT array column | `query_policies` | `unnest()` + LIKE for pattern matching. |
| Timestamp column | `created_at`, `updated_at`, `timestamp` | Numeric values are treated as Unix milliseconds; ISO strings cast to `timestamptz`. |
| `payload.…` jsonb path | `payload.body.x`, `payload.body.config.db.host` | `payload @> '{…}'::jsonb` containment, type-aware. |
| `payload.…*` wildcard | `payload.body.*`, `payload.*` | `ILIKE` over the cast-to-text subtree. |
| `payload.…[]` array iteration | `payload.body.tags[]`, `payload.body.items[].sku` | `EXISTS (… jsonb_array_elements …)` over each element. |

To filter by schema, use the query's `filter_schema_names` field.

## Array iteration in payload paths

Append `[]` to a path segment to iterate over a JSONB array. Two shapes:

### Primitive-array element match

`@payload.body.arr[]:value` — `arr` is an array of scalars; the predicate matches if **any** element equals `value`.

```
@payload.body.tags[]:alpha
                ⇒ payload.body.tags is an array AND some element equals "alpha"
```

Internally: `EXISTS (SELECT 1 FROM jsonb_array_elements_text(payload->'body'->'tags') AS e WHERE e = $1)` — guarded by `jsonb_typeof(...) = 'array'`.

### Object-array element match (with sub-path)

`@payload.body.arr[].x:value` — `arr` is an array of objects; the predicate matches if **any** element's `x` equals `value`.

```
@payload.body.items[].sku:ABC123
                ⇒ payload.body.items has an element whose "sku" key equals "ABC123"
```

Sub-paths can nest:

```
@payload.body.items[].config.host:localhost
                ⇒ payload.body.items has an element where config.host equals "localhost"
```

Internally: `EXISTS (SELECT 1 FROM jsonb_array_elements(...) AS x WHERE x->>'sku' = $1)`.

### All value forms work over `[]`

Every value form from the _Value forms_ section composes with array iteration:

```
@payload.body.items[].price:>100         ⇒ any element's price > 100
@payload.body.items[].price:[10 100]     ⇒ any element's price BETWEEN 10 AND 100
@payload.body.items[].status:active|pending
                                         ⇒ any element's status is "active" or "pending"
-@payload.body.items[].status:archived
                                         ⇒ NOT (any element's status is "archived")
                                            (i.e. NO archived element exists)
```

### Caveats

- **Only the first `[]` in the path is treated as iteration.** Deeper `[]` segments are parsed as literal key names and will not match. E.g. `@payload.body.a[].b[].c:v` looks up the literal key `b[]` inside each `a` element — it does **not** double-iterate. Flatten the data model or use multiple queries instead.

- The path before `[]` must resolve to a JSONB array. The emitted predicate is guarded with `jsonb_typeof(...) = 'array'`, so non-array values silently don't match.

- Existence checks on the array itself (`@payload.body.arr[]:*`) are not specially handled — for "the array has at least one element", use the column-level form `@payload.body.arr:*` (which checks the array reference is non-null).

## Value forms

Any of the following can appear after the colon in `@field:value`.

### 1. Plain string

```
@shortname:my_entry          ⇒ shortname = 'my_entry'   (exact)
@payload.body.name:john      ⇒ payload contains {"body": {"name": "john"}}
```

### 2. Quoted string (for spaces inside)

```
@payload.body.name:"John Doe"
                             ⇒ payload contains {"body": {"name": "John Doe"}}
```

Quotes are required only when the value contains whitespace.

### 3. Boolean

`true` / `false` (case-insensitive). Triggers a boolean cast.

```
@is_active:true              ⇒ CAST(is_active AS BOOLEAN) = true
@payload.body.enabled:false  ⇒ payload's `enabled` is the JSONB `false`
```

### 4. Numeric

Optional minus, digits, optional decimal: `-?\d+(?:\.\d+)?`.

```
@payload.body.count:42       ⇒ payload's `count` equals 42 (number, not string)
@payload.body.score:3.14     ⇒ payload's `score` equals 3.14
```

Numeric detection is per **value**: if the value parses as a number, the predicate adds a JSONB type guard (`jsonb_typeof = 'number'`) plus a `::float` comparison.

### 5. Wildcard (existence) `*`

The literal `*` after the colon means "any value present":

```
@slug:*                      ⇒ slug IS NOT NULL
@payload.body.email:*        ⇒ payload's path `body.email` IS NOT NULL
@query_policies:*            ⇒ array_length(query_policies, 1) > 0
```

Negated, it asserts absence:

```
-@slug:*                     ⇒ slug IS NULL
-@payload.body.email:*       ⇒ payload's path `body.email` IS NULL
```

### 6. Wildcard glob (column-level)

For plain text columns, an embedded `*` becomes `%` in `ILIKE`:

```
@shortname:web*              ⇒ shortname ILIKE 'web%'
@shortname:*api*             ⇒ shortname ILIKE '%api%'
```

A `*` inside a payload value works the same way: `@payload.body.name:jo*` matches names starting with "jo" (`ILIKE`, with a trigram index prefilter on PostgreSQL).

### 7. OR-list `v1|v2|v3`

A pipe-separated list. The values OR together for the same field.

```
@state:active|pending              ⇒ state='active' OR state='pending'
@payload.body.env:staging|prod     ⇒ payload's env is 'staging' OR 'prod'
```

OR-lists obey the same type detection — all-numeric / all-boolean lists get the matching cast.

### 8. Range `[min max]` or `[min,max]`

Square brackets, separator is **a space or a comma**.

```
@payload.body.price:[10 100]       ⇒ price BETWEEN 10 AND 100  (numeric)
@payload.body.age:[18,65]          ⇒ age BETWEEN 18 AND 65
@payload.body.created:[2024-01-01,2024-12-31]
                                   ⇒ string range, BETWEEN 'a' AND 'b'
@created_at:[1776902400000 1777161599999]
                                   ⇒ to_timestamp(min/1000.0) AND to_timestamp(max/1000.0)
                                      (timestamps treat numbers as Unix ms)
@updated_at:[2026-01-01,2026-12-31]
                                   ⇒ updated_at BETWEEN '...'::timestamptz AND '...'::timestamptz
```

If both bounds are numeric, the range is treated as numeric; otherwise both are treated as strings.

### 9. Comparison `>`, `>=`, `<`, `<=`

Prefix the value with the operator. The value is a **number** or an **ISO 8601 date**; anything else after `>` or `<` is taken literally, as a plain string match.

```
@payload.body.price:>100           ⇒ price > 100
@payload.body.memory:>=16          ⇒ memory >= 16
@created_at:>1776902400000         ⇒ created_at > to_timestamp(1776902400000/1000.0)
@updated_at:>2026-01-01            ⇒ updated after the start of 2026-01-01
@payload.body.due:<2026-06-01      ⇒ compared as text, which orders ISO dates correctly
```

A number compares numerically, and values that are not numbers are skipped. On `created_at`, `updated_at` and `timestamp` every value must be a date or epoch milliseconds; `@updated_at:>yesterday` is a request error.

### 10. Not equal `!`

```
@payload.body.status:!archived     ⇒ status != 'archived'
```

## Negation `-@field:value`

Prefix the selector with `-`. Negation works on every value form:

| Form | Negated meaning |
|---|---|
| `-@field:value` | `field != value` (or `NOT (jsonb @> …)`) |
| `-@field:v1\|v2` | `field != v1 AND field != v2` (DeMorgan) |
| `-@field:[a b]` | `NOT BETWEEN a AND b` |
| `-@field:*` | `field IS NULL` (or array empty) |
| `-@tags:x` | `NOT (tags @> '["x"]'::jsonb)` |

Examples:

```
-@state:deleted                    ⇒ state != 'deleted'
-@payload.body.status:deleted      ⇒ NOT (payload @> '{"body":{"status":"deleted"}}')
-@payload.body.env:staging|dev     ⇒ env != 'staging' AND env != 'dev'
-@payload.body.score:[0 50]        ⇒ score NOT BETWEEN 0 AND 50
-@roles:admin                      ⇒ roles array does NOT contain 'admin'
```

Besides the `-@` prefix, a value can start with `!` for not-equal (`@field:!v`, see above).

## Grouping `( … )` and `or`

Whitespace means AND, between paren groups too. OR comes only from the `or` keyword, or from `|` inside a value. AND binds tighter than OR, and parens group terms:

```
(@is_active:true)                          ⇒ is_active = true
(@is_active:true) (@payload.body.k:v)      ⇒ is_active = true AND payload.body.k = v
(@is_active:true) or (@payload.body.k:v)   ⇒ is_active = true OR payload.body.k = v
@is_active:true @roles:admin or @payload.body.k:v
                                           ⇒ (is_active = true AND roles ⊇ admin)
                                              OR
                                              (payload.body.k = v)
```

Up to mid-2026, whitespace between paren groups meant OR. It now means AND; write `or` where you meant OR.

## Repeated selectors

Each `@field:value` is its own condition, ANDed with the rest. Repeating a field does not merge or replace anything:

```
@payload.body.tags:alpha @payload.body.tags:beta
                ⇒ both tags must be present
@payload.body.dept:sales @payload.body.dept:ops
                ⇒ dept = sales AND dept = ops: on a single-valued field, nothing
                  (use @payload.body.dept:sales|ops for either)
@shortname:x -@shortname:y
                ⇒ shortname = x AND shortname != y
```

## Cookbook

Each recipe is an exact string you can drop into the `search` field.

### Plain free-text

```
hello
                ⇒ entries whose values contain "hello" (as a word, part of a word, or a near spelling)
```

```
web01 nginx
                ⇒ entries matching "web01" AND "nginx"
```

### Single field, exact

```
@shortname:user_42
                ⇒ shortname is exactly 'user_42'
```

```
@is_active:true
                ⇒ active rows
```

```
@is_open:false
                ⇒ closed rows
```

### Boolean and numeric inside payload

```
@payload.body.enabled:true
                ⇒ payload.body.enabled === true (JSON boolean)
```

```
@payload.body.count:42
                ⇒ payload.body.count === 42 (JSON number)
```

```
@payload.body.name:john
                ⇒ payload.body.name === "john" (JSON string)
```

### Deep nested path

```
@payload.body.config.db.host:localhost
                ⇒ payload.body.config.db.host === "localhost"
```

### Quoted value

```
@payload.body.name:"John Doe"
                ⇒ payload.body.name === "John Doe"
```

### Existence / absence

```
@slug:*
                ⇒ slug IS NOT NULL
```

```
-@slug:*
                ⇒ slug IS NULL
```

```
@payload.body.email:*
                ⇒ payload.body.email exists (any value)
```

```
-@payload.body.email:*
                ⇒ payload.body.email is missing or null
```

```
@query_policies:*
                ⇒ row has at least one query policy
```

### Wildcard glob on a column

```
@shortname:web*
                ⇒ shortname starts with "web"
```

```
@shortname:*api*
                ⇒ shortname contains "api"
```

### Wildcard inside payload (full-subtree text)

```
@payload.body.*:web01
                ⇒ stringified payload.body contains "web01" anywhere
```

```
@payload.*:something
                ⇒ stringified payload (whole) contains "something"
```

### Tags / roles / groups (jsonb arrays)

```
@tags:important
                ⇒ tags array contains "important"
```

```
@roles:super_admin
                ⇒ roles array contains "super_admin"
```

```
@groups:editors
                ⇒ groups array contains "editors"
```

```
-@roles:admin
                ⇒ roles array does NOT contain "admin"
```

### Query-policy patterns (TEXT[])

```
@query_policies:test:api:content:true:*
                ⇒ at least one element of query_policies LIKE 'test:api:content:true:%'
```

### OR-list

```
@state:active|pending
                ⇒ state = 'active' OR state = 'pending'
```

```
@payload.body.env:staging|prod
                ⇒ payload.body.env is "staging" or "prod"
```

```
-@payload.body.env:staging|dev
                ⇒ payload.body.env is neither "staging" nor "dev"
```

### Comparisons

```
@payload.body.price:>100
                ⇒ price > 100
```

```
@payload.body.memory:>=16
                ⇒ memory >= 16
```

```
@payload.body.latency:<100
                ⇒ latency < 100
```

```
@payload.body.errors:<=5
                ⇒ errors <= 5
```

### Numeric range

```
@payload.body.price:[10 100]
                ⇒ price BETWEEN 10 AND 100
```

```
@payload.body.age:[18,65]
                ⇒ age BETWEEN 18 AND 65
```

```
-@payload.body.score:[0 50]
                ⇒ score NOT BETWEEN 0 AND 50
```

### String range

```
@payload.body.created:[2024-01-01,2024-12-31]
                ⇒ created sort-key BETWEEN '2024-01-01' AND '2024-12-31'
```

### Timestamp range / comparison

```
@created_at:[1776902400000 1777161599999]
                ⇒ created_at within an inclusive Unix-ms range
```

```
@updated_at:[2026-01-01,2026-12-31]
                ⇒ updated_at BETWEEN '2026-01-01'::timestamptz AND '2026-12-31'::timestamptz
```

```
@created_at:>1776902400000
                ⇒ created_at > to_timestamp(1776902400000/1000.0)
```

### Multiple fields → AND

```
@payload.body.host:web01 @payload.body.dc:us-east
                ⇒ host = "web01" AND dc = "us-east"
```

```
@payload.body.a:x @payload.body.b:y @payload.body.c:z
                ⇒ a = "x" AND b = "y" AND c = "z"
```

### Mixed plain text + field

```
web01 @payload.body.dc:us-east
                ⇒ free-text "web01" AND payload.body.dc = "us-east"
```

### OR with `or`

```
@is_active:true or @payload.body.k:v
                ⇒ is_active = true OR payload.body.k = v
```

```
(@is_active:true @roles:admin) or (@payload.body.k:v)
                ⇒ (active admins) OR (rows with payload.body.k = v)
```

### Negated payload

```
-@payload.body.status:deleted
                ⇒ NOT (payload.body.status = "deleted")
                  (also matches rows where the path is missing)
```

### Same field, accumulated AND

```
@payload.body.tags:alpha and @payload.body.tags:beta
                ⇒ payload.body.tags must contain BOTH "alpha" AND "beta"
                  (the literal `and` is optional — whitespace alone has the same effect)
```

### Array iteration — primitives

```
@payload.body.tags[]:alpha
                ⇒ payload.body.tags array contains an element equal to "alpha"
```

```
@payload.body.skus[]:ABC|DEF|GHI
                ⇒ payload.body.skus array contains "ABC" OR "DEF" OR "GHI"
```

```
-@payload.body.tags[]:archived
                ⇒ payload.body.tags array does NOT contain "archived"
```

### Array iteration — objects with sub-path

```
@payload.body.items[].sku:ABC123
                ⇒ payload.body.items has an object whose "sku" equals "ABC123"
```

```
@payload.body.items[].price:>100
                ⇒ payload.body.items has an object whose "price" > 100
```

```
@payload.body.items[].price:[10 100]
                ⇒ payload.body.items has an object whose "price" BETWEEN 10 AND 100
```

```
@payload.body.items[].status:active|pending
                ⇒ payload.body.items has an object whose "status" is "active" or "pending"
```

```
-@payload.body.items[].status:archived
                ⇒ payload.body.items has NO object whose "status" is "archived"
```

### Array iteration — nested object sub-path

```
@payload.body.items[].config.host:localhost
                ⇒ payload.body.items has an object whose config.host equals "localhost"
```

### Composite real-world example

```
(@is_active:true @roles:editor) @payload.body.published:true -@tags:archived @updated_at:>1735689600000
                ⇒ active editors with published=true,
                  not tagged "archived",
                  updated since 2025-01-01 UTC
```

## Aggregation `type:"aggregation"`

When `type` is `aggregation` (over the `entries` table) or `attachments_aggregation` (over the `attachments` table), the query carries an `aggregation_data` object instead of returning raw entries. It compiles straight into a single SQL `SELECT … GROUP BY …`. The `search` string, if present, still runs — as the `WHERE` clause _before_ aggregation.

### The `aggregation_data` shape

```json
{
  "type": "aggregation",
  "space_name": "shop",
  "subpath": "orders",
  "search": "@is_active:true",
  "aggregation_data": {
    "group_by": ["@payload.body.status"],
    "reducers": [
      { "reducer_name": "count", "alias": "orders" },
      { "reducer_name": "avg", "args": ["@payload.body.total"], "alias": "avg_total" }
    ]
  }
}
```

`group_by` is a list of column names or dotted `payload.*` paths; a leading `@` is optional and stripped. `reducers` is a list of aggregate specs. (A third field, `load`, is accepted for wire-compat with upstream but the SQL builder derives its columns from `group_by` + `reducers` only — `load` is effectively a no-op here.)

### The `reducers[]` item shape

```json
{ "reducer_name": "quantile", "args": ["@payload.body.price", "0.9"], "alias": "p90" }
```

- `reducer_name` — one of the functions in the table below (case-insensitive).

- `args` — positional arguments. `args[0]` is the target field (column or dotted `payload.*` path; a leading `@` is stripped). A missing `args[0]` is only valid for `count` / `count_distinct` (which fall back to `*`); every other reducer with no field is dropped from the SELECT.

- `alias` — the output attribute key. When omitted, the `reducer_name` itself is used. Aliases and group-by keys are sanitised to `[a-zA-Z0-9_]` (`@` and `.` become `_`), so `@payload.body.status` surfaces under the key `payload_body_status`.

### `reducer_name` reference

| `reducer_name` | Args | Compiles to (PostgreSQL) |
|---|---|---|
| `count` | none, or `[field]` | `COUNT(*)` / `COUNT(field)` |
| `count_distinct` | none, or `[field]` | `COUNT(*)` / `COUNT(DISTINCT field)` |
| `sum` | `[field]` | `SUM((field)::numeric)` |
| `avg` | `[field]` | `AVG((field)::numeric)` |
| `min` | `[field]` | `MIN(field)` |
| `max` | `[field]` | `MAX(field)` |
| `stddev` | `[field]` | `STDDEV((field)::numeric)` |
| `group_concat` (alias `tolist`) | `[field]` | `STRING_AGG((field)::text, ',')` |
| `quantile` | `[field, q]` | `percentile_cont(q) WITHIN GROUP (ORDER BY (field)::numeric)` — `q` is clamped to `[0, 1]`; defaults to `0.5` if absent/unparseable |
| `first_value` | `[field]` | `(ARRAY_AGG(field ORDER BY updated_at DESC))[1]` |
| `random_sample` | `[field]` | `(ARRAY_AGG(field ORDER BY RANDOM()))[1]` |

On SQLite, `stddev`, `quantile`, `first_value` and `random_sample` are not available and answer `400`; the others work on both engines.

`group_concat` / `tolist` are the same reducer; so are `count` / `r_count`, `count_distinct` / `count_distinctish`, and `sum` / `total` (wire-compat aliases). Any unrecognised `reducer_name` is silently skipped.

### Response shape

Each result group becomes one `Record` with `resource_type: "content"`, `shortname: "aggregation"`, and the grouped columns + reducer aliases in `attributes`:

```json
{
  "status": "success",
  "records": [
    {
      "resource_type": "content",
      "shortname": "aggregation",
      "subpath": "/orders",
      "attributes": { "payload_body_status": "paid", "orders": 128, "avg_total": 57.4 }
    },
    {
      "resource_type": "content",
      "shortname": "aggregation",
      "subpath": "/orders",
      "attributes": { "payload_body_status": "pending", "orders": 34, "avg_total": 41.2 }
    }
  ],
  "attributes": { "total": 2, "returned": 2 }
}
```

Integer aggregates come back as JSON integers and numeric aggregates (`avg`, `sum`, `stddev`, `quantile`) as JSON doubles.

### `attachments_aggregation`

Identical grammar, but the `FROM` table is `attachments` instead of `entries` — use it to aggregate over attachments (media / comments / relationships / …) hanging off a parent subpath. Example: count attachments per content-type across a subpath.

```json
{
  "type": "attachments_aggregation",
  "space_name": "shop",
  "subpath": "orders",
  "aggregation_data": {
    "group_by": ["@payload_content_type"],
    "reducers": [ { "reducer_name": "count", "alias": "n" } ]
  }
}
```

## Joins & `jq_filter`

Two post-processing hooks reshape a query's result set on the server: `join` attaches related entries under each base record, and `jq_filter` pipes the whole `records[]` array through a bounded `jq` transform. Both live on the `Query` body alongside `search`.

### `join[]` — attach related records

Each item in the `join` list has this shape:

```json
{
  "join_on": "payload.body.customer:shortname",
  "alias": "customer",
  "type": "left",
  "query": {
    "type": "subpath",
    "space_name": "shop",
    "subpath": "customers"
  }
}
```

- `join_on` — a comma-separated list of `left:right` field pairs. `left` is a path on the **base** record, `right` a path on the joined (sub-query) record. Append `[]` to a side to match against each element of a JSONB array (e.g. `payload.body.tags[]:shortname`). Multiple pairs (comma-separated) must all match.

- `alias` — the key under which matches are attached. Each base record gains `attributes.join.{alias}` — a list of the matched sub-query records (empty list when nothing matched).

- `type` — a `JoinType`: `left` (default), `right`, `inner`, or `outer`. A missing or `null` type is treated as `left`.

- `query` — a nested `Query` object (same schema, recursively) describing the right-hand side to pull and match against.

**Pagination semantics.** A `left` join is cardinality-preserving — the base page is fetched normally, then matches are attached. A cardinality-_changing_ join (`inner`, `right`, or `outer`) can drop or append rows, so the server fetches the base set **unpaginated** (offset 0, capped at `MaxQueryLimit`), performs the join over the whole set, then **re-paginates the joined result** with your original `limit`/`offset`. In other words: `inner`/`right`/`outer` give you "join-then-page" semantics, bounded by the max-limit cap.

`right`/`outer` joins are O(right-table-size) by design (they must surface right records the base set never referenced). The pull of right-hand records is capped at `MAX_QUERY_LIMIT` rows; matches past the cap are missing, and the server logs a warning. Pair them with a selective `query.search` to keep them fast.

With `ENABLE_INNER_JOIN_PUSHDOWN` on (the default), an eligible `inner` join is pushed into SQL as an `EXISTS` semi-join instead, so the base query pages and counts in the database.

A worked example — orders with their customer attached:

```json
{
  "type": "subpath",
  "space_name": "shop",
  "subpath": "orders",
  "limit": 10,
  "join": [
    {
      "join_on": "payload.body.customer:shortname",
      "alias": "customer",
      "type": "inner",
      "query": { "type": "subpath", "space_name": "shop", "subpath": "customers" }
    }
  ]
}
```

A matched base record comes back like:

```json
{
  "resource_type": "content",
  "shortname": "order_1001",
  "subpath": "/orders",
  "attributes": {
    "payload": { "body": { "customer": "acme", "total": 57.4 } },
    "join": {
      "customer": [
        { "resource_type": "content", "shortname": "acme", "subpath": "/customers",
          "attributes": { "payload": { "body": { "tier": "gold" } } } }
      ]
    }
  }
}
```

### `jq_filter` — server-side jq transform

`jq_filter` is a top-level string on the `Query` body. After the query runs, the server pipes the `records[]` array through the `jq` binary as `map(<your filter>)` — so your filter is written against a **single record's shape** and is applied to every record. The transformed array is slotted back into `records`; `status`, `attributes`, and `error` are preserved.

```json
{
  "type": "search",
  "space_name": "shop",
  "subpath": "orders",
  "jq_filter": ".attributes.payload.body"
}
```

The filter above projects each record down to just its payload body, so `records` becomes a flat list of body objects. (The server wraps it as `map(.attributes.payload.body)` — do not include your own `map(…)` or a leading `.records`; the input to your filter is already a single record.)

**Bounds & safety.**

- Runs only on a **successful** result set with a non-null `records`; otherwise it is a no-op.

- Subprocess timeout is `JQ_TIMEOUT` seconds (config key, default `2`). A timeout returns a `JQ_TIMEOUT` failure envelope; a jq syntax/runtime error returns `JQ_ERROR`.

- The filter is capped at **1024 characters** and rejected if it references dangerous builtins (`env`, `$ENV`, `input`, `debug`, `stderr`, `path(`, `getpath`, `halt`, `halt_error`, `builtins`, `modulemeta`, `$__loc__`).

- `jq` must be on `PATH` (the RPM/container declares it as a dependency); if it is missing the filter fails cleanly rather than crashing the request.

A `jq_filter` may also be set on a join's nested `query`, where it reshapes that join's matched list (wrapped as `map([ <filter> ])` for per-base alignment) before attachment.

## `history` & `events` queries

These two query types do not use the `search` DSL (see the table at the top) and instead read audit trails. Only a request with no caller at all is refused. On `/public/query` the anonymous user is checked against its permissions like anyone else: `history` against the parent entry, `events` at the space level.

### `history`

Reads the per-entry change log from the `histories` table. Narrow it with `filter_shortnames` to a specific entry (plus the usual `subpath`):

```json
{
  "type": "history",
  "space_name": "shop",
  "subpath": "orders",
  "filter_shortnames": ["note1"],
  "limit": 20,
  "sort_type": "descending"
}
```

Each record carries the change's `timestamp`, `user_shortname`, request type, and a diff of what changed.

### `events`

Reads the append-only space event feed (`events.jsonl` under the space, when the optional event log is enabled). It is filtered by `from_date` / `to_date`, and by `search` as a plain, case-sensitive substring of each raw line, and paged — `filter_shortnames`, `filter_types`, and `subpath` are **ignored** (events live at the space root). Default sort is newest-first.

```json
{
  "type": "events",
  "space_name": "shop",
  "subpath": "/",
  "limit": 50
}
```

If the space has no configured event log, the events feed is simply empty — there is no database fallback (parity with upstream).

Looking for natural-language / vector search instead of the `search` DSL? That is a separate endpoint — `POST /managed/semantic-search` (pgvector cosine similarity), documented on its own page. It does not use the `search` string or any of the query types above.

## Quick reference

| Token | Meaning |
|---|---|
| `word` | plain word: whole or partial words in entry values, spelling-corrected, best match first |
| `@field:value` | exact match (column or jsonb path) |
| `@field:"v with spaces"` | quoted value |
| `@field:true` / `:false` | boolean compare |
| `@field:42` / `:3.14` | numeric compare (with type guard on jsonb) |
| `@field:*` | exists / IS NOT NULL |
| `-@field:*` | missing / IS NULL |
| `@col:abc*` | glob (column-level ILIKE) |
| `@payload.x.*:v` | substring search over the cast-to-text subtree |
| `@payload.body.arr[]:v` | EXISTS — primitive-array element equals `v` |
| `@payload.body.arr[].x:v` | EXISTS — object-array element's `x` equals `v` |
| `@field:v1\|v2` | OR-list |
| `@field:[a b]` | range (space or comma separator) |
| `@field:>n` `@field:>=n` `@field:<n` `@field:<=n` | comparisons (numbers or ISO dates) |
| `@field:!v` | not equal |
| `-@field:value` | negation (works on every form above) |
| `A B` / `(A B) (C)` | AND (whitespace, between groups too) |
| `A or B` | OR; AND binds tighter |
| `and` | no-op keyword, ignored |
| `@tags:x` `@roles:x` `@groups:x` | jsonb array containment |
| `@query_policies:pat:*` | TEXT[] LIKE pattern (unnest) |
| `@created_at:[ms ms]` | timestamp range, numeric = Unix milliseconds |
| `@created_at:[iso,iso]` | timestamp range, ISO strings |

## Limitations

The search language deliberately does **not** support:

- Regular expressions.

- Phrase / proximity operators.

- **Indexed** access into JSON arrays (`@payload.body.items[0].name`). Use `@payload.body.items[].name:value` to match _any_ element instead.

- **Nested** array iteration. Only the first `[]` in a path is treated as iteration — subsequent `[]` segments are interpreted as literal key names. `@payload.body.a[].b[].c:v` does **not** double-iterate.

For semantic / vector search, use the separate `POST /managed/semantic-search` endpoint — it is **not** part of the `search` string.

For free-form SQL or stored queries, use saved-query / `aggregation` flows; raw SQL is never accepted in the `search` field.
