The `search` field on the `Query` body (`POST /managed/query`, `POST /public/query`) accepts a small RediSearch-flavoured expression language. The name is historical: this is purely a **syntax** — the parser compiles it straight into SQL `WHERE` clauses, on PostgreSQL (full-text and pg_trgm indexes, GIN-indexed jsonb tests) or SQLite (FTS5). There is no Redis or RediSearch engine anywhere in the stack; every query runs against the database. This page covers **every operator** and **every value form**, with worked examples for each.

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
| `search`, `subpath` | Primary use: filters the records under `space_name` / `subpath` (and below it, unless `exact_subpath` is true). The two types run identically, and so does `reports`. |
| `aggregation` | Filters the rows before aggregation. |
| `attachments_aggregation` | Same, for the attachments table. |
| `tags` | Filters which entries' tags are counted. |
| `attachments` | Filters attachments under a parent subpath. |
| `random` | Filters the row pool before `ORDER BY RANDOM()`. |
| `counters` | Filters the rows whose count is returned. |

The `search` field is **ignored** for `type` = `spaces` and `history`. For `events` it is a plain, case-sensitive substring matched against each raw event line.

In the `management` space, a query at `/users`, `/roles`, `/groups` or `/permissions` (or below) runs on that table, so a selector names that table's columns: `email`, `msisdn`, `roles` and `groups` are columns of users, not of entries.

The query's other filters are ANDed with the search: `filter_types`, `filter_shortnames`, `filter_schema_names`, `filter_tags` (any of the listed tags), and `from_date` / `to_date`, which bound `created_at`. `filter_schema_names` defaults to `["meta"]`, which filters nothing: the name `meta` is dropped from the list.

