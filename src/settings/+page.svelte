<script lang="ts">
</script>

<div class="content">
    <h1>Configuration Settings</h1>
    <p class="intro">
        All configurable settings for DMART. Bound to the strongly-typed
        <code>DmartSettings</code> record and loaded from a
        <code>config.env</code> dotenv file and/or environment variables. Values
        are read <strong>once at boot</strong> and validated before the server
        starts &mdash; there is no hot reload and no file watcher.
    </p>

    <div class="feature-section">
        <h2>Loading Order</h2>
        <p>
            Sources are layered with a strict precedence (later wins):
            <code>appsettings.json</code> &lt; <code>config.env</code> &lt;
            environment variables (<code>Dmart__Xxx</code>).
        </p>
        <p>
            The <code>config.env</code> file is located with a first-match-wins
            lookup:
        </p>
        <ol>
            <li>
                The path in the <code>BACKEND_ENV</code> (or
                <code>DMART_ENV</code>) environment variable &mdash; used for
                dev/CI, e.g. a repo-local file
            </li>
            <li>
                <code>~/.dmart/config.env</code> &mdash; per-user install
            </li>
            <li>
                <code>/etc/dmart/config.env</code> &mdash; system-wide RPM/DEB
                install
            </li>
        </ol>
        <p>
            A cwd-relative <code>./config.env</code> is <em>not</em> looked up
            implicitly. Because the file may carry <code>JWT_SECRET</code> and
            <code>DATABASE_PASSWORD</code>, DMART refuses to read it if
            &quot;other&quot; permission bits are set.
        </p>
        <div class="highlight">
            <strong>Strict validation.</strong> Configuration is bound and
            validated at startup (<code>ValidateOnStart</code>). Any
            <strong>unknown key is rejected</strong> and aborts startup
            &mdash; there is no silent fallthrough for typos. Retired
            keys &mdash; <code>REDIS_HOST</code>/<code>PORT</code>/<code
                >PASSWORD</code
            >/<code>CONNECTION</code>, <code>DATABASE_DRIVER</code>, and
            <code>ACTIVE_DATA_DB</code> &mdash; no longer exist and now
            hard-fail the boot if present.
        </div>
    </div>

    <!-- ═══ GENERAL ═══ -->
    <div class="feature-section">
        <h2>General Configuration</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>APP_URL</code></td><td
                            >Public base URL of the server, used to assemble
                            short-link URLs. Empty disables short-link
                            assembly.</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>MANAGEMENT_SPACE</code></td><td
                            >Name of the space that holds users, roles, groups
                            and permissions</td
                        ><td><code>"management"</code></td></tr
                    >
                    <tr
                        ><td><code>MAX_QUERY_LIMIT</code></td><td
                            >Hard cap on the number of records returned by a
                            query</td
                        ><td><code>10000</code></td></tr
                    >
                    <tr
                        ><td><code>URL_SHORTER_EXPIRES</code></td><td
                            >Short-link expiration (seconds)</td
                        ><td><code>3600</code></td></tr
                    >
                    <tr
                        ><td><code>REQUEST_TIMEOUT</code></td><td
                            >Outbound HTTP timeout (seconds) for
                            plugins/webhooks</td
                        ><td><code>35</code></td></tr
                    >
                    <tr
                        ><td><code>JQ_TIMEOUT</code></td><td
                            >Timeout (seconds) for the <code>jq</code>
                            subprocess used by join sub-queries carrying a
                            <code>jq_filter</code></td
                        ><td><code>2</code></td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ SERVER ═══ -->
    <div class="feature-section">
        <h2>Server &amp; Network</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>LISTENING_HOST</code></td><td
                            >Hostname/IP the Kestrel server binds to</td
                        ><td><code>"0.0.0.0"</code></td></tr
                    >
                    <tr
                        ><td><code>LISTENING_PORT</code></td><td
                            >Port the server listens on (HTTP + WebSocket share
                            this port)</td
                        ><td><code>8282</code></td></tr
                    >
                    <tr
                        ><td><code>CXB_URL</code></td><td
                            >URL path prefix for the embedded CXB admin SPA. Set
                            to <code>/</code> to serve it at the root.</td
                        ><td><code>"/cxb"</code></td></tr
                    >
                    <tr
                        ><td><code>CAT_URL</code></td><td
                            >URL path prefix for the embedded Catalog SPA</td
                        ><td><code>"/cat"</code></td></tr
                    >
                    <tr
                        ><td><code>ALLOWED_CORS_ORIGINS</code></td><td
                            >Comma-separated origins allowed to make cross-site
                            requests. Empty allows only the same-host origin.</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>TRUSTED_PROXIES</code></td><td
                            >Comma-separated IPs/CIDRs whose
                            <code>X-Forwarded-For</code> is trusted (for real
                            client IP behind nginx/an LB)</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>FORWARDED_FOR_HOP_COUNT</code></td><td
                            >Number of proxy hops in front of DMART</td
                        ><td><code>1</code></td></tr
                    >
                    <tr
                        ><td><code>OTLP_ENDPOINT</code></td><td
                            >OpenTelemetry collector endpoint for
                            metrics/traces. Empty disables observability
                            entirely.</td
                        ><td><code>""</code></td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ DATABASE ═══ -->
    <div class="feature-section">
        <h2>Database &amp; Storage</h2>
        <p>
            <strong>PostgreSQL (via Npgsql) is the sole runtime data store.</strong>
            There is no Redis and no filesystem runtime adapter; all caches are
            in-process. Provide a full connection string with
            <code>POSTGRES_CONNECTION</code>, or leave it unset and let DMART
            assemble one from the individual <code>DATABASE_*</code> components
            below.
        </p>

        <h3>PostgreSQL Connection</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>POSTGRES_CONNECTION</code></td><td
                            >Full Npgsql connection string. When set, the
                            component settings below are ignored.</td
                        ><td><code>""</code> (unset)</td></tr
                    >
                    <tr
                        ><td><code>DATABASE_HOST</code></td><td
                            >Database hostname</td
                        ><td><code>"localhost"</code></td></tr
                    >
                    <tr
                        ><td><code>DATABASE_PORT</code></td><td
                            >Database port</td
                        ><td><code>5432</code></td></tr
                    >
                    <tr
                        ><td><code>DATABASE_USERNAME</code></td><td
                            >Database username</td
                        ><td><code>"dmart"</code></td></tr
                    >
                    <tr
                        ><td><code>DATABASE_PASSWORD</code></td><td
                            >Database password</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>DATABASE_NAME</code></td><td
                            >Database name</td
                        ><td><code>"dmart"</code></td></tr
                    >
                    <tr
                        ><td><code>DATABASE_POOL_SIZE</code></td><td
                            >Connection pool size</td
                        ><td><code>10</code></td></tr
                    >
                    <tr
                        ><td><code>DATABASE_MAX_OVERFLOW</code></td><td
                            >Max overflow connections</td
                        ><td><code>10</code></td></tr
                    >
                    <tr
                        ><td><code>DATABASE_POOL_TIMEOUT</code></td><td
                            >Pool timeout (seconds)</td
                        ><td><code>30</code></td></tr
                    >
                    <tr
                        ><td><code>DATABASE_POOL_RECYCLE</code></td><td
                            >Pool recycle time (seconds)</td
                        ><td><code>1800</code></td></tr
                    >
                    <tr
                        ><td><code>DATABASE_KEEPALIVE</code></td><td
                            >Seconds of socket inactivity before a keepalive
                            probe is sent. 0 disables.</td
                        ><td><code>30</code></td></tr
                    >
                </tbody>
            </table>
        </div>

        <h3>Spaces Folder (import/export only)</h3>
        <p>
            The on-disk <code>spaces/</code> +
            <code>.dm/meta.*.json</code> layout is a transfer/backup format used
            only by <code>import</code>, <code>export</code>,
            <code>seed</code> and <code>migrate</code> &mdash; never as a live
            store. <code>SPACES_FOLDER</code> defaults empty and, when set, is
            also the root for an optional append-only
            <code>events.jsonl.log</code> audit trail (disabled unless
            configured).
        </p>
    </div>

    <!-- ═══ SECURITY ═══ -->
    <div class="feature-section">
        <h2>Security &amp; Authentication</h2>
        <p>
            Authentication is JWT Bearer (HS256, symmetric key from
            <code>JWT_SECRET</code>) with Argon2 password hashing, plus an
            OAuth 2.1 Authorization Server. The signing algorithm is fixed at
            HS256 and is not configurable.
        </p>

        <h3>JWT &amp; Sessions</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>JWT_SECRET</code></td><td
                            >Symmetric signing key (min 32 bytes).
                            <strong
                                >Required &mdash; the server refuses to start on
                                the placeholder value.</strong
                            ></td
                        ><td><code>"change-me…"</code></td></tr
                    >
                    <tr
                        ><td><code>JWT_ISSUER</code></td><td
                            >Expected <code>iss</code> claim</td
                        ><td><code>"dmart"</code></td></tr
                    >
                    <tr
                        ><td><code>JWT_AUDIENCE</code></td><td
                            >Expected <code>aud</code> claim</td
                        ><td><code>"dmart"</code></td></tr
                    >
                    <tr
                        ><td><code>JWT_ACCESS_EXPIRES</code></td><td
                            >Access-token lifetime (seconds)</td
                        ><td><code>2592000</code> (30d)</td></tr
                    >
                    <tr
                        ><td><code>JWT_REFRESH_DAYS</code></td><td
                            >Refresh-token lifetime (days)</td
                        ><td><code>30</code></td></tr
                    >
                    <tr
                        ><td><code>JWT_REQUIRE_TOKEN_USE</code></td><td
                            >Reject JWTs lacking the <code>token_use</code> claim
                            (access vs refresh separation)</td
                        ><td><code>false</code></td></tr
                    >
                    <tr
                        ><td><code>MAX_SESSIONS_PER_USER</code></td><td
                            >Max concurrent sessions per user</td
                        ><td><code>5</code></td></tr
                    >
                    <tr
                        ><td><code>SESSION_INACTIVITY_TTL</code></td><td
                            >Idle seconds before a JWT is rejected and its
                            session deleted (0 = disabled)</td
                        ><td><code>0</code></td></tr
                    >
                    <tr
                        ><td><code>SESSION_MAX_LIFETIME_SECONDS</code></td><td
                            >Hard cap on the refresh-token chain from original
                            login (0 = disabled)</td
                        ><td><code>0</code></td></tr
                    >
                    <tr
                        ><td><code>LOGOUT_ON_PWD_CHANGE</code></td><td
                            >Invalidate all sessions on password change</td
                        ><td><code>true</code></td></tr
                    >
                    <tr
                        ><td><code>CSRF_PROTECT_COOKIE_AUTH</code></td><td
                            >Gate cookie-borne auth against cross-site requests
                            (bearer-header callers unaffected)</td
                        ><td><code>true</code></td></tr
                    >
                </tbody>
            </table>
        </div>

        <h3>Brute-force &amp; Rate Limiting</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>MAX_FAILED_LOGIN_ATTEMPTS</code></td><td
                            >Failed attempts before an account is auto-locked</td
                        ><td><code>5</code></td></tr
                    >
                    <tr
                        ><td><code>LOCKOUT_COOLDOWN_SECONDS</code></td><td
                            >Seconds an account stays locked before a retry may
                            clear it (0 = permanent until admin reset)</td
                        ><td><code>900</code></td></tr
                    >
                    <tr
                        ><td><code>AUTH_RATE_LIMIT_PER_MINUTE</code></td><td
                            >Per-IP cap on <code>/user/login</code> +
                            <code>/user/otp-request</code> per 60s</td
                        ><td><code>10</code></td></tr
                    >
                    <tr
                        ><td><code>MAX_OTP_VERIFY_ATTEMPTS</code></td><td
                            >Wrong guesses allowed against one OTP code before it
                            is invalidated (0 = uncapped)</td
                        ><td><code>5</code></td></tr
                    >
                    <tr
                        ><td><code>LOCK_PERIOD</code></td><td
                            >Seconds a <code>PUT /managed/lock</code> stays held
                            before another user can take it</td
                        ><td><code>300</code></td></tr
                    >
                </tbody>
            </table>
        </div>

        <h3>Registration, OTP &amp; Profiles</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>IS_REGISTRABLE</code></td><td
                            >Allow self-registration via
                            <code>POST /user/create</code></td
                        ><td><code>true</code></td></tr
                    >
                    <tr
                        ><td><code>IS_OTP_FOR_CREATE_REQUIRED</code></td><td
                            >Require a verified OTP for account creation</td
                        ><td><code>true</code></td></tr
                    >
                    <tr
                        ><td><code>OTP_TOKEN_TTL</code></td><td
                            >One-time-password time-to-live (seconds)</td
                        ><td><code>300</code></td></tr
                    >
                    <tr
                        ><td><code>ALLOW_OTP_RESEND_AFTER</code></td><td
                            >Minimum seconds between OTP re-sends to one
                            destination</td
                        ><td><code>60</code></td></tr
                    >
                    <tr
                        ><td><code>ALLOW_PASSWORD_RESET_RESEND_AFTER</code></td
                        ><td
                            >Minimum seconds between password-reset OTP
                            re-sends</td
                        ><td><code>60</code></td></tr
                    >
                    <tr
                        ><td><code>USER_CREATE_DEFAULT_ROLE</code></td><td
                            >Single role assigned to every self-created user
                            (self-service create ignores roles in the body)</td
                        ><td><code>""</code> (none)</td></tr
                    >
                    <tr
                        ><td><code>USER_CREATE_DEFAULT_GROUP</code></td><td
                            >Single group assigned to every self-created user</td
                        ><td><code>""</code> (none)</td></tr
                    >
                    <tr
                        ><td
                            ><code>USER_PROFILE_PAYLOAD_PROTECTED_FIELDS</code
                            ></td
                        ><td
                            >CSV of payload fields users cannot update via
                            <code>POST /user/profile</code></td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>ALLOWED_SUBMIT_MODELS</code></td><td
                            >CSV of <code>space.schema</code> pairs allowed for
                            public <code>/submit</code> endpoints (empty =
                            none)</td
                        ><td><code>""</code></td></tr
                    >
                </tbody>
            </table>
        </div>

        <h3>Admin Bootstrap</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>ADMIN_EMAIL</code></td><td
                            >Email seeded for the <code>dmart</code> admin on
                            first boot only</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>ADMIN_PASSWORD</code></td><td
                            >First-boot admin password. Intentionally omitted
                            from <code>config.env</code>; the recommended flow is
                            <code>dmart passwd dmart &lt;pwd&gt;</code>. Honoured
                            via <code>Dmart__AdminPassword</code> if provided.</td
                        ><td><code>""</code> (unset)</td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ EMAIL ═══ -->
    <div class="feature-section">
        <h2>Email &amp; Notifications</h2>

        <h3>SMTP</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>MAIL_HOST</code></td><td
                            >SMTP server host. Empty falls back to logging the
                            code only.</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>MAIL_PORT</code></td><td>SMTP port</td><td
                            ><code>587</code></td
                        ></tr
                    >
                    <tr
                        ><td><code>MAIL_USERNAME</code></td><td
                            >SMTP username</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>MAIL_PASSWORD</code></td><td
                            >SMTP password</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>MAIL_USE_TLS</code></td><td
                            >Use TLS for the SMTP connection</td
                        ><td><code>true</code></td></tr
                    >
                    <tr
                        ><td><code>MAIL_FROM_ADDRESS</code></td><td
                            >From email address</td
                        ><td><code>"noreply@admin.com"</code></td></tr
                    >
                    <tr
                        ><td><code>MAIL_FROM_NAME</code></td><td>From name</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>MOCK_SMTP_API</code></td><td
                            >Short-circuit SMTP delivery (dev/test)</td
                        ><td><code>false</code></td></tr
                    >
                </tbody>
            </table>
        </div>

        <h3>SMS Gateway</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>SEND_SMS_OTP_API</code></td><td
                            >POST endpoint for OTP SMS delivery. Empty logs the
                            code only.</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>SEND_SMS_API</code></td><td
                            >POST endpoint for general SMS delivery</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>SMS_SENDER</code></td><td
                            >Optional sender ID / from-name inlined into the SMS
                            request body</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>SMPP_AUTH_KEY</code></td><td
                            >Value of the <code>auth-key</code> header sent to
                            the SMS gateway</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>MOCK_SMPP_API</code></td><td
                            >Short-circuit SMS delivery (dev/test)</td
                        ><td><code>false</code></td></tr
                    >
                    <tr
                        ><td><code>MOCK_OTP_CODE</code></td><td
                            >Fixed OTP code returned when mocking is enabled</td
                        ><td><code>"123456"</code></td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ LOGGING ═══ -->
    <div class="feature-section">
        <h2>Logging</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>LOG_FORMAT</code></td><td
                            ><code>"text"</code> (human-readable) or
                            <code>"json"</code> (structured JSON lines)</td
                        ><td><code>"text"</code></td></tr
                    >
                    <tr
                        ><td><code>LOG_LEVEL</code></td><td
                            ><code>trace</code>, <code>debug</code>,
                            <code>information</code>, <code>warning</code>,
                            <code>error</code>, <code>critical</code>,
                            <code>none</code></td
                        ><td><code>"information"</code></td></tr
                    >
                    <tr
                        ><td><code>LOG_FILE</code></td><td
                            >Log file path. Empty = stdout only
                            (container/journald friendly).</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>LOG_MAX_BYTES</code></td><td
                            >Max file size before rotation. 0 disables
                            rotation.</td
                        ><td><code>1073741824</code> (1 GB)</td></tr
                    >
                    <tr
                        ><td><code>LOG_BACKUP_COUNT</code></td><td
                            >Rotated archive retention (&lt; 0 unlimited, 0
                            truncate, &gt; 0 keep N)</td
                        ><td><code>-1</code></td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ THIRD-PARTY ═══ -->
    <div class="feature-section">
        <h2>Third-Party Integrations</h2>

        <h3>OAuth / Social Login</h3>
        <p>
            Leaving a provider&rsquo;s <code>CLIENT_ID</code> blank disables it
            cleanly &mdash; its endpoints return a &quot;provider not
            configured&quot; error instead of attempting an outbound call.
        </p>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th></tr>
                </thead>
                <tbody>
                    <tr
                        ><td
                            ><code>GOOGLE_CLIENT_ID</code> /
                            <code>GOOGLE_CLIENT_SECRET</code> /
                            <code>GOOGLE_OAUTH_CALLBACK</code></td
                        ><td>Google OAuth credentials + redirect URI</td></tr
                    >
                    <tr
                        ><td
                            ><code>FACEBOOK_CLIENT_ID</code> /
                            <code>FACEBOOK_CLIENT_SECRET</code> /
                            <code>FACEBOOK_OAUTH_CALLBACK</code></td
                        ><td>Facebook OAuth credentials + redirect URI</td></tr
                    >
                    <tr
                        ><td
                            ><code>APPLE_CLIENT_ID</code> /
                            <code>APPLE_TEAM_ID</code> /
                            <code>APPLE_KEY_ID</code> /
                            <code>APPLE_P8_PRIVATE_KEY</code> /
                            <code>APPLE_OAUTH_CALLBACK</code></td
                        ><td
                            >Apple Sign In. The client secret is a short-lived
                            ES256 JWT that DMART mints on the fly from the .p8
                            key.</td
                        ></tr
                    >
                </tbody>
            </table>
        </div>

        <h3>Embeddings (semantic search, opt-in)</h3>
        <p>
            When the <code>pgvector</code> extension is installed <em>and</em>
            <code>EMBEDDING_API_URL</code> is set, DMART embeds every entry on
            create/update and exposes
            <code>POST /managed/semantic-search</code> plus the
            <code>dmart_semantic_search</code> MCP tool. The endpoint is
            OpenAI-compatible.
        </p>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>EMBEDDING_API_URL</code></td><td
                            >Embeddings endpoint. Empty keeps semantic search
                            off.</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>EMBEDDING_API_KEY</code></td><td
                            >Bearer token for the embeddings endpoint</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>EMBEDDING_MODEL</code></td><td
                            >Model name sent in the request body</td
                        ><td><code>"text-embedding-3-small"</code></td></tr
                    >
                </tbody>
            </table>
        </div>

        <h3>Channel Authentication</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>ENABLE_CHANNEL_AUTH</code></td><td
                            >Gate requests on the <code>x-channel-key</code>
                            header</td
                        ><td><code>false</code></td></tr
                    >
                    <tr
                        ><td><code>CHANNELS_CONFIG_PATH</code></td><td
                            >Path to the channels JSON file (empty =
                            <code>~/.dmart/channels.json</code>)</td
                        ><td><code>""</code></td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ MISC ═══ -->
    <div class="feature-section">
        <h2>Miscellaneous</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>ENFORCE_FOLDER_CONTENT_POLICY</code></td><td
                            >Enforce a folder&rsquo;s content-policy arrays on
                            create/update/move. False = dry-run (violations
                            warn-logged but allowed).</td
                        ><td><code>true</code></td></tr
                    >
                    <tr
                        ><td><code>ENABLE_INNER_JOIN_PUSHDOWN</code></td><td
                            >Push eligible inner joins into SQL as correlated
                            EXISTS semi-joins. False forces the in-memory
                            fallback.</td
                        ><td><code>true</code></td></tr
                    >
                    <tr
                        ><td><code>IMPORT_MAX_ENTRIES</code></td><td
                            >Reject zip imports declaring more than this many
                            entries (decompression-bomb guard). 0 disables.</td
                        ><td><code>500000</code></td></tr
                    >
                    <tr
                        ><td><code>IMPORT_MAX_UNCOMPRESSED_BYTES</code></td><td
                            >Reject zip imports whose declared uncompressed size
                            exceeds this. 0 disables.</td
                        ><td><code>2147483648</code> (2 GiB)</td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>
</div>

<style>
</style>
