DMART ships with a plugin system that lets you extend the platform without forking it. Plugins come in two flavours: **hook plugins** react to before/after action events, and **API plugins** mount their own HTTP routes. They can be compiled into the binary as managed C# classes, or run at runtime as subprocess plugins.

## Built-in Plugins

These managed plugins are compiled into the single self-contained binary and registered at startup. The tag shows whether each is a hook or an API plugin.

**audit** Writes a log line for every create, update, delete and other action, with who did it (the rows of a bulk CSV import excepted). Hook

**semantic_indexer** When the `pgvector` extension is installed and an embedding API is configured, embeds each entry on create and update so it can be found by semantic (vector) search. Hook

**realtime_updates_notifier** The live notification path: for each matching event it computes the set of subscription channels (walking subpath prefixes × schema × action × state) and sends a `notification_subscription` message, via the in-process WebSocket manager, to each subscribed client that may read the changed record — judged as a read of that record would be, at the moment of sending. For an attachment, that takes reading the record it hangs off too, its ACL included. It reaches only clients connected to the node that handled the write: with several nodes behind a load balancer, a client on another node hears nothing. Hook

**mcp_sse_bridge** Sends each MCP session a `notifications/resources/updated` message for every entry created, updated or deleted that its user may read, judged as `realtime_updates_notifier` judges it. It does nothing while `ENABLE_MCP` is off; the MCP server itself is described in the [API reference](/api-docs). Hook

**resource_folders_creation** Creates a new user's `personal/people/<shortname>` folder with its five sub-folders, and a new space's `/schema` folder. It runs in the background, so the create can answer before the folders exist; `"concurrent": false` in its `config.json` makes user and space creates wait for their folders. Hook

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

Each plugin keeps a `config.json` in a directory named after it — a plugin without one never loads — that declares whether it is a `hook` or `api` plugin and, for hooks, the event filters and ordering that decide when it runs. DMART reads these configs from `./plugins` (under the working directory), the `plugins` folder beside the binary, `/usr/lib/dmart/plugins` and `~/.dmart/plugins`, in that order; the first directory of a given name wins. A subprocess plugin's executable loads only from `~/.dmart/plugins/<name>/`. Ready-made examples live in the `custom_plugins_sdk/` directory.

The packaged systemd service runs as the `dmart` user, from `/var/lib/dmart`, which is also that user's home. So under that service:

| Path | Holds |
|---|---|
| `/var/lib/dmart/plugins/<name>/config.json` | A lasting override of a built-in plugin's config. It is read first, and an upgrade leaves it alone. |
| `/usr/lib/dmart/plugins/<name>/config.json` | The built-in plugins' configs. The package owns them, and an upgrade replaces them. |
| `/var/lib/dmart/.dmart/plugins/<name>/` | Subprocess plugins: the executable and its `config.json`. |
| `/var/lib/dmart/custom_plugins` | Nothing. The package creates it, but DMART never reads it. |

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
| `concurrent` | After-hooks: `true` (the default) runs the hook in the background, so the response does not wait for it; `false` makes the request wait. At shutdown, DMART waits up to 10 seconds for background hooks to finish |
| `workers` | Subprocess plugins: how many processes serve the plugin, each taking one call at a time (default 1, clamped to 1–32) |
| `filters` | Event filters. `subpaths` is a map of space → subpath patterns (`__all_spaces__` / `__all_subpaths__` match any space / subpath); a pattern also covers the folders below it, and `__current_user__` in one stands for the acting user. For `resource_types`, `schema_shortnames`, and `actions`, an empty array `[]` matches everything. |

Hooks hear `create`, `update`, `delete`, `move`, `lock` and `unlock`. Progressing or assigning a ticket reaches them as an `update`, and no event carries `query`, `view`, `attach`, `assign` or `progress_ticket`, so a filter naming only those never fires.

A `before` hook fires once every check of the write has passed, just before the write: the caller's permission, the row filters, the owner group and field limits, the schema and uniqueness rules. That holds for an entry and for a user, role, group, permission or space written through `/managed/request` alike, so a hook sees no write that is then refused, save one that loses a race at the write itself. An update or delete of a user, role, group, permission or space that is not there reaches no hook, nor does a dry-run delete, nor a delete of the `management` space, which is refused (`CANNT_DELETE`) once the permission check has passed. A veto fails the record with `INVALID_DATA` ("plugin rejected …"). A delete that removes nothing, of a record that is not there or that row filters or an ACL hide from the caller, fires no `after` hook.

Some filters never fire:

- **An empty `subpaths`** (`{}`) matches no event, and a space mapped to `[]` adds nothing. Opt in to everything with `{"__all_spaces__": ["__all_subpaths__"]}`.

- **A non-empty `schema_shortnames`** is checked on every event, whatever its resource type, and passes only events whose record's `payload.schema_shortname` it lists: a folder or a ticket whose payload names a listed schema matches too. A record without a payload schema never matches it. Pair it with `resource_types` to narrow it to one kind.

- **A flat `subpaths` array**, the legacy `["__ALL__"]` shape, is refused at load with `PLUGIN_ERROR`, and the plugin does not load.

API plugins ignore `filters`: their routes are mounted whenever `is_active` is true.

These codes in the log mark a plugin that did not load or run: `PLUGIN_INVALID` (a hook without `filters` or `listen_time`), `PLUGIN_UNKNOWN` (a config with no plugin behind it), `PLUGIN_ERROR` (a config that does not parse, or a hook that failed), `NATIVE_PLUGIN_LOAD_FAILED` (a subprocess plugin that did not start) and `SUBPROCESS_PLUGIN_TIMEOUT` (a plugin silent for 30 seconds).

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

A managed plugin that creates an entry through `EntryService.CreateAsync` is judged as the actor it passes, as a request is: its `create` grants and their row filters, and the owner group the entry names, which must be one the actor belongs to unless a grant without a row filter gives it `assign` at the entry's address.

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

To extend a deployment without recompiling the binary, drop a plugin into `~/.dmart/plugins/<name>/` and restart the server: a standalone executable in any language, next to its `config.json`. DMART runs the file named after the directory, or else another executable file in it; a `config.json` with no executable beside it is a load failure, logged as `NATIVE_PLUGIN_LOAD_FAILED` and listed on `GET /info/plugins`. The process starts in its own directory, and what it writes to stderr goes to DMART's log, prefixed `[<name>]`.

DMART speaks JSON-lines over stdin/stdout; if the process crashes it is respawned on the next event, so it can never take the server down. A process that dies during a call is restarted and sent that call once more, but only if it has made no callback yet; after one, the call fails, so a write is never repeated. A plugin that stays silent for 30 seconds is stopped, and that call fails. With `workers` above 1, each worker is its own process, so state the plugin keeps in memory exists once per worker, and consecutive calls need not reach the same one.

In-process shared-library plugins (`.so` / `.dylib` / `.dll`) have been removed: a crash in them took the server down, and they cannot load in the static build. A directory that still holds one is reported as a load failure that says so.

The subprocess protocol is a simple request/response over JSON lines:

```
# dmart → plugin (stdin)                    # plugin → dmart (stdout)
{"type":"info","host":{"callbacks":1}}       {"shortname":"my_plugin","version":"1.0.0","type":"hook"}
{"type":"hook","event":{...}}                {"status":"ok"}
{"type":"request","request":{...}}           {"status":"success","attributes":{...}}
```

The `version` in the `info` answer shows on `GET /info/plugins`, and defaults to `0.0.0`. A hook answers `{"status":"error","message":"..."}` to fail; from a `before` hook, that refuses the action. An API plugin's `info` answer also lists its `routes`, each a `method` and a `path`, mounted under `/{shortname}`; a method other than `GET`, `POST`, `PUT` or `DELETE` is mounted as `GET`.

