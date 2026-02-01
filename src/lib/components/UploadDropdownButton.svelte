<script>
  import { clickOutside } from "svelte-outside";
  
  export let onOption1 = () => {}; // Faculty Loading format
  export let onOption2 = () => {}; // CRS format
  
  let isOpen = false;
  
  function toggleDropdown() {
    isOpen = !isOpen;
  }
  
  function handleClickOutside() {
    isOpen = false;
  }
</script>

<div class="relative" use:clickOutside={handleClickOutside}>
  <button 
    class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded cursor-pointer text-sm flex items-center gap-1"
    on:click={toggleDropdown}
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
    Choose File
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
  
  {#if isOpen}
    <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
      <div class="py-1">
        <button 
          class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          on:click={() => {
            onOption1();
            isOpen = false;
          }}
        >
          Faculty Loading
        </button>
        <button 
          class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          on:click={() => {
            onOption2();
            isOpen = false;
          }}
        >
          CRS Format
        </button>
      </div>
    </div>
  {/if}
</div>