<script lang="ts">
  import { useMermaid } from "../lib/mermaid";
</script>

<div class="content" use:useMermaid>
    <h1>Access Control</h1>
    <p class="intro">
        A deep technical overview of the DMART Access Control system. The
        system implements a hybrid model combining <strong
            >Role-Based Access Control (RBAC)</strong
        >
        for broad permissions and <strong>Access Control Lists (ACLs)</strong> for
        fine-grained, resource-specific overrides.
    </p>

    <!-- ═══ CORE ARCHITECTURE ═══ -->
    <div class="feature-section">
        <h2>Core Architecture</h2>
        <p>
            The access control logic is centralized in the <code
                >PermissionService</code
            >
            class. Data models are defined in <code>Dmart.Models.Core</code>.
        </p>

        <h3>Key Components</h3>
        <div class="grid-list">
            <div class="item">
                <strong>Permission</strong>
                <span
                    >The atomic unit of access. Defines <em>what</em> can be
                    done on <em>which</em> resources under <em>what</em> conditions.</span
                >
            </div>
            <div class="item">
                <strong>Role</strong>
                <span>A named collection of Permission shortnames.</span>
            </div>
            <div class="item">
                <strong>Group</strong>
                <span
                    >A named collection of Roles. Users are assigned to Groups.</span
                >
            </div>
            <div class="item">
                <strong>User</strong>
                <span
                    >The actor. Can have direct Roles and inherit Roles from
                    Groups.</span
                >
            </div>
            <div class="item">
                <strong>ACL</strong>
                <span
                    >Optional list embedded in a Resource that grants specific
                    users specific actions, bypassing standard RBAC.</span
                >
            </div>
        </div>
    </div>

    <!-- ═══ AUTHORIZATION ALGORITHM ═══ -->
    <div class="feature-section">
        <h2>The Authorization Algorithm</h2>
        <p>
            The <code>CanAsync</code> method is the gatekeeper. It evaluates
            requests based on the following precedence order:
        </p>

        <div class="diagram-container">
            <pre class="mermaid">
