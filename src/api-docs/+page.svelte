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
            The base URL for all API requests is typically: <code
                >http://localhost:8000</code
            > (or as configured).
        </p>
        <p>Most endpoints require authentication using a JWT token:</p>
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
                        <td><strong>ResourceType</strong></td>
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
                            <code>duckdb</code>, <code>parquet</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>RequestType</strong></td>
                        <td
                            ><code>create</code>, <code>update</code>,
                            <code>patch</code>, <code>update_acl</code>,
                            <code>assign</code>, <code>delete</code>,
                            <code>move</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>ContentType</strong></td>
                        <td
                            ><code>text</code>, <code>comment</code>,
                            <code>reaction</code>, <code>markdown</code>,
                            <code>html</code>, <code>json</code>,
                            <code>image</code>, <code>python</code>,
                            <code>pdf</code>, <code>audio</code>,
                            <code>video</code>, <code>csv</code>,
                            <code>parquet</code>, <code>jsonl</code>,
                            <code>apk</code>, <code>duckdb</code>,
                            <code>sqlite</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>ActionType</strong></td>
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
                        <td><strong>QueryType</strong></td>
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
                        <td><strong>SortType</strong></td>
                        <td><code>ascending</code>, <code>descending</code></td>
                    </tr>
                    <tr>
                        <td><strong>TaskType</strong></td>
                        <td><code>query</code></td>
                    </tr>
                    <tr>
                        <td><strong>UserType</strong></td>
                        <td
                            ><code>web</code>, <code>mobile</code>,
                            <code>bot</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>Language</strong></td>
                        <td
                            ><code>ar</code> (Arabic), <code>en</code>
                            (English), <code>ku</code> (Kurdish),
                            <code>fr</code>
                            (French), <code>tr</code> (Turkish)</td
                        >
                    </tr>
                    <tr>
                        <td><strong>ConditionType</strong></td>
                        <td><code>is_active</code>, <code>own</code></td>
                    </tr>
                    <tr>
                        <td><strong>ReactionType</strong></td>
                        <td
                            ><code>like</code>, <code>dislike</code>,
                            <code>love</code>, <code>care</code>,
                            <code>laughing</code>, <code>sad</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>LockAction</strong></td>
                        <td
                            ><code>fetch</code>, <code>lock</code>,
                            <code>extend</code>, <code>unlock</code>,
                            <code>cancel</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>NotificationType</strong></td>
                        <td><code>admin</code>, <code>system</code></td>
                    </tr>
                    <tr>
                        <td><strong>NotificationPriority</strong></td>
                        <td
                            ><code>high</code>, <code>medium</code>,
                            <code>low</code></td
                        >
                    </tr>
                    <tr>
                        <td><strong>PluginType</strong></td>
                        <td><code>hook</code>, <code>api</code></td>
                    </tr>
                    <tr>
                        <td><strong>EventListenTime</strong></td>
                        <td><code>before</code>, <code>after</code></td>
                    </tr>
                </tbody>
            </table>
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
            <p>Locks an entry.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method delete">DELETE</span>
                <code
                    >/managed/lock/&#123;space&#125;/&#123;subpath&#125;/&#123;shortname&#125;</code
                >
            </div>
            <p>Unlocks an entry.</p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method get">GET</span>
                <code>/managed/reload-security-data</code>
            </div>
            <p>
                Reloads permissions and roles (useful for file-based storage).
            </p>
        </div>

        <div class="endpoint">
            <div class="endpoint-header">
                <span class="method post">POST</span>
                <code
                    >/managed/excute/&#123;task_type&#125;/&#123;space&#125;</code
                >
            </div>
            <p>Executes a specific task type (e.g., query) on a space.</p>
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
                <code>/managed/s/&#123;token&#125;</code>
            </div>
            <p>Redirects a short token to its original URL.</p>
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
                <code
                    >/public/submit/&#123;space&#125;/&#123;schema&#125;/&#123;subpath&#125;</code
                >
            </div>
            <p>Submits data to a public endpoint (e.g., a form).</p>
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
</div>

<style>
  /* h2 code override for route labels */
  h2 code {
    font-size: 0.85em;
    text-transform: none;
    margin-left: 0.5rem;
  }

  /* ─── ENDPOINT CARDS ─── */
  .endpoint {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
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
    font-family: "Courier New", Courier, monospace;
    border: 1px solid;
    min-width: 55px;
    text-align: center;
  }

  .method.get {
    color: #2e7d32;
    border-color: #2e7d32;
  }

  .method.post {
    color: #1565c0;
    border-color: #1565c0;
  }

  .method.put {
    color: #e65100;
    border-color: #e65100;
  }

  .method.delete {
    color: #c62828;
    border-color: #c62828;
  }

  :global(.dark) .method.get {
    color: #66bb6a;
    border-color: #66bb6a;
  }
  :global(.dark) .method.post {
    color: #42a5f5;
    border-color: #42a5f5;
  }
  :global(.dark) .method.put {
    color: #ffa726;
    border-color: #ffa726;
  }
  :global(.dark) .method.delete {
    color: #ef5350;
    border-color: #ef5350;
  }

  .endpoint p {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .params {
    font-size: 0.85rem;
  }

  /* Code blocks inside endpoints use a slightly different bg */
  .endpoint .code-container {
    background: var(--bg-secondary);
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
