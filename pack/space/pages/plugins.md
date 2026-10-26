DMART ships with a plugin system that lets you extend the platform without forking it. Plugins come in two flavours: **hook plugins** react to before/after action events, and **API plugins** mount their own HTTP routes. They can be compiled into the binary as managed C# classes, or run at runtime as subprocess plugins.

## Built-in Plugins

These managed plugins are compiled into the single self-contained binary and registered at startup. The tag shows whether each is a hook or an API plugin.

**audit** Writes a log line for every create, update, delete and other action, with who did it (the rows of a bulk CSV import excepted). Hook

**semantic_indexer** When the `pgvector` extension is installed and an embedding API is configured, embeds each entry on create and update so it can be found by semantic (vector) search. Hook

**realtime_updates_notifier** The live notification path: for each matching event it computes the set of subscription channels (walking subpath prefixes × schema × action × state) and sends a `notification_subscription` message, via the in-process WebSocket manager, to each subscribed client that may read the changed record — judged as a read of that record would be, at the moment of sending. Hook

**mcp_sse_bridge** Sends each MCP session a `notifications/resources/updated` message for every entry created, updated or deleted that its user may read. It does nothing while `ENABLE_MCP` is off; the MCP server itself is described in the [API reference](/api-docs). Hook

**resource_folders_creation** Creates a new user's `personal/people/<shortname>` folder with its five sub-folders, and a new space's `/schema` folder. It runs in the background, so the create can answer before the folders exist. Hook

**admin_notification_sender** Registered no-op stub. The Python original pushed admin notifications through an SMS/push gateway (Firebase/SMS); that gateway is out of scope for the port, so `HookAsync` only logs today. Hook Stub

**system_notification_sender** Registered no-op stub. The original fanned out per-user notification entries and pushed via the gateway; the query + push sides aren't ported yet, so it only logs. Hook Stub

**local_notification** Registered no-op stub. The real body needs the notification-persistence pipeline (attachment-first notification entries) which hasn't been ported; enabling it is a no-op today. Hook Stub

**db_size_info** Answers `GET /db_size_info/`, to global admins only, with the database's storage usage per table. On SQLite it gives per-table sizes where the build supports them, and the size of the database file otherwise. API

The three notification plugins are marked _Stub_: they are registered, and shipped switched off (`is_active: false`), only so `config.json` references don't warn `PLUGIN_UNKNOWN`; their hook body is a no-op pending a push/SMS gateway integration. The one live notification path today is `realtime_updates_notifier`, which broadcasts changes over WebSocket.

`GET /info/plugins` (global admins) lists each loaded plugin with its version and type, and each external plugin directory that failed to load, with the reason.

## Defining Custom Plugins

There are two ways to add your own plugins, each suited to a different workflow.

**Managed C# plugins** Implement `IHookPlugin` or `IApiPlugin` in-process and register the class with dependency injection. Fastest and fully typed, but compiled into the binary.

**Subprocess plugins** Dropped into `~/.dmart/plugins/<name>/` and loaded when the server starts — no recompilation needed. Ship them as an executable in any language.

Each plugin keeps a `config.json` in a directory named after it — a plugin without one never loads — that declares whether it is a `hook` or `api` plugin and, for hooks, the event filters and ordering that decide when it runs. DMART reads these directories from `./plugins`, the `plugins` folder beside the binary, `/usr/lib/dmart/plugins` and `~/.dmart/plugins`; the first directory of a given name wins. Ready-made examples live in the `custom_plugins_sdk/` directory.

## Configuration

The `config.json` file defines the plugin's metadata and behavior.

```json
{
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
}
```

