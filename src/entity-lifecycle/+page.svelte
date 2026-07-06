<script lang="ts">
</script>

<div class="content">
    <h1>Entity Lifecycle &amp; Management</h1>
    <p class="intro">
        A technical overview of the entity lifecycle within DMART. Entities are
        the fundamental units of data storage and management, defined by a
        common structure that includes metadata and a payload.
    </p>

    <!-- ═══ CORE STRUCTURE ═══ -->
    <div class="feature-section">
        <h2>Core Structure</h2>
        <p>Every entity consists of two main parts:</p>

        <div class="grid-list">
            <div class="item">
                <strong>Meta</strong>
                <span
                    >System-level metadata: UUID, shortname, ownership,
                    timestamps, and access control lists (ACLs).</span
                >
            </div>
            <div class="item">
                <strong>Payload</strong>
                <span
                    >The actual content body, along with its type (JSON,
                    Markdown, Image) and schema reference.</span
                >
            </div>
        </div>

        <h3>Meta Structure</h3>
        <div class="code-container">
            <pre><code
                    >{`{
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
}`}</code
                ></pre>
        </div>
    </div>

    <!-- ═══ CREATING ENTITIES ═══ -->
    <div class="feature-section">
        <h2>Creating &amp; Managing Entities</h2>
        <p>
            Entities are managed through the REST API — the single runtime path
            for all create, read, update, and delete operations. Every entity is
            persisted to <strong>PostgreSQL</strong>, which is the sole source of
            truth. The same entities can also be exported to (and imported from)
            the <code>.dm</code> JSON file layout for backup, migration, and
            seeding.
        </p>

        <div class="step-section">
            <h3>1. Via REST API</h3>
            <p>
                The primary endpoint for CRUD operations is <code
                    >POST /managed/request</code
                >. It accepts a batch of records and an action type.
            </p>

            <div class="code-container">
                <pre><code
                        >{`{
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
}`}</code
                    ></pre>
            </div>

            <h4>Supported Request Types</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            ><td><code>create</code></td><td
                                >Create new entities</td
                            ></tr
                        >
                        <tr
                            ><td><code>update</code></td><td
                                >Update existing entities (partial or full)</td
                            ></tr
                        >
                        <tr
                            ><td><code>delete</code></td><td>Remove entities</td
                            ></tr
                        >
                        <tr
                            ><td><code>move</code></td><td
                                >Move entities to a different space or subpath</td
                            ></tr
                        >
                        <tr
                            ><td><code>assign</code></td><td
                                >Change ownership or group assignment</td
                            ></tr
                        >
                        <tr
                            ><td><code>update_acl</code></td><td
                                >Modify Access Control Lists</td
                            ></tr
                        >
                        <tr
                            ><td><code>patch</code></td><td
                                >Patch specific fields</td
                            ></tr
                        >
                    </tbody>
                </table>
            </div>

            <h4>Cascade Delete: <code>force</code> &amp; <code>dry_run</code></h4>
            <p>
                Two request-level flags (siblings of <code>request_type</code>,
                applied only to <code>delete</code>) control how far a delete
                reaches. <code>force: true</code> cascades — it removes a folder
                (or a user) together with everything it contains / owns.
                <code>dry_run: true</code> removes <strong>nothing</strong>: it runs
                the same statements inside a transaction that is rolled back and
                reports the projected blast radius instead.
            </p>

            <div class="code-container">
                <pre><code
                        >{`{
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
}`}</code
                    ></pre>
            </div>

            <p>
                Each deleted record comes back annotated with an
                <code>affected</code> total plus a per-category <code>report</code>.
                On a dry run <code>dry_run: true</code> is echoed and the numbers
                are a projection of what a real delete would remove:
            </p>

            <div class="code-container">
                <pre><code
                        >{`{
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
}`}</code
                    ></pre>
            </div>

            <p class="code-note">
                A plain (non-<code>force</code>) delete of a user that has
                created records is rejected — you must pass
                <code>force: true</code> to delete the user and everything they
                own. A force-delete can never wipe the <code>management</code> space,
                even if the target user owns it. Drop <code>dry_run</code> (or set
                it to <code>false</code>) to actually commit the cascade.
            </p>

            <h4>Reassigning Ownership: <code>assign</code></h4>
            <p>
                The <code>assign</code> request type transfers an entry's owner
                to another user. <code>owner_shortname</code> is required in
                <code>attributes</code> and the target user must already exist;
                an optional <code>collaborators</code> map records additional
                assignees. The permission check uses the dedicated
                <code>assign</code> action (not <code>update</code>), so an admin
                can grant "edit but not transfer ownership" separately.
            </p>

            <div class="code-container">
                <pre><code
                        >{`{
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
}`}</code
                    ></pre>
            </div>

            <h4>Per-Entry ACLs: <code>update_acl</code></h4>
            <p>
                The <code>update_acl</code> request type sets the per-entry
                access control list from <code>attributes.acl</code>. Each ACL
                entry names a <code>user_shortname</code> and the list of
                <code>allowed_actions</code> that user may take on this specific
                entry — a per-entry grant layered on top of the role/permission
                model.
            </p>

            <div class="code-container">
                <pre><code
                        >{`{
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
}`}</code
                    ></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>2. Export &amp; Import (Backup / Migration / Seeding)</h3>
            <p>
                Entities live in PostgreSQL at runtime, but they can be
                round-tripped to and from a portable <code>.dm</code> JSON file
                layout via the CLI (<code>export</code>, <code>import</code>,
                <code>seed</code>, <code>migrate</code>). This zip-based format
                mirrors each entity as a <code>meta.&lt;type&gt;.json</code> file and
                is used for backups, migrations, and seeding sample data — it is
                <strong>not</strong> a live editing mode; the database always
                remains the source of truth.
            </p>

            <div class="code-container tree">
                <pre><code
                        >{`spaces/
├── space_name/
│   ├── subpath/
│   │   ├── .dm/
│   │   │   ├── entity_shortname/
│   │   │   │   ├── meta.content.json
│   │   │   │   └── history/
│   │   └── entity_shortname.json`}</code
                    ></pre>
            </div>

            <p><strong>Each exported entity is represented by:</strong></p>
            <ol>
                <li>The directory structure for its space and subpath</li>
                <li>A <code>meta.&lt;type&gt;.json</code> file with its metadata</li>
                <li>
                    (Optional) A separate payload file when the body is
                    externalized
                </li>
            </ol>
        </div>
    </div>

    <!-- ═══ RESOURCE TYPES ═══ -->
    <div class="feature-section">
        <h2>Types of Records</h2>
        <p>
            DMART supports various resource types, each serving a specific
            purpose:
        </p>

        <div class="grid-list types">
            <div class="item">
                <strong>Core</strong>
                <span
                    ><code>space</code>, <code>folder</code>, <code>user</code>,
                    <code>group</code>, <code>role</code>,
                    <code>permission</code></span
                >
            </div>
            <div class="item">
                <strong>Data</strong>
                <span
                    ><code>content</code>, <code>schema</code>,
                    <code>json</code>, <code>data_asset</code>,
                    <code>media</code></span
                >
            </div>
            <div class="item">
                <strong>Social</strong>
                <span
                    ><code>post</code>, <code>comment</code>,
                    <code>reaction</code>, <code>share</code></span
                >
            </div>
            <div class="item">
                <strong>Workflow</strong>
                <span><code>ticket</code></span>
            </div>
            <div class="item">
                <strong>System</strong>
                <span
                    ><code>log</code>, <code>notification</code>,
                    <code>plugin_wrapper</code>, <code>history</code></span
                >
            </div>
            <div class="item">
                <strong>Big Data</strong>
                <span
                    ><code>parquet</code>, <code>csv</code>, <code>jsonl</code>,
                    <code>sqlite</code></span
                >
            </div>
        </div>
    </div>

    <!-- ═══ MANAGEMENT SPACE ═══ -->
    <div class="feature-section">
        <h2>Management Space</h2>
        <p>
            The <code>management</code> space is reserved for system-critical entities.
            Security primitives are stored in specific subpaths:
        </p>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Entity</th>
                        <th>Path</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        ><td><strong>Users</strong></td><td
                            ><code
                                >management/users/.dm/&lt;username&gt;/meta.user.json</code
                            ></td
                        ></tr
                    >
                    <tr
                        ><td><strong>Groups</strong></td><td
                            ><code
                                >management/groups/.dm/&lt;groupname&gt;/meta.group.json</code
                            ></td
                        ></tr
                    >
                    <tr
                        ><td><strong>Roles</strong></td><td
                            ><code
                                >management/roles/.dm/&lt;rolename&gt;/meta.role.json</code
                            ></td
                        ></tr
                    >
                    <tr
                        ><td><strong>Permissions</strong></td><td
                            ><code
                                >management/permissions/.dm/&lt;permname&gt;/meta.permission.json</code
                            ></td
                        ></tr
                    >
                </tbody>
            </table>
        </div>

        <h3>Role Example</h3>
        <p class="code-note">Defines a collection of permissions.</p>
        <div class="code-container">
            <pre><code
                    >{`{
  "resource_type": "role",
  "shortname": "editor",
  "is_active": true,
  "permissions": ["read_all", "write_content"]
}`}</code
                ></pre>
        </div>

        <h3>Permission Example</h3>
        <p class="code-note">
            Defines granular access controls (Actions, Conditions,
            Restrictions).
        </p>
        <div class="code-container">
            <pre><code
                    >{`{
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
}`}</code
                ></pre>
        </div>

        <h3>Group Example</h3>
        <p class="code-note">Aggregates roles.</p>
        <div class="code-container">
            <pre><code
                    >{`{
  "resource_type": "group",
  "shortname": "editors_group",
  "roles": ["editor"]
}`}</code
                ></pre>
        </div>
    </div>
</div>

<style>
  .grid-list.types {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  .item span code {
    font-size: 0.8em;
  }
</style>
