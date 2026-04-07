<script lang="ts">
</script>

<div class="content">
    <h1>Entity Lifecycle &amp; Management</h1>
    <p class="intro">
        A technical overview of the entity lifecycle within D-MART. Entities are
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
  "created_at": "2023-10-27T10:00:00",
  "updated_at": "2023-10-27T10:00:00",
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
            Entities are primarily managed through the REST API. When D-MART is
            configured in <code>'file'</code> mode, they can also be managed directly
            via the file system.
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
        </div>

        <div class="step-section">
            <h3>2. Via File System ('file' mode only)</h3>
            <p>
                When using the <code>file</code> adapter (default), entities are
                stored as JSON files in the <code>spaces</code> directory.
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

            <p><strong>To create an entity manually:</strong></p>
            <ol>
                <li>Create the directory structure</li>
                <li>Add the <code>meta.&lt;type&gt;.json</code> file</li>
                <li>
                    (Optional) Add the payload file if the body is externalized
                </li>
            </ol>
        </div>

        <div class="step-section">
            <h3>3. Via SQL Database ('sql' mode)</h3>
            <p>
                When configured in <code>'sql'</code> mode, entities are stored in
                relational database tables. While direct SQL access is possible for
                administrative tasks, it is recommended to manage entities via the
                API to ensure data integrity and proper event triggering.
            </p>
        </div>
    </div>

    <!-- ═══ RESOURCE TYPES ═══ -->
    <div class="feature-section">
        <h2>Types of Records</h2>
        <p>
            D-MART supports various resource types, each serving a specific
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
                    <code>json</code>, <code>file</code>,
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
                    <code>sqlite</code>, <code>duckdb</code></span
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
