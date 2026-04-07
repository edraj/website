<script lang="ts">
    import { onMount } from "svelte";
</script>

<div class="content">
    <h1>Plugins</h1>
    <p class="intro">
        D-MART comes with a powerful plugin system that allows you to extend its
        functionality. Plugins can intercept events (hooks) or add new API
        endpoints.
    </p>

    <!-- ═══ PRE-BUNDLED PLUGINS ═══ -->
    <div class="feature-section">
        <h2>Pre-bundled Plugins</h2>

        <div class="plugin-grid">
            <div class="plugin-card">
                <strong>action_log</strong>
                <span
                    >Logs all creation, update, and deletion actions to a JSONL
                    file for audit purposes.</span
                >
                <span class="plugin-tag active">Active</span>
            </div>
            <div class="plugin-card">
                <strong>admin_notification_sender</strong>
                <span
                    >Sends notifications to administrators when specific content
                    is created.</span
                >
                <span class="plugin-tag active">Active</span>
            </div>
            <div class="plugin-card">
                <strong>ldap_manager</strong>
                <span
                    >Synchronizes user creation and updates with an LDAP server.</span
                >
                <span class="plugin-tag inactive">Inactive</span>
            </div>
            <div class="plugin-card">
                <strong>local_notification</strong>
                <span
                    >Handles local notifications for tickets, reactions, and
                    comments.</span
                >
                <span class="plugin-tag active">Active</span>
            </div>
            <div class="plugin-card">
                <strong>realtime_updates_notifier</strong>
                <span
                    >Notifies connected clients of real-time updates via
                    WebSocket when resources are modified.</span
                >
                <span class="plugin-tag active">Active</span>
            </div>
            <div class="plugin-card">
                <strong>resource_folders_creation</strong>
                <span
                    >Automatically creates necessary folder structures when a
                    new user or space is created.</span
                >
                <span class="plugin-tag active">Active</span>
            </div>
            <div class="plugin-card">
                <strong>system_notification_sender</strong>
                <span>Sends system-wide notifications for various actions.</span
                >
                <span class="plugin-tag inactive">Inactive</span>
            </div>
            <div class="plugin-card">
                <strong>update_access_controls</strong>
                <span
                    >Updates ACLs when roles, groups, permissions, or users are
                    modified.</span
                >
                <span class="plugin-tag active">Active</span>
            </div>
        </div>
    </div>

    <!-- ═══ CUSTOM PLUGINS ═══ -->
    <div class="feature-section">
        <h2>Defining Custom Plugins</h2>
        <p>
            Extend D-MART by creating your own plugins. Custom plugins are
            placed in <code>spaces/custom_plugins/</code>.
        </p>

        <div class="grid-list">
            <div class="item">
                <strong>config.json</strong>
                <span
                    >Plugin metadata, type, filters, and activation settings.</span
                >
            </div>
            <div class="item">
                <strong>plugin.py</strong>
                <span>Python implementation — hook handler or API router.</span>
            </div>
        </div>
    </div>

    <!-- ═══ CONFIGURATION ═══ -->
    <div class="feature-section">
        <h2>Configuration</h2>
        <p>
            The <code>config.json</code> file defines the plugin's metadata and behavior.
        </p>

        <div class="code-container">
            <pre><code
                    >{`{
  "shortname": "my_custom_plugin",
  "is_active": true,
  "type": "hook",
  "listen_time": "after",
  "ordinal": 10,
  "filters": {
    "subpaths": ["__ALL__"],
    "resource_types": ["content", "user"],
    "schema_shortnames": ["__ALL__"],
    "actions": ["create", "update"]
  }
}`}</code
                ></pre>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>shortname</code></td>
                        <td>Unique identifier for the plugin</td>
                    </tr>
                    <tr>
                        <td><code>is_active</code></td>
                        <td>Set to <code>true</code> to enable the plugin</td>
                    </tr>
                    <tr>
                        <td><code>type</code></td>
                        <td
                            ><code>hook</code> — reacts to system events<br
                            /><code>api</code> — adds new API endpoints</td
                        >
                    </tr>
                    <tr>
                        <td><code>listen_time</code></td>
                        <td
                            ><code>before</code> — execute before action (can
                            block/modify)<br /><code>after</code> — execute after
                            action (logging, notifications)</td
                        >
                    </tr>
                    <tr>
                        <td><code>ordinal</code></td>
                        <td
                            >Execution order relative to other plugins (lower =
                            first)</td
                        >
                    </tr>
                    <tr>
                        <td><code>filters</code></td>
                        <td
                            >Event filters: <code>subpaths</code>,
                            <code>resource_types</code>,
                            <code>schema_shortnames</code>,
                            <code>actions</code>. Use <code>__ALL__</code> for wildcard.</td
                        >
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ IMPLEMENTATION ═══ -->
    <div class="feature-section">
        <h2>Implementation</h2>

        <div class="step-section">
            <h3>Hook Plugins</h3>
            <p>
                For <code>hook</code> plugins, define a <code>Plugin</code>
                class that inherits from <code>PluginBase</code> and implements
                the <code>hook</code> method.
            </p>

            <div class="code-container python">
                <pre><code
                        >{`from models.core import PluginBase, Event

class Plugin(PluginBase):
    async def hook(self, data: Event):
        # Your custom logic here
        print(f"Event received: {data.action_type} on {data.resource_type}")`}</code
                    ></pre>
            </div>
            <p class="code-note">
                The <code>Event</code> object contains details about the action:
                <code>space_name</code>, <code>subpath</code>,
                <code>resource_type</code>, <code>action_type</code>, and
                <code>attributes</code>.
            </p>
        </div>

        <div class="step-section">
            <h3>API Plugins</h3>
            <p>
                For <code>api</code> plugins, define a <code>router</code>
                object (FastAPI <code>APIRouter</code>). The system
                automatically mounts this router.
            </p>

            <div class="code-container python">
                <pre><code
                        >{`from fastapi import APIRouter

router = APIRouter()

@router.get("/hello")
async def hello():
    return {"message": "Hello from my custom plugin!"}`}</code
                    ></pre>
            </div>
            <p class="code-note">
                Endpoints will be available under <code
                    >/&#123;plugin_shortname&#125;/...</code
                >
            </p>
        </div>
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

    strong {
        color: var(--text-main);
        font-weight: 700;
    }

    code {
        font-family: "Courier New", Courier, monospace;
        font-size: 0.85em;
        background: var(--bg-color);
        border: 1px solid var(--border-color);
        padding: 0.1rem 0.35rem;
    }

    /* ─── PLUGIN GRID ─── */
    .plugin-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .plugin-card {
        background: var(--bg-color);
        padding: 1rem;
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        position: relative;
    }

    .plugin-card strong {
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .plugin-card span {
        font-size: 0.85rem;
        color: var(--text-secondary);
        line-height: 1.4;
    }

    .plugin-tag {
        display: inline-block;
        font-size: 0.65rem !important;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        padding: 0.15rem 0.5rem;
        border: 1px solid var(--border-color);
        margin-top: 0.25rem;
        align-self: flex-start;
    }

    .plugin-tag.active {
        border-color: var(--text-main);
        color: var(--text-main) !important;
    }

    .plugin-tag.inactive {
        color: var(--text-secondary) !important;
        opacity: 0.6;
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
        font-size: 1rem;
        text-transform: uppercase;
    }

    .item span {
        font-size: 0.85rem;
        color: var(--text-secondary);
        line-height: 1.4;
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

    tr:last-child td {
        border-bottom: none;
    }

    /* ─── CODE ─── */
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

    .code-container {
        background: var(--bg-color);
        border: 1px solid var(--border-color);
        margin: 1rem 0;
        overflow-x: auto;
    }

    .code-container.python {
        border-left: 3px solid var(--text-main);
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
        margin-bottom: 0.5rem;
        padding-left: 0.5rem;
        border-left: 2px solid var(--border-color);
    }

    @media (max-width: 768px) {
        .plugin-grid {
            grid-template-columns: 1fr;
        }
        .grid-list {
            grid-template-columns: 1fr;
        }
    }
</style>
