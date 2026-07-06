<script lang="ts">
</script>

<div class="content">
    <h1>API Documentation</h1>
    <p class="intro">
        Comprehensive reference for the DMART API. All endpoints, data
        structures, and usage examples.
    </p>

    <!-- ═══ BASE & AUTH ═══ -->
    <div class="feature-section">
        <h2>Base URL &amp; Authentication</h2>
        <p>
            The API is served by the self-contained DMART binary (.NET 10 Native
            AOT) on ASP.NET Core / Kestrel. The base URL for all API requests is
            typically: <code>http://localhost:8282</code> (or as configured via
            <code>LISTENING_HOST</code> / <code>LISTENING_PORT</code>).
        </p>
        <p>
            Most endpoints require authentication with a JWT bearer token
            (HS256), supplied either as a header or a cookie:
        </p>
        <div class="grid-list">
            <div class="item">
                <strong>Header</strong>
                <span
                    ><code>Authorization: Bearer &lt;your_token&gt;</code></span
                >
            </div>
            <div class="item">
                <strong>Cookie</strong>
                <span><code>auth_token=&lt;your_token&gt;</code></span>
            </div>
        </div>
        <p>
            Tokens are obtained via <code>/user/login</code> (password or OTP) or
            through OAuth social login (Google, Facebook, Apple). DMART also
            exposes a full <strong>OAuth 2.1 Authorization Server</strong> —
            discovery, Dynamic Client Registration, and authorize/token
            endpoints under <code>/.well-known</code> — used for automatic
            onboarding of MCP clients.
        </p>
        <p>
            Interactive API documentation is available as <strong
                >Swagger UI</strong
            > at <code>/docs</code>, with the raw OpenAPI schema at
            <code>/docs/openapi.json</code> (both served by ASP.NET Core).
        </p>
    </div>

    <!-- ═══ DATA STRUCTURES ═══ -->
    <div class="feature-section">
        <h2>Common Data Structures</h2>

        <h3>Record</h3>
        <p>
            Represents a resource in the system. This is the primary object for
            creating or updating entities.
        </p>
        <div class="code-container">
            <pre><code
                    >{`{
  "resource_type": "content",
  "shortname": "my-article",
  "subpath": "/blog",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "attributes": {
    "is_active": true,
    "slug": "my-article-slug",
    "displayname": { "en": "My Article" },
    "description": { "en": "A description" },
    "tags": ["news", "tech"],
    "owner_shortname": "jdoe",
    "owner_group_shortname": "editors",
    "created_at": "2023-10-01T12:00:00",
    "updated_at": "2023-10-01T12:00:00",
    "payload": {
      "content_type": "json",
      "schema_shortname": "article",
      "body": { "title": "Hello World", "content": "..." }
    },
    "acl": [
      {
        "user_shortname": "jane",
        "allowed_actions": ["view", "update"]
      }
    ],
    "relationships": [
      {
        "related_to": {
          "space_name": "data",
          "type": "user",
          "subpath": "users",
          "shortname": "jane"
        },
        "attributes": { "role": "editor" }
      }
    ]
  }
}`}</code
                ></pre>
        </div>

        <h3>Request</h3>
        <p>Used for batch operations (create, update, delete, etc.).</p>
        <div class="code-container">
            <pre><code
                    >{`{
  "space_name": "data",
  "request_type": "create",
  "records": [ ... list of Record objects ... ]
}`}</code
                ></pre>
        </div>

        <h3>Query</h3>
        <p>
            Used for searching and filtering resources. Supports full-text
            search, aggregation, joins, and JQ filters.
        </p>
        <div class="code-container">
            <pre><code
                    >{`{
  "type": "search",
  "space_name": "data",
  "subpath": "/blog",
  "exact_subpath": false,
  "filter_types": ["content"],
  "filter_schema_names": ["article"],
  "filter_shortnames": [],
  "filter_tags": ["tech"],
  "search": "@title:Hello*",
  "from_date": "2023-01-01T00:00:00",
  "to_date": "2023-12-31T23:59:59",
  "exclude_fields": ["payload.body"],
  "include_fields": ["shortname", "displayname"],
  "highlight_fields": { "description.en": "<b>" },
  "sort_by": "created_at",
  "sort_type": "descending",
  "retrieve_json_payload": true,
  "retrieve_attachments": false,
  "retrieve_total": true,
  "validate_schema": true,
  "retrieve_lock_status": false,
  "jq_filter": ". | select(.attributes.is_active == true)",
  "limit": 10,
  "offset": 0,
  "aggregation_data": {
    "group_by": ["@tags"],
    "reducers": [
      { "reducer_name": "count_distinct", "alias": "count", "args": ["@shortname"] }
    ]
  },
  "join": [
    {
      "join_on": "uuid",
      "alias": "author_details",
      "query": { "...nested Query..." }
    }
  ]
}`}</code
                ></pre>
        </div>
    </div>

    <!-- ═══ ENUMS ═══ -->
    <div class="feature-section">
        <h2>Enums &amp; Possible Values</h2>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Enum</th>
                        <th>Values</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>ResourceType</strong> (30)</td>
                        <td
                            ><code>user</code>, <code>group</code>,
                            <code>folder</code>, <code>schema</code>,
                            <code>content</code>, <code>log</code>,
                            <code>acl</code>, <code>comment</code>,
                            <code>media</code>, <code>data_asset</code>,
                            <code>locator</code>, <code>relationship</code>,
                            <code>alteration</code>, <code>history</code>,
                            <code>space</code>, <code>permission</code>,
                            <code>role</code>, <code>ticket</code>,
                            <code>json</code>, <code>lock</code>,
                            <code>post</code>, <code>reaction</code>,
                            <code>reply</code>, <code>share</code>,
                            <code>plugin_wrapper</code>,
                            <code>notification</code>, <code>csv</code>,
                            <code>jsonl</code>, <code>sqlite</code>,
                            <code>parquet</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>RequestType</strong> (7)</td>
                        <td
                            ><code>create</code>, <code>update</code>,
                            <code>patch</code>, <code>update_acl</code>,
                            <code>assign</code>, <code>delete</code>,
                            <code>move</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>ContentType</strong> (21)</td>
                        <td
                            ><code>text</code>, <code>comment</code>,
                            <code>reaction</code>, <code>markdown</code>,
                            <code>html</code>, <code>json</code>,
                            <code>image</code>, <code>image_jpeg</code>,
                            <code>image_png</code>, <code>image_svg</code>,
                            <code>image_gif</code>, <code>image_webp</code>,
                            <code>python</code>, <code>pdf</code>,
                            <code>audio</code>, <code>video</code>,
                            <code>csv</code>, <code>parquet</code>,
                            <code>jsonl</code>, <code>apk</code>,
                            <code>sqlite</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>ActionType</strong> (11)</td>
                        <td
                            ><code>query</code>, <code>view</code>,
                            <code>update</code>, <code>create</code>,
                            <code>delete</code>, <code>attach</code>,
                            <code>assign</code>, <code>move</code>,
                            <code>progress_ticket</code>, <code>lock</code>,
                            <code>unlock</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>QueryType</strong> (12)</td>
                        <td
                            ><code>search</code>, <code>subpath</code>,
                            <code>events</code>, <code>history</code>,
                            <code>tags</code>, <code>random</code>,
                            <code>spaces</code>, <code>counters</code>,
                            <code>reports</code>, <code>aggregation</code>,
                            <code>attachments</code>,
                            <code>attachments_aggregation</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>Language</strong> (5)</td>
                        <td
                            ><code>arabic</code>, <code>english</code>,
                            <code>kurdish</code>, <code>french</code>,
                            <code>turkish</code>
                            <span class="code-note"
                                >These full spellings are the persisted enum wire
                                values (e.g. <code>space.languages</code>). The
                                2-letter keys <code>ar</code> / <code>en</code> /
                                <code>ku</code> / <code>fr</code> /
                                <code>tr</code> are ONLY keys inside
                                <code>displayname</code> /
                                <code>description</code> translation maps — they
                                are NOT Language enum values.</span
                            ></td
                        >
                    </tr>
                    <tr>
                        <td><strong>SortType</strong> (2)</td>
                        <td><code>ascending</code>, <code>descending</code></td>
                    </tr>
                    <tr>
                        <td><strong>UserType</strong> (3)</td>
                        <td
                            ><code>web</code>, <code>mobile</code>,
                            <code>bot</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>PluginType</strong> (2)</td>
                        <td><code>hook</code>, <code>api</code></td>
                    </tr>
                    <tr>
                        <td><strong>EventListenTime</strong> (2)</td>
                        <td><code>before</code>, <code>after</code></td>
                    </tr>
                    <tr>
                        <td><strong>JoinType</strong> (4)</td>
                        <td
                            ><code>left</code>, <code>right</code>,
                            <code>inner</code>, <code>outer</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>PublicSubmitResourceType</strong> (2)</td>
                        <td
                            ><code>content</code>, <code>ticket</code>
                            <span class="code-note"
                                >The only two resource types accepted by
                                <code>/public/submit</code>.</span
                            ></td
                        >
                    </tr>
                    <tr>
                        <td><strong>Status</strong> (2)</td>
                        <td
                            ><code>success</code>, <code>failed</code>
                            <span class="code-note"
                                >The response-envelope <code>status</code> field
                                (see below).</span
                            ></td
                        >
                    </tr>
                    <tr>
                        <td><strong>TaskType</strong> (1)</td>
                        <td><code>query</code></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <h3>String conventions (NOT typed enums)</h3>
        <p>
            The following values are string <strong>conventions</strong> — they
            are validated/handled as plain strings and have <em>no</em> backing
            C# enum. Only the two permission condition constants
            (<code>own</code>, <code>is_active</code>) are real string constants;
            reaction kinds, the lock action string, and notification
            type/priority are inherited Python-era conventions.
        </p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Convention</th>
                        <th>Values</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td
                            ><strong>Permission conditions</strong>
                            <span class="code-note">(real string constants)</span
                            ></td
                        >
                        <td><code>own</code>, <code>is_active</code></td>
                    </tr>
                    <tr>
                        <td
                            ><strong>Reaction kinds</strong>
                            <span class="code-note">(convention)</span></td
                        >
                        <td
                            ><code>like</code>, <code>dislike</code>,
                            <code>love</code>, <code>care</code>,
                            <code>laughing</code>, <code>sad</code></td
                        >
                    </tr>
                    <tr>
                        <td
                            ><strong>Lock action</strong>
                            <span class="code-note">(convention)</span></td
                        >
                        <td
                            ><code>lock</code>, <code>unlock</code>
                            <span class="code-note"
                                >(acquire/release via the
                                <code>/managed/lock</code> routes)</span
                            ></td
                        >
                    </tr>
                    <tr>
                        <td
                            ><strong>Notification type</strong>
                            <span class="code-note">(convention)</span></td
                        >
                        <td><code>admin</code>, <code>system</code></td>
                    </tr>
                    <tr>
                        <td
                            ><strong>Notification priority</strong>
                            <span class="code-note">(convention)</span></td
                        >
                        <td
                            ><code>high</code>, <code>medium</code>,
                            <code>low</code></td
                        >
                    </tr>
                </tbody>
            </table>
        </div>

        <h3>Response envelope</h3>
        <p>
            Every <code>/managed</code>, <code>/public</code>, and
            <code>/user</code> endpoint returns the same envelope. A success
            carries <code>records</code> and an <code>attributes</code> block
            (with <code>total</code> / <code>returned</code> counts on queries);
            a failure carries a single <code>error</code> triple and
            <code>records: null</code>.
        </p>
        <div class="code-container">
            <pre><code
                    >{`// success
{
  "status": "success",
  "error": null,
  "records": [ /* ...Record objects... */ ],
  "attributes": { "total": 128, "returned": 10 }
}

// failure
{
  "status": "failed",
  "error": {
    "type": "jwtauth",
    "code": 401,
    "message": "Not authenticated",
    "info": null
  }
}`}</code
                ></pre>
        </div>
    </div>

    <!-- ═══ USER MANAGEMENT ═══ -->
    <div class="feature-section">
        <h2>User Management <code>/user</code></h2>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/user/check-existing</code>
            </div>
            <p>Checks if a user with specific fields already exists.</p>
            <p class="params">
                <strong>Query Params:</strong> <code>shortname</code>,
                <code>msisdn</code>, <code>email</code> (all optional)
            </p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/create</code>
            </div>
            <p>Registers a new user.</p>
            <div class="code-container">
                <pre><code
                        >{`{
  "resource_type": "user",
  "shortname": "jdoe",
  "subpath": "users",
  "attributes": {
    "email": "jdoe@example.com",
    "password": "StrongPassword123!",
    "displayname": { "en": "John Doe" }
  }
}`}</code
                    ></pre>
            </div>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/login</code>
            </div>
            <p>Authenticates a user and returns a token.</p>
            <div class="code-container">
                <pre><code
                        >{`{
  "shortname": "jdoe",
  "password": "StrongPassword123!"
}`}</code
                    ></pre>
            </div>
            <p class="code-note">Or via OTP:</p>
            <div class="code-container">
                <pre><code
                        >{`{
  "msisdn": "1234567890",
  "otp": "123456"
}`}</code
                    ></pre>
            </div>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/user/profile</code>
            </div>
            <p>Retrieves the profile of the currently logged-in user.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/profile</code>
            </div>
            <p>Updates the profile of the currently logged-in user.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/logout</code>
            </div>
            <p>Logs out the current user.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/delete</code>
            </div>
            <p>Deletes the current user's account.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/otp-request</code>
            </div>
            <p>Requests an OTP for login or verification.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/otp-request-login</code>
            </div>
            <p>Requests an OTP specifically for login purposes.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/password-reset-request</code>
            </div>
            <p>Initiates the password reset process.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/otp-confirm</code>
            </div>
            <p>Verifies the OTP sent to the user.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/reset</code>
            </div>
            <p>Resets a user's password (requires appropriate permissions).</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/user/validate_password</code>
            </div>
            <p>
                Checks if the provided password is correct for the current user.
            </p>
        </div>

        <h3>Social Login Callbacks</h3>
        <p>Handles callbacks from social login providers.</p>
        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/user/google/callback</code>
            </div>
            <p>Google OAuth callback.</p>
        </div>
        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/user/facebook/callback</code>
            </div>
            <p>Facebook OAuth callback.</p>
        </div>
        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/user/apple/callback</code>
            </div>
            <p>Apple OAuth callback.</p>
        </div>
    </div>

    <!-- ═══ MANAGED CONTENT ═══ -->
    <div class="feature-section">
        <h2>Managed Content <code>/managed</code></h2>
        <p>Endpoints for authenticated management of content and resources.</p>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/managed/request</code>
            </div>
            <p>Performs batch operations (create, update, delete, etc.).</p>
            <div class="code-container">
                <pre><code
                        >{`{
  "space_name": "data",
  "request_type": "create",
  "records": [
    {
      "resource_type": "content",
      "shortname": "new-item",
      "subpath": "/items",
      "attributes": {
        "displayname": {"en": "New Item"},
        "payload": {
          "content_type": "json",
          "body": {"key": "value"}
        }
      }
    }
  ]
}`}</code
                    ></pre>
            </div>
            <p class="code-note">
                <strong>Delete with <code>force</code> / <code>dry_run</code>:</strong>
                a <code>delete</code> request accepts two top-level flags.
                <code>force: true</code> cascade-deletes a non-empty folder (and
                all its contents); a plain delete of a non-empty folder is
                rejected. <code>dry_run: true</code> projects the full cascade
                and returns an affected-count report <em>without removing
                anything</em>.
            </p>
            <div class="code-container">
                <pre><code
                        >{`{
  "space_name": "data",
  "request_type": "delete",
  "force": true,
  "dry_run": true,
  "records": [
    { "resource_type": "folder", "shortname": "archive", "subpath": "/" }
  ]
}
// -> success envelope; each record's attributes carry a per-category
//    "report" of what WOULD be deleted, plus "dry_run": true (nothing removed).`}</code
                    ></pre>
            </div>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/managed/query</code>
            </div>
            <p>Executes a query against the database.</p>
            <div class="code-container">
                <pre><code
                        >{`{
  "type": "search",
  "space_name": "data",
  "subpath": "/content",
  "search": "*",
  "limit": 5
}`}</code
                    ></pre>
            </div>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/managed/semantic-search</code>
            </div>
            <p>
                Natural-language (vector) search — embeds the query and returns
                the top-N most similar entries by cosine distance over
                <code>entries.embedding</code>. Requires the pgvector extension
                <em>and</em> a configured embedding provider
                (<code>EMBEDDING_API_URL</code>); when either is missing it
                returns a clean <code>400</code> failure envelope. Results are
                permission-filtered, and <code>limit</code> is clamped to a max
                of 100.
            </p>
            <div class="code-container">
                <pre><code
                        >{`// request
{
  "query": "how do refunds work",
  "space_name": "data",        // optional
  "subpath": "/articles",       // optional prefix
  "resource_types": ["content"],// optional
  "limit": 10                    // optional (default 10, max 100)
}

// success -> each record's attributes carry space_name, similarity (0..1), uri
{
  "status": "success",
  "records": [
    {
      "resource_type": "content",
      "shortname": "refund-policy",
      "subpath": "/articles",
      "attributes": { "space_name": "data", "similarity": 0.83,
                      "uri": "dmart://data/articles/refund-policy" }
    }
  ],
  "attributes": { "returned": 1, "matched": 3 }
}

// not configured
{ "status": "failed",
  "error": { "type": "request", "code": 400,
             "message": "semantic search not configured — set EMBEDDING_API_URL ..." } }`}</code
                    ></pre>
            </div>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/managed/reindex-embeddings</code>
            </div>
            <p>
                Admin tool that (re)embeds entries into the pgvector column —
                used to backfill or rebuild the semantic-search index. Runs as a
                background job.
            </p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/managed/reindex-embeddings/status</code>
            </div>
            <p>
                Admin-only. Returns the live progress of the current or last
                re-index run.
            </p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/managed/import</code>
            </div>
            <p>
                Imports data from a ZIP file. Body: <code
                    >multipart/form-data</code
                >
                with <code>zip_file</code>.
            </p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/managed/export</code>
            </div>
            <p>Exports data based on a <code>Query</code> object.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/managed/csv</code>
            </div>
            <p>Exports query results as CSV.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method put">PUT</span>
                <code
                    >/managed/progress-ticket/&#123;space&#125;/&#123;subpath&#125;/&#123;shortname&#125;/&#123;action&#125;</code
                >
            </div>
            <p>Updates the state of a ticket workflow.</p>
            <div class="code-container">
                <pre><code
                        >{`{
  "resolution": "Fixed",
  "comment": "Done"
}`}</code
                    ></pre>
            </div>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code
                    >/managed/payload/&#123;resource_type&#125;/&#123;space&#125;/&#123;subpath&#125;/&#123;shortname&#125;.&#123;ext&#125;</code
                >
            </div>
            <p>Gets the raw payload of a resource.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/managed/resource_with_payload</code>
            </div>
            <p>
                Uploads a file as payload. Body: <code>multipart/form-data</code
                >
                with <code>payload_file</code>, <code>request_record</code>,
                <code>space_name</code>.
            </p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code
                    >/managed/resources_from_csv/&#123;resource_type&#125;/&#123;space&#125;/&#123;subpath&#125;/&#123;schema&#125;</code
                >
            </div>
            <p>Creates resources from a CSV file.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code
                    >/managed/entry/&#123;resource_type&#125;/&#123;space&#125;/&#123;subpath&#125;/&#123;shortname&#125;</code
                >
            </div>
            <p>Gets the metadata of a resource.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/managed/byuuid/&#123;uuid&#125;</code>
            </div>
            <p>Gets an entry by UUID.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/managed/byslug/&#123;slug&#125;</code>
            </div>
            <p>Gets an entry by slug.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code
                    >/managed/health/&#123;health_type&#125;/&#123;space&#125;</code
                >
            </div>
            <p>
                Runs a health check. Types: <code>soft</code>,
                <code>hard</code>.
            </p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method put">PUT</span>
                <code
                    >/managed/lock/&#123;resource_type&#125;/&#123;space&#125;/&#123;subpath&#125;/&#123;shortname&#125;</code
                >
            </div>
            <p>
                <strong>Acquires</strong> an entry lock for the caller. While a
                lock is held, <code>update</code> and <code>delete</code> from
                any user other than the lock holder are rejected; the holder may
                re-lock (extend) their own lock. Query results can surface the
                current holder via <code>retrieve_lock_status</code> (see the
                <code>Query</code> shape above).
            </p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method delete">DELETE</span>
                <code
                    >/managed/lock/&#123;space&#125;/&#123;subpath&#125;/&#123;shortname&#125;</code
                >
            </div>
            <p><strong>Releases</strong> the lock the caller holds on an entry.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/managed/reload-security-data</code>
            </div>
            <p>
                Reloads the in-process permissions and roles cache from
                PostgreSQL.
            </p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code
                    >/managed/execute/&#123;task_type&#125;/&#123;space&#125;</code
                >
            </div>
            <p>
                Runs a <strong>saved query</strong> task. The only defined
                <code>task_type</code> is <code>query</code>: DMART loads a saved
                query entry by <code>shortname</code>, parses its
                <code>payload.body</code> as a <code>Query</code>, and executes
                it. <code>query_overrides</code> merge into the loaded query, and
                any <code>$param</code> placeholders inside the query's
                <code>search</code> string (e.g.
                <code>@status:$state</code>) are substituted from the overrides;
                unresolved <code>@field:$param</code> fragments are stripped
                before execution.
            </p>
            <p class="code-note">
                The misspelled legacy path
                <code>/managed/excute/&#123;task_type&#125;/&#123;space&#125;</code>
                is also mapped for client compatibility.
            </p>
            <div class="code-container">
                <pre><code
                        >{`{
  "shortname": "open-tickets",
  "subpath": "/tasks",
  "query_overrides": { "state": "open", "limit": 20 }
}`}</code
                    ></pre>
            </div>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code
                    >/managed/apply-alteration/&#123;space&#125;/&#123;alteration_name&#125;</code
                >
            </div>
            <p>Applies a recorded alteration to an entry.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code
                    >/managed/shortening/&#123;space&#125;/&#123;**rest&#125;</code
                >
            </div>
            <p>
                <strong>Creates</strong> a short link for a DMART resource URL and
                returns a random token. The resolvable
                <code>short_url</code> is bounded by <code>APP_URL</code> and the
                token expires after <code>URL_SHORTER_EXPIRES</code> seconds.
            </p>
            <div class="code-container">
                <pre><code
                        >{`// -> { "short_url": "https://app.example.com/managed/s/aB3xY9" }`}</code
                    ></pre>
            </div>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/managed/s/&#123;token&#125;</code>
            </div>
            <p>
                Resolves a short token and issues a <code>302</code> redirect to
                its original URL (anonymous-accessible, rate-limited).
            </p>
        </div>
    </div>

    <!-- ═══ PUBLIC ACCESS ═══ -->
    <div class="feature-section">
        <h2>Public Access <code>/public</code></h2>
        <p>Endpoints for unauthenticated or public access (if configured).</p>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/public/query</code>
            </div>
            <p>Executes a query publicly.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code
                    >/public/query/&#123;type&#125;/&#123;space&#125;/&#123;subpath&#125;</code
                >
            </div>
            <p>Public query via URL params.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code
                    >/public/entry/&#123;resource_type&#125;/&#123;space&#125;/&#123;subpath&#125;/&#123;shortname&#125;</code
                >
            </div>
            <p>Retrieves a public entry.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code
                    >/public/payload/&#123;resource_type&#125;/&#123;space&#125;/&#123;subpath&#125;/&#123;shortname&#125;.&#123;ext&#125;</code
                >
            </div>
            <p>Retrieves a public payload.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/public/submit/&#123;space&#125;/&#123;**rest&#125;</code>
            </div>
            <p>
                Submits data to a public endpoint (e.g. a form). An optional
                <strong>leading</strong> path segment selects the resource type:
                it is parsed against <strong>PublicSubmitResourceType</strong>,
                so only <code>content</code> or <code>ticket</code> are honored.
                When the leading segment is <em>not</em> one of those, it is
                treated as the space name and the resource type defaults to
                <code>content</code> (it is not rejected). Submitting a
                <code>ticket</code> additionally requires a workflow shortname in
                the path.
            </p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/public/attach/&#123;space&#125;</code>
            </div>
            <p>Attaches a file to a record publicly.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code
                    >/public/excute/&#123;task_type&#125;/&#123;space&#125;</code
                >
            </div>
            <p>Executes a task publicly.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/public/byuuid/&#123;uuid&#125;</code>
            </div>
            <p>Gets a public entry by UUID.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/public/byslug/&#123;slug&#125;</code>
            </div>
            <p>Gets a public entry by slug.</p>
        </div>
    </div>

    <!-- ═══ QR CODES ═══ -->
    <div class="feature-section">
        <h2>QR Codes <code>/qr</code></h2>
        <p class="code-note">
            Note: the <code>/qr</code> generate/validate endpoints are currently
            minimal / a stub in this port and are not yet fully featured.
        </p>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code
                    >/qr/generate/&#123;resource_type&#125;/&#123;space&#125;/&#123;subpath&#125;/&#123;shortname&#125;</code
                >
            </div>
            <p>Generates a QR code for a resource.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/qr/validate</code>
            </div>
            <p>Validates a scanned QR code.</p>
            <div class="code-container">
                <pre><code
                        >{`{
  "resource_type": "user",
  "space_name": "data",
  "subpath": "/users",
  "shortname": "jdoe",
  "qr_data": "<scanned_string>"
}`}</code
                    ></pre>
            </div>
        </div>
    </div>

    <!-- ═══ SYSTEM INFO ═══ -->
    <div class="feature-section">
        <h2>System Info <code>/info</code></h2>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/info/me</code>
            </div>
            <p>Gets current user info.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/info/settings</code>
            </div>
            <p>Gets system settings (restricted to 'dmart' user).</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/info/manifest</code>
            </div>
            <p>Returns system version and status.</p>
        </div>
    </div>

    <!-- ═══ REALTIME / WEBSOCKETS ═══ -->
    <div class="feature-section">
        <h2>Realtime &amp; WebSockets <code>/ws</code></h2>
        <p>
            DMART pushes live updates over WebSocket connections. A built-in
            notifier plugin broadcasts entry changes to subscribed clients.
        </p>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/ws</code>
            </div>
            <p>
                Opens an authenticated WebSocket connection for realtime
                notifications. The JWT is passed as a query param
                (<code>ws://host/ws?token=JWT</code>) or via the
                <code>auth_token</code> cookie; the socket is closed with
                <code>401</code> if the token is invalid, the user is inactive,
                or the session has been revoked.
            </p>
            <p>
                After connecting, the client subscribes by sending a
                <code>notification_subscription</code> message. DMART builds a
                channel name of the form
                <code>space:subpath:schema:action:state</code>, defaulting any
                omitted segment to the <code>__ALL__</code> wildcard. The
                realtime notifier plugin then broadcasts every matching CRUD
                event to subscribed clients.
            </p>
            <div class="code-container">
                <pre><code
                        >{`// client -> server: subscribe (omit fields to wildcard them)
{
  "type": "notification_subscription",
  "space_name": "data",
  "subpath": "/tickets",
  "schema_shortname": "ticket",   // optional -> __ALL__
  "action_type": "update",         // optional -> __ALL__
  "ticket_state": "open"           // optional -> __ALL__
}
// -> channel "data:/tickets:ticket:update:open"

// server -> client on connect
{ "type": "connection_response", "message": { "status": "success" } }`}</code
                    ></pre>
            </div>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/send-message/&#123;user&#125;</code>
            </div>
            <p>Sends a message to a specific connected user.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/broadcast-to-channels</code>
            </div>
            <p>Broadcasts a message to subscribers of one or more channels.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/ws-info</code>
            </div>
            <p>Returns information about active WebSocket connections.</p>
        </div>
    </div>

    <!-- ═══ MCP ═══ -->
    <div class="feature-section">
        <h2>Model Context Protocol <code>/mcp</code></h2>
        <p>
            DMART ships a built-in <strong>MCP server</strong> (Streamable HTTP
            transport, spec <code>2025-03-26</code>) so AI agents can query and
            mutate entries as tools. All requests are authenticated — the
            caller's JWT flows through to each tool handler. Sessions are tracked
            via the <code>Mcp-Session-Id</code> header. Pair it with the OAuth 2.1
            Authorization Server for automatic client onboarding.
        </p>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code>/mcp</code>
            </div>
            <p>Sends a JSON-RPC MCP request (initialize, list/call tools, etc.).</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/mcp</code>
            </div>
            <p>Opens the server-sent-events (SSE) stream for the MCP session.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method delete">DELETE</span>
                <code>/mcp</code>
            </div>
            <p>Terminates the current MCP session.</p>
        </div>

        <h3>Available tools (11)</h3>
        <p>
            The MCP server exposes these tools to agents. Every tool runs under
            the caller's JWT, so DMART's permission model is enforced
            identically to the HTTP API — there is no admin escape hatch.
        </p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Tool</th>
                        <th>Purpose</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>dmart_me</code></td>
                        <td>Return the authenticated caller's profile.</td>
                    </tr>
                    <tr>
                        <td><code>dmart_spaces</code></td>
                        <td>List the spaces the caller can access.</td>
                    </tr>
                    <tr>
                        <td><code>dmart_query</code></td>
                        <td
                            >Search / list entries. Results are hard-capped at
                            <strong>50</strong> records per call.</td
                        >
                    </tr>
                    <tr>
                        <td><code>dmart_read</code></td>
                        <td>Read a single entry (metadata + payload).</td>
                    </tr>
                    <tr>
                        <td><code>dmart_schema</code></td>
                        <td>Fetch a schema definition for a space/subpath.</td>
                    </tr>
                    <tr>
                        <td><code>dmart_create</code></td>
                        <td>Create a new entry.</td>
                    </tr>
                    <tr>
                        <td><code>dmart_update</code></td>
                        <td>Update / patch an existing entry.</td>
                    </tr>
                    <tr>
                        <td><code>dmart_delete</code></td>
                        <td
                            >Delete an entry. Requires an interactive
                            <strong>elicitation</strong> confirmation before it
                            proceeds; folders take an optional
                            <code>force</code> flag to cascade-delete non-empty
                            contents.</td
                        >
                    </tr>
                    <tr>
                        <td><code>dmart_history</code></td>
                        <td>Retrieve the change history of an entry.</td>
                    </tr>
                    <tr>
                        <td><code>dmart_download</code></td>
                        <td>Download the raw payload / attachment of an entry.</td>
                    </tr>
                    <tr>
                        <td><code>dmart_semantic_search</code></td>
                        <td
                            >Natural-language vector search (requires pgvector +
                            an embedding provider, same as
                            <code>/managed/semantic-search</code>).</td
                        >
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<style>
  /* h2 code override for route labels */
  h2 code {
    font-size: 0.85em;
    font-family: var(--font-mono);
    text-transform: none;
    margin-left: 0.5rem;
  }

  /* ─── ENDPOINT CARDS ─── */
  .endpoint {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    transition: box-shadow 0.2s;
  }

  .endpoint:hover {
    box-shadow: var(--shadow-sm);
  }

  .endpoint:last-child {
    margin-bottom: 0;
  }

  .endpoint-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .endpoint-header code {
    font-size: 0.85rem;
    font-family: var(--font-mono);
    font-weight: 700;
    background: transparent;
    border: none;
    padding: 0;
    color: var(--text-main);
  }

  .method {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: var(--font-mono);
    border: none;
    border-radius: var(--radius-sm);
    min-width: 55px;
    text-align: center;
  }

  .method.get {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .method.post {
    background: #e3f2fd;
    color: #1565c0;
  }

  .method.put {
    background: #fff3e0;
    color: #e65100;
  }

  .method.delete {
    background: #ffebee;
    color: #c62828;
  }

  :global(.dark) .method.get {
    background: #1b3a1b;
    color: #66bb6a;
  }
  :global(.dark) .method.post {
    background: #0d2948;
    color: #42a5f5;
  }
  :global(.dark) .method.put {
    background: #3d2200;
    color: #ffa726;
  }
  :global(.dark) .method.delete {
    background: #3d0c0c;
    color: #ef5350;
  }

  .endpoint p {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  /* Code blocks inside endpoints use a slightly different bg */
  .endpoint .code-container {
    background: var(--code-bg);
    border-radius: var(--radius-md);
    margin: 0.75rem 0;
  }

  .endpoint .code-container pre {
    padding: 1rem;
  }

  @media (max-width: 768px) {
    .endpoint-header {
      flex-wrap: wrap;
    }

    .endpoint-header code {
      font-size: 0.75rem;
      word-break: break-all;
    }
  }
</style>
