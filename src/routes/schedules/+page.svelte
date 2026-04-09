<script>
  import Table from "../../lib/components/Table.svelte";
  import VenueView from "../../lib/components/VenueView.svelte";
  import Sample from "../../lib/components/Sample.svelte";
  import InstructorView from "../../lib/components/InstructorView.svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let update = $state(false);
  let showDeleteInstructorModal = $state(false);
  let modalDeleteInstructorUpdate = $state(false);
  let deleteInstructorID;
  let deleteInstructorName;

  // Added: Term Selection State
  let availableYears = $state([]);
  let selectedAcademicYear = $state("");
  let selectedSemester = $state("1"); 
  let isTermLoaded = $state(false);

  // Added: Memory Saver
  $effect(() => {
      if (browser) {
          sessionStorage.setItem('sched_term', selectedAcademicYear);
          sessionStorage.setItem('sched_sem', selectedSemester);
      }
  });

  onMount(async () => {
      // Restore from memory
      if (sessionStorage.getItem('sched_term')) selectedAcademicYear = sessionStorage.getItem('sched_term');
      if (sessionStorage.getItem('sched_sem')) selectedSemester = sessionStorage.getItem('sched_sem');
      
      await fetchAllTerms();
  });

  async function fetchAllTerms() {
      const { data, error } = await supabase.from('academic_terms').select('*');
      if (data && data.length > 0) {
          availableYears = [...new Set(data.map(d => d.academic_year))].sort();
          if (!selectedAcademicYear || !availableYears.includes(selectedAcademicYear)) {
              selectedAcademicYear = availableYears[0];
          }
          isTermLoaded = true;
      }
  }

  const toggleDeleteInstructorModal = (id, name) => {
      deleteInstructorID = id;
      deleteInstructorName = name;
      showDeleteInstructorModal = true;
      modalDeleteInstructorUpdate = !modalDeleteInstructorUpdate;
  };

  async function handleDeleteInstructorSubmitEnd() {
      deleteInstructorFinal();
      clickOutDeleteInstructorModal();
  }

  async function clickOutDeleteInstructorModal() {
      try {
          showDeleteInstructorModal = false;
          modalDeleteInstructorUpdate = !modalDeleteInstructorUpdate;
      } catch(err) {
          console.log(err)
      }
  }

  const deleteInstructorFinal = async () => {
      try {
          const { error } = await supabase.from('instructors').delete().eq('id', deleteInstructorID);
          if (error) throw error;
          
          const { error2 } = await supabase.from('classes').update({ instructor: "TBA" }).eq("instructor", deleteInstructorName);
          if (error2) throw error2;
          
          update = !update;
      } catch (err) {
          console.error(err);
      }
  };

  let pastelColors = { pink: "#df746a", orange: "#eba434", green: "#43b770", blue: "#6f80d3" };
  let activeTab = $state('venue');

  function setTab(tab) {
      activeTab = tab;
  }
</script>

<div class="flex h-screen bg-gray-50">
  <Sidebar />

  {#key modalDeleteInstructorUpdate}
  {#if modalDeleteInstructorUpdate}
  <div class="backdrop z-100 flex justify-center items-center">
      <div class="delete-modal z-200 shadow-xl" usetapOutside={(e) => clickOutDeleteInstructorModal()}>
          <h3 class="text-red-600 mb-2"><strong>WARNING: This instructor may have classes in the current schedules.</strong> </h3>
          <h3 class="mb-6 text-gray-600">Deleting will cause classes associated with this instructor to be changed to "TBA"</h3>
          <h3 class="text-lg font-bold">Are you sure to delete {deleteInstructorName}? </h3>
          
          <div class="flex mt-6">
              <button class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition" onclick={clickOutDeleteInstructorModal}>Cancel</button>
              <button class="ml-auto bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2" onclick={handleDeleteInstructorSubmitEnd}>Delete</button>
          </div>
      </div>
  </div>
  {/if}
  {/key}

  <div class="schedule-container flex-1 p-8 ml-64 overflow-y-auto">
      
      <div class="flex justify-between items-end mb-8 border-b border-gray-200 pb-6">
          <div>
              <h1 class="text-3xl font-bold text-gray-800 mb-4">Class Schedules</h1>
              
              <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-max">
                  <span class="text-sm font-medium text-gray-600"><i class="fa-solid fa-graduation-cap"></i> Term:</span>
                  
                  <select bind:value={selectedAcademicYear} class="text-sm font-bold text-gray-800 bg-transparent cursor-pointer hover:bg-gray-100 p-1 rounded focus:outline-none">
                      {#if availableYears.length === 0} <option value="">No Terms Found</option> {/if}
                      {#each availableYears as year} <option value={year}>{year}</option> {/each}
                  </select>

                  <select bind:value={selectedSemester} class="text-sm font-bold text-gray-800 bg-transparent cursor-pointer hover:bg-gray-100 p-1 rounded focus:outline-none">
                      <option value="1">1st Semester</option>
                      <option value="2">2nd Semester</option>
                      <option value="Midyear">Midyear</option>
                  </select>
              </div>
          </div>

          <div class="flex flex-col items-end gap-3">
              <div class="flex bg-gray-200 p-1 rounded-lg">
                  <button class="px-4 py-2 rounded-md font-medium transition-colors {activeTab === 'venue' ? 'bg-white shadow-sm text-green-700' : 'text-gray-600 hover:text-gray-900'}" onclick={() => setTab('venue')}>Venue View</button>
                  <button class="px-4 py-2 rounded-md font-medium transition-colors {activeTab === 'instructor' ? 'bg-white shadow-sm text-green-700' : 'text-gray-600 hover:text-gray-900'}" onclick={() => setTab('instructor')}>Instructor View</button>
              </div>
          </div>
      </div>

      <div>
          {#if activeTab == 'venue'}
              <VenueView {selectedAcademicYear} {selectedSemester} />
          {:else if activeTab == 'instructor'}
              {#key update}
                  <InstructorView {selectedAcademicYear} {selectedSemester} onDeleteInstructor={toggleDeleteInstructorModal} />
              {/key}
          {/if}
      </div>

  </div>
</div>

<style>
  .delete-modal {
      padding: 2rem;
      border-radius: 10px;
      max-width: 40rem;
      background: white;
      z-index: 150;
  }

  .backdrop {
      width: 100%;
      height: 100%;
      position: fixed;
      top: 0;
      left: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
  }
</style>