**The hook event** is snake_case JSON: `space_name`, `subpath`, `shortname`, `action_type`, `resource_type`, `schema_shortname`, `user_shortname` and `attributes`, plus the record's `uuid`, `displayname`, `description` and `tags`. A field without a value is left out. The event carries no payload body; read the record with `load_entry`. In `attributes`:

- `state` — a ticket's state, after the action.
- `history_diff` — on an update's after event, the `{path: {old, new}}` diff its history row stores (see [history queries](/query-search#history)).
- `src_shortname`, `src_subpath` — on a `move`, whose event names the destination.

**The API request** holds `method`, `path` (the full request path), `query` and `headers` (objects of strings), `body` (the raw body as a string, left out when there is none) and `user` (the signed-in caller). DMART removes `authorization`, `proxy-authorization`, `cookie`, `x-channel-key` and `x-api-key` from `headers` first. The plugin's answer line becomes the response body, sent as JSON with HTTP status 200. To answer with bytes instead, such as a PDF, the plugin replies `{"binary":true,"content_type":"application/pdf","body_b64":"…","filename":"report.pdf"}`: DMART decodes `body_b64` and streams it with that content type, adding `Content-Disposition: attachment` when `filename` is given.

**Callbacks.** Before its final answer, a plugin may call back into DMART with lines such as `{"type":"callback","id":1,"op":"query","args":{...}}`, each answered on its stdin with `{"type":"callback_result","id":1,"ok":true,"result":{...}}`. `ok: false`, with an `error`, means DMART did not understand the frame (an unknown `op`, missing args). An operation that ran and failed comes back `ok: true`, with an `{"error":…}` document or a non-zero `code` in `result`.

| `op` | `args` | `result` |
|---|---|---|
| `load_entry` | `space`, `subpath`, `shortname`, optional `resource_type` | The entry, or `{"entry":null}` |
| `load_user` | `shortname` | The user, or `{"user":null}` |
| `save_entry` | `entry`, the whole entry | `{"code":0}` |
| `update_user` | `user`, the whole user | `{"code":0}` |
| `query` | The query itself, with an optional `as_actor` | A query response |
| `send_email` | `to`, `subject`, `html` | `{"code":0}` |
| `ws_broadcast` | `channel`, `message` | `{"code":0}` |
| `log` | `level` (0–6), optional `category`, `message` | `{"code":0}` |
| `get_media_attachment` | `space`, `subpath`, `shortname` | `{"media_b64":…,"length":N}`, or `{"media":null}` |
| `get_session_firebase_tokens` | `shortname`, optional `inactivity_ttl_seconds` | The push tokens (`firebase_token`) of the user's sessions, as a list; with the TTL, only of sessions active within it |
| `invalidate_firebase_tokens` | `tokens`, a list | `{"cleared":N}` |

After a push, pass the tokens FCM rejected (`UNREGISTERED`, `INVALID_ARGUMENT`) to `invalidate_firebase_tokens`. It clears them from every session that holds them, so the next `get_session_firebase_tokens` leaves them out.

- **Reads and writes skip DMART's checks.** `load_entry`, `load_user`, `save_entry` and `update_user` go straight to the database: no permission check, schema validation, folder content policy or hooks. `save_entry` and `update_user` write a history row only when they change an existing record, attributed to the user whose action started the exchange, with `x-source: plugin` and `x-plugin: <name>` in its stored headers; a create writes none. A write that must pass those checks goes through the REST API, signed in as the plugin's own account.

- **A `query` runs as the user whose action started the exchange**: the hook's `user_shortname`, or the API request's `user`. `"as_actor": "<user>"` in the query runs it as that user instead. `"as_actor": null` runs it as the anonymous user, never as the system: on every table (entries, attachments, users, roles, groups, permissions, spaces) it returns what an anonymous caller may list, under anonymous's grants, ACLs and row filters. A `history` query with it is refused.

- **More than 256 callbacks** in one exchange kills the process, and the call fails.

Two working samples in Python, a hook and an API plugin, live in the `custom_plugins_sdk/` directory of the repository, with a README that covers the protocol.
