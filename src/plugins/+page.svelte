<script lang="ts">
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
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    position: relative;
    transition: box-shadow 0.2s, transform 0.2s;
  }

  .plugin-card:hover {
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }

  .plugin-card strong {
    font-size: 0.9rem;
    letter-spacing: 0.5px;
  }

  .plugin-card span {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .plugin-tag {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 0.15rem 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 100px;
    margin-top: 0.25rem;
    align-self: flex-start;
  }

  .plugin-tag.active {
    background: var(--accent-light);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .plugin-tag.inactive {
    color: var(--text-secondary);
    opacity: 0.6;
  }

  @media (max-width: 768px) {
    .plugin-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
