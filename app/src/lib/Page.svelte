<script>
  import Layout from "./Layout.svelte";
  import { site } from "./site.js";

  /** One page of the `website` space, as scripts/export-content.mjs wrote it. */
  let { page } = $props();
</script>

<Layout
  kind={page.doc ? "doc" : "standalone"}
  path="/{page.slug}"
  title={page.title + site.titleSuffix}
  description={page.description}
  hasDiagram={page.hasDiagram}
>
  <article class="prose">
    {#if !page.leadingHeading}<h1>{page.title}</h1>{/if}
    {@html page.html}
  </article>
</Layout>
