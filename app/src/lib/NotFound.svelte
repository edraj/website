<script>
  import Layout from "./Layout.svelte";
  import { site } from "./site.js";
</script>

<Layout kind="standalone" title={"Page not found" + site.titleSuffix} ogType="website">
  <article class="prose not-found">
    <h1>Page not found</h1>
    <p>There is no page at this address. <a href="/">Go to the home page</a>.</p>
  </article>
</Layout>
