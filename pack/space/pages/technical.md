## 1. Introduction

DMART (Data Mart) is a Data-as-a-Service (DaaS) platform designed to act as a streamlined, low-code information inventory system. It treats data assets as commodities, allowing for structured, unstructured, and binary data management. Optimized for small to medium data footprints (<=300 million primary entries), it uses a SQL database for data longevity and ACID compliance.

## 2. Architecture

DMART follows a microservices-friendly architecture with clear separation between the API layer, data processing, and storage.

```mermaid
graph TD
    User["User / Client"] -->|"HTTP/REST"| LB["Load Balancer / Reverse Proxy"]
    LB -->|HTTP| API["ASP.NET Core (Kestrel)"]

    subgraph "Backend (AOT binary)"
        API -->|RW| SQL["PostgreSQL or SQLite"]
        API -->|"MCP /mcp"| MCP["MCP Server"]
    end

    subgraph "Embedded Frontend"
        CXB["CXB (/cxb)"] -->|"API Calls"| API
        CAT["Catalog (/cat)"] -->|"API Calls"| API
    end

    SQL -->|"Export (zip)"| Backup["Backup / Import-Export"]
```

### Backend Stack

- **Language & Runtime:** C# on .NET 10, compiled ahead of time with **Native AOT** into a single self-contained binary (~70 MB) — no runtime install required. JSON is source-generated (System.Text.Json), and the same binary bundles both the server and the CLI client.

- **Web Framework:** ASP.NET Core Minimal APIs on the **Kestrel** HTTP server, built with the slim/AOT host (`WebApplication.CreateSlimBuilder`). Endpoints are route groups (`MapGroup`), not MVC controllers. Swagger/OpenAPI is served at `/docs`.

- **Data Persistence:** one SQL database is the single source of truth for all runtime data: **PostgreSQL** (via Npgsql) for the full tier, or **SQLite** for a single node, the edge and development — ACID compliant with relational integrity. There is no Redis and no filesystem runtime store; caches are in-process only.

- **Authentication:** JWT Bearer (HS256, Argon2id-hashed passwords), sign-in with a one-time code by email or SMS, and Google, Facebook and Apple sign-in. DMART can also be an OAuth 2.1 authorization server for MCP clients (`ENABLE_MCP=true`), an OpenID Connect provider (`OIDC_ISSUER`), and a read-only LDAP directory with replicas.

- **Interoperability:** Built-in MCP server at `/mcp` (Streamable HTTP; off by default, enable with `ENABLE_MCP=true`) and WebSocket endpoints for realtime updates.

### Frontend Stack

DMART ships two **Svelte 5 + Vite** admin SPAs that are **embedded directly into the .NET binary** and served by ASP.NET middleware — no separate frontend deployment:

- **CXB (`/cxb`):** the Customer eXperience Builder — the primary administrative interface.

- **Catalog (`/cat`):** a user-oriented SPA.

- **Under the hood:** Svelte 5, @roxi/routify v3, Vite, and Svelte stores for state.

## 3. Data Model

DMART uses an **Entry-oriented** data model rather than a document-oriented one. Every entity shares a common set of Meta fields and is told apart by its `resource_type`.

### Resource Hierarchy

- **Space:** Top-level container defining configuration like languages, indexing, and visibility.

- **Subpath:** Logical folder structure within a space (e.g., `/content/posts`).

- **Entry:** Atomic unit of information with UUID, Shortname, Meta, Payload, and Attachments.

### Key Data Structures

The C# models are sealed records (`Entry`, `Attachment`, `User`, `Space`, `Role`, `Permission`, `Group`, …), not a class hierarchy.

- **Meta:** the fields every entry shares (uuid, shortname, slug, acl, owner, timestamps, …).

- **Record:** Flat representation for API I/O.

- **Payload:** Content type, schema reference, and body.

- **Attachment:** a resource bound to a parent entry, stored in its own table: media, comment, reaction, relationship, and more.

- **DataAsset:** an attachment holding a tabular or binary data file — supported content types are **CSV**, **JSONL**, **SQLite**, and **Parquet**. Here `sqlite` is a content type, not to be confused with the SQLite database backend.

- **Ticket:** an entry with workflow state, a reporter, and collaborators.

## 4. Key Features

### 4.1 Storage & Data Longevity

Data is stored in normalized SQL tables, on PostgreSQL or SQLite, ensuring ACID compliance and standard relational integrity. The database is the sole runtime store; the on-disk `spaces/` + `.dm/` layout is used only as a portable import/export, seed, and migration format (zip round-trips), never as a live data store.

### 4.2 Advanced Search & Querying

The `/query` endpoint supports a rich query language that is compiled to SQL. On PostgreSQL, search uses trigram indexes (`pg_trgm` + GIN on jsonb) and full-text indexes, with optional **pgvector** semantic search for cosine-similarity matching; on SQLite, FTS5 indexes:

- **Filtering:** By space, subpath, resource type, schema, and specific shortnames.

- **Full-text Search:** plain words match whole and partial words in entry values, with spelling correction, best match first.

- **Aggregation:** Grouping and reducing data (counts, sums).

- **Sorting & Pagination:** `limit`, `offset`, `sort_by`.

- **Specialized Queries:** `history`, `events`, `tags`, `counters`, `random`.

### 4.3 Access Control (RBAC + ACL)

Security enforced via a comprehensive `AccessControl` module:

- **Permission Scope:** Action type, subpath, resource type, conditions, field-level restrictions.

- **ACLs:** Per-instance access overrides on individual entries.

### 4.4 Workflows & Tickets

Ticketing system with state management and a `/progress-ticket` API for workflow transitions.

### 4.5 Data Import/Export

- **ZIP:** Full space export/import preserving folder structure.

- **CSV Export:** Stream query results as CSV (`/csv` endpoint).

- **CSV Import:** Batch-create resources from CSV uploads (`/resources_from_csv`).

### 4.6 Plugin System

Event-driven plugin architecture built around two C# interfaces: `IApiPlugin` (new endpoints mounted at `/{shortname}`) and `IHookPlugin` (before/after action interceptors). Beyond managed C# plugins, DMART also loads **subprocess plugins** from `~/.dmart/plugins` — crash-safe executables speaking JSON-lines over stdin/stdout — enabling extensions written in any language.

## Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Middleware
    participant Router
    participant AccessControl
    participant PluginManager
    participant SqlAdapter

    Client->>Middleware: HTTP Request (Kestrel)
    Middleware->>Middleware: JWT Auth & Logging
    Middleware->>Router: Route Request (Minimal API)
    Router->>AccessControl: Check Permissions (RBAC/ACL)
    alt Access Denied
        AccessControl-->>Client: 403 Forbidden
    else Access Granted
        Router->>PluginManager: Trigger Before Hooks
        PluginManager->>PluginManager: Run IHookPlugin handlers

        Router->>SqlAdapter: Perform Action (CRUD)
        SqlAdapter->>SqlAdapter: Persist to the database & index

        Router->>PluginManager: Trigger After Hooks
        PluginManager->>PluginManager: Run after hooks (concurrent ones in the background)

        Router-->>Client: HTTP Response
    end
```

## 5. API Structure

REST-like and resource-oriented. Key routers:

**`/managed`**: Core content management (CRUD, Query, Import/Export).

- `/request`: Unified endpoint for batch operations.

- `/query`: Main search endpoint.

- `/entry`: Single entry metadata and payload.

- `/payload`: Raw content/media retrieval.

- `/import` / `/export`: Bulk data operations.

- **`/user`**: Authentication and profile management.

- **`/public`**: Read-only access for public content.

- **`/qr`**: QR code endpoints (mapped, not implemented yet; they answer 501).

- **`/info`**: System information and manifest.

- **`/mcp`**: Model Context Protocol server (Streamable HTTP) exposing DMART tools to AI clients, paired with the OAuth 2.1 Authorization Server for client onboarding. Requires `ENABLE_MCP=true`; off by default.

- **`/docs`**: Swagger UI and OpenAPI schema (`/docs/openapi.json`).

## 6. Data Asset Management

DMART natively handles analytical data files:

- **SQLite** files can be stored as data-asset attachments. Note that `sqlite` here is a content type, not to be confused with the SQLite database backend.

- **Parquet**, **JSONL**, and **CSV** are treated as first-class data citizens.

## 7. Deployment

- **Single Binary:** Native-AOT publish produces one self-contained `dmart` executable (~70 MB). The static musl build has no runtime dependency at all — copy and run; the glibc builds ship `libe_sqlite3.so` and `libargon2.so.1` beside it. The embedded admin UIs and sample seed data ship inside it, and the same binary doubles as the CLI (`seed`, `import`, `export`, `migrate`).

- **Containerized:** Docker/Podman images available (`ghcr.io/edraj/csdmart`).

- **Config:** Environment variables / `config.env`, bound and validated once at startup (strict unknown-key rejection, no hot reload).

- **External dependency:** none on SQLite (the default for the RPM, DEB and APK packages and the container); a PostgreSQL instance for the full tier — no Redis, no separate search cluster required.
