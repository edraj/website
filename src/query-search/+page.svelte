<script lang="ts">
</script>

<div class="content">
    <h1>Query Search</h1>
    <p class="intro">
        The <code>search</code> field on the <code>Query</code> body
        (<code>POST /managed/query</code>, <code>POST /public/query</code>)
        accepts a small RediSearch-flavoured expression language. The name is
        historical: this is purely a <strong>syntax</strong> — the parser
        compiles it straight into PostgreSQL <code>WHERE</code> clauses
        (pg_trgm wildcards + GIN jsonb containment). There is no Redis or
        RediSearch engine anywhere in the stack; every query runs against
        Postgres. This page covers <strong>every operator</strong> and
        <strong>every value form</strong>, with worked examples for each.
    </p>

    <!-- ═══ AT A GLANCE ═══ -->
    <div class="feature-section">
        <h2>At a glance</h2>
        <div class="code-container">
            <pre><code>{`{
  "type": "search",
  "space_name": "my_space",
  "subpath": "items",
  "search": "@is_active:true @payload.body.price:[10 100] -@payload.body.status:archived"
}`}</code></pre>
        </div>
        <p>
            The <code>search</code> string above means: <em>active items whose
            payload price is between 10 and 100, excluding any whose status is
            <code>archived</code></em>. The rest of this page explains how each
            token contributes.
        </p>
    </div>

    <!-- ═══ WHEN search RUNS ═══ -->
    <div class="feature-section">
        <h2>When <code>search</code> runs</h2>
        <p>
            The <code>search</code> field is consulted when <code>type</code> is
            one of:
        </p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th><code>type</code></th>
                        <th>Effect of <code>search</code></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>search</code></td>
                        <td>Primary use — full RediSearch-style expression.</td>
                    </tr>
                    <tr>
                        <td><code>subpath</code></td>
                        <td>Same parser; combined with the subpath narrowing.</td>
                    </tr>
                    <tr>
                        <td><code>aggregation</code></td>
                        <td>Filters the rows before aggregation.</td>
                    </tr>
                    <tr>
                        <td><code>attachments_aggregation</code></td>
                        <td>Same, for the attachments table.</td>
                    </tr>
                    <tr>
                        <td><code>tags</code></td>
                        <td>Filters which entries' tags are counted.</td>
                    </tr>
                    <tr>
                        <td><code>attachments</code></td>
                        <td>Filters attachments under a parent subpath.</td>
                    </tr>
                    <tr>
                        <td><code>random</code></td>
                        <td>
                            Filters the row pool before <code>ORDER BY RANDOM()</code>.
                        </td>
                    </tr>
                    <tr>
                        <td><code>counters</code></td>
                        <td>Filters the rows whose count is returned.</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p>
            The <code>search</code> field is <strong>ignored</strong> for
            <code>type</code> = <code>spaces</code>, <code>history</code>, or
            <code>events</code>.
        </p>
    </div>

    <!-- ═══ THREE KINDS OF TOKEN ═══ -->
    <div class="feature-section">
        <h2>Three kinds of token</h2>
        <p>
            The parser recognises exactly three kinds of token, separated by
            whitespace:
        </p>
        <ol>
            <li>
                <strong>Plain word</strong> — anything that isn't
                <code>@…:…</code>, <code>(</code>, <code>)</code>, or the
                literal <code>and</code>. Treated as free-text.
            </li>
            <li>
                <strong>Field selector</strong> — <code>@field:value</code> or
                <code>-@field:value</code>.
            </li>
            <li>
                <strong>Group delimiters</strong> — <code>(</code> and
                <code>)</code> for paren grouping.
            </li>
        </ol>
        <p>
            The literal word <code>and</code> is skipped (no-op). Inserting it
            for readability does not change behaviour.
        </p>
        <div class="code-container">
            <pre><code>{`"foo bar"           → two plain words
"foo @x:1"          → one plain word + one field selector
"foo and @x:1"      → identical to the line above`}</code></pre>
        </div>
    </div>

    <!-- ═══ PLAIN-TEXT SEARCH ═══ -->
    <div class="feature-section">
        <h2>Plain-text search</h2>
        <p>A bare word matches across the <strong>five</strong> common columns:</p>
        <ul>
            <li><code>shortname</code></li>
            <li><code>displayname</code> (jsonb, cast to text)</li>
            <li><code>description</code> (jsonb, cast to text)</li>
            <li><code>tags</code> (jsonb, cast to text)</li>
            <li><code>payload</code> (jsonb, cast to text)</li>
        </ul>
        <p>
            Match is case-insensitive substring (<code>ILIKE '%word%'</code>).
        </p>
        <div class="code-container">
            <pre><code>{`hello                  ⇒ rows where any of the five columns contains "hello"
foo bar                ⇒ rows where ALL the columns contain "foo" AND ALL contain "bar"
                          (multiple plain words AND together)`}</code></pre>
        </div>
        <p>Plain words and field selectors can be freely mixed:</p>
        <div class="code-container">
            <pre><code>{`web01 @payload.body.dc:us-east
                       ⇒ rows where shortname/displayname/description/tags/payload
                          contain "web01"  AND  payload.body.dc == "us-east"`}</code></pre>
        </div>
    </div>

    <!-- ═══ FIELD SELECTORS ═══ -->
    <div class="feature-section">
        <h2>Field selectors <code>@field:value</code></h2>
        <p>
            <code>field</code> is the column name (e.g. <code>shortname</code>,
            <code>is_active</code>) or a dotted jsonb path (e.g.
            <code>payload.body.email</code>). <code>field</code> must match
            <code>^[a-z][a-z0-9_]&#123;0,63&#125;$</code> — anything else is
            rejected silently.
        </p>
        <p>
            The behaviour depends on which <strong>category</strong>
            <code>field</code> falls into:
        </p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Examples</th>
                        <th>Behaviour</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Plain text column</td>
                        <td>
                            <code>shortname</code>, <code>subpath</code>,
                            <code>slug</code>, <code>space_name</code>,
                            <code>schema_shortname</code>,
                            <code>owner_shortname</code>, <code>state</code>
                        </td>
                        <td>
                            Exact <code>=</code> match; <code>*</code> in value
                            falls back to <code>ILIKE</code> glob.
                        </td>
                    </tr>
                    <tr>
                        <td>Boolean column</td>
                        <td><code>is_active</code>, <code>is_open</code></td>
                        <td>Cast to boolean before compare.</td>
                    </tr>
                    <tr>
                        <td>JSONB array column</td>
                        <td>
                            <code>tags</code>, <code>roles</code>,
                            <code>groups</code>
                        </td>
                        <td>
                            <code>@&gt;</code> containment (does the array
                            contain this value?).
                        </td>
                    </tr>
                    <tr>
                        <td>TEXT array column</td>
                        <td><code>query_policies</code></td>
                        <td>
                            <code>unnest()</code> + LIKE for pattern matching.
                        </td>
                    </tr>
                    <tr>
                        <td>Timestamp column</td>
                        <td>
                            <code>created_at</code>, <code>updated_at</code>,
                            <code>timestamp</code>
                        </td>
                        <td>
                            Numeric values are treated as Unix milliseconds; ISO
                            strings cast to <code>timestamptz</code>.
                        </td>
                    </tr>
                    <tr>
                        <td><code>payload.…</code> jsonb path</td>
                        <td>
                            <code>payload.body.x</code>,
                            <code>payload.body.config.db.host</code>
                        </td>
                        <td>
                            <code>payload @&gt; '&#123;…&#125;'::jsonb</code>
                            containment, type-aware.
                        </td>
                    </tr>
                    <tr>
                        <td><code>payload.…*</code> wildcard</td>
                        <td>
                            <code>payload.body.*</code>, <code>payload.*</code>
                        </td>
                        <td>
                            <code>ILIKE</code> over the cast-to-text subtree.
                        </td>
                    </tr>
                    <tr>
                        <td><code>payload.…[]</code> array iteration</td>
                        <td>
                            <code>payload.body.tags[]</code>,
                            <code>payload.body.items[].sku</code>
                        </td>
                        <td>
                            <code>EXISTS (… jsonb_array_elements …)</code> over
                            each element.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ ARRAY ITERATION ═══ -->
    <div class="feature-section">
        <h2>Array iteration in payload paths</h2>
        <p>
            Append <code>[]</code> to a path segment to iterate over a JSONB
            array. Two shapes:
        </p>

        <h3>Primitive-array element match</h3>
        <p>
            <code>@payload.body.arr[]:value</code> — <code>arr</code> is an
            array of scalars; the predicate matches if <strong>any</strong>
            element equals <code>value</code>.
        </p>
        <div class="code-container">
            <pre><code>{`@payload.body.tags[]:alpha
                ⇒ payload.body.tags is an array AND some element equals "alpha"`}</code></pre>
        </div>
        <p>
            Internally:
            <code
                >EXISTS (SELECT 1 FROM jsonb_array_elements_text(payload-&gt;'body'-&gt;'tags')
                AS e WHERE e = $1)</code
            > — guarded by <code>jsonb_typeof(...) = 'array'</code>.
        </p>

        <h3>Object-array element match (with sub-path)</h3>
        <p>
            <code>@payload.body.arr[].x:value</code> — <code>arr</code> is an
            array of objects; the predicate matches if <strong>any</strong>
            element's <code>x</code> equals <code>value</code>.
        </p>
        <div class="code-container">
            <pre><code>{`@payload.body.items[].sku:ABC123
                ⇒ payload.body.items has an element whose "sku" key equals "ABC123"`}</code></pre>
        </div>
        <p>Sub-paths can nest:</p>
        <div class="code-container">
            <pre><code>{`@payload.body.items[].config.host:localhost
                ⇒ payload.body.items has an element where config.host equals "localhost"`}</code></pre>
        </div>
        <p>
            Internally:
            <code
                >EXISTS (SELECT 1 FROM jsonb_array_elements(...) AS x WHERE
                x-&gt;&gt;'sku' = $1)</code
            >.
        </p>

        <h3>All value forms work over <code>[]</code></h3>
        <p>
            Every value form from the <em>Value forms</em> section composes with
            array iteration:
        </p>
        <div class="code-container">
            <pre><code>{`@payload.body.items[].price:>100         ⇒ any element's price > 100
@payload.body.items[].price:[10 100]     ⇒ any element's price BETWEEN 10 AND 100
@payload.body.items[].status:active|pending
                                         ⇒ any element's status is "active" or "pending"
-@payload.body.items[].status:archived
                                         ⇒ NOT (any element's status is "archived")
                                            (i.e. NO archived element exists)`}</code></pre>
        </div>

        <h3>Caveats</h3>
        <ul>
            <li>
                <strong
                    >Only the first <code>[]</code> in the path is treated as
                    iteration.</strong
                > Deeper <code>[]</code> segments are parsed as literal key
                names and will not match. E.g.
                <code>@payload.body.a[].b[].c:v</code> looks up the literal key
                <code>b[]</code> inside each <code>a</code> element — it does
                <strong>not</strong> double-iterate. Flatten the data model or
                use multiple queries instead.
            </li>
            <li>
                The path before <code>[]</code> must resolve to a JSONB array.
                The emitted predicate is guarded with
                <code>jsonb_typeof(...) = 'array'</code>, so non-array values
                silently don't match.
            </li>
            <li>
                Existence checks on the array itself
                (<code>@payload.body.arr[]:*</code>) are not specially handled —
                for "the array has at least one element", use the column-level
                form <code>@payload.body.arr:*</code> (which checks the array
                reference is non-null).
            </li>
        </ul>
    </div>

    <!-- ═══ VALUE FORMS ═══ -->
    <div class="feature-section">
        <h2>Value forms</h2>
        <p>Any of the following can appear after the colon in <code>@field:value</code>.</p>

        <h3>1. Plain string</h3>
        <div class="code-container">
            <pre><code>{`@shortname:my_entry          ⇒ shortname = 'my_entry'   (exact)
@payload.body.name:john      ⇒ payload contains {"body": {"name": "john"}}`}</code></pre>
        </div>

        <h3>2. Quoted string (for spaces inside)</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.name:"John Doe"
                             ⇒ payload contains {"body": {"name": "John Doe"}}`}</code></pre>
        </div>
        <p>Quotes are required only when the value contains whitespace.</p>

        <h3>3. Boolean</h3>
        <p>
            <code>true</code> / <code>false</code> (case-insensitive). Triggers
            a boolean cast.
        </p>
        <div class="code-container">
            <pre><code>{`@is_active:true              ⇒ CAST(is_active AS BOOLEAN) = true
@payload.body.enabled:false  ⇒ payload's \`enabled\` is the JSONB \`false\``}</code></pre>
        </div>

        <h3>4. Numeric</h3>
        <p>
            Optional minus, digits, optional decimal:
            <code>-?\d+(?:\.\d+)?</code>.
        </p>
        <div class="code-container">
            <pre><code>{`@payload.body.count:42       ⇒ payload's \`count\` equals 42 (number, not string)
@payload.body.score:3.14     ⇒ payload's \`score\` equals 3.14`}</code></pre>
        </div>
        <p>
            Numeric detection is per <strong>value</strong>: if the value parses
            as a number, the predicate adds a JSONB type guard
            (<code>jsonb_typeof = 'number'</code>) plus a <code>::float</code>
            comparison.
        </p>

        <h3>5. Wildcard (existence) <code>*</code></h3>
        <p>The literal <code>*</code> after the colon means "any value present":</p>
        <div class="code-container">
            <pre><code>{`@slug:*                      ⇒ slug IS NOT NULL
@payload.body.email:*        ⇒ payload's path \`body.email\` IS NOT NULL
@query_policies:*            ⇒ array_length(query_policies, 1) > 0`}</code></pre>
        </div>
        <p>Negated, it asserts absence:</p>
        <div class="code-container">
            <pre><code>{`-@slug:*                     ⇒ slug IS NULL
-@payload.body.email:*       ⇒ payload's path \`body.email\` IS NULL`}</code></pre>
        </div>

        <h3>6. Wildcard glob (column-level)</h3>
        <p>
            For plain text columns, an embedded <code>*</code> becomes
            <code>%</code> in <code>ILIKE</code>:
        </p>
        <div class="code-container">
            <pre><code>{`@shortname:web*              ⇒ shortname ILIKE 'web%'
@shortname:*api*             ⇒ shortname ILIKE '%api%'`}</code></pre>
        </div>
        <p class="code-note">
            Wildcard glob does not apply to jsonb-path values — those use
            containment, not LIKE.
        </p>

        <h3>7. OR-list <code>v1|v2|v3</code></h3>
        <p>
            A pipe-separated list. The values OR together for the same field.
        </p>
        <div class="code-container">
            <pre><code>{`@status:active|pending             ⇒ status='active' OR status='pending'
@payload.body.env:staging|prod     ⇒ payload's env is 'staging' OR 'prod'`}</code></pre>
        </div>
        <p>
            OR-lists obey the same type detection — all-numeric / all-boolean
            lists get the matching cast.
        </p>

        <h3>8. Range <code>[min max]</code> or <code>[min,max]</code></h3>
        <p>Square brackets, separator is <strong>a space or a comma</strong>.</p>
        <div class="code-container">
            <pre><code>{`@payload.body.price:[10 100]       ⇒ price BETWEEN 10 AND 100  (numeric)
@payload.body.age:[18,65]          ⇒ age BETWEEN 18 AND 65
@payload.body.created:[2024-01-01,2024-12-31]
                                   ⇒ string range, BETWEEN 'a' AND 'b'
@created_at:[1776902400000 1777161599999]
                                   ⇒ to_timestamp(min/1000.0) AND to_timestamp(max/1000.0)
                                      (timestamps treat numbers as Unix ms)
@updated_at:[2026-01-01,2026-12-31]
                                   ⇒ updated_at BETWEEN '...'::timestamptz AND '...'::timestamptz`}</code></pre>
        </div>
        <p>
            If both bounds are numeric, the range is treated as numeric;
            otherwise both are treated as strings.
        </p>

        <h3>9. Comparison <code>&gt;</code>, <code>&gt;=</code>, <code>&lt;</code>, <code>&lt;=</code></h3>
        <p>
            Prefix the value with the operator. <strong>Numeric values only</strong>
            (the parser falls back to plain string match for non-numeric
            comparison values).
        </p>
        <div class="code-container">
            <pre><code>{`@payload.body.price:>100           ⇒ price > 100
@payload.body.memory:>=16          ⇒ memory >= 16
@payload.body.latency:<100         ⇒ latency < 100
@payload.body.errors:<=5           ⇒ errors <= 5
@created_at:>1776902400000         ⇒ created_at > to_timestamp(1776902400000/1000.0)`}</code></pre>
        </div>
    </div>

    <!-- ═══ NEGATION ═══ -->
    <div class="feature-section">
        <h2>Negation <code>-@field:value</code></h2>
        <p>
            Prefix the selector with <code>-</code>. Negation works on every
            value form:
        </p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Form</th>
                        <th>Negated meaning</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>-@field:value</code></td>
                        <td>
                            <code>field != value</code> (or
                            <code>NOT (jsonb @&gt; …)</code>)
                        </td>
                    </tr>
                    <tr>
                        <td><code>-@field:v1|v2</code></td>
                        <td>
                            <code>field != v1 AND field != v2</code> (DeMorgan)
                        </td>
                    </tr>
                    <tr>
                        <td><code>-@field:[a b]</code></td>
                        <td><code>NOT BETWEEN a AND b</code></td>
                    </tr>
                    <tr>
                        <td><code>-@field:*</code></td>
                        <td><code>field IS NULL</code> (or array empty)</td>
                    </tr>
                    <tr>
                        <td><code>-@tags:x</code></td>
                        <td>
                            <code>NOT (tags @&gt; '["x"]'::jsonb)</code>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p>Examples:</p>
        <div class="code-container">
            <pre><code>{`-@status:deleted                   ⇒ status != 'deleted'
-@payload.body.status:deleted      ⇒ NOT (payload @> '{"body":{"status":"deleted"}}')
-@payload.body.env:staging|dev     ⇒ env != 'staging' AND env != 'dev'
-@payload.body.score:[0 50]        ⇒ score NOT BETWEEN 0 AND 50
-@roles:admin                      ⇒ roles array does NOT contain 'admin'`}</code></pre>
        </div>
        <p>
            There is <strong>no separate "not" operator</strong>; only the
            <code>-@</code> prefix.
        </p>
    </div>

    <!-- ═══ GROUPING ═══ -->
    <div class="feature-section">
        <h2>Grouping <code>( … )</code></h2>
        <p>Parens express OR-of-AND:</p>
        <ul>
            <li><strong>Within</strong> a paren group, terms AND together.</li>
            <li><strong>Between</strong> paren groups, the result is OR'd.</li>
        </ul>
        <div class="code-container">
            <pre><code>{`(@is_active:true)                          ⇒ is_active = true
(@is_active:true) (@payload.body.k:v)      ⇒ is_active = true OR payload.body.k = v
(@is_active:true @roles:admin) and (@payload.body.k:v)
                                           ⇒ (is_active = true AND roles ⊇ admin)
                                              OR
                                              (payload.body.k = v)`}</code></pre>
        </div>
        <p>
            The literal <code>and</code> between groups is dropped —
            paren-to-paren is always OR. To express AND between groups, drop
            the parens or merge their terms.
        </p>
    </div>

    <!-- ═══ SAME-FIELD ACCUMULATION ═══ -->
    <div class="feature-section">
        <h2>Same-field accumulation</h2>
        <p>Repeating a field with the same sign accumulates values:</p>
        <div class="code-container">
            <pre><code>{`@payload.body.tags:alpha and @payload.body.tags:beta
                ⇒ payload contains alpha  AND  payload contains beta
                  (i.e. both tags must be present)`}</code></pre>
        </div>
        <p>If the signs differ across repetitions, the <strong>last</strong> wins:</p>
        <div class="code-container">
            <pre><code>{`@x:1 -@x:1      ⇒ -@x:1   (value(s) re-set, last sign wins)`}</code></pre>
        </div>
    </div>

    <!-- ═══ COOKBOOK ═══ -->
    <div class="feature-section">
        <h2>Cookbook</h2>
        <p>Each recipe is an exact string you can drop into the <code>search</code> field.</p>

        <h3>Plain free-text</h3>
        <div class="code-container">
            <pre><code>{`hello
                ⇒ any column contains "hello"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`web01 nginx
                ⇒ any column contains "web01" AND any column contains "nginx"`}</code></pre>
        </div>

        <h3>Single field, exact</h3>
        <div class="code-container">
            <pre><code>{`@shortname:user_42
                ⇒ shortname is exactly 'user_42'`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@is_active:true
                ⇒ active rows`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@is_open:false
                ⇒ closed rows`}</code></pre>
        </div>

        <h3>Boolean and numeric inside payload</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.enabled:true
                ⇒ payload.body.enabled === true (JSON boolean)`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.count:42
                ⇒ payload.body.count === 42 (JSON number)`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.name:john
                ⇒ payload.body.name === "john" (JSON string)`}</code></pre>
        </div>

        <h3>Deep nested path</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.config.db.host:localhost
                ⇒ payload.body.config.db.host === "localhost"`}</code></pre>
        </div>

        <h3>Quoted value</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.name:"John Doe"
                ⇒ payload.body.name === "John Doe"`}</code></pre>
        </div>

        <h3>Existence / absence</h3>
        <div class="code-container">
            <pre><code>{`@slug:*
                ⇒ slug IS NOT NULL`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`-@slug:*
                ⇒ slug IS NULL`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.email:*
                ⇒ payload.body.email exists (any value)`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`-@payload.body.email:*
                ⇒ payload.body.email is missing or null`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@query_policies:*
                ⇒ row has at least one query policy`}</code></pre>
        </div>

        <h3>Wildcard glob on a column</h3>
        <div class="code-container">
            <pre><code>{`@shortname:web*
                ⇒ shortname starts with "web"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@shortname:*api*
                ⇒ shortname contains "api"`}</code></pre>
        </div>

        <h3>Wildcard inside payload (full-subtree text)</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.*:web01
                ⇒ stringified payload.body contains "web01" anywhere`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.*:something
                ⇒ stringified payload (whole) contains "something"`}</code></pre>
        </div>

        <h3>Tags / roles / groups (jsonb arrays)</h3>
        <div class="code-container">
            <pre><code>{`@tags:important
                ⇒ tags array contains "important"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@roles:super_admin
                ⇒ roles array contains "super_admin"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@groups:editors
                ⇒ groups array contains "editors"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`-@roles:admin
                ⇒ roles array does NOT contain "admin"`}</code></pre>
        </div>

        <h3>Query-policy patterns (TEXT[])</h3>
        <div class="code-container">
            <pre><code>{`@query_policies:test:api:content:true:*
                ⇒ at least one element of query_policies LIKE 'test:api:content:true:%'`}</code></pre>
        </div>

        <h3>OR-list</h3>
        <div class="code-container">
            <pre><code>{`@status:active|pending
                ⇒ status = 'active' OR status = 'pending'`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.env:staging|prod
                ⇒ payload.body.env is "staging" or "prod"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`-@payload.body.env:staging|dev
                ⇒ payload.body.env is neither "staging" nor "dev"`}</code></pre>
        </div>

        <h3>Comparisons</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.price:>100
                ⇒ price > 100`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.memory:>=16
                ⇒ memory >= 16`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.latency:<100
                ⇒ latency < 100`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.errors:<=5
                ⇒ errors <= 5`}</code></pre>
        </div>

        <h3>Numeric range</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.price:[10 100]
                ⇒ price BETWEEN 10 AND 100`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.age:[18,65]
                ⇒ age BETWEEN 18 AND 65`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`-@payload.body.score:[0 50]
                ⇒ score NOT BETWEEN 0 AND 50`}</code></pre>
        </div>

        <h3>String range</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.created:[2024-01-01,2024-12-31]
                ⇒ created sort-key BETWEEN '2024-01-01' AND '2024-12-31'`}</code></pre>
        </div>

        <h3>Timestamp range / comparison</h3>
        <div class="code-container">
            <pre><code>{`@created_at:[1776902400000 1777161599999]
                ⇒ created_at within an inclusive Unix-ms range`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@updated_at:[2026-01-01,2026-12-31]
                ⇒ updated_at BETWEEN '2026-01-01'::timestamptz AND '2026-12-31'::timestamptz`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@created_at:>1776902400000
                ⇒ created_at > to_timestamp(1776902400000/1000.0)`}</code></pre>
        </div>

        <h3>Multiple fields → AND</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.host:web01 @payload.body.dc:us-east
                ⇒ host = "web01" AND dc = "us-east"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.a:x @payload.body.b:y @payload.body.c:z
                ⇒ a = "x" AND b = "y" AND c = "z"`}</code></pre>
        </div>

        <h3>Mixed plain text + field</h3>
        <div class="code-container">
            <pre><code>{`web01 @payload.body.dc:us-east
                ⇒ free-text "web01" AND payload.body.dc = "us-east"`}</code></pre>
        </div>

        <h3>OR via parentheses</h3>
        <div class="code-container">
            <pre><code>{`(@is_active:true) (@payload.body.k:v)
                ⇒ is_active = true OR payload.body.k = v`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`(@is_active:true @roles:admin) (@payload.body.k:v)
                ⇒ (active admins) OR (rows with payload.body.k = v)`}</code></pre>
        </div>

        <h3>Negated payload</h3>
        <div class="code-container">
            <pre><code>{`-@payload.body.status:deleted
                ⇒ NOT (payload.body.status = "deleted")
                  (also matches rows where the path is missing)`}</code></pre>
        </div>

        <h3>Same field, accumulated AND</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.tags:alpha and @payload.body.tags:beta
                ⇒ payload.body.tags must contain BOTH "alpha" AND "beta"
                  (the literal \`and\` is optional — whitespace alone has the same effect)`}</code></pre>
        </div>

        <h3>Array iteration — primitives</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.tags[]:alpha
                ⇒ payload.body.tags array contains an element equal to "alpha"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.skus[]:ABC|DEF|GHI
                ⇒ payload.body.skus array contains "ABC" OR "DEF" OR "GHI"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`-@payload.body.tags[]:archived
                ⇒ payload.body.tags array does NOT contain "archived"`}</code></pre>
        </div>

        <h3>Array iteration — objects with sub-path</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.items[].sku:ABC123
                ⇒ payload.body.items has an object whose "sku" equals "ABC123"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.items[].price:>100
                ⇒ payload.body.items has an object whose "price" > 100`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.items[].price:[10 100]
                ⇒ payload.body.items has an object whose "price" BETWEEN 10 AND 100`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`@payload.body.items[].status:active|pending
                ⇒ payload.body.items has an object whose "status" is "active" or "pending"`}</code></pre>
        </div>
        <div class="code-container">
            <pre><code>{`-@payload.body.items[].status:archived
                ⇒ payload.body.items has NO object whose "status" is "archived"`}</code></pre>
        </div>

        <h3>Array iteration — nested object sub-path</h3>
        <div class="code-container">
            <pre><code>{`@payload.body.items[].config.host:localhost
                ⇒ payload.body.items has an object whose config.host equals "localhost"`}</code></pre>
        </div>

        <h3>Composite real-world example</h3>
        <div class="code-container">
            <pre><code>{`(@is_active:true @roles:editor) @payload.body.published:true -@tags:archived @updated_at:>1735689600000
                ⇒ active editors with published=true,
                  not tagged "archived",
                  updated since 2025-01-01 UTC`}</code></pre>
        </div>
    </div>

    <!-- ═══ AGGREGATION ═══ -->
    <div class="feature-section">
        <h2>Aggregation <code>type:"aggregation"</code></h2>
        <p>
            When <code>type</code> is <code>aggregation</code> (over the
            <code>entries</code> table) or <code>attachments_aggregation</code>
            (over the <code>attachments</code> table), the query carries an
            <code>aggregation_data</code> object instead of returning raw
            entries. It compiles straight into a single PostgreSQL
            <code>SELECT … GROUP BY …</code>. The <code>search</code> string, if
            present, still runs — as the <code>WHERE</code> clause
            <em>before</em> aggregation.
        </p>

        <h3>The <code>aggregation_data</code> shape</h3>
        <div class="code-container">
            <pre><code>{`{
  "type": "aggregation",
  "space_name": "shop",
  "subpath": "orders",
  "search": "@is_active:true",
  "aggregation_data": {
    "group_by": ["@payload.body.status"],
    "reducers": [
      { "reducer_name": "count", "alias": "orders" },
      { "reducer_name": "avg", "args": ["@payload.body.total"], "alias": "avg_total" }
    ]
  }
}`}</code></pre>
        </div>
        <p>
            <code>group_by</code> is a list of column names or dotted
            <code>payload.*</code> paths; a leading <code>@</code> is optional
            and stripped. <code>reducers</code> is a list of aggregate specs.
            (A third field, <code>load</code>, is accepted for wire-compat with
            upstream but the SQL builder derives its columns from
            <code>group_by</code> + <code>reducers</code> only — <code>load</code>
            is effectively a no-op here.)
        </p>

        <h3>The <code>reducers[]</code> item shape</h3>
        <div class="code-container">
            <pre><code>{`{ "reducer_name": "quantile", "args": ["@payload.body.price", "0.9"], "alias": "p90" }`}</code></pre>
        </div>
        <ul>
            <li>
                <code>reducer_name</code> — one of the functions in the table
                below (case-insensitive).
            </li>
            <li>
                <code>args</code> — positional arguments. <code>args[0]</code> is
                the target field (column or dotted <code>payload.*</code> path; a
                leading <code>@</code> is stripped). A missing
                <code>args[0]</code> is only valid for <code>count</code> /
                <code>count_distinct</code> (which fall back to <code>*</code>);
                every other reducer with no field is dropped from the SELECT.
            </li>
            <li>
                <code>alias</code> — the output attribute key. When omitted, the
                <code>reducer_name</code> itself is used. Aliases and group-by
                keys are sanitised to <code>[a-zA-Z0-9_]</code> (<code>@</code>
                and <code>.</code> become <code>_</code>), so
                <code>@payload.body.status</code> surfaces under the key
                <code>payload_body_status</code>.
            </li>
        </ul>

        <h3><code>reducer_name</code> reference</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th><code>reducer_name</code></th>
                        <th>Args</th>
                        <th>Compiles to (PostgreSQL)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>count</code></td>
                        <td>none, or <code>[field]</code></td>
                        <td><code>COUNT(*)</code> / <code>COUNT(field)</code></td>
                    </tr>
                    <tr>
                        <td><code>count_distinct</code></td>
                        <td>none, or <code>[field]</code></td>
                        <td>
                            <code>COUNT(*)</code> /
                            <code>COUNT(DISTINCT field)</code>
                        </td>
                    </tr>
                    <tr>
                        <td><code>sum</code></td>
                        <td><code>[field]</code></td>
                        <td><code>SUM((field)::numeric)</code></td>
                    </tr>
                    <tr>
                        <td><code>avg</code></td>
                        <td><code>[field]</code></td>
                        <td><code>AVG((field)::numeric)</code></td>
                    </tr>
                    <tr>
                        <td><code>min</code></td>
                        <td><code>[field]</code></td>
                        <td><code>MIN(field)</code></td>
                    </tr>
                    <tr>
                        <td><code>max</code></td>
                        <td><code>[field]</code></td>
                        <td><code>MAX(field)</code></td>
                    </tr>
                    <tr>
                        <td><code>stddev</code></td>
                        <td><code>[field]</code></td>
                        <td><code>STDDEV((field)::numeric)</code></td>
                    </tr>
                    <tr>
                        <td>
                            <code>group_concat</code>
                            <span class="code-note">(alias <code>tolist</code>)</span>
                        </td>
                        <td><code>[field]</code></td>
                        <td><code>STRING_AGG((field)::text, ',')</code></td>
                    </tr>
                    <tr>
                        <td><code>quantile</code></td>
                        <td><code>[field, q]</code></td>
                        <td>
                            <code
                                >percentile_cont(q) WITHIN GROUP (ORDER BY
                                (field)::numeric)</code
                            > — <code>q</code> is clamped to
                            <code>[0, 1]</code>; defaults to <code>0.5</code> if
                            absent/unparseable
                        </td>
                    </tr>
                    <tr>
                        <td><code>first_value</code></td>
                        <td><code>[field]</code></td>
                        <td>
                            <code
                                >(ARRAY_AGG(field ORDER BY updated_at
                                DESC))[1]</code
                            >
                        </td>
                    </tr>
                    <tr>
                        <td><code>random_sample</code></td>
                        <td><code>[field]</code></td>
                        <td>
                            <code
                                >(ARRAY_AGG(field ORDER BY RANDOM()))[1]</code
                            >
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p class="code-note">
            <code>group_concat</code> / <code>tolist</code> are the same
            reducer; so are <code>count</code> / <code>r_count</code>,
            <code>count_distinct</code> / <code>count_distinctish</code>, and
            <code>sum</code> / <code>total</code> (wire-compat aliases). Any
            unrecognised <code>reducer_name</code> is silently skipped.
        </p>

        <h3>Response shape</h3>
        <p>
            Each result group becomes one <code>Record</code> with
            <code>resource_type: "content"</code>, <code>shortname:
            "aggregation"</code>, and the grouped columns + reducer aliases in
            <code>attributes</code>:
        </p>
        <div class="code-container">
            <pre><code>{`{
  "status": "success",
  "records": [
    {
      "resource_type": "content",
      "shortname": "aggregation",
      "subpath": "/orders",
      "attributes": { "payload_body_status": "paid", "orders": 128, "avg_total": 57.4 }
    },
    {
      "resource_type": "content",
      "shortname": "aggregation",
      "subpath": "/orders",
      "attributes": { "payload_body_status": "pending", "orders": 34, "avg_total": 41.2 }
    }
  ],
  "attributes": { "total": 2, "returned": 2 }
}`}</code></pre>
        </div>
        <p class="code-note">
            Integer aggregates come back as JSON integers and numeric
            aggregates (<code>avg</code>, <code>sum</code>, <code>stddev</code>,
            <code>quantile</code>) as JSON doubles.
        </p>

        <h3><code>attachments_aggregation</code></h3>
        <p>
            Identical grammar, but the <code>FROM</code> table is
            <code>attachments</code> instead of <code>entries</code> — use it to
            aggregate over attachments (media / comments / relationships / …)
            hanging off a parent subpath. Example: count attachments per
            content-type across a subpath.
        </p>
        <div class="code-container">
            <pre><code>{`{
  "type": "attachments_aggregation",
  "space_name": "shop",
  "subpath": "orders",
  "aggregation_data": {
    "group_by": ["@payload_content_type"],
    "reducers": [ { "reducer_name": "count", "alias": "n" } ]
  }
}`}</code></pre>
        </div>
    </div>

    <!-- ═══ JOINS & JQ_FILTER ═══ -->
    <div class="feature-section">
        <h2>Joins &amp; <code>jq_filter</code></h2>
        <p>
            Two post-processing hooks reshape a query's result set on the
            server: <code>join</code> attaches related entries under each base
            record, and <code>jq_filter</code> pipes the whole
            <code>records[]</code> array through a bounded <code>jq</code>
            transform. Both live on the <code>Query</code> body alongside
            <code>search</code>.
        </p>

        <h3><code>join[]</code> — attach related records</h3>
        <p>Each item in the <code>join</code> list has this shape:</p>
        <div class="code-container">
            <pre><code>{`{
  "join_on": "payload.body.customer:shortname",
  "alias": "customer",
  "type": "left",
  "query": {
    "type": "subpath",
    "space_name": "shop",
    "subpath": "customers"
  }
}`}</code></pre>
        </div>
        <ul>
            <li>
                <code>join_on</code> — a comma-separated list of
                <code>left:right</code> field pairs. <code>left</code> is a path
                on the <strong>base</strong> record, <code>right</code> a path on
                the joined (sub-query) record. Append <code>[]</code> to a side
                to match against each element of a JSONB array
                (e.g. <code>payload.body.tags[]:shortname</code>). Multiple pairs
                (comma-separated) must all match.
            </li>
            <li>
                <code>alias</code> — the key under which matches are attached.
                Each base record gains
                <code>attributes.join.&#123;alias&#125;</code> — a list of the
                matched sub-query records (empty list when nothing matched).
            </li>
            <li>
                <code>type</code> — a <code>JoinType</code>:
                <code>left</code> (default), <code>right</code>,
                <code>inner</code>, or <code>outer</code>. A missing or
                <code>null</code> type is treated as <code>left</code>.
            </li>
            <li>
                <code>query</code> — a nested <code>Query</code> object (same
                schema, recursively) describing the right-hand side to pull and
                match against.
            </li>
        </ul>
        <p>
            <strong>Pagination semantics.</strong> A <code>left</code> join is
            cardinality-preserving — the base page is fetched normally, then
            matches are attached. A cardinality-<em>changing</em> join
            (<code>inner</code>, <code>right</code>, or <code>outer</code>) can
            drop or append rows, so the server fetches the base set
            <strong>unpaginated</strong> (offset&nbsp;0, capped at
            <code>MaxQueryLimit</code>), performs the join over the whole set,
            then <strong>re-paginates the joined result</strong> with your
            original <code>limit</code>/<code>offset</code>. In other words:
            <code>inner</code>/<code>right</code>/<code>outer</code> give you
            "join-then-page" semantics, bounded by the max-limit cap.
        </p>
        <p class="code-note">
            <code>right</code>/<code>outer</code> joins are
            O(right-table-size) by design (they must surface right records the
            base set never referenced) and are bounded by an internal 1000-row
            match cap. Pair them with a selective <code>query.search</code> to
            keep them fast.
        </p>
        <p>A worked example — orders with their customer attached:</p>
        <div class="code-container">
            <pre><code>{`{
  "type": "subpath",
  "space_name": "shop",
  "subpath": "orders",
  "limit": 10,
  "join": [
    {
      "join_on": "payload.body.customer:shortname",
      "alias": "customer",
      "type": "inner",
      "query": { "type": "subpath", "space_name": "shop", "subpath": "customers" }
    }
  ]
}`}</code></pre>
        </div>
        <p>A matched base record comes back like:</p>
        <div class="code-container">
            <pre><code>{`{
  "resource_type": "content",
  "shortname": "order_1001",
  "subpath": "/orders",
  "attributes": {
    "payload": { "body": { "customer": "acme", "total": 57.4 } },
    "join": {
      "customer": [
        { "resource_type": "content", "shortname": "acme", "subpath": "/customers",
          "attributes": { "payload": { "body": { "tier": "gold" } } } }
      ]
    }
  }
}`}</code></pre>
        </div>

        <h3><code>jq_filter</code> — server-side jq transform</h3>
        <p>
            <code>jq_filter</code> is a top-level string on the
            <code>Query</code> body. After the query runs, the server pipes the
            <code>records[]</code> array through the <code>jq</code> binary as
            <code>map(&lt;your filter&gt;)</code> — so your filter is written
            against a <strong>single record's shape</strong> and is applied to
            every record. The transformed array is slotted back into
            <code>records</code>; <code>status</code>, <code>attributes</code>,
            and <code>error</code> are preserved.
        </p>
        <div class="code-container">
            <pre><code>{`{
  "type": "search",
  "space_name": "shop",
  "subpath": "orders",
  "jq_filter": ".attributes.payload.body"
}`}</code></pre>
        </div>
        <p>
            The filter above projects each record down to just its payload body,
            so <code>records</code> becomes a flat list of body objects. (The
            server wraps it as <code>map(.attributes.payload.body)</code> — do
            not include your own <code>map(…)</code> or a leading
            <code>.records</code>; the input to your filter is already a single
            record.)
        </p>
        <p><strong>Bounds &amp; safety.</strong></p>
        <ul>
            <li>
                Runs only on a <strong>successful</strong> result set with a
                non-null <code>records</code>; otherwise it is a no-op.
            </li>
            <li>
                Subprocess timeout is <code>JQ_TIMEOUT</code> seconds (config
                key, default <code>2</code>). A timeout returns a
                <code>JQ_TIMEOUT</code> failure envelope; a jq syntax/runtime
                error returns <code>JQ_ERROR</code>.
            </li>
            <li>
                The filter is capped at <strong>1024 characters</strong> and
                rejected if it references dangerous builtins
                (<code>env</code>, <code>$ENV</code>, <code>input</code>,
                <code>debug</code>, <code>stderr</code>, <code>path(</code>,
                <code>getpath</code>, <code>halt</code>,
                <code>halt_error</code>, <code>builtins</code>,
                <code>modulemeta</code>, <code>$__loc__</code>).
            </li>
            <li>
                <code>jq</code> must be on <code>PATH</code> (the RPM/container
                declares it as a dependency); if it is missing the filter fails
                cleanly rather than crashing the request.
            </li>
        </ul>
        <p class="code-note">
            A <code>jq_filter</code> may also be set on a join's nested
            <code>query</code>, where it reshapes that join's matched list
            (wrapped as <code>map([ &lt;filter&gt; ])</code> for per-base
            alignment) before attachment.
        </p>
    </div>

    <!-- ═══ EVENTS & HISTORY ═══ -->
    <div class="feature-section">
        <h2><code>history</code> &amp; <code>events</code> queries</h2>
        <p>
            These two query types ignore the <code>search</code> DSL entirely
            (see the table at the top) and instead read audit trails. Both
            <strong>require authentication</strong> — anonymous callers are
            rejected.
        </p>

        <h3><code>history</code></h3>
        <p>
            Reads the per-entry change log from the <code>histories</code>
            table. Narrow it with <code>filter_shortnames</code> to a specific
            entry (plus the usual <code>subpath</code>):
        </p>
        <div class="code-container">
            <pre><code>{`{
  "type": "history",
  "space_name": "shop",
  "subpath": "orders",
  "filter_shortnames": ["note1"],
  "limit": 20,
  "sort_type": "descending"
}`}</code></pre>
        </div>
        <p>
            Each record carries the change's <code>timestamp</code>,
            <code>user_shortname</code>, request type, and a diff of what
            changed.
        </p>

        <h3><code>events</code></h3>
        <p>
            Reads the append-only space event feed
            (<code>events.jsonl</code> under the space, when the optional event
            log is enabled). It is filtered only by <code>from_date</code> /
            <code>to_date</code> and paged — <code>filter_shortnames</code>,
            <code>filter_types</code>, and <code>subpath</code> are
            <strong>ignored</strong> (events live at the space root). Default
            sort is newest-first.
        </p>
        <div class="code-container">
            <pre><code>{`{
  "type": "events",
  "space_name": "shop",
  "subpath": "/",
  "limit": 50
}`}</code></pre>
        </div>
        <p class="code-note">
            If the space has no configured event log, the events feed is
            simply empty — there is no PostgreSQL fallback (parity with
            upstream).
        </p>

        <p class="highlight">
            Looking for natural-language / vector search instead of the
            <code>search</code> DSL? That is a separate endpoint —
            <code>POST /managed/semantic-search</code> (pgvector cosine
            similarity), documented on its own page. It does not use the
            <code>search</code> string or any of the query types above.
        </p>
    </div>

    <!-- ═══ QUICK REFERENCE ═══ -->
    <div class="feature-section">
        <h2>Quick reference</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Token</th>
                        <th>Meaning</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>word</code></td>
                        <td>
                            substring match across shortname, displayname,
                            description, tags, payload
                        </td>
                    </tr>
                    <tr>
                        <td><code>@field:value</code></td>
                        <td>exact match (column or jsonb path)</td>
                    </tr>
                    <tr>
                        <td><code>@field:"v with spaces"</code></td>
                        <td>quoted value</td>
                    </tr>
                    <tr>
                        <td>
                            <code>@field:true</code> / <code>:false</code>
                        </td>
                        <td>boolean compare</td>
                    </tr>
                    <tr>
                        <td>
                            <code>@field:42</code> / <code>:3.14</code>
                        </td>
                        <td>numeric compare (with type guard on jsonb)</td>
                    </tr>
                    <tr>
                        <td><code>@field:*</code></td>
                        <td>exists / IS NOT NULL</td>
                    </tr>
                    <tr>
                        <td><code>-@field:*</code></td>
                        <td>missing / IS NULL</td>
                    </tr>
                    <tr>
                        <td><code>@col:abc*</code></td>
                        <td>glob (column-level ILIKE)</td>
                    </tr>
                    <tr>
                        <td><code>@payload.x.*:v</code></td>
                        <td>substring search over the cast-to-text subtree</td>
                    </tr>
                    <tr>
                        <td><code>@payload.body.arr[]:v</code></td>
                        <td>EXISTS — primitive-array element equals <code>v</code></td>
                    </tr>
                    <tr>
                        <td><code>@payload.body.arr[].x:v</code></td>
                        <td>
                            EXISTS — object-array element's <code>x</code>
                            equals <code>v</code>
                        </td>
                    </tr>
                    <tr>
                        <td><code>@field:v1|v2</code></td>
                        <td>OR-list</td>
                    </tr>
                    <tr>
                        <td><code>@field:[a b]</code></td>
                        <td>range (space or comma separator)</td>
                    </tr>
                    <tr>
                        <td>
                            <code>@field:&gt;n</code> <code>@field:&gt;=n</code>
                            <code>@field:&lt;n</code> <code>@field:&lt;=n</code>
                        </td>
                        <td>comparisons (numeric values)</td>
                    </tr>
                    <tr>
                        <td><code>-@field:value</code></td>
                        <td>negation (works on every form above)</td>
                    </tr>
                    <tr>
                        <td><code>(A B) (C)</code></td>
                        <td>AND inside, OR between groups</td>
                    </tr>
                    <tr>
                        <td><code>and</code></td>
                        <td>no-op keyword, ignored</td>
                    </tr>
                    <tr>
                        <td>
                            <code>@tags:x</code> <code>@roles:x</code>
                            <code>@groups:x</code>
                        </td>
                        <td>jsonb array containment</td>
                    </tr>
                    <tr>
                        <td><code>@query_policies:pat:*</code></td>
                        <td>TEXT[] LIKE pattern (unnest)</td>
                    </tr>
                    <tr>
                        <td><code>@created_at:[ms ms]</code></td>
                        <td>timestamp range, numeric = Unix milliseconds</td>
                    </tr>
                    <tr>
                        <td><code>@created_at:[iso,iso]</code></td>
                        <td>timestamp range, ISO strings</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ LIMITATIONS ═══ -->
    <div class="feature-section">
        <h2>Limitations</h2>
        <p>The search language deliberately does <strong>not</strong> support:</p>
        <ul>
            <li>Regular expressions.</li>
            <li>Fuzzy matching, typo tolerance, or stemming.</li>
            <li>Phrase / proximity operators.</li>
            <li>Logical NOT outside of the <code>-@</code> prefix.</li>
            <li>
                <strong>Indexed</strong> access into JSON arrays
                (<code>@payload.body.items[0].name</code>). Use
                <code>@payload.body.items[].name:value</code> to match
                <em>any</em> element instead.
            </li>
            <li>
                <strong>Nested</strong> array iteration. Only the first
                <code>[]</code> in a path is treated as iteration — subsequent
                <code>[]</code> segments are interpreted as literal key names.
                <code>@payload.body.a[].b[].c:v</code> does <strong>not</strong>
                double-iterate.
            </li>
        </ul>
        <p class="highlight">
            For semantic / vector search, use the separate
            <code>POST /managed/semantic-search</code> endpoint — it is
            <strong>not</strong> part of the <code>search</code> string.
        </p>
        <p>
            For free-form SQL or stored queries, use saved-query /
            <code>aggregation</code> flows; raw SQL is never accepted in the
            <code>search</code> field.
        </p>
    </div>
</div>

<style>
    /* h2 inline code styling matches api-docs page */
    h2 code {
        font-size: 0.85em;
        font-family: var(--font-mono);
        text-transform: none;
        margin-left: 0.25rem;
    }

    h3 code {
        font-size: 0.9em;
        font-family: var(--font-mono);
    }
</style>
