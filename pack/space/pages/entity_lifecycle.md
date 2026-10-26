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
| `assign` | Change ownership or group assignment |
| `update_acl` | Modify Access Control Lists |
| `patch` | Same handling as `update` |

#### What a write goes through

Every create or update of an entry passes the same gates, in this order; the first that fails refuses the record:

1. **Names** — on a create, `space_name`, `subpath` and `shortname` must match their patterns.

2. **Permission** — the caller's roles, or the entry's ACL, must allow the action.

3. **Address & lock** — a create needs a shortname not yet taken in the folder (`SHORTNAME_ALREADY_EXIST`); an update is refused (`LOCKED_ENTRY`) while another user holds a lock on the entry.

4. **ACL** — a new or changed ACL may grant or deny only actions the writer itself holds through its roles.

5. **Schema** — the body must validate against the schema `payload.schema_shortname` names (see [Data Model](/data-model)).

6. **Relationships** — each relationship the write adds must point at an entry that exists (links to users, roles, permissions and spaces are not checked).

7. **Folder rules** — the parent folder's `unique_fields` and content policy (see [Folders](/folders)).

8. **Plugins** — before-hooks run and may veto the write.

The row is then written (a new ticket starting in its workflow's initial state), a history row records what changed, and the after-hooks run: live notifications go over the WebSocket to subscribers who may read the record, and, when `SPACES_FOLDER` is set, the action is appended to the space's event log, which the `events` query type reads, showing each caller only the events of records it could list. Users, roles, groups, permissions and spaces fire the same hooks. See [Plugins](/plugins).

A `move` names its destination in `attributes`: `dest_subpath` and `dest_shortname`, plus `dest_space_name` to change space. It needs `update` where the entry is and `create` where it goes, is blocked by another user's lock, and must satisfy the destination folder's content policy. The entry keeps its uuid and takes its attachments, locks and history along (a folder, its whole subtree), and one history row records the old and new location. A user can only be renamed; roles, groups, permissions and spaces cannot be moved.

#### Cascade Delete: `force` & `dry_run`

Two request-level flags (siblings of `request_type`, applied only to `delete`) control how far a delete reaches. `force: true` cascades — it removes a folder (or a user) together with everything it contains / owns. Without it, a folder that still holds entries is refused (`CANNT_DELETE`). `dry_run: true` removes **nothing**: it counts what the same delete would remove, writes and locks nothing, runs no plugin hooks, and reports that projected blast radius instead.

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

A single entry's delete takes its attachments with it; its history rows stay. A lock held by another user blocks a delete as it blocks an update. Deleting an entry that other entries still link to through `relationships` is refused (`CANNT_DELETE`), naming the first one. Deleting a space removes everything in it, `force` or not; the `management` space cannot be deleted. Before and after a real delete, the plugins' hooks run as for any write, and a before-hook may veto it.

How a user is deleted depends on `USER_DELETION_MODE`. In the default `soft` mode the user row is kept, marked deleted and stripped of its contacts and password, and nothing the user owns is touched, so `force` has no effect. In `hard` mode a plain delete of a user that owns records is rejected — you must pass `force: true` to delete the user together with the entries and attachments they own, those entries' history and locks, and the history rows and locks the user wrote; the spaces, roles, groups, permissions and accounts they own pass to `dmart` instead. A user who owns the `management` space cannot be hard-deleted at all. Drop `dry_run` (or set it to `false`) to actually commit the cascade.

#### Reassigning Ownership: `assign`

The `assign` request type transfers an entry's owner to another user. `owner_shortname` is required in `attributes` and the target user must already exist; an optional `collaborators` map records additional assignees. The permission check uses the dedicated `assign` action (not `update`), so an admin can grant "edit but not transfer ownership" separately.

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
        "owner_shortname": "alice",
        "collaborators": { "reviewer": "carol" }
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

**A space or one folder.** `dmart export <space>` writes the whole space, including the space's own record (`.dm/meta.space.json`). `--subpath <path>` writes one folder: its own record and everything below it, but not the space's record. A folder's archive therefore imports only where its space already exists; rows of a missing space are refused and reported once per space (`"kind": "space-missing"`). An import skips rows that already exist unless `-r` (`--replace`) is given.

**Parquet.** For large installations, `dmart export <space> --parquet [--subpath <path>]` writes a columnar archive directory instead of a zip: the space's (or folder's) entries, attachments and history, plus spaces, users, roles and permissions when the space is `management`. `dmart export --all --parquet` is the full backup — every space, plus users, roles and permissions — and re-reads what it wrote to verify it. `dmart import <dir> --parquet` restores either. A space or folder archive carries no space record, so it restores only where its space exists: rows of a missing space are refused, and the command exits 1.

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

The `management` space is reserved for system-critical entities. Security primitives are stored in specific subpaths; an export of the management space writes users, roles and permissions at these paths:

| Entity | Path |
|---|---|
| **Users** | `management/users/.dm/<username>/meta.user.json` |
| **Groups** | `management/groups` (not carried by exports) |
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
