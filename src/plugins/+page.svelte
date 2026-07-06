<script lang="ts">
</script>

<div class="content">
    <h1>Plugins</h1>
    <p class="intro">
        DMART ships with a plugin system that lets you extend the platform
        without forking it. Plugins come in two flavours: <strong>hook plugins</strong>
        react to before/after action events, and <strong>API plugins</strong>
        mount their own HTTP routes. They can be compiled into the binary as
        managed C# classes, or loaded at runtime as native plugins.
    </p>

    <!-- ═══ PRE-BUNDLED PLUGINS ═══ -->
    <div class="feature-section">
        <h2>Built-in Plugins</h2>
        <p>
            These managed plugins are compiled into the single self-contained
            binary and registered at startup. The tag shows whether each is a
            hook or an API plugin.
        </p>

        <div class="plugin-grid">
            <div class="plugin-card">
                <strong>audit</strong>
                <span
                    >Records create, update, and delete actions for audit
                    trails.</span
                >
                <span class="plugin-tag active">Hook</span>
            </div>
            <div class="plugin-card">
                <strong>semantic_indexer</strong>
                <span
                    >Generates and maintains pgvector embeddings so entries can
                    be found by semantic (vector) search.</span
                >
                <span class="plugin-tag active">Hook</span>
            </div>
            <div class="plugin-card">
                <strong>realtime_updates_notifier</strong>
                <span
                    >The live notification path: for each matching event it
                    computes the set of subscription channels (walking subpath
                    prefixes × schema × action × state) and broadcasts a
                    <code>notification_subscription</code> message directly to
                    connected clients via the in-process WebSocket manager.</span
                >
                <span class="plugin-tag active">Hook</span>
            </div>
            <div class="plugin-card">
                <strong>mcp_sse_bridge</strong>
                <span
                    >Bridges entry events to the MCP server so Model Context
                    Protocol clients receive live updates.</span
                >
                <span class="plugin-tag active">Hook</span>
            </div>
            <div class="plugin-card">
                <strong>resource_folders_creation</strong>
                <span
                    >Automatically provisions the folder structures a new user
                    or space needs.</span
                >
                <span class="plugin-tag active">Hook</span>
            </div>
            <div class="plugin-card">
                <strong>admin_notification_sender</strong>
                <span
                    >Registered no-op stub. The Python original pushed
                    admin notifications through an SMS/push gateway
                    (Firebase/SMS); that gateway is out of scope for the port,
                    so <code>HookAsync</code> only logs today.</span
                >
                <span class="plugin-tag active">Hook</span>
                <span class="plugin-tag stub">Stub</span>
            </div>
            <div class="plugin-card">
                <strong>system_notification_sender</strong>
                <span
                    >Registered no-op stub. The original fanned out per-user
                    notification entries and pushed via the gateway; the query +
                    push sides aren't ported yet, so it only logs.</span
                >
                <span class="plugin-tag active">Hook</span>
                <span class="plugin-tag stub">Stub</span>
            </div>
            <div class="plugin-card">
                <strong>local_notification</strong>
                <span
                    >Registered no-op stub. The real body needs the
                    notification-persistence pipeline (attachment-first
                    notification entries) which hasn't been ported; activating
                    it in a space is a no-op today.</span
                >
                <span class="plugin-tag active">Hook</span>
                <span class="plugin-tag stub">Stub</span>
            </div>
            <div class="plugin-card">
                <strong>db_size_info</strong>
                <span
                    >Exposes an endpoint reporting PostgreSQL storage usage for
                    the deployment.</span
                >
                <span class="plugin-tag active">API</span>
            </div>
        </div>
        <p class="code-note">
            The three notification-sender plugins are marked <em>Stub</em>: they
            are registered only so <code>config.json</code> references don't warn
            <code>PLUGIN_UNKNOWN</code>, but their hook body is a no-op pending a
            push/SMS gateway integration. The one live notification path today is
            <code>realtime_updates_notifier</code>, which broadcasts changes over
            WebSocket.
        </p>
    </div>

    <!-- ═══ CUSTOM PLUGINS ═══ -->
    <div class="feature-section">
        <h2>Defining Custom Plugins</h2>
        <p>
            There are two ways to add your own plugins, each suited to a
            different workflow.
        </p>

        <div class="grid-list">
            <div class="item">
                <strong>Managed C# plugins</strong>
                <span
                    >Implement <code>IHookPlugin</code> or
                    <code>IApiPlugin</code> in-process. Fastest and fully typed,
                    but compiled into the binary.</span
                >
            </div>
            <div class="item">
                <strong>Native plugins</strong>
                <span
                    >Dropped into <code>~/.dmart/plugins/&lt;name&gt;/</code> and
                    loaded at runtime — no recompilation needed. Ship them as a
                    subprocess executable or a shared library.</span
                >
            </div>
        </div>

        <p>
            Each plugin keeps a <code>config.json</code> alongside it that
            declares its <code>shortname</code>, whether it is a
            <code>hook</code> or <code>api</code> plugin, and — for hooks — the
            event filters and ordering that decide when it runs. Ready-made
            examples live in the <code>custom_plugins_sdk/</code> directory.
        </p>
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
    "subpaths": { "__all_spaces__": ["__all_subpaths__"] },
    "resource_types": ["content", "user"],
    "schema_shortnames": [],
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
                            >Event filters. <code>subpaths</code> is a map of
                            space &rarr; subpath patterns
                            (<code>__all_spaces__</code> /
                            <code>__all_subpaths__</code> match any space /
                            subpath). For <code>resource_types</code>,
                            <code>schema_shortnames</code>, and
                            <code>actions</code>, an empty array
                            <code>[]</code> matches everything.</td
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
                A managed hook plugin implements <code>IHookPlugin</code>: a
                <code>Shortname</code> and an async
                <code>HookAsync(Event, CancellationToken)</code> method. It is
                invoked on before/after action events that match its filters.
            </p>

            <div class="code-container csharp">
                <pre><code
                        >{`using Dmart.Models.Core;
using Dmart.Plugins;

public sealed class MyHookPlugin : IHookPlugin
{
    public string Shortname => "my_custom_plugin";

    public async Task HookAsync(Event e, CancellationToken ct = default)
    {
        // Your custom logic here
        Console.WriteLine("Event: " + e.ActionType + " on " + e.ResourceType);
        await Task.CompletedTask;
    }
}`}</code
                    ></pre>
            </div>
            <p class="code-note">
                The <code>Event</code> carries details about the action:
                <code>SpaceName</code>, <code>Subpath</code>,
                <code>ResourceType</code>, <code>ActionType</code>,
                <code>UserShortname</code>, and <code>Attributes</code>. Throwing
                from a <code>before</code> hook aborts the action; a
                <code>after</code> hook that throws is logged but does not fail
                the request.
            </p>
        </div>

        <div class="step-section">
            <h3>API Plugins</h3>
            <p>
                A managed API plugin implements <code>IApiPlugin</code>: a
                <code>Shortname</code> plus a <code>MapRoutes</code> method that
                wires endpoints into a route group. The plugin manager mounts
                that group at <code>/&#123;shortname&#125;</code> during startup.
            </p>

            <div class="code-container csharp">
                <pre><code
                        >{`using Dmart.Plugins;

public sealed class MyApiPlugin : IApiPlugin
{
    public string Shortname => "my_custom_plugin";

    public void MapRoutes(RouteGroupBuilder group)
    {
        group.MapGet("/hello", () =>
            Results.Ok(new { message = "Hello from my custom plugin!" }));
    }
}`}</code
                    ></pre>
            </div>
            <p class="code-note">
                Endpoints are served under <code
                    >/&#123;shortname&#125;/...</code
                > — the example above answers on <code>/my_custom_plugin/hello</code>.
            </p>
        </div>

        <div class="step-section">
            <h3>Native Plugins (runtime-loadable)</h3>
            <p>
                To extend a running deployment without recompiling the binary,
                drop a plugin into
                <code>~/.dmart/plugins/&lt;name&gt;/</code>. DMART supports two
                native modes and prefers the executable when both are present.
            </p>

            <div class="grid-list">
                <div class="item">
                    <strong>Subprocess (recommended)</strong>
                    <span
                        >A standalone executable in any language. DMART speaks
                        JSON-lines over stdin/stdout; if the process crashes it
                        is respawned automatically, so it can never take the
                        server down.</span
                    >
                </div>
                <div class="item">
                    <strong>Shared library</strong>
                    <span
                        >A <code>.so</code>, <code>.dylib</code>, or
                        <code>.dll</code> loaded in-process via a small C ABI
                        (<code>get_info</code>, <code>hook</code>,
                        <code>handle_request</code>, <code>free_string</code>,
                        <code>init</code>, <code>dmart_plugin_version</code>).
                        Lowest latency, but a crash takes down the host.</span
                    >
                </div>
            </div>

            <p class="code-note">
                The subprocess protocol is a simple request/response over JSON
                lines:
            </p>

            <div class="code-container">
                <pre><code
                        >{`# dmart → plugin (stdin)      # plugin → dmart (stdout)
{"type":"info"}                {"shortname":"my_plugin","version":"1.0.0","type":"hook"}
{"type":"hook","event":{...}}  {"status":"ok"}
{"type":"request","request":{...}}  {"status":"success","attributes":{...}}`}</code
                    ></pre>
            </div>
            <p class="code-note">
                Working templates for both modes — plus higher-level examples —
                live in the <code>custom_plugins_sdk/</code> directory of the
                repository.
            </p>
        </div>
    </div>
</div>

<style>
  .code-container.csharp {
    border-left: 3px solid transparent;
    border-image: linear-gradient(180deg, var(--iri-2), var(--iri-3)) 1;
  }

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

  .plugin-tag.stub {
    background: transparent;
    border-color: var(--border-color);
    color: var(--text-secondary);
  }

  @media (max-width: 768px) {
    .plugin-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
