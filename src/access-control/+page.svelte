<script lang="ts">
    import mermaid from "mermaid";
    import { onMount } from "svelte";

    function isDarkMode() {
        return document.documentElement.classList.contains("dark");
    }

    async function renderMermaid() {
        const theme = isDarkMode() ? "dark" : "neutral";
        mermaid.initialize({ startOnLoad: false, theme });
        document.querySelectorAll(".mermaid[data-original]").forEach((el) => {
            el.removeAttribute("data-processed");
            el.innerHTML = el.getAttribute("data-original")!;
        });
        await mermaid.run();
    }

    onMount(() => {
        document.querySelectorAll("pre.mermaid").forEach((el) => {
            el.setAttribute("data-original", el.innerHTML);
        });
        renderMermaid();

        const onThemeChange = () => renderMermaid();
        window.addEventListener("themechange", onThemeChange);
        return () => window.removeEventListener("themechange", onThemeChange);
    });
</script>

<div class="content">
    <h1>Access Control</h1>
    <p class="intro">
        A deep technical overview of the D-MART Access Control system. The
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
            The access control logic is centralized in <code>AccessControl</code
            >
            class. Data models are defined in <code>models/core.py</code>.
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
            The <code>check_access</code> method is the gatekeeper. It evaluates
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
                    <strong>Method:</strong>
                    <code>check_access_control_list</code>
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
                        <td><code>dict[str, list[str]]</code></td>
                        <td
                            ><strong>Target Scope.</strong> Maps Space names to
                            subpaths. Use <code>__all_subpaths__</code> for
                            recursive access, <code>__all_spaces__</code> for global
                            access.</td
                        >
                    </tr>
                    <tr>
                        <td><code>resource_types</code></td>
                        <td><code>list[str]</code></td>
                        <td
                            ><strong>Target Resources.</strong> The types of
                            objects this permission applies to (e.g.,
                            <code>content</code>, <code>ticket</code>,
                            <code>user</code>).</td
                        >
                    </tr>
                    <tr>
                        <td><code>actions</code></td>
                        <td><code>list[str]</code></td>
                        <td
                            ><strong>Allowed Operations.</strong> What the user
                            can do (e.g., <code>create</code>,
                            <code>view</code>, <code>update</code>,
                            <code>delete</code>, <code>query</code>).</td
                        >
                    </tr>
                    <tr>
                        <td><code>conditions</code></td>
                        <td><code>list[str]</code></td>
                        <td
                            ><strong>Contextual Requirements.</strong>
                            <code>own</code>: User must be the owner.
                            <code>is_active</code>: Resource must be active.
                            Empty list = no conditions.</td
                        >
                    </tr>
                    <tr>
                        <td><code>restricted_fields</code></td>
                        <td><code>list[str]</code></td>
                        <td
                            ><strong>Field Protection.</strong> Fields that
                            <em>cannot</em>
                            be modified in <code>create</code> or
                            <code>update</code> requests.</td
                        >
                    </tr>
                    <tr>
                        <td><code>allowed_fields_values</code></td>
                        <td><code>dict[str, list]</code></td>
                        <td
                            ><strong>Value Constraints.</strong> Enforces that specific
                            fields can only take specific values.</td
                        >
                    </tr>
                </tbody>
            </table>
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
    .content {
        color: var(--text-main);
    }

    h1 {
        font-size: 2rem;
        margin-bottom: 1rem;
        color: var(--text-main);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
        text-transform: uppercase;
    }

    .intro {
        font-size: 1.05rem;
        color: var(--text-secondary);
        margin-bottom: 2.5rem;
        font-family: var(--font-sans);
        line-height: 1.7;
    }

    .feature-section {
        margin-bottom: 3rem;
        padding: 1.5rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
    }

    h2 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: var(--text-main);
        text-transform: uppercase;
    }

    h3 {
        font-size: 1.1rem;
        margin-top: 1.5rem;
        margin-bottom: 0.5rem;
        color: var(--text-main);
        text-transform: uppercase;
        letter-spacing: 1px;
        border-bottom: 1px dashed var(--border-color);
        display: inline-block;
        padding-bottom: 0.2rem;
    }

    p {
        margin-bottom: 1rem;
        line-height: 1.6;
    }

    ul,
    ol {
        margin-bottom: 1rem;
        padding-left: 1.2rem;
    }

    ul {
        list-style-type: square;
    }

    li {
        margin-bottom: 0.5rem;
        color: var(--text-secondary);
        line-height: 1.5;
    }

    li strong {
        color: var(--text-main);
    }

    strong {
        color: var(--text-main);
        font-weight: 700;
    }

    em {
        font-style: italic;
    }

    code {
        font-family: "Courier New", Courier, monospace;
        font-size: 0.85em;
        background: var(--bg-color);
        border: 1px solid var(--border-color);
        padding: 0.1rem 0.35rem;
    }

    .grid-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .item {
        background: var(--bg-color);
        padding: 1rem;
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .item strong {
        color: var(--text-main);
        font-size: 1rem;
        text-transform: uppercase;
    }

    .item span {
        font-size: 0.9rem;
        color: var(--text-secondary);
        line-height: 1.4;
    }

    .diagram-container {
        background: var(--bg-color);
        padding: 1rem;
        border: 1px solid var(--border-color);
        margin: 1.5rem 0;
        overflow-x: auto;
    }

    pre.mermaid {
        background: transparent;
        padding: 0;
        margin: 0;
        font-family: monospace;
        border: none;
    }

    .step-section {
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }

    .step-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }

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

    /* ─── TABLE ─── */
    .table-container {
        overflow-x: auto;
        margin: 1rem 0;
        border: 1px solid var(--border-color);
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    thead {
        background: var(--bg-color);
    }

    th {
        text-align: left;
        padding: 0.75rem 1rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 0.75rem;
        color: var(--text-main);
        border-bottom: 2px solid var(--text-main);
    }

    td {
        padding: 0.75rem 1rem;
        color: var(--text-secondary);
        border-bottom: 1px solid var(--border-color);
        vertical-align: top;
        line-height: 1.5;
    }

    td code {
        font-size: 0.8em;
    }

    tr:last-child td {
        border-bottom: none;
    }

    /* ─── CODE BLOCKS ─── */
    .code-container {
        background: var(--bg-color);
        border: 1px solid var(--border-color);
        margin: 1rem 0;
        overflow-x: auto;
    }

    .code-container pre {
        margin: 0;
        padding: 1.25rem;
        background: transparent;
        border: none;
    }

    .code-container code {
        font-family: "Courier New", Courier, monospace;
        font-size: 0.8rem;
        line-height: 1.6;
        color: var(--text-main);
        background: transparent;
        border: none;
        padding: 0;
        white-space: pre;
    }

    .code-note {
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin-top: 0.25rem;
        margin-bottom: 2rem;
        padding-left: 0.5rem;
        border-left: 2px solid var(--border-color);
    }

    @media (max-width: 768px) {
        .grid-list {
            grid-template-columns: 1fr;
        }
    }
</style>
