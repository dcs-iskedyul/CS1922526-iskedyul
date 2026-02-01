<script>
  import "../app.css";
  import Footer from "../lib/components/Footer.svelte";
  export let data;
  export let session = data.session;

</script>

<slot />

<Footer />

<!-- header
    login
    footer -->
