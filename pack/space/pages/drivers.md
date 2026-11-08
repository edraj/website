Integrate DMART with official client libraries.

## Python

**pydmart** Official Python client.

```bash
pip install pydmart
```

Usage

```python
from pydmart import DmartService, QueryRequest, QueryType

dmart = DmartService("http://localhost:8282")
await dmart.login("dmart", "change-me")

resp = await dmart.query(QueryRequest(
    type=QueryType.subpath,
    space_name="management",
    subpath="/users",
    search="",
    limit=10,
))
for record in resp.records:
    print(record.shortname)
```

[PyPI →](https://pypi.org/project/pydmart/)

## C# / .NET

**Dmart.Client** Async C# client for .NET Standard 2.1, .NET 8 & .NET 10 (AOT-friendly).

```bash
dotnet add package Dmart.Client
```

Usage

```csharp
using Dmart.Client;
using Dmart.Models.Api;
using Dmart.Models.Enums;

using var client = new DmartClient("http://localhost:8282");
await client.LoginAsync("dmart", "change-me");

var resp = await client.QueryAsync(new Query
{
    Type = QueryType.Subpath,
    SpaceName = "management",
    Subpath = "/users",
    Limit = 10,
});

foreach (var record in resp.Records ?? [])
    Console.WriteLine(record.Shortname);
```

Password resets and health checks

- **A password reset by code:** `PasswordResetRequestAsync` sends the code, and `PasswordResetConfirmAsync(otp, password, …)` redeems it and sets the new password, naming the same shortname, phone or email. No admin call sets a password (see [Managing User Accounts](/access-control#managing-user-accounts)).
- **`GetSpaceHealthAsync(space)`** runs the `soft` health check of a space (`/managed/health/soft/{space}`, global admins only), and `GetSpaceHealthAsync(space, "hard")` or `"all"` adds up to 10 sample shortnames for each check.

Errors and retired calls

- **A failed record in a batch.** When any record of a `RequestAsync` (`/managed/request`) fails, the call throws a `DmartException` whose `Error.Code` is `SOMETHING_WRONG` (430). Each failed record's own code and message are in `Error.Info[0]["failed"]`, as `error_code` and `error`: a payload that fails its schema is `INVALID_DATA` (402), "payload failed schema validation", listing each failing constraint.
- **`FetchDataAssetAsync`** is marked `[Obsolete]`. It posts to `/managed/data-asset`, which dmart does not serve, so every call fails. Download the file from the URL `GetAttachmentUrl` builds instead.

Reading whole numbers

A number stored as `10240.0` (the way Python, and a .NET `decimal` with scale, write it) is an integer to the server's JSON Schema, but `System.Text.Json` refuses to read it into an `int`. `IntegralInt32Converter` and `IntegralInt64Converter` read it into an `int` or `long`, and still refuse a real fraction:

```csharp
using Dmart.Client.Json;

public sealed class Grant
{
    [JsonPropertyName("data")]
    [JsonConverter(typeof(IntegralInt32Converter))]   // reads 10240.0 as 10240
    public int Data { get; set; }
}
```

[NuGet →](https://www.nuget.org/packages/Dmart.Client)

**More .NET packages**

| Package | Targets | What it is |
|---|---|---|
| `Dmart.Models` | .NET Standard 2.1, .NET 8, .NET 10 | the wire types (`Record`, `Query`, `Response`, the enums); `Dmart.Client` pulls it in |
| `Dmart.QueryGrammar` | .NET 8, .NET 10 | the parser for search expressions such as `@field:value` |
| `Dmart.SqlAdapter` | .NET 8, .NET 10 | direct reads and writes of a dmart PostgreSQL database, without the server |

`Dmart.Client` and these three packages are licensed LGPL-3.0-or-later: an application that uses them may be under any license, and the LGPL covers changes to the packages themselves. The dmart server is AGPL-3.0.

`Dmart.SqlAdapter` works on a database the dmart server has already set up, and suits tools inside the same trust boundary: ETL, bulk loads, internal services.

- **`DmartSqlAdapter.WithRbac(db)`** checks every call against the roles, ACLs and query policies of the `actor` it names, and holds each write to the server's rules, so an app can do no more through it than the same caller could through the HTTP API (see [Dmart.SqlAdapter under RBAC](#dmartsqladapter-under-rbac)). A `null` actor is the anonymous user.
- **`new DmartSqlAdapter(db)`** is the system context: no permission checks, and `actor` is ignored.
- **Either way** it leaves out what the server adds on top of the database: schema validation, folder content rules, plugin hooks, the history rows a write records, and the tombstones an incremental export reads deletions from. Under RBAC it reads a ticket's workflow only to refuse what the server refuses. Use `Dmart.Client` when you need those.
- **Concurrent writes.** An update, move or delete is checked, inside its transaction, against the revision of the entry it read and judged, so a change another writer made in between is never written over. An update or delete then throws `DmartConflictException`, and a move moves nothing and answers `false`: load the entry again and reapply the change. The revision is a column the dmart server adds when it sets up or migrates the database. Until it is there the adapter writes without comparing, and it compares from its next write once it is, with no restart. The revision is not in the JSON the adapter or the API hands out.
- **Folders with `unique_fields`.** The adapter refuses a write into such a folder, and a folder save that sets `unique_fields` or changes them, in the system context too: use the HTTP API, which checks uniqueness inside the write's transaction, and checks the records already in a folder against new rules. A folder save that keeps its rules as stored (a new display name, a move) goes ahead.
- **`IDmartData`:** `DmartSqlAdapter` and `DmartClient` both implement it, so code written against the interface takes either.

```csharp
using Dmart.Models.Enums;
using Dmart.SqlAdapter;

var db = new DmartDb("Host=localhost;Username=dmart;Password=secret;Database=dmart");
var adapter = DmartSqlAdapter.WithRbac(db);

var entry = await adapter.LoadAsync("products", "/catalog", "widget_42",
    ResourceType.Content, actor: "alice");
```

### Dmart.SqlAdapter under RBAC

**Reads and listings** follow the server's permission rules:

- **Owning a row does not list it.** A listing follows the grants' resource types and conditions. An `own` grant lists the actor's rows, but not its own user record, which `GetProfileAsync` serves without a grant.
- **An ACL that denies `view` or `query`** keeps a row or a space out of every listing, whatever grant admits it. The SDK exempts no one from a deny.
- **A grant with `filter_fields_values`** lists no row, reads no record and admits no write, except on folders and spaces: the SDK does not evaluate row filters. Read and write those rows through the HTTP API.
- **`__current_user__` and `__current_user__owner__`** resolve as on the server. Neither resolves for the anonymous actor or to a name of the form `__name__`, nor the owner word for an account no one owns, and a subpath that names one then reaches nothing.
- **Subpaths.** A grant on a space's root lists the whole space; an empty subpaths list (`{"S": []}`) reaches nothing. The spaces listing counts only grants that hold `view` or `query` and reach something.
- **The management space** is limited as on the server (see [The Management Space](/access-control#the-management-space)), in every check and listing and in the permission map. Give the adapter the server's exemptions and sign-up role, or it limits every account that is not an admin, as a server with no exemptions does:

  ```csharp
  var adapter = DmartSqlAdapter.WithRbac(db, options: new DmartSqlAdapterOptions
  {
      ManagementExemptRoles = ["ops_admin"],          // MANAGEMENT_EXEMPT_ROLES
      ManagementExemptAccounts = ["integration_bot"], // MANAGEMENT_EXEMPT_ACCOUNTS
      UserCreateDefaultRole = "customer",             // USER_CREATE_DEFAULT_ROLE
  });
  ```

  A `PermissionEngine` built by hand takes the same three. An exemption naming `anonymous`, `world`, `logged_in` or the sign-up role throws `ArgumentException`, as the server refuses to start.
- **Accounts.** A deleted account holds no grant. The inactive `anonymous` row the server creates resolves its roles, so the anonymous actor gets what `world` opens.
- **A read by name** answers a record the actor may not read as a missing one: `null` where the address admits the actor, `DmartPermissionDeniedException` where it does not. `LoadAsync`, `LoadOrNoneAsync`, `GetSchemaAsync`, `FetchSpaceAsync`, `LoadUserMetaAsync` and `LoadUserMetaForAuthAsync` answer so, and `IsEntryExistAsync` judges a record on its stored type.
- **No password hash** comes back under RBAC, from `LoadUserMetaForAuthAsync` included. A sign-in reads the hash on a system-context adapter.
- **History.** `QueryHistoryAsync` reads a record's history as far as the record is listed, so a `view` grant alone reads none, and only with `history` in a grant, with `view` or `query`, at the record's folder. It answers `[]` when refused. Its rows carry no request headers, and each diff has its secret-named fields masked at any depth, as the server's history does (see [`history`](/query-search#history)).
- **`GetUserPermissionsAsync`** computes the map `GET /user/permissions` returns. Under RBAC it reads the actor's own only: another account answers as a missing one, and a deactivated, deleted or anonymous actor is refused.
- **`GetLockerAsync(locator, actor)`** names the holder only to an actor that may read the record; the overload without an actor answers as the anonymous user.
- **`PermissionFilter.Append`** filters a missing actor as anonymous, and throws `NotSupportedException` for `attachments` and `histories`.

**Writes** follow the server's write rules:

- **Field limits** (`restricted_fields`, `allowed_fields_values`) apply to creates, updates and moves, to every element of an array. Removing a limited field counts as writing it as null.
- **The ACL, the owner and the collaborators.** An update that changes the ACL is judged as an ACL update, and may hand out only actions the writer holds. Changing the owner takes `assign` and an owner that exists, and changes nothing else. A create's owner is the caller, and naming another takes `assign`; so does naming an owner group the caller does not belong to. Changing `collaborators` takes `update`, under the field limits on `collaborators` and `collaborators.<key>`; the map is written whole.
- **Times and fixed fields.** An update keeps `uuid`, `created_at`, `resource_type`, `owner_group_shortname`, `last_checksum_history` and the payload's `client_checksum` and `content_sub_type` as stored, and stamps `updated_at`. A JSON payload's `checksum` is the SHA-256 of its body as compact JSON: an update that changes the body sets a new one, in the system context too, and one that leaves it keeps the stored value. A create is stamped with the current time, writes no `client_checksum` or `content_sub_type`, and gives a JSON body its checksum. A system-context create keeps the times and fields it is given.
- **Missing and forbidden alike.** A caller without the right gets the same answer whether or not the record exists: `UpdateAsync`, `DeleteAsync`, `MoveAsync`, `TryLockAsync` and `AppendHistoryAsync` throw the refusal, and `CreateAsync` checks `create` before the name conflict. A caller with the right still hears that the record is missing.
- **Moves** take `update` at the source and `create` at the destination, and regenerate the row's `query_policies` so it lists in its new folder.
- **Deletes and moves carry what hangs off the record,** in one transaction and in the system context too: a delete takes the record's attachments, history and lock, a move carries them, and a folder's delete or move takes everything beneath it.
- **Tickets.** A ticket created on, or put on, a workflow starts at the workflow's initial state.
- **Relationships.** Every target a create names, or an update adds, must be a record the caller may read: an entry, or a user, role, group, permission or space, looked up in its own table and judged at its place in management (a space at its own root). A global admin reads every target that exists.
- **Locks and history.** The anonymous actor takes no lock, and `AppendHistoryAsync` takes `update` on the record.

What each refusal throws:

| Refused | Thrown |
|---|---|
| An action the caller does not hold | `DmartPermissionDeniedException` |
| A space, user, role, group, permission or attachment type in `entries`: written by a create, update, save or move, in the system context too, or deleted under RBAC | `DmartException`, `NOT_SUPPORTED_TYPE` (217) |
| A space name, subpath or shortname the server refuses (a `/` in a shortname, a trailing newline, too long): on create, save and a move's destination in the system context too, and under RBAC on update, delete, a move's source and history append | `DmartValidationException`, `INVALID_DATA` (402) |
| Another user's live lock, on update, save, delete or move | `DmartException`, `LOCKED_ENTRY` (31), status 423 |
| An update or delete of an entry another writer changed after the call read it, in the system context too | `DmartConflictException`, status 409 |
| A write into a folder with `unique_fields`, or a folder save that sets or changes them, in the system context too | `DmartValidationException`, `NOT_SUPPORTED_TYPE` (217) |
| An update that changes a workflow ticket's `state`, `is_open`, `resolution_reason` or `workflow_shortname` (use progress-ticket; a global admin may) | `DmartException`, `INVALID_TICKET_STATUS` (300) |
| A relationship target the caller cannot read, or that is not there | `DmartValidationException`, `INVALID_DATA`, "relationship target not found" |
| A folder that holds records, deleted without `DeleteAsync(locator, force: true, actor)`, in the system context too; under RBAC, a record another record's relationship points at | `DmartException`, `CANNT_DELETE` (204) |
| A folder moved into itself or beneath it, in the system context too | `DmartValidationException`, `INVALID_DATA` |
| An owner that does not exist | `DmartNotFoundException` |

**Trimmed and Native AOT hosts.** The rule checks serialize through a source-generated context of the SDK's own, chained before the host's resolver, and need no reflection. Pass `JsonSerializerOptions` whose resolver covers the `Dmart.Models` records the adapter reads and writes (`Entry`, `User`, `Space`, `Dictionary<string, object>`).

## TypeScript / JavaScript

**@edraj/tsdmart** Fully typed client for Node, Deno, Bun, and browsers.

```bash
npm install @edraj/tsdmart
```

Usage

```typescript
import axios from "axios";
import { Dmart, QueryType } from "@edraj/tsdmart";

Dmart.setAxiosInstance(axios.create({ baseURL: "http://localhost:8282" }));
await Dmart.login("dmart", "change-me");

const resp = await Dmart.query({
  type: QueryType.subpath,
  space_name: "management",
  subpath: "/users",
  search: "",
  limit: 10,
});
console.log(resp?.records?.map((r) => r.shortname));
```

[NPM →](https://www.npmjs.com/package/@edraj/tsdmart)

## Dart / Flutter

**dmart** Native Dart package for cross-platform apps.

```
flutter pub add dmart
```

Usage

```dart
import 'package:dmart/dmart.dart';

Dmart.dmartServerUrl = 'http://localhost:8282';
Dmart.initDmart();
await Dmart.login(LoginRequest(shortname: 'dmart', password: 'change-me'));

final (resp, _) = await Dmart.query(QueryRequest(
  queryType: QueryType.subpath,
  spaceName: 'management',
  subpath: '/users',
  limit: 10,
));
for (final record in resp?.records ?? []) {
  print(record.shortname);
}
```

[pub.dev →](https://pub.dev/packages/dmart)
