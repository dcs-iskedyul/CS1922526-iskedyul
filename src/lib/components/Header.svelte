<script>
  import Sidebar from "./Sidebar.svelte";
</script>

<header class="flex flex-col relative z-20">
  <div
    class="max-w-[1400px] mx-auto w-full flex items-left justify-between p-4 py-10">
  <Sidebar/>
  <div class = "max-h-1 flex fixed right-5 ">
    <img class = "size-6" src = "https://dcs.upd.edu.ph/staticfiles/media/dcs_logo.png" alt="DCS LOGO">
    <a href="/">
        <h1 class="font-bold text-left px-2">
          
          DCS <span 
          class="text-green-400">Iskedyul</span>
        </h1>
    </a>
</div>



</header>