| Key | Description |
|---|---|
| `shortname` | The plugin's identifier. DMART takes it from the directory's name, so keep the two the same |
| `is_active` | Set to `true` to enable the plugin |
| `type` | `hook` — reacts to system events `api` — adds new API endpoints |
| `listen_time` | `before` — execute before action (can veto it by throwing, but cannot change the entry) `after` — execute after action (logging, notifications). A hook without `listen_time` or `filters` is not loaded |
| `ordinal` | Execution order relative to other plugins (lower = first; default 9999) |
| `concurrent` | After-hooks: `true` (the default) runs the hook in the background, so the response does not wait for it; `false` makes the request wait |
| `workers` | Subprocess plugins: how many processes serve the plugin, each taking one call at a time (default 1) |
| `filters` | Event filters. `subpaths` is a map of space → subpath patterns (`__all_spaces__` / `__all_subpaths__` match any space / subpath); a pattern also covers the folders below it, and `__current_user__` in one stands for the acting user. For `resource_types`, `schema_shortnames`, and `actions`, an empty array `[]` matches everything. |

Hooks hear `create`, `update`, `delete`, `move`, `lock` and `unlock`. Progressing or assigning a ticket reaches them as an `update`, and no event carries `query`, `view`, `attach`, `assign` or `progress_ticket`, so a filter naming only those never fires.

## Implementation

### Hook Plugins

A managed hook plugin implements `IHookPlugin`: a `Shortname` and an async `HookAsync(Event, CancellationToken)` method. It is invoked on before/after action events that match its filters.

```csharp
using Dmart.Models.Core;
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
}
```

The `Event` carries details about the action: `SpaceName`, `Subpath`, `Shortname`, `ResourceType`, `SchemaShortname`, `ActionType`, `UserShortname`, and `Attributes`. Throwing from a `before` hook aborts the action; an `after` hook that throws is logged but does not fail the request.

### API Plugins

A managed API plugin implements `IApiPlugin`: a `Shortname` plus a `MapRoutes` method that wires endpoints into a route group. The plugin manager mounts that group at `/{shortname}` during startup.

```csharp
using Dmart.Plugins;

public sealed class MyApiPlugin : IApiPlugin
{
    public string Shortname => "my_custom_plugin";

    public void MapRoutes(RouteGroupBuilder group)
    {
        group.MapGet("/hello", () =>
            Results.Ok(new { message = "Hello from my custom plugin!" }));
    }
}
```

Endpoints are served under `/{shortname}/...` and require authentication — the example above answers on `/my_custom_plugin/hello`.

### Subprocess Plugins (runtime-loadable)

To extend a deployment without recompiling the binary, drop a plugin into `~/.dmart/plugins/<name>/` and restart the server: a standalone executable in any language, next to its `config.json`. DMART speaks JSON-lines over stdin/stdout; if the process crashes it is respawned on the next event, so it can never take the server down. A plugin that stays silent for 30 seconds is stopped, and that call fails.

In-process shared-library plugins (`.so` / `.dylib` / `.dll`) have been removed: a crash in them took the server down, and they cannot load in the static build. A directory that still holds one is reported as a load failure that says so.

The subprocess protocol is a simple request/response over JSON lines:

```
# dmart → plugin (stdin)                    # plugin → dmart (stdout)
{"type":"info","host":{"callbacks":1}}       {"shortname":"my_plugin","version":"1.0.0","type":"hook"}
{"type":"hook","event":{...}}                {"status":"ok"}
{"type":"request","request":{...}}           {"status":"success","attributes":{...}}
```

A hook answers `{"status":"error","message":"..."}` to fail; from a `before` hook, that refuses the action. An API plugin's `info` answer also lists its `routes`, each a `method` and a `path`, mounted under `/{shortname}`.

Before its final answer, a plugin may call back into DMART with lines such as `{"type":"callback","id":1,"op":"query","args":{...}}`, each answered on its stdin with a `callback_result`. The operations are `load_entry`, `load_user`, `save_entry`, `update_user`, `query`, `send_email`, `ws_broadcast`, `log`, `get_media_attachment`, and two for push-notification tokens. A `query` runs as the user whose action started the exchange, unless it carries an `as_actor` override. One exchange may make up to 256 callbacks.

Two working samples in Python, a hook and an API plugin, live in the `custom_plugins_sdk/` directory of the repository, with a README that covers the protocol.
