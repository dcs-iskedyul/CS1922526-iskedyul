<script>
  export let onOption1 = () => {};
  export let onOption2 = () => {};

  let isOpen = false;

  function toggleDropdown() {
    isOpen = !isOpen;
  }
</script>

<style>
  .dropdown {
    position: relative;
    display: inline-block;
  }
  .dropdown-menu {
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    list-style: none;
    padding: 5px;
    margin: 0;
    width: 150px;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  }
  .dropdown-menu li {
    padding: 8px;
    cursor: pointer;
  }
  .dropdown-menu li:hover {
    background: #f0f0f0;
  }
  .button {
    background: #3498db;
    color: white;
    border: none;
    padding: 10px;
    cursor: pointer;
    border-radius: 5px;
  }
</style>

<div class="dropdown">
  <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
   on:click={toggleDropdown}>
    Export CSV ▼
  </button>
  
  {#if isOpen}
    <ul class="dropdown-menu rounded-lg">
      <li on:click={() => { onOption1(); isOpen = false; }}>Faculty Loading</li>
      <li on:click={() => { onOption2(); isOpen = false; }}>CRS Format</li>
    </ul>
  {/if}
</div>
