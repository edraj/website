A technical overview of the entity lifecycle within DMART. Entities are the fundamental units of data storage and management, defined by a common structure that includes metadata and a payload.

## Core Structure

Every entity consists of two main parts:

**Meta** System-level metadata: UUID, shortname, ownership, timestamps, and access control lists (ACLs).

**Payload** The actual content body, along with its type (JSON, Markdown, Image) and schema reference.

### Meta Structure

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "shortname": "unique_entity_id",
  "slug": "user-friendly-slug",
  "is_active": true,
  "displayname": {
    "en": "Entity Name",
    "ar": "اسم الكيان",
    "ku": "Navê Heyber"
  },
  "description": {
    "en": "Description here",
    "ar": "الوصف هنا"
  },
  "tags": ["tag1", "tag2"],
  "created_at": "2026-07-06T10:00:00",
  "updated_at": "2026-07-06T10:00:00",
  "owner_shortname": "admin_user",
  "owner_group_shortname": "editors",
  "payload": {
    "content_type": "json",
    "schema_shortname": "custom_schema",
    "body": { "key": "value" }
  }
}
```

## Creating & Managing Entities

Entities are managed through the REST API — the single runtime path for all create, read, update, and delete operations. Every entity is persisted to the database — **PostgreSQL or SQLite** — which is the sole source of truth. The same entities can also be exported to (and imported from) the `.dm` JSON file layout for backup, migration, and seeding.

### 1. Via REST API

The primary endpoint for CRUD operations is `POST /managed/request`. It accepts a batch of records and an action type.

```json
{
  "space_name": "data",
  "request_type": "create",
  "records": [
    {
      "resource_type": "content",
      "shortname": "my_new_article",
      "subpath": "/articles",
      "attributes": {
        "is_active": true,
        "displayname": { "en": "My New Article" },
        "payload": {
          "content_type": "markdown",
          "body": "# Hello World"
        }
      }
    }
  ]
}
```

#### Supported Request Types

| Type | Description |
|---|---|
| `create` | Create new entities |
| `update` | Update existing entities (partial or full) |
| `delete` | Remove entities |
| `move` | Move entities to a different space or subpath, or rename them |
| `assign` | Change an entry's owner (`owner_shortname`), and nothing else |
| `update_acl` | Modify Access Control Lists |
| `patch` | Same handling as `update` |

`/managed/request` sends spaces, users, roles, groups and permissions to their own tables, and attachments to theirs. The other write paths write entries only: MCP `dmart_create` and `dmart_update` and `/managed/resources_from_csv` refuse a `space`, `user`, `role`, `group` or `permission` record, and the attachment types, with `NOT_SUPPORTED_TYPE` (217), the CSV import once for the whole file; `/managed/resource_with_payload` takes entries and attachments, and refuses the others before it reads the file. A row stored in `entries` under one of those types, written before these checks, is not updated or moved by a request that declares it `content`: once the caller is admitted on its real type, the answer is `NOT_SUPPORTED_TYPE` (217). It can still be deleted.

#### What a create stores

- **The owner is the caller.** An `owner_shortname` in the attributes is ignored; `assign` changes the owner afterwards.
- **`owner_group_shortname`** may name only a group the creator belongs to; any other needs `assign` at the record's address, or the create is refused with `NOT_ALLOWED`.
- **`collaborators`** keeps only string values.
- **`is_active`** is `true` unless the request sets it to `false`.
- **`uuid`** may be supplied by the client; otherwise dmart generates one.
- **`content_type`**, when missing or not recognised, becomes `json`.
- **The shortname `auto`** becomes the first 8 hex digits of a new UUID, which is also the record's `uuid`. On the rare clash with a taken name, dmart draws again, up to 5 times.

#### What an update changes

An `update` changes only what it names, and `patch` is handled exactly the same way. For an entry:

- **`payload.body` is deep-merged** into the stored body. A key sent as `null` is removed. An array, or any value that is not an object, replaces what was there, and so does a body that is not an object (Markdown text, say). `schema_shortname` and `content_type`, when sent, replace the stored ones, and the merged body is checked against the schema.
- **Omitted attributes are kept.** An explicit `null` clears a field such as `slug`, `state` or `relationships`, and `tags: null` becomes `[]`. On a ticket with a workflow, `state`, `is_open`, `resolution_reason` and `workflow_shortname` change only through progress-ticket, and an update that puts a ticket on a workflow starts it at the workflow's initial state (see [Tickets](/tickets#advancing-a-ticket-progress-ticket)).
- **`displayname` and `description` merge per language:** `{"ar": "…"}` changes only the Arabic text. A plain string is stored as `en`, and drops the other languages.
- **`relationships` is replaced** as a whole list. To add one link, send the full list.
- **`collaborators` is replaced** as a whole map, as `relationships` is: send every key you want kept. A record that does not name it keeps the stored map, and `"collaborators": null` or `{}` clears it. Values that are not strings are dropped. The grant's field limits judge the map as it lands: a stored key the update leaves out counts as written, and as set to null, and `{}` counts as a write of `collaborators`. Each change is written to the history, one key per collaborator (`collaborators.processed_by`). The map grants no access of its own.
- **`owner_shortname` and `acl` are ignored;** use `assign` and `update_acl`. `owner_group_shortname` and `reporter` never change after the entry is created.

An attachment's update differs. A `payload` it sends replaces the whole stored payload. It accepts `acl`, which may hold only actions the writer holds itself. It changes `owner_group_shortname` when the caller also holds `assign` on the attachment.

#### What a write goes through

Every create or update of an entry passes the same gates, in this order; the first that fails refuses the record:

1. **Names** — on a create, `space_name`, `subpath` and `shortname` must match their patterns.

2. **Permission** — the caller's roles, or the entry's ACL, must allow the action. A grant with a row filter admits only the records its filter covers, and when only such grants admit a create or update, the record it leaves must pass one of their filters (`NOT_ALLOWED` otherwise; see [Row filters](/access-control#row-filters)).

3. **Address & lock** — a create needs a shortname not yet taken in the folder (`SHORTNAME_ALREADY_EXIST`), even by a record the caller cannot see; an update is refused (`LOCKED_ENTRY`) while another user holds a lock on the entry. A create only ever inserts: one that loses a race for the name to another also gets `SHORTNAME_ALREADY_EXIST`, and the first row stays as it was written. Imports, restores and the built-in `resource_folders_creation` plugin write over an existing row.

4. **ACL** — a new or changed ACL may grant or deny only actions the writer itself holds through its roles.

5. **Schema** — the body must validate against the schema `payload.schema_shortname` names (see [Data Model](/data-model)).

6. **Relationships** — each relationship the write adds must point at a record that exists and that the caller may read: an entry, or a user, role, group, permission or space, looked up by shortname in its own table. One the caller cannot read is refused as a missing one is: "relationship target not found" (`INVALID_DATA`).

7. **Folder rules** — the parent folder's `unique_fields` and content policy (see [Folders](/folders)).

8. **Plugins** — before-hooks run and may veto the write.

The row is then written (a new ticket starting in its workflow's initial state), a history row records what changed, and the after-hooks run: live notifications go over the WebSocket to subscribers who may read the record, and, when `SPACES_FOLDER` is set, the action is appended to the space's event log, which the `events` query type reads, showing each caller only the events of records it could list. Users, roles, groups, permissions and spaces fire the same hooks; for them too, the before-hook runs only once every other check has passed, so a write refused by a check never reaches a plugin. See [Plugins](/plugins).

A write the caller may not make is refused in the same words whether or not its record exists. On a record that is not there, an update, patch, assign, update_acl, move or delete is judged on the address alone: a caller the address refuses gets `NOT_ALLOWED` ("no update access", "no move access", …), one it admits hears that the record is missing (`OBJECT_NOT_FOUND`, `SHORTNAME_DOES_NOT_EXIST`, or an empty success for a delete). A record refused for what is stored rather than for its address (hidden by the caller's row filters, denied to the caller by its ACL, or refused on its real type when the request names another) gets that same answer wherever the address alone would admit the write, if the caller cannot read the record; a caller that can read it is refused `NOT_ALLOWED`. Nothing of it changes either way. See [What a Refusal Says](/access-control#what-a-refusal-says).

#### Moving and renaming

A `move` names its destination in `attributes`: `dest_subpath` and `dest_shortname`, plus `dest_space_name` to change space. It needs `update` where the entry is and `create` where it goes, judged the same way whether or not the source is there, is blocked by another user's lock, and must satisfy the destination folder's content policy. A folder cannot be moved into itself or a folder beneath it (`INVALID_DATA`). The entry keeps its uuid and takes its attachments, locks and history along (a folder, its whole subtree), and one history row records the old and new location. The locks of records that do not move stay where they are, including those on records beneath the destination path. A ticket moved to another space where its workflow resolves, from one where it did not, starts at the workflow's initial state, open, as does every such ticket beneath a moved folder (see [Tickets](/tickets#advancing-a-ticket-progress-ticket)). A user can only be renamed; roles, groups, permissions and spaces cannot be moved.

**Renaming a user** is a `move` that keeps the space and subpath (`management`, `/users`) and changes only `dest_shortname`; any other destination is refused with `INVALID_DATA`.

```json
{
  "space_name": "management",
  "request_type": "move",
  "records": [
    {
      "resource_type": "user",
      "shortname": "jdoe",
      "subpath": "/users",
      "attributes": { "dest_subpath": "/users", "dest_shortname": "john_doe" }
    }
  ]
}
```

- **What follows the new name:** the account keeps its uuid, and everything it owns moves to the new name: entries, attachments, spaces, roles, groups, permissions and accounts, plus the user's own attachments, its locks and its record's history.
- **Sessions end,** so the user signs in again under the new name.
- **What is refused:** `dmart` and `anonymous` cannot be renamed, nor can a deleted account. A name already in use fails with `SHORTNAME_ALREADY_EXIST`. A move to the same name succeeds and changes nothing.
- **What is not rewritten:** ACL entries, `collaborators` and relationships that name the old shortname, and the authorship of history rows the user wrote.

#### Cascade Delete: `force` & `dry_run`

Two request-level flags (siblings of `request_type`, applied only to `delete`) control how far a delete reaches. `force: true` cascades — it removes a folder together with everything it contains, or a user together with what it owns (see [Deleting a user](#deleting-a-user)). Without it, a folder that still holds entries is refused (`CANNT_DELETE`). `dry_run: true` removes **nothing**: it counts what the same delete would remove, writes and locks nothing, runs no plugin hooks, and reports that projected blast radius instead.

```json
{
  "space_name": "s",
  "request_type": "delete",
  "force": true,
  "dry_run": true,
  "records": [
    {
      "resource_type": "folder",
      "shortname": "f",
      "subpath": "/"
    }
  ]
}
```

Each deleted record comes back annotated with an `affected` total plus a per-category `report`. On a dry run `dry_run: true` is echoed and the numbers are a projection of what a real delete would remove:

```json
{
  "resource_type": "folder",
  "shortname": "f",
  "subpath": "/",
  "attributes": {
    "affected": 42,
    "report": {
      "entries": 30,
      "attachments": 9,
      "histories": 3,
      "locks": 0
    },
    "dry_run": true
  }
}
```

A single entry's delete takes with it, in one transaction, its attachments, the history rows of the entry and of those attachments, and a lock at its address; an attachment's delete takes its own history rows and a lock at its address. A record created later at the same address starts with no history and no lock. The entries, attachments and history rows removed are recorded as deletions for incremental exports (`--since`), and the report counts each kind, locks included, on a dry run too. A lock held by another user blocks a delete as it blocks an update. Deleting an entry that other entries still link to through `relationships` is refused (`CANNT_DELETE`), naming the first one to a caller that may read it; any other caller hears "entry has incoming relationships from another record". Deleting a space removes everything in it, `force` or not; the `management` space cannot be deleted. Before and after a real delete, the plugins' hooks run as for any write, and a before-hook may veto it. A delete that removes nothing (the record is not there, or is hidden from the caller) fires no after-hook, so the audit log, the events feed and realtime listeners hear of no deletion.

#### Deleting a user

How a user is deleted depends on `USER_DELETION_MODE` (see [Settings](/settings)). In the default `soft` mode the user row is kept, marked deleted and stripped of its contacts and password, and nothing the user owns is touched, so `force` has no effect. A soft delete cannot be undone:

- **The account is closed.** It cannot sign in (it gets the same `INVALID_USERNAME_AND_PASS`, code 10, as an unknown name), refresh a token, or be edited or renamed. Its sessions end at once.
- **It leaves the user listings and counts,** but exports and uniqueness checks still see the row.
- **Its mailbox and aliases are freed** for other accounts, as its email and phone number are.
- **A create under the same shortname makes a new account,** with a new uuid and only what that create gives it. Records the old account owned still name that shortname, so they belong to the new account.

In `hard` mode the user row is removed, with records the user owns, as below. A user who owns the `management` space cannot be hard-deleted at all (`CANNT_DELETE`).

**An admin's delete.** A plain `delete` of a user that owns records (entries, attachments, spaces, roles, groups, permissions or accounts) is refused (`CANNT_DELETE`); with `force: true` it needs a global admin, and then removes, in one transaction:

- **What the user owns:** every entry, with every attachment at or beneath it whoever owns that, the history of each and the lock on it; the user's own attachments elsewhere, with their history.
- **What hangs on the account:** every lock the user holds, the account's own history, and its sessions.

It keeps:

- **Others' folders:** a folder of the user's that holds an entry another account owns, anywhere beneath it, stays where it is and passes to `dmart`, as do the spaces, roles, groups, permissions and accounts the user owns.
- **The history the user wrote** on every record that stays: another user's entry it edited, a folder kept above, a role passed to `dmart`. History follows its record, not its author.

The history it removes is recorded as deletions for incremental exports, as the entries and attachments are. `dry_run: true` counts every row the delete would remove, by kind, and removes none; drop `dry_run` (or set it to `false`) to commit the cascade.

**A user deleting themself.** `POST /user/delete` in `hard` mode takes only what the account may delete itself. Each entry and attachment it owns (the ones it created and the ones assigned to it) is judged as a `delete` request from the account would be: the record's ACL, the account's roles and permissions with their conditions (such as `own`) and row filters, and global admin. It also keeps what such a request would refuse:

- **an owned entry another account holds a live lock on;**
- **an entry that a record staying behind points at** through `relationships`;
- **a folder with an entry in it that stays,** whoever owns that entry.

Its own records that point at each other, and a folder of only its own entries, go together. Each entry taken goes with every attachment at or beneath it, whoever owns it, and each record taken goes with its whole history; the history the account wrote on records that stay is kept, and its locks are released. When nothing it owns is left, the account is removed as an admin's delete removes it. When records are left, they still name it as their owner, so the account is soft-deleted exactly as `soft` mode does it, and the answer says so:

```json
{
  "status": "success",
  "attributes": {
    "soft_deleted": true,
    "records_kept": 2,
    "message": "2 record(s) you own and may not delete were kept, so the account was marked deleted instead of removed"
  }
}
```

#### Reassigning Ownership: `assign`

The `assign` request type transfers an entry's owner to another user, and changes nothing else. `owner_shortname` is required in `attributes` (`MISSING_DATA` without it) and the target user must already exist (`OBJECT_NOT_FOUND`), looked up only once the caller's `assign` on the entry has been checked. Any other attribute in the record, a `collaborators` map included, is ignored; collaborators change through an `update`. The permission check uses the dedicated `assign` action (not `update`), so an admin can grant "edit but not transfer ownership" separately, and another user's lock does not block it. `assign` reaches entries only: an attachment's owner does not change, and its owner group changes through an `update` by a caller who holds `assign`.

```json
{
  "space_name": "data",
  "request_type": "assign",
  "records": [
    {
      "resource_type": "content",
      "shortname": "my_new_article",
      "subpath": "/articles",
      "attributes": {
        "owner_shortname": "alice"
      }
    }
  ]
}
```

#### Per-Entry ACLs: `update_acl`

The `update_acl` request type sets the per-entry access control list from `attributes.acl`. Each ACL entry names a `user_shortname`, the list of `allowed_actions` that user may take on this specific entry, and optionally a `denied` list of actions refused to that user whatever their roles allow — checked before the role/permission model. A `query` or `view` deny also leaves the entry out of that user's listings. The writer may grant or deny only actions it holds itself through its roles, unless it is a global admin.

```json
{
  "space_name": "data",
  "request_type": "update_acl",
  "records": [
    {
      "resource_type": "content",
      "shortname": "my_new_article",
      "subpath": "/articles",
      "attributes": {
        "acl": [
          {
            "user_shortname": "bob",
            "allowed_actions": ["view", "update"]
          }
        ]
      }
    }
  ]
}
```

### 2. Export & Import (Backup / Migration / Seeding)

Entities live in the database at runtime, but they can be round-tripped to and from a portable `.dm` JSON file layout via the CLI (`export`, `import`, `seed`), or, for a global admin, over HTTP (`/managed/export`, `/managed/import`). This zip-based format mirrors each entity as a `meta.<type>.json` file and is used for backups, migrations, and seeding sample data — it is **not** a live editing mode; the database always remains the source of truth.

```
spaces/
├── space_name/
│   ├── subpath/
│   │   ├── .dm/
│   │   │   ├── entity_shortname/
│   │   │   │   ├── meta.content.json
│   │   │   │   └── history.jsonl
│   │   └── entity_shortname.json
```

**Each exported entity is represented by:**

1. The directory structure for its space and subpath

2. A `meta.<type>.json` file with its metadata

3. (Optional) A separate payload file when the body is externalized

4. (Optional) Its history in `history.jsonl`, and its attachments under `attachments.<type>/`

**A space or one folder.** `dmart export <space>` writes the whole space, including the space's own record (`.dm/meta.space.json`). `--subpath <path>` writes one folder: its own record and everything below it, but not the space's record. A folder's archive therefore imports only where its space already exists; rows of a missing space are refused and reported once per space (`"kind": "space-missing"`). `dmart import` skips rows that already exist unless `-r` (`--replace`) is given. `/managed/import` replaces them instead: each existing row is overwritten from the archive, its owner included.

**Files in a zip.** A zip export stores an attachment's file only when its `payload.body` is the attachment's own file name, `<shortname>.<ext>`, as an upload sets it. Otherwise the zip carries the attachment's metadata without the bytes, and the export logs a warning that names it and suggests `--parquet`. A Parquet export stores every attachment's bytes, by hash.

**Parquet.** For large installations, `dmart export <space> --parquet [--subpath <path>]` writes a columnar archive directory instead of a zip: the space's (or folder's) entries, attachments and history, plus spaces, users, groups, roles and permissions when the space is `management`. `dmart export --all --parquet` is the full backup — every space, plus users, groups, roles and permissions — and re-reads what it wrote to verify it. `dmart import <dir> --parquet` restores either. A space or folder archive carries no space record, so it restores only where its space exists: rows of a missing space are refused, and the command exits 1.

```
manifest.json
entries/space_name=<s>/part-00000.parquet
attachments/space_name=<s>/part-00000.parquet
histories/space_name=<s>/part-00000.parquet
spaces/part-00000.parquet         (also users/, roles/, groups/, permissions/)
deletions/part-00000.parquet      (incremental exports, --since, only)
blobs/<sha256[0:2]>/<sha256>      (attachment files, one per distinct hash)
```

The `space_name=<s>` directories are Hive-style partitions, so DuckDB or Spark read the archive as it is: `read_parquet('entries/**/*.parquet', hive_partitioning=true)`.

## Types of Records

DMART supports various resource types, each serving a specific purpose:

**Core** `space`, `folder`, `user`, `group`, `role`, `permission`

**Data** `content`, `schema`, `json`, `data_asset`, `media`

**Social** `post`, `comment`, `reaction`, `share`

**Workflow** `ticket`

**System** `log`, `notification`, `plugin_wrapper`, `history`

**Big Data** `parquet`, `csv`, `jsonl`, `sqlite`

The full list of 30 is in the [Data Model](/data-model) catalog.

## Management Space

The `management` space is reserved for system-critical entities. Security primitives are stored in specific subpaths; an export of the management space writes users, groups, roles and permissions at these paths:

| Entity | Path |
|---|---|
| **Users** | `management/users/.dm/<username>/meta.user.json` |
| **Groups** | `management/groups/.dm/<groupname>/meta.group.json` |
| **Roles** | `management/roles/.dm/<rolename>/meta.role.json` |
| **Permissions** | `management/permissions/.dm/<permname>/meta.permission.json` |

### Role Example

Defines a collection of permissions.

```json
{
  "resource_type": "role",
  "shortname": "editor",
  "is_active": true,
  "permissions": ["read_all", "write_content"]
}
```

### Permission Example

Defines granular access controls (Actions, Conditions, Restrictions).

```json
{
  "resource_type": "permission",
  "shortname": "write_content",
  "subpaths": {
    "data": ["/articles", "/news"]
  },
  "resource_types": ["content", "media"],
  "actions": ["create", "update", "view"],
  "conditions": ["is_active", "own"],
  "restricted_fields": ["owner_shortname"],
  "allowed_fields_values": {}
}
```

### Group Example

A named set of users. Groups carry no roles; a user's access comes from the roles on the user. A group's members share ownership of entries whose `owner_group_shortname` names it.

```json
{
  "resource_type": "group",
  "shortname": "editors_group",
  "displayname": { "en": "Editors" }
}
```