graph TD
    A["Request: User, Action, Resource"] --> B&#123;Is Resource Space?&#125;
    B -- Yes --> C[Check Space Access]
    B -- No --> D&#123;Has Item ACL?&#125;
    D -- Yes --> E[Check ACL]
    E -- Allowed --> F[Access Granted]
    E -- Denied --> G[Continue to RBAC]
    D -- No --> G
    G --> H[Load User Permissions]
    H --> I["Determine Context Conditions (is_active, own)"]
    I --> J[Traverse Path Hierarchy]
    J --> K&#123;Match Found?&#125;
    K -- Yes --> L["Check Constraints (Actions, Conditions, Fields)"]
    L -- Pass --> F
    L -- Fail --> M[Continue Traversal]
    K -- No --> M
    M --> N&#123;Root Reached?&#125;
    N -- No --> J
    N -- Yes --> O[Access Denied]
      </pre>
        </div>
    </div>

    <!-- ═══ DETAILED EVALUATION STEPS ═══ -->
    <div class="feature-section">
        <h2>Detailed Evaluation Steps</h2>

        <div class="step-section">
            <h3>1. ACL Evaluation (Short-Circuit)</h3>
            <p>
                Before evaluating roles, the system checks if the specific
                resource instance has an <strong
                    >Access Control List (ACL)</strong
                > defined.
            </p>
            <ul>
                <li>
                    <strong>Check:</strong> Per-entry
                    <code>acl</code> list match
                </li>
                <li>
                    <strong>Logic:</strong> If <code>entry.acl</code> exists and
                    contains an entry for <code>user_shortname</code> with the
                    requested <code>action_type</code>, access is
                    <strong>immediately granted</strong>.
                </li>
                <li>
                    <strong>Note:</strong> ACLs are strictly <em>additive</em>.
                    They cannot explicitly deny access if a Role allows it, but
                    they are checked <em>before</em> Roles, allowing for performance
                    optimization on specific items.
                </li>
            </ul>
        </div>

        <div class="step-section">
            <h3>2. Permission Aggregation</h3>
            <p>
                If no ACL grants access, the system compiles the user's
                effective permissions.
            </p>
            <ul>
                <li>
                    <strong>Source:</strong> User's direct Roles + Roles from User's
                    Groups.
                </li>
                <li>
                    <strong>Storage:</strong> Permissions are stored in the SQL database
                    for fast lookup.
                </li>
            </ul>
        </div>

        <div class="step-section">
            <h3>3. Contextual Conditions</h3>
            <p>
                The system determines the "state" of the request to match
                against Permission conditions.
            </p>
            <ul>
                <li>
                    <strong><code>is_active</code>:</strong> Set if the
                    resource's <code>is_active</code> flag is True.
                </li>
                <li>
                    <strong><code>own</code>:</strong> Set if
                    <code>resource.owner_shortname == user.shortname</code>
                    OR <code>resource.owner_group</code> is in
                    <code>user.groups</code>.
                </li>
            </ul>
        </div>

        <div class="step-section">
            <h3>4. Hierarchy Traversal &amp; Global Wildcards</h3>
            <p>
                The system checks permissions starting from the specific
                resource path up to the root.
            </p>
            <div class="path-example">
                <code>/space/folder/subfolder/resource</code>
            </div>
            <p><strong>Traversal Order:</strong></p>
            <ol>
                <li>
                    Specific Path: <code>space:/folder/subfolder/resource</code>
                </li>
                <li>Parent: <code>space:/folder/subfolder</code></li>
                <li>...</li>
                <li>Root: <code>space:/</code></li>
            </ol>
            <p><strong>Wildcard Checks:</strong></p>
            <ul>
                <li>
                    <code>__all_spaces__</code> — Grants access across all spaces.
                </li>
                <li>
                    <code>__all_subpaths__</code> — Grants access to any subpath.
                </li>
            </ul>
        </div>

        <div class="step-section">
            <h3>5. Constraint Validation</h3>
            <p>
                When a matching Permission key is found, three checks must pass:
            </p>
            <ol>
                <li>
                    <strong>Action Check:</strong> Is <code>action_type</code>
                    (e.g., <code>view</code>, <code>create</code>) in
                    <code>allowed_actions</code>?
                </li>
                <li>
                    <strong>Condition Check:</strong> Does the Permission
                    require conditions (e.g., <code>own</code>)? If yes, does
                    the current Context satisfy them?
                </li>
                <li>
                    <strong>Field-Level Restrictions:</strong>
                    <ul>
                        <li>
                            <strong>Restricted Fields:</strong> For
                            <code>update</code>/<code>create</code>, ensures the
                            user is not modifying fields listed in
                            <code>restricted_fields</code>.
                        </li>
                        <li>
                            <strong>Allowed Values:</strong> Checks if the
                            values being assigned to fields match
                            <code>allowed_fields_values</code>.
                        </li>
                    </ul>
                </li>
            </ol>
        </div>

        <div class="step-section">
            <h3>6. User Profile Protection</h3>
            <p>
                For User Profile updates, an additional layer of protection
                exists via the <code>user_profile_payload_protected_fields</code
                > setting. This global setting prevents users from modifying specific
                fields in their own profile payload, even if their Role technically
                allows "update" access.
            </p>
        </div>
    </div>

    <!-- ═══ PERMISSION JSON STRUCTURE ═══ -->
    <div class="feature-section">
        <h2>Permission JSON Structure</h2>
        <p>
            Permissions are defined as JSON objects. Understanding these keys is
            critical for configuring access.
        </p>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Type</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>subpaths</code></td>
                        <td><code>Dictionary&lt;string, List&lt;string&gt;&gt;</code></td>
                        <td
                            ><strong>Target Scope.</strong> Maps Space names to
                            subpaths. Use <code>__all_subpaths__</code> for
                            recursive access, <code>__all_spaces__</code> for global
                            access.</td
                        >
                    </tr>
                    <tr>
                        <td><code>resource_types</code></td>
                        <td><code>List&lt;string&gt;</code></td>
                        <td
                            ><strong>Target Resources.</strong> The types of
                            objects this permission applies to — one or more
                            resource types (see <a href="#allowed-values"
                                >Allowed Values</a
                            > below). An empty list applies to <em>all</em> types.</td
                        >
                    </tr>
                    <tr>
                        <td><code>actions</code></td>
                        <td><code>List&lt;string&gt;</code></td>
                        <td
                            ><strong>Allowed Operations.</strong> What the user
                            can do — one or more of the 11 action types (see
                            <a href="#allowed-values">Allowed Values</a> below).
                            An empty list grants nothing.</td
                        >
                    </tr>
                    <tr>
                        <td><code>conditions</code></td>
                        <td><code>List&lt;string&gt;</code></td>
                        <td
                            ><strong>Contextual Requirements.</strong>
                            <code>own</code> and/or <code>is_active</code> (see
                            <a href="#allowed-values">Allowed Values</a> below).
                            An empty list = no conditions.</td
                        >
                    </tr>
                    <tr>
                        <td><code>restricted_fields</code></td>
                        <td><code>List&lt;string&gt;</code></td>
                        <td
                            ><strong>Field Protection.</strong> Fields that
                            <em>cannot</em>
                            be modified in <code>create</code> or
                            <code>update</code> requests.</td
                        >
                    </tr>
                    <tr>
                        <td><code>allowed_fields_values</code></td>
                        <td><code>Dictionary&lt;string, object&gt;</code></td>
                        <td
                            ><strong>Value Constraints.</strong> Enforces that specific
                            fields can only take specific values.</td
                        >
                    </tr>
                </tbody>
            </table>
        </div>

        <h3 id="allowed-values">Allowed Values</h3>
        <p>
            The <code>actions</code>, <code>conditions</code>, and
            <code>resource_types</code> arrays only accept the fixed sets below —
            any other string is rejected.
        </p>

        <h4>Actions — the 11 operation types</h4>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Authorizes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td><code>view</code></td><td>Read a single entry's metadata and payload.</td></tr>
                    <tr><td><code>query</code></td><td>Search / list entries via the <code>/query</code> endpoint.</td></tr>
                    <tr><td><code>create</code></td><td>Create a new entry.</td></tr>
                    <tr><td><code>update</code></td><td>Modify an existing entry's metadata or payload.</td></tr>
                    <tr><td><code>delete</code></td><td>Remove an entry.</td></tr>
                    <tr><td><code>attach</code></td><td>Add attachments (comments, media, reactions, relationships) to an entry.</td></tr>
                    <tr><td><code>assign</code></td><td>Change an entry's ownership (owner or owning group).</td></tr>
                    <tr><td><code>move</code></td><td>Move or rename an entry to a different subpath / shortname.</td></tr>
                    <tr><td><code>progress_ticket</code></td><td>Advance a ticket through its workflow states.</td></tr>
                    <tr><td><code>lock</code></td><td>Place a lock on an entry to block concurrent edits.</td></tr>
                    <tr><td><code>unlock</code></td><td>Release a lock on an entry.</td></tr>
                </tbody>
            </table>
        </div>

        <h4>Conditions — the 2 contextual gates</h4>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Condition</th>
                        <th>Requirement</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>own</code></td>
                        <td>The requesting user must own the entry — its <code>owner_shortname</code> equals the user, or the entry's owning group is one of the user's groups.</td>
                    </tr>
                    <tr>
                        <td><code>is_active</code></td>
                        <td>The entry's <code>is_active</code> flag must be <code>true</code>.</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p class="code-note">
            Conditions gate access to <em>existing</em> entries, so the
            <code>create</code> and <code>query</code> actions are exempt from
            condition checks.
        </p>

        <h4>Resource types — what the permission targets</h4>
        <p>
            Any of the platform's <a href="/data-model">resource types</a> may be
            listed. An empty <code>resource_types</code> array applies to
            <strong>all</strong> types. The full set, grouped:
        </p>
        <div class="grid-list types">
            <div class="item"><strong>Identity</strong><span><code>user</code>, <code>group</code></span></div>
            <div class="item"><strong>Structure</strong><span><code>folder</code>, <code>space</code></span></div>
            <div class="item"><strong>Content</strong><span><code>content</code>, <code>schema</code>, <code>data_asset</code>, <code>csv</code>, <code>jsonl</code>, <code>sqlite</code>, <code>parquet</code></span></div>
            <div class="item"><strong>Workflow</strong><span><code>ticket</code></span></div>
            <div class="item"><strong>Social</strong><span><code>comment</code>, <code>reply</code>, <code>post</code>, <code>reaction</code>, <code>notification</code>, <code>share</code></span></div>
            <div class="item"><strong>Attachments</strong><span><code>media</code>, <code>log</code>, <code>relationship</code>, <code>alteration</code>, <code>history</code>, <code>lock</code></span></div>
            <div class="item"><strong>Management</strong><span><code>role</code>, <code>permission</code>, <code>acl</code></span></div>
            <div class="item"><strong>Extensions</strong><span><code>locator</code>, <code>json</code>, <code>plugin_wrapper</code></span></div>
        </div>
    </div>

    <!-- ═══ EXAMPLES ═══ -->
    <div class="feature-section">
        <h2>Permission Examples</h2>

        <h3>Super Manager — Full Access</h3>
        <div class="code-container">
            <pre><code
                    >{`{
  "shortname": "super_manager",
  "subpaths": {
    "__all_spaces__": ["__all_subpaths__"]
  },
  "resource_types": [
    "schema", "space", "content", "user", "..."
  ],
  "actions": [
    "delete", "update", "query", "create", "view", "attach"
  ],
  "conditions": [],
  "restricted_fields": []
}`}</code
                ></pre>
        </div>
        <p class="code-note">
            Grants <strong>unrestricted access</strong> to all resources in all spaces.
            No ownership requirement, no field restrictions.
        </p>

        <h3>View Users — Read-Only Scope</h3>
        <div class="code-container">
            <pre><code
                    >{`{
  "shortname": "view_users",
  "subpaths": {
    "management": ["users"]
  },
  "resource_types": [
    "content", "ticket", "folder"
  ],
  "actions": ["view", "query"],
  "conditions": []
}`}</code
                ></pre>
        </div>
        <p class="code-note">
            Read-only access to the <code>users</code> subpath within the
            <code>management</code> space only.
        </p>

        <h3>Edit Own Profile — Restricted Update</h3>
        <div class="code-container">
            <pre><code
                    >{`{
  "shortname": "edit_own_profile",
  "resource_types": ["user"],
  "actions": ["update"],
  "conditions": ["own"],
  "restricted_fields": ["roles", "is_active"],
  "allowed_fields_values": {}
}`}</code
                ></pre>
        </div>
        <p class="code-note">
            Can only edit <strong>their own</strong> user record. Cannot modify
            <code>roles</code>
            or <code>is_active</code> fields — prevents self-promotion or account
            manipulation.
        </p>
    </div>
</div>

<style>
  .path-example {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    margin: 0.75rem 0;
    display: inline-block;
  }

  .path-example code {
    border: none;
    background: transparent;
    padding: 0;
    font-size: 0.9rem;
    font-weight: 700;
  }

  .code-note {
    margin-bottom: 2rem;
  }

  .grid-list.types {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .grid-list.types .item span code {
    font-size: 0.8em;
  }
</style>
