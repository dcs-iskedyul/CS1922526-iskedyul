<!-- <button data-drawer-target="default-sidebar" data-drawer-toggle="default-sidebar" aria-controls="default-sidebar" type="button" class="inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600">
    <span class="sr-only">Open sidebar</span>
    <svg class="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path clip-rule="evenodd" fill-rule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"></path>
    </svg>
 </button> -->



 <script>
   import { fly } from 'svelte/transition';
   import { supabase } from "$lib/supabaseClient";
   import { Toaster, toast } from 'svelte-sonner';

   let sidebar = true;

   // function toggleSidebar(){
   //    sidebar = !sidebar
   // }


   async function logOutSupabase() {
      try {
      const { error } = await supabase.auth.signOut();
      window.location.href = "/dashboard";
   } catch (error) {
    toast.error("Something went wrong");
  }
   }

   const fadeIn = {
		delay: 100,
		duration: 200
	}
	
	const fadeOut = {
		delay: 0,
		duration: 100
	}

</script>

<!-- {#if !sidebar}
<button  class="w-64 fixed top-0 left-0 px-3 py-4 max-h-1" on:click={toggleSidebar}>☰ Open Sidebar</button>  
{/if} -->

 <!-- {#if sidebar} -->
<aside id="default-sidebar" class="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0" aria-label="Sidebar">
   <Toaster/>
   <div class="h-full px-3 py-4 overflow-y-auto bg-green-800">
       <ul class="space-y-2 font-medium">
          <li>
             <a href=/dashboard class="flex items-center p-2 text-white rounded-lg hover:bg-white group">
                <i class="fa-solid fa-compass group-hover:invert"></i>
                <span class="ms-3 group-hover:text-black">Dashboard</span>
             </a>
          </li>
          <li>
             <a href=/profile class="flex items-center p-2 text-white rounded-lg hover:bg-gray-100 group">
                <i class="fa-solid fa-user group-hover:invert"></i>
                <span class="flex-1 ms-3 whitespace-nowrap group-hover:text-black">Profile</span>
             </a>
          </li>
          <li>
             <a href=/schedules class="flex items-center p-2 text-white rounded-lg hover:bg-gray-100 group">
                <i class="fa-solid fa-calendar-days group-hover:invert"></i>
                <span class="flex-1 ms-3 whitespace-nowrap group-hover:text-black">Schedules</span>
             </a>
          </li>
          <li>
             <a href=/data class="flex items-center p-2 text-white rounded-lg hover:bg-gray-100 group">
                <i class="fa-solid fa-folder-open group-hover:invert"></i>
                <span class="flex-1 ms-3 whitespace-nowrap group-hover:text-black">Data</span>
             </a>
          </li>
          <li>
               <button onclick={logOutSupabase} class="flex items-center p-2 text-white rounded-lg hover:bg-gray-100 group">
                <i class="fa-solid fa-right-to-bracket group-hover:invert"></i>
                <span class="flex-1 ms-3 whitespace-nowrap group-hover:text-black">Log out</span>
             </button>
          </li>
       </ul>
    </div>
</aside> 
<!-- {/if} -->
<!-- 
<div>
    
    <div class="">
      <button class="openbtn" on:click={toggleSidebar}>☰ Open Sidebar</button>  
      <h2>Collapsed Sidebar</h2>
      <p>Click on the hamburger menu/bar icon to open the sidebar, and push this content to the right.</p>
    </div>

    {#if sidebar}
    <aside>
      <div id="mySidebar" class:sidebar>
         <button class="closebtn" on:click={toggleSidebar}>×</button>
         <a href="#" class="flex items-center p-2 text-white rounded-lg hover:bg-white group">
            <i class="fa-solid fa-compass group-hover:invert"></i>
            <span class="ms-3 group-hover:text-black">Dashboard</span>
         </a>
         <a href="#" class="flex items-center p-2 text-white rounded-lg hover:bg-gray-100 group">
            <i class="fa-solid fa-user group-hover:invert"></i>
            <span class="flex-1 ms-3 whitespace-nowrap group-hover:text-black">Profile</span>
         </a>
         <a href=/schedules class="flex items-center p-2 text-white rounded-lg hover:bg-gray-100 group">
            <i class="fa-solid fa-calendar-days group-hover:invert"></i>
            <span class="flex-1 ms-3 whitespace-nowrap group-hover:text-black">Schedules</span>
         </a>
         <a href="#" class="flex items-center p-2 text-white rounded-lg hover:bg-gray-100 group">
            <i class="fa-solid fa-folder-open group-hover:invert"></i>
            <span class="flex-1 ms-3 whitespace-nowrap group-hover:text-black">Data</span>
         </a>
         <a href="#" class="flex items-center p-2 text-white rounded-lg hover:bg-gray-100 group">
            <i class="fa-solid fa-right-to-bracket group-hover:invert"></i>
            <span class="flex-1 ms-3 whitespace-nowrap group-hover:text-black">Log out</span>
         </a>
      </div>
    </aside>
    {/if}
</div>

<style> -->

<!-- 
   .sidebar {
     height: 100%;
     width: 250px;
     position: fixed;
     z-index: 1;
     top: 0;
     left: 0;
     background-color: rgb(22 101 52);
     overflow-x: hidden;
     transition: 0.5s;
     padding-top: 60px;
     transition: all 0.3s ease-out;
   }
   
   .sidebar a {
     padding: 8px 8px 8px 32px;
     text-decoration: none;
     color: white;
     display: block;
     transition: 0.3s;
   }
   
   .sidebar a:hover {
     color: #f1f1f1;
   }
   
   .sidebar .closebtn {
     position: absolute;
     top: 0;
     padding: 0.75rem;
     font-size: 36px;
   }
   
   .openbtn {
     font-size: 20px;
     cursor: pointer;
     background-color: #111;
     color: white;
     padding: 10px 15px;
     border: none;
   }
   
   .openbtn:hover {
     background-color: #444;
   }
   
   </style>
   
 -->