**Permissions narrow every search.** A query returns only rows the caller may list: a row is listed through a grant whose resource types and conditions admit it, or an ACL that grants the caller `query`. Owning a row does not list it on its own; an `own` grant lists the caller's rows. A grant reaches a listing at its own subpath and every folder below it, and a grant on a space's root reaches every listing in the space. A permission's row filter (`filter_fields_values`), with `__current_user__` and `__current_user__owner__` replaced by the caller's own values, is ANDed onto the search, and parsed on its own, so nothing in the search (an `or`, an unbalanced quote or paren) can loosen it. A record whose ACL denies the caller `query` or `view` is left out of pages, totals, counters, tags and aggregations, unless the caller is a global admin. Attachments and history are listed only where the record they hang off would be. See [access control](/access-control#row-filters).

## Query types other than `search`

`type` decides what a query reads and what it answers. `search`, `subpath` and `reports` list records. The others:

| `type` | Answers |
|---|---|
| `spaces` | One record per space where one of the caller's grants that holds `view` or `query` reaches something, by the space's name or `__all_spaces__`, and whose ACL does not deny the caller `view` or `query`; a grant to `create` alone lists no space. It needs `space_name: "management"` and `subpath: "/"`; anything else is `INVALID_DATA`. |
| `attachments` | One record per attachment below `subpath` that the caller may read, body included. |
| `tags` | One record, with shortname `tags`. Its `attributes.tags` lists the matching entries' tags, most used first, and `attributes.tag_counts` maps each tag to its count. `limit` and `offset` page over the tags, so `total` is the number of tags in this page. |
| `counters` | No records. `total` is the number of matching rows, and `returned` the number a listing with the same `limit` and `offset` would return. |
| `random` | The matching rows in random order; `sort_by` is ignored. |
| `aggregation`, `attachments_aggregation` | Grouped counts and sums: see [Aggregation](#aggregation-typeaggregation). |
| `history`, `events` | Change logs: see [`history` & `events` queries](#history--events-queries). |

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

Every typed word must match. Results come back best match first — whole words, then parts of words, then corrections, most recently updated first within each — unless the query sets `sort_by`.

A word with a digit (`x200`), a single letter, or a fragment of more than 200 of the space's words is matched as a plain substring of the entry's values, without corrections. An entry's indexed text stops at 100,000 characters, so a word past that point in a very large body is not found.

A word that starts with `-` is not an exclusion: it and the words typed next to it are matched as plain substrings. So is every plain word with `ENABLE_SMART_SEARCH=false`, and on every table but entries (users, roles, groups, permissions, attachments): a case-insensitive substring of the shortname, payload, display names, descriptions and tags, read as JSON text, key names included.

A bare `*` is not a wildcard. As a plain word it is matched as a substring, so `"search": "*"` finds only records whose values hold an asterisk. To list everything, leave `search` out.

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

Columns the API never returns cannot be searched, as a field or as the start of a path: a user's `password`, `last_login` and `last_failed_login`, a history row's `request_headers` and an attachment's `media`. Naming one is a `400`.

The behaviour depends on which **category** `field` falls into:

| Category | Examples | Behaviour |
|---|---|---|
| Plain text column | `shortname`, `subpath`, `slug`, `space_name`, `owner_shortname`, `state` | Exact `=` match; `*` in value falls back to `ILIKE` glob. |
| Folder subtree | `@subpath:/a/*` | Every row below the folder `/a`, matched exactly and case-sensitively; `_` and `%` in the name match only themselves. `@subpath:/a\|/a/*` takes `/a` too. |
| Owner contact | `email`, `msisdn` | On any table but users, matched through the owner's user record, and only for a caller who may list every user (a global admin, or a grant on `management/users` with no condition and no row filter); anyone else gets a `400`. Whole values only. On users they are the user's own columns. `@email` ignores case on both: see [`@email` and `@msisdn`](#email-and-msisdn). |
| Boolean column | `is_active`, `is_open` | Cast to boolean before compare. |
| JSONB array column | `tags`; on users also `roles`, `groups`, `services`, `mail_aliases` | `@>` containment (does the array contain this value?). |
| TEXT array column | `query_policies` | `unnest()`, with `ILIKE` when the value holds `*`. |
| Timestamp column | `created_at`, `updated_at`, `timestamp` | Stored as the server's local wall-clock time, with no time zone. A number is Unix milliseconds, converted to the server's local time; an ISO date without an offset is read as the server's local time. |
| Other JSON column path | `displayname.en`, `description.ar` | The text at that key, compared like a plain text column; `@displayname.*:v` is a substring of the whole column. |
| `payload.…` jsonb path | `payload.body.x`, `payload.body.config.db.host` | The value held there, or as an element of an array there, by the value's type (below). On PostgreSQL an equality is one jsonpath test, `payload @? …`, which the payload's GIN index serves. |
| `payload.…*` wildcard | `payload.body.*`, `payload.*` | `ILIKE` over the cast-to-text subtree. |
| `payload.…[]` array iteration | `payload.body.tags[]`, `payload.body.items[].sku` | `EXISTS (… jsonb_array_elements …)` over each element. |

`relationships` and `acl` hold JSON arrays, so a dotted path into them, such as `@relationships.attributes.relation:x`, parses but never matches. `[]` iteration works only under `payload.`: `@relationships[].attributes.relation:x` is a `400`. To search them, use `@relationships.*:v`, a substring of the whole column.

### `@email` and `@msisdn`

`@email:<value>` matches an address whatever its case, on the users table and through a row's owner on any other table: `@email:Ali@Example.org` finds `ali@example.org`. It compares as sign-in and the users table's unique email index do, `LOWER(email) = LOWER(value)`, so it is a lookup in that index on both engines. A user create's or update's uniqueness check on `email` searches the same way. `-@email:v` and `@email:!v` exclude the same way, without the index.

On the users table a glob (`@email:*@example.org`) is a pattern, in any case, and a range or comparison (`@email:[a m]`) compares the text as stored. Through a row's owner a value is always whole: a `*` is a character, and a range or comparison is a `400`. Case is folded by the database's `lower()`: PostgreSQL's folds any letter, SQLite's only ASCII, as at sign-in. `@msisdn` compares the number as stored.

## Array iteration in payload paths

Append `[]` to a path segment to iterate over a JSONB array. Two shapes:

### Primitive-array element match

`@payload.body.arr[]:value` — `arr` is an array of scalars; the predicate matches if **any** element equals `value`.

```
@payload.body.tags[]:alpha
                ⇒ payload.body.tags is an array AND some element equals "alpha"
```

On PostgreSQL, internally: `EXISTS (SELECT 1 FROM jsonb_array_elements_text(payload->'body'->'tags') AS e WHERE e = $1)` — guarded by `jsonb_typeof(...) = 'array'`.

### Object-array element match (with sub-path)

`@payload.body.arr[].x:value` — `arr` is an array of objects; the predicate matches if **any** element's `x` equals `value`, or is itself an array holding `value`. (Comparisons and ranges test `x` as one value.)

```
@payload.body.items[].sku:ABC123
                ⇒ payload.body.items has an element whose "sku" key equals "ABC123"
```

Sub-paths can nest:

```
@payload.body.items[].config.host:localhost
                ⇒ payload.body.items has an element where config.host equals "localhost"
```

On PostgreSQL, internally: `EXISTS (SELECT 1 FROM jsonb_array_elements(...) AS x WHERE x->>'sku' = $1)`.

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

- Existence checks on the array itself (`@payload.body.arr[]:*`) are not specially handled: `arr[]` is read as a literal key, so it matches nothing. `@payload.body.arr:*` tests only that the key is present; an empty array passes it.

## Value forms

Any of the following can appear after the colon in `@field:value`.

### 1. Plain string

```
@shortname:my_entry          ⇒ shortname = 'my_entry'   (exact)
@payload.body.name:john      ⇒ payload.body.name is "john", or an array holding "john"
```

### 2. Quoted string (for spaces inside)

```
@payload.body.name:"John Doe"
                             ⇒ payload.body.name is "John Doe" (or an array holding it)
```

Quotes are required only when the value contains whitespace.

### 3. Boolean

`true` / `false` (case-insensitive). On a boolean column, a boolean compare. On a payload path it matches a JSON boolean or the string `"true"` / `"false"` in any case, held directly or in an array; other strings (`"yes"`, `"1"`) do not count. Strings are compared, never cast, and both engines answer alike.

```
@is_active:true              ⇒ CAST(is_active AS BOOLEAN) = true
@payload.body.enabled:false  ⇒ `enabled` is false, "false" / "FALSE", or an array holding one
```

### 4. Numeric

Optional minus, ASCII digits, optional decimal: `-?[0-9]+(\.[0-9]+)?`.

```
@payload.body.count:42       ⇒ `count` is the number 42 or the string "42", or an array holding either
@payload.body.score:3.14     ⇒ `score` equals 3.14
```

Numeric detection is per **value**. On PostgreSQL this equality compares the number exactly, to any precision. A negated search (`-@`), a `[]` path, a comparison and a range compare as floating point, as every numeric test does on SQLite. A comparison or range on a payload path skips values that are not JSON numbers (the string `"150"` is not `>100`).

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
-@payload.body.email:*       ⇒ payload has no key `body.email`
```

On a payload path, `*` asks whether the key is there, so a key holding JSON `null` counts as present. To treat a JSON `null` as missing, use `null`:

```
@payload.body.email:null     ⇒ `email` is missing or JSON null
-@payload.body.email:null    ⇒ `email` is present with a non-null value
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

A number compares numerically, and values that are not numbers are skipped. Arabic-Indic (`٥`) and Persian (`۵`) digits in a comparison or range are read as the number. On `created_at`, `updated_at` and `timestamp` every value must be a date or epoch milliseconds; `@updated_at:>yesterday` is a request error.

### 10. Not equal `!`

```
@payload.body.status:!archived     ⇒ status != 'archived'
```

## Negation `-@field:value`

Prefix the selector with `-`. Negation works on every value form:

| Form | Negated meaning |
|---|---|
| `-@field:value` | `field != value` (on a payload path: missing, or not holding `value`) |
| `-@field:v1\|v2` | `field != v1 AND field != v2` (DeMorgan) |
| `-@field:[a b]` | `NOT BETWEEN a AND b` (on a payload path: also a missing field) |
| `-@field:*` | `field IS NULL` (or array empty) |
| `-@tags:x` | `NOT (tags @> '["x"]'::jsonb)` |

Examples:

```
-@state:deleted                    ⇒ state != 'deleted'
-@payload.body.status:deleted      ⇒ status is missing, another string, or an array without "deleted"
-@payload.body.env:staging|dev     ⇒ env != 'staging' AND env != 'dev'
-@payload.body.score:[0 50]        ⇒ score NOT BETWEEN 0 AND 50
-@roles:admin                      ⇒ roles array does NOT contain 'admin'
```

On a payload path, every negated test (string, number, boolean, range, glob, comparison or `[]`) also matches rows where the field is missing or JSON `null`. A value of another type, such as a string under `-@payload.body.n:[1 10]`, is still left out.

A glob on a plain column negates as a glob: `-@shortname:web*` excludes every shortname that starts with `web`, in any case (`NOT ILIKE` on PostgreSQL). `!` (`@shortname:!web*`) still compares the text as written. On a plain column, a negation leaves out rows where the column is NULL, as `!=` does.

Permission row filters (`filter_fields_values`) use this same parser, so these rules decide which records a filtered permission covers, for listings, reads by name and writes alike.

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

Whitespace between paren groups means AND; write `or` for OR.

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
                ⇒ payload.body.enabled is true, or "true" in any case (or an array holding it)
```

```
@payload.body.count:42
                ⇒ payload.body.count is 42 or "42" (or an array holding it)
```

```
@payload.body.name:john
                ⇒ payload.body.name is "john" (or an array holding it)
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
                ⇒ payload.body.email is missing
```

```
@payload.body.email:null
                ⇒ payload.body.email is missing or JSON null
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

`roles` and `groups` are columns of users, so the `@roles` and `@groups` recipes run on `management/users`.

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
                ⇒ at least one element of query_policies ILIKE 'test:api:content:true:%'
```

A row carries `space:subpath:resource_type:is_active` for its folder and each folder above it, each also followed by `:<owner>`. A row with an owner group also carries each followed by `:@<group>`:

```
@query_policies:X:a:content:true:@editors
                ⇒ active content in X, at /a or below, whose owner group is "editors"
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
                ⇒ created, as text, BETWEEN '2024-01-01' AND '2024-12-31'
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
(@is_active:true @tags:featured) @payload.body.published:true -@tags:archived @updated_at:>1735689600000
                ⇒ active entries tagged "featured" with published=true,
                  not tagged "archived",
                  updated after Unix ms 1735689600000 (2025-01-01 00:00 UTC),
                  which dmart converts to the server's local time to compare
```

## Sorting, paging and totals

These fields of the `Query` body shape every listing, whatever its `search`.

- **`sort_by`** — a column such as `shortname`, `created_at`, `updated_at`, `slug`, `is_active`, `resource_type` or `owner_shortname` (on entries also `state`), or a dotted path (`payload.body.rank`; `body.rank` is shorthand, and a leading `@` or `attributes.` is dropped). `schema_shortname` is shorthand for `payload.schema_shortname`, on every table and engine, attachments included. No table has a `payload_content_type` column; sort by the content type with `payload.content_type`. Numbers at a path sort as numbers (2 before 10). Comma-separated keys sort in turn. A key that cannot be used, a hidden column included, is dropped; with none left, rows sort by `updated_at`. Without `sort_by`, rows sort by `updated_at`, except an entries search with plain words, which comes back best match first. `random` ignores it.

- **`sort_type`** — `descending` (the default) or `ascending`, for every key. Rows without the key come first when descending and last when ascending, on both engines.

- **`limit`** — omitted, `DEFAULT_QUERY_LIMIT` (default 10). `-1` asks for `MAX_QUERY_LIMIT` (default 10000), any other value below 1 means 100, and a larger limit is cut to `MAX_QUERY_LIMIT`.

- **`offset`** — rows to skip.

- **`total`** and **`returned`** come back in `attributes`. `/managed/query` counts unless the body says `retrieve_total: false` (an omitted field follows `RETRIEVE_TOTAL_DEFAULT`, true by default). `/public/query` counts only when the body says `retrieve_total: true`, and its GET form never does. A skipped count reports `total` as `-1`. Above `QUERY_TOTAL_CAP` (default 100000) the count stops: `total` is the cap and `total_is_lower_bound` is `true`.

### Shaping the records

These fields of the `Query` body decide what each record carries.

- **`retrieve_json_payload`** — false by default, so a record from an entries query carries its `payload` without `body`. Set it to `true` for the body. Records from every other table (spaces, users, roles, groups, permissions, attachments) always carry their body.

- **`retrieve_attachments`** — `true` adds an `attachments` object to each record of an entries query, beside `attributes`: each attachment type maps to a list of records, as in `{"comment": [ … ], "media": [ … ]}`. It lists only the attachments the caller may read, and a record with none has no `attachments` key. Each embedded attachment reports its parent's subpath, and carries no `acl` or `relationships`.

- **`retrieve_lock_status`** — `true` adds `attributes.locked.owner_shortname` to each record of an entries query that someone holds a live lock on.

- **`include_fields`, `exclude_fields` and `highlight_fields`** — accepted, and ignored.

### CSV export

`POST /managed/csv` takes the same body and answers a CSV file, sized by the same `limit` rule: one file holds at most `MAX_QUERY_LIMIT` rows, a body without `limit` gets `DEFAULT_QUERY_LIMIT` rows, and `-1` asks for as many as the server allows.

When the query's `subpath` is a folder that names its `csv_columns` (see [folders](/folders)), the file holds exactly those columns, each headed by its `name`. Otherwise the columns are `resource_type`, `shortname`, `subpath` and `uuid`, then the records' attributes in alphabetical order: `displayname` and `description` split by language (`displayname.en`), lists of text joined with `|`, and `payload` as one JSON cell. That cell holds an entry's body only when the request sets `retrieve_json_payload: true`. A saved query exported through `/managed/csv/{space}` always takes this second form. To load a CSV back, see `resources_from_csv` in the [API reference](/api-docs).

The file cannot say that it stopped short, so `POST /managed/csv?preview=1` answers, in `attributes`, what the CSV for the same body would hold: `exported`, `total`, `limit`, `truncated`, the `reason` it stops short (`max_query_limit`, `default_query_limit` or `limit`) and a `message`. `/managed/csv/{space}`, which also runs a saved query, takes `?preview=1` too.

## Aggregation `type:"aggregation"`

When `type` is `aggregation` (over the `entries` table) or `attachments_aggregation` (over the `attachments` table), the query carries an `aggregation_data` object instead of returning raw entries. It compiles straight into a single SQL `SELECT … GROUP BY …`. The `search` string, if present, still runs — as the `WHERE` clause _before_ aggregation — and so do the caller's row filters and ACL denies, so the counts cover only what a listing would show.

Groups are paged like records: `limit` (by default `DEFAULT_QUERY_LIMIT`, 10) caps how many groups one response holds, and `total` is the number of groups in it. They come in no set order unless `sort_by` names a grouped field.

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

`group_by` is a list of column names or dotted paths (`payload.body.status`, `displayname.en`); a leading `@` is optional and stripped. A column the API never returns (see _Field selectors_) is skipped, as a group-by and as a reducer argument. `reducers` is a list of aggregate specs. (A third field, `load`, is accepted for wire-compat with upstream but the SQL builder derives its columns from `group_by` + `reducers` only — `load` is effectively a no-op here.)

### The `reducers[]` item shape

```json
{ "reducer_name": "quantile", "args": ["@payload.body.price", "0.9"], "alias": "p90" }
```

- `reducer_name` — one of the functions in the table below (case-insensitive).

- `args` — positional arguments. `args[0]` is the target field (column or dotted `payload.*` path; a leading `@` is stripped). A missing `args[0]` is only valid for `count` / `count_distinct` (which fall back to `*`); every other reducer with no field is dropped from the SELECT.

- `alias` — the output attribute key. When omitted, the `reducer_name` itself is used. Aliases and group-by keys are sanitised to `[a-zA-Z0-9_]`: `@` is dropped, `.` and any other character become `_`, and a leading digit gets an `a_` prefix. So `@payload.body.status` surfaces under the key `payload_body_status`.

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

On SQLite, `stddev`, `quantile`, `first_value` and `random_sample` are not available and answer `400`; the others work on both engines. On a dotted path, `min` and `max` compare numbers as numbers (9 below 10) and rank numbers below text, on both engines.

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
      "subpath": "orders",
      "attributes": { "payload_body_status": "paid", "orders": 128, "avg_total": 57.4 }
    },
    {
      "resource_type": "content",
      "shortname": "aggregation",
      "subpath": "orders",
      "attributes": { "payload_body_status": "pending", "orders": 34, "avg_total": 41.2 }
    }
  ],
  "attributes": { "total": 2, "returned": 2 }
}
```

Counts come back as JSON integers. `sum`, `avg`, `stddev` and `quantile` come back as JSON numbers without trailing zeros (`22.5`, `90`); on PostgreSQL `sum`, `avg` and `stddev` are exact decimals. A group key or aggregate that is SQL `NULL` (rows without the field, an `avg` over no numbers) is left out of `attributes`.

### `attachments_aggregation`

Identical grammar, but the `FROM` table is `attachments` instead of `entries` — use it to aggregate over attachments (media / comments / relationships / …) hanging off a parent subpath. It counts the attachments an `attachments` listing would list: those whose parent record the caller could list, of the attachment types the caller's grants read. Example: count attachments per content-type across a subpath.

```json
{
  "type": "attachments_aggregation",
  "space_name": "shop",
  "subpath": "orders",
  "aggregation_data": {
    "group_by": ["@payload.content_type"],
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

- `join_on` — a comma-separated list of `left:right` field pairs. `left` is a path on the **base** record, `right` a path on the joined (sub-query) record: `shortname`, `subpath`, `uuid`, `resource_type`, another attribute, or a payload path. An array value matches on its elements, with or without a trailing `[]` (e.g. `payload.body.tags[]:shortname`), and a `[]` inside a path visits each element at any depth (`payload.body.tiles[].shortname:shortname`). Multiple pairs (comma-separated) must all match. A payload key works without `retrieve_json_payload`: the body is fetched for the join and still left out of the response unless that side asked for it.

- `alias` — the key under which matches are attached. Each base record gains `attributes.join.{alias}` — a list of the matched sub-query records (empty list when nothing matched).

- `type` — a `JoinType`: `left` (default), `right`, `inner`, or `outer`. A missing or `null` type is treated as `left`. A right record that no base record matched, appended by `right` or `outer`, carries `attributes.join._join_origin: "right"`.

- `query` — a nested `Query` object (same schema, recursively) describing the right-hand side to pull and match against. Its `limit` caps the matches attached to **each base record**; without one, every match attaches, up to the pull cap below.

A join that cannot run (a blank `alias`, a `join_on` that is not `left:right` pairs, a `query` that is not a valid query object) fails the whole query with `INVALID_DATA`, and a sub-query that fails on its own fails the query as it would alone. Neither answers with the base rows un-joined.

**Pagination semantics.** A `left` join is cardinality-preserving — the base page is fetched normally, then matches are attached. A cardinality-_changing_ join (`inner`, `right`, or `outer`) can drop or append rows, so the server fetches the base set **unpaginated** (offset 0, capped at `MAX_QUERY_LIMIT`), performs the join over the whole set, then **re-paginates the joined result** with your original `limit`/`offset`, with `total` as the joined count. In other words: `inner`/`right`/`outer` give you "join-then-page" semantics, bounded by the max-limit cap. When the base fetch or the right-hand pull comes back full, the response says `total_is_lower_bound: true`.

`right`/`outer` joins are O(right-table-size) by design (they must surface right records the base set never referenced). The pull of right-hand records is capped at `MAX_QUERY_LIMIT` rows; matches past the cap are missing, and the server logs a warning. Pair them with a selective `query.search` to keep them fast.

With `ENABLE_INNER_JOIN_PUSHDOWN` on (the default), an eligible `inner` join is pushed into SQL as an `EXISTS` semi-join instead, so the base query pages and counts in the database. It is eligible when both sides are entries queries, every pair is plain (`shortname`, `subpath`, `uuid`, `resource_type` or a payload path, no `[]`), and the request has no `right` or `outer` join.

A worked example — orders with their customer attached:

```json
{
  "type": "subpath",
  "space_name": "shop",
  "subpath": "orders",
  "limit": 10,
  "retrieve_json_payload": true,
  "join": [
    {
      "join_on": "payload.body.customer:shortname",
      "alias": "customer",
      "type": "inner",
      "query": { "type": "subpath", "space_name": "shop", "subpath": "customers",
                 "retrieve_json_payload": true }
    }
  ]
}
```

A matched base record comes back like:

```json
{
  "resource_type": "content",
  "shortname": "order_1001",
  "subpath": "orders",
  "attributes": {
    "payload": { "body": { "customer": "acme", "total": 57.4 } },
    "join": {
      "customer": [
        { "resource_type": "content", "shortname": "acme", "subpath": "customers",
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
  "retrieve_json_payload": true,
  "jq_filter": ".attributes.payload.body"
}
```

The filter above projects each record down to just its payload body, so `records` becomes a flat list of body objects. (The server wraps it as `map(.attributes.payload.body)` — do not include your own `map(…)` or a leading `.records`; the input to your filter is already a single record.)

**Bounds & safety.**

- Runs only on a **successful** result set with a non-null `records`; otherwise it is a no-op.

- Subprocess timeout is `JQ_TIMEOUT` seconds (config key, default `2`). A timeout returns a `JQ_TIMEOUT` failure envelope; a jq syntax/runtime error returns `JQ_ERROR`.

- The filter is capped at **1024 characters** and rejected if it references dangerous builtins (`env`, `$ENV`, `input`, `inputs`, `input_filename`, `input_line_number`, `debug`, `stderr`, `path(`, `getpath`, `halt`, `halt_error`, `builtins`, `modulemeta`, `$__loc__`) or starts with an `import` or `include` directive.

- At most `JQ_MAX_CONCURRENCY` (default 4) `jq` processes run at once; a request that waits longer than `JQ_QUEUE_TIMEOUT_SECONDS` (default 5) for one gets a retryable `JQ_TIMEOUT`. Output past 32 MB is a `JQ_ERROR`.

- `jq` must be on `PATH` (the RPM/container declares it as a dependency); if it is missing the filter fails cleanly rather than crashing the request.

A `jq_filter` may also be set on a join's nested `query`, where it reshapes that join's matched list (wrapped as `map([ <filter> ])` for per-base alignment) before attachment.

## `history` & `events` queries

These two query types do not use the `search` DSL (see the table at the top) and instead read audit trails. Both show a change only where the caller could list the record it belongs to now, under its grants' conditions, row filters and ACL; the history of an attachment also needs a grant on the attachment's own type.

### `history`

Reads the per-entry change log from the `histories` table. A request with no caller at all is refused; on `/public/query` the anonymous user is checked like anyone else. Narrow it with `filter_shortnames` to a specific entry, and with `from_date` / `to_date` on the change's time. It reads the `subpath` and everything below it, whatever `exact_subpath` says, newest change first:

```json
{
  "type": "history",
  "space_name": "shop",
  "subpath": "orders",
  "filter_shortnames": ["note1"],
  "limit": 20
}
```

Each record has `resource_type: history` and the changed record's `shortname` and `subpath`, and carries in `attributes` `owner_shortname` (who made the change), `timestamp`, `diff` and `last_checksum_history`. It carries no request headers.

`diff` maps each changed field to its `old` and `new` value. Its keys are dotted paths: `is_active`, `displayname.en`, `payload.body.title`. An array is stored and compared whole, so a change to one element shows the whole old and new array. A `password` key, or one ending in `.password`, reads `********` on both sides. The row an entry's create writes lists the fields it set, each with `old: null`, without the body; a CSV import writes none.

### `events`

Reads the append-only space event feed (`events.jsonl` under the space, written when `SPACES_FOLDER` is set; past `EVENTS_LOG_MAX_BYTES`, 50 MiB by default, it rolls over and one previous file is kept and read). It needs a signed-in caller: on `/public/query` it answers `NOT_AUTHENTICATED`. It is filtered by `subpath` (and below it, unless `exact_subpath`), by `from_date` / `to_date`, and by `search` as a plain, case-sensitive substring of each raw line, and paged — `filter_shortnames` and `filter_types` are **ignored**. Default sort is newest-first.

An event carries what its record held, so a caller other than a global admin sees an event only for a record it could list now, matched by uuid: not one deleted, moved away or replaced under the same name since. Such callers get each event without its `request_headers`.

```json
{
  "type": "events",
  "space_name": "shop",
  "subpath": "/",
  "limit": 50
}
```

If the space has no event log, the events feed is simply empty — there is no database fallback (parity with upstream).

Looking for natural-language / vector search instead of the `search` DSL? That is a separate endpoint — `POST /managed/semantic-search` (pgvector cosine similarity), documented in the [API reference](/api-docs). It does not use the `search` string or any of the query types above.

## Quick reference

| Token | Meaning |
|---|---|
| `word` | plain word: whole or partial words in entry values, spelling-corrected, best match first |
| `@field:value` | exact match (column or jsonb path) |
| `@field:"v with spaces"` | quoted value |
| `@field:true` / `:false` | boolean compare |
| `@field:42` / `:3.14` | numeric compare; on a payload path also `"42"` and arrays holding it |
| `@field:*` | exists / IS NOT NULL |
| `-@field:*` | missing / IS NULL |
| `@payload.x:null` | payload key missing or JSON null |
| `@col:abc*` | glob (column-level ILIKE) |
| `@subpath:/a/*` | every row below the folder `/a` |
| `@payload.x.*:v` | substring search over the cast-to-text subtree |
| `@payload.body.arr[]:v` | EXISTS — primitive-array element equals `v` |
| `@payload.body.arr[].x:v` | EXISTS — object-array element's `x` equals `v` |
| `@field:v1\|v2` | OR-list |
| `@field:[a b]` | range (space or comma separator) |
| `@field:>n` `@field:>=n` `@field:<n` `@field:<=n` | comparisons (numbers or ISO dates) |
| `@field:!v` | not equal |
| `-@field:value` | negation (every form above but a column glob) |
| `A B` / `(A B) (C)` | AND (whitespace, between groups too) |
| `A or B` | OR; AND binds tighter |
| `and` | no-op keyword, ignored |
| `@tags:x` `@roles:x` `@groups:x` | jsonb array containment (`roles`, `groups`: users) |
| `@query_policies:pat:*` | TEXT[] ILIKE pattern (unnest) |
| `@created_at:[ms ms]` | timestamp range, numeric = Unix milliseconds |
| `@created_at:[iso,iso]` | timestamp range, ISO strings |

## Limitations

The search language deliberately does **not** support:

- Regular expressions.

- Phrase / proximity operators.

- **Indexed** access into JSON arrays (`@payload.body.items[0].name`). Use `@payload.body.items[].name:value` to match _any_ element instead.

- **Nested** array iteration. Only the first `[]` in a path is treated as iteration — subsequent `[]` segments are interpreted as literal key names. `@payload.body.a[].b[].c:v` does **not** double-iterate.

It also has hard bounds: a search of more than 65,536 characters, the caller's row filters included, matches nothing, and parentheses nested more than 100 deep are a `400`.

For semantic / vector search, use the separate `POST /managed/semantic-search` endpoint — it is **not** part of the `search` string.

For free-form SQL or stored queries, use saved-query / `aggregation` flows; raw SQL is never accepted in the `search` field.
