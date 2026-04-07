<script lang="ts">
</script>

<div class="content">
    <h1>Configuration Settings</h1>
    <p class="intro">
        All configurable settings for D-MART. Defined in <code
            >backend/utils/settings.py</code
        >
        and loaded via <code>pydantic-settings</code> from environment
        variables, <code>config.env</code>, or a JSON config file.
    </p>

    <div class="feature-section">
        <h2>Loading Order</h2>
        <ol>
            <li>Environment variables</li>
            <li>
                File specified by the <code>BACKEND_ENV</code> environment variable
            </li>
            <li><code>config.env</code> in the current directory</li>
            <li><code>~/.dmart/config.env</code></li>
        </ol>
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
                        ><td><code>app_name</code></td><td>Application name</td
                        ><td><code>"dmart"</code></td></tr
                    >
                    <tr
                        ><td><code>app_url</code></td><td
                            >Base URL where the app is hosted</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>public_app_url</code></td><td
                            >Publicly accessible URL for external links</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>base_path</code></td><td
                            >URL path prefix (e.g. <code>/api</code>)</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>debug_enabled</code></td><td
                            >Enables debug mode with detailed errors</td
                        ><td><code>True</code></td></tr
                    >
                    <tr
                        ><td><code>debug_perm</code></td><td
                            >Permissions debugging flag</td
                        ><td><code>False</code></td></tr
                    >
                    <tr
                        ><td><code>hide_stack_trace</code></td><td
                            >Hides stack traces from error responses</td
                        ><td><code>False</code></td></tr
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
                        ><td><code>listening_host</code></td><td
                            >Hostname/IP the server binds to</td
                        ><td><code>"0.0.0.0"</code></td></tr
                    >
                    <tr
                        ><td><code>listening_port</code></td><td
                            >Port the server listens on</td
                        ><td><code>8282</code></td></tr
                    >
                    <tr
                        ><td><code>request_timeout</code></td><td
                            >Max request processing time (seconds)</td
                        ><td><code>35</code></td></tr
                    >
                    <tr
                        ><td><code>websocket_url</code></td><td
                            >WebSocket connection URL</td
                        ><td><code>""</code> (dynamic)</td></tr
                    >
                    <tr
                        ><td><code>websocket_port</code></td><td
                            >WebSocket port</td
                        ><td><code>8484</code></td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ DATABASE ═══ -->
    <div class="feature-section">
        <h2>Database &amp; Storage</h2>
        <p>
            D-MART uses a SQL database for all data persistence.
        </p>

        <h3>SQL Database</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>database_driver</code></td><td
                            >SQLAlchemy driver</td
                        ><td><code>"sqlite+pysqlite"</code></td></tr
                    >
                    <tr
                        ><td><code>database_host</code></td><td
                            >Database hostname</td
                        ><td><code>"localhost"</code></td></tr
                    >
                    <tr
                        ><td><code>database_port</code></td><td
                            >Database port</td
                        ><td><code>5432</code></td></tr
                    >
                    <tr
                        ><td><code>database_username</code></td><td
                            >Database username</td
                        ><td><code>"postgres"</code></td></tr
                    >
                    <tr
                        ><td><code>database_password</code></td><td
                            >Database password</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>database_name</code></td><td
                            >Database name</td
                        ><td><code>"dmart"</code></td></tr
                    >
                    <tr
                        ><td><code>database_pool_size</code></td><td
                            >Connection pool size</td
                        ><td><code>2</code></td></tr
                    >
                    <tr
                        ><td><code>database_max_overflow</code></td><td
                            >Max overflow connections</td
                        ><td><code>2</code></td></tr
                    >
                    <tr
                        ><td><code>database_pool_timeout</code></td><td
                            >Pool timeout (seconds)</td
                        ><td><code>30</code></td></tr
                    >
                    <tr
                        ><td><code>database_pool_recycle</code></td><td
                            >Pool recycle time (seconds)</td
                        ><td><code>30</code></td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ SECURITY ═══ -->
    <div class="feature-section">
        <h2>Security &amp; Authentication</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>jwt_secret</code></td><td
                            >Secret key for signing JWT tokens. <strong
                                >Change in production.</strong
                            ></td
                        ><td>Random</td></tr
                    >
                    <tr
                        ><td><code>jwt_algorithm</code></td><td
                            >JWT algorithm</td
                        ><td><code>"HS256"</code></td></tr
                    >
                    <tr
                        ><td><code>jwt_access_expires</code></td><td
                            >JWT expiration (seconds)</td
                        ><td><code>2592000</code> (30d)</td></tr
                    >
                    <tr
                        ><td><code>max_sessions_per_user</code></td><td
                            >Max concurrent sessions</td
                        ><td><code>5</code></td></tr
                    >
                    <tr
                        ><td><code>session_inactivity_ttl</code></td><td
                            >Inactive session timeout (0 = disabled)</td
                        ><td><code>0</code></td></tr
                    >
                    <tr
                        ><td><code>max_failed_login_attempts</code></td><td
                            >Failed attempts before lockout</td
                        ><td><code>5</code></td></tr
                    >
                    <tr
                        ><td><code>lock_period</code></td><td
                            >Lockout duration (seconds)</td
                        ><td><code>300</code></td></tr
                    >
                    <tr
                        ><td><code>is_registrable</code></td><td
                            >Allow self-registration</td
                        ><td><code>True</code></td></tr
                    >
                    <tr
                        ><td><code>social_login_allowed</code></td><td
                            >Enable social login</td
                        ><td><code>True</code></td></tr
                    >
                    <tr
                        ><td><code>is_otp_for_create_required</code></td><td
                            >Require OTP for account creation</td
                        ><td><code>True</code></td></tr
                    >
                    <tr
                        ><td><code>otp_token_ttl</code></td><td
                            >OTP time-to-live (seconds)</td
                        ><td><code>300</code></td></tr
                    >
                    <tr
                        ><td><code>allow_otp_resend_after</code></td><td
                            >OTP resend cooldown (seconds)</td
                        ><td><code>60</code></td></tr
                    >
                    <tr
                        ><td
                            ><code>user_profile_payload_protected_fields</code
                            ></td
                        ><td>Fields users cannot self-update</td><td
                            ><code>[]</code></td
                        ></tr
                    >
                    <tr
                        ><td><code>logout_on_pwd_change</code></td><td
                            >Force logout on password change</td
                        ><td><code>True</code></td></tr
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
                        ><td><code>mail_driver</code></td><td>Mail driver</td
                        ><td><code>"smtp"</code></td></tr
                    >
                    <tr
                        ><td><code>mail_host</code></td><td>SMTP server host</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>mail_port</code></td><td>SMTP port</td><td
                            ><code>587</code></td
                        ></tr
                    >
                    <tr
                        ><td><code>mail_username</code></td><td
                            >SMTP username</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>mail_password</code></td><td
                            >SMTP password</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>mail_encryption</code></td><td
                            >Encryption (<code>tls</code> or
                            <code>ssl</code>)</td
                        ><td><code>"tls"</code></td></tr
                    >
                    <tr
                        ><td><code>mail_from_address</code></td><td
                            >From email address</td
                        ><td><code>"noreply@admin.com"</code></td></tr
                    >
                    <tr
                        ><td><code>mail_from_name</code></td><td>From name</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>mock_smtp_api</code></td><td
                            >Mock SMTP calls (dev/test)</td
                        ><td><code>True</code></td></tr
                    >
                </tbody>
            </table>
        </div>

        <h3>SMS &amp; SMPP</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>send_sms_api</code></td><td
                            >SMS API endpoint</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>send_sms_otp_api</code></td><td
                            >OTP SMS API endpoint</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>sms_sender</code></td><td>SMS sender ID</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>smpp_auth_key</code></td><td
                            >SMPP auth key</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>mock_smpp_api</code></td><td
                            >Mock SMPP calls</td
                        ><td><code>True</code></td></tr
                    >
                    <tr
                        ><td><code>comms_api</code></td><td
                            >General comms API endpoint</td
                        ><td><code>""</code></td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ PATHS ═══ -->
    <div class="feature-section">
        <h2>Paths &amp; Directories</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>spaces_folder</code></td><td
                            >Directory for spaces data</td
                        ><td><code>"../sample/spaces/"</code></td></tr
                    >
                    <tr
                        ><td><code>management_space</code></td><td
                            >Management space name</td
                        ><td><code>"management"</code></td></tr
                    >
                    <tr
                        ><td><code>users_subpath</code></td><td
                            >Users subpath in management</td
                        ><td><code>"users"</code></td></tr
                    >
                    <tr
                        ><td><code>cxb_url</code></td><td
                            >Frontend (CXB) URL path</td
                        ><td><code>"/cxb"</code></td></tr
                    >
                    <tr
                        ><td><code>cxb_config_path</code></td><td
                            >CXB config file path</td
                        ><td><code>""</code> (auto)</td></tr
                    >
                    <tr
                        ><td><code>log_file</code></td><td
                            >Application log file</td
                        ><td><code>"../logs/dmart.ljson.log"</code></td></tr
                    >
                    <tr
                        ><td><code>ws_log_file</code></td><td
                            >WebSocket log file</td
                        ><td><code>"../logs/websocket.ljson.log"</code></td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ THIRD-PARTY ═══ -->
    <div class="feature-section">
        <h2>Third-Party Integrations</h2>

        <h3>OAuth Providers</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th></tr>
                </thead>
                <tbody>
                    <tr
                        ><td
                            ><code>google_client_id</code> /
                            <code>google_client_secret</code></td
                        ><td>Google OAuth credentials</td></tr
                    >
                    <tr
                        ><td
                            ><code>apple_client_id</code> /
                            <code>apple_client_secret</code></td
                        ><td>Apple OAuth credentials</td></tr
                    >
                    <tr
                        ><td
                            ><code>facebook_client_id</code> /
                            <code>facebook_client_secret</code></td
                        ><td>Facebook OAuth credentials</td></tr
                    >
                    <tr
                        ><td><code>google_application_credentials</code></td><td
                            >Path to Google Application Credentials JSON</td
                        ></tr
                    >
                </tbody>
            </table>
        </div>

        <h3>LDAP</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Setting</th><th>Description</th><th>Default</th></tr
                    >
                </thead>
                <tbody>
                    <tr
                        ><td><code>ldap_url</code></td><td>LDAP server URL</td
                        ><td><code>"ldap://"</code></td></tr
                    >
                    <tr
                        ><td><code>ldap_admin_dn</code></td><td
                            >LDAP Admin DN</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>ldap_root_dn</code></td><td>LDAP Root DN</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>ldap_pass</code></td><td>LDAP Password</td
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
                        ><td><code>auto_uuid_rule</code></td><td
                            >UUID generation rule</td
                        ><td><code>"auto"</code></td></tr
                    >
                    <tr
                        ><td><code>jq_timeout</code></td><td
                            >JQ processing timeout (seconds)</td
                        ><td><code>2</code></td></tr
                    >
                    <tr
                        ><td><code>url_shorter_expires</code></td><td
                            >Shortened URL expiration (seconds)</td
                        ><td><code>172800</code> (48h)</td></tr
                    >
                    <tr
                        ><td><code>is_sha_required</code></td><td
                            >Enable optimistic locking via checksum</td
                        ><td><code>False</code></td></tr
                    >
                    <tr
                        ><td><code>mock_otp_code</code></td><td
                            >Fixed OTP code for testing</td
                        ><td><code>"123456"</code></td></tr
                    >
                    <tr
                        ><td><code>invitation_link</code></td><td
                            >Base URL for invitation links</td
                        ><td><code>""</code></td></tr
                    >
                    <tr
                        ><td><code>store_payload_string</code></td><td
                            >Controls payload storage format</td
                        ><td><code>True</code></td></tr
                    >
                    <tr
                        ><td><code>enable_channel_auth</code></td><td
                            >Enable channel-based auth</td
                        ><td><code>False</code></td></tr
                    >
                    <tr
                        ><td><code>max_query_limit</code></td><td
                            >Hard limit on query results</td
                        ><td><code>10000</code></td></tr
                    >
                </tbody>
            </table>
        </div>
    </div>
</div>

<style>
</style>
