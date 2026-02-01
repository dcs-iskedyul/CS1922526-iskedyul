<script>
	import InstructorClass from "./InstructorClass.svelte";
  import InstructorInfo from  "./InstructorInfo.svelte";
  import Sidebar from "./Sidebar.svelte";


  let activeInstructorTab = $state('instructorInfo');
  let { onDeleteInstructor } = $props();

/**
 * @param {string} tab
 */
function setTab(tab) {
  activeInstructorTab = tab;
}

</script>



<div class="flex h-screen">
  <Sidebar />
  <div class="schedule-container flex-1 p-12 ml-32">
  <div>
    <div class="view-btns flex justify-end space-x-2">
      <button class="sched-view-btn" onclick={() => setTab('instructorClass')} style="background-color: {activeInstructorTab === 'instructorClass' ? '#ADD6BD' : '#DADADA'}">Classes</button>
      <button class="sched-view-btn" onclick={() => setTab('instructorInfo')} style="background-color: {activeInstructorTab === 'instructorInfo' ? '#ADD6BD' : '#DADADA'}">Instructors</button>
         </div>
  </div>
  
  <div>
    {#if activeInstructorTab == 'instructorClass'}
      <InstructorClass/>
    {:else if activeInstructorTab == 'instructorInfo'}
      <InstructorInfo onDeleteInstructor={onDeleteInstructor} />
    {/if}
  </div>
  
  </div>
  
  </div>
