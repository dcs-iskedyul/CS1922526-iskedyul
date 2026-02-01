<script>
  import Sidebar from './Sidebar.svelte';
  import { supabase } from '$lib/supabaseClient';

  import { schedules, rooms, instructors, parseForConflicts, conflictsStore } from '$lib/store.js';
  import { onMount, onDestroy } from 'svelte';


  let selectedSchedule = $state("1");
  let isLoading = $state(true);
  let stats = $state({
      totalClasses: 0,
      activeInstructors: 0,
      venuesInUse: 0,
      conflicts: 0
  });
  let update = $state(false);

  function handleScheduleChange(schedule) {
      selectedSchedule = schedule;
      fetchDashboardData();
      update = !update;
  }

  async function fetchDashboardData() {
      isLoading = true;
      
      try {
          const { data: classes, error: classError } = await supabase
              .from('classes')
              .select('*')
              .eq('schedule', selectedSchedule);

          if (classError) throw classError;
          
          if (!classes || classes.length === 0) {
              stats = {
                  totalClasses: 0,
                  activeInstructors: 0,
                  venuesInUse: 0,
                  conflicts: 0
              };
              isLoading = false;
              return;
          }
          
          // 1. Classes
          const totalClasses = classes.length;
          
          // 2. Instructors
          const uniqueInstructors = new Set();
          classes.forEach(cls => {
              if (cls.instructor && cls.instructor !== 'TBA') {
                  uniqueInstructors.add(cls.instructor);
              }
          });
          
          // 3. Venues
          const uniqueVenues = new Set();
          classes.forEach(cls => {
              if (cls.location && cls.location !== 'TBA') {
                  uniqueVenues.add(cls.location);
              }
          });
          
          // 4. Conflicts
          const conflictCount = (parseForConflicts(classes)).length
          
          stats = {
              totalClasses,
              activeInstructors: uniqueInstructors.size,
              venuesInUse: uniqueVenues.size,
              conflicts: conflictCount
          };

      } catch (error) {
          console.error('Error fetching dashboard data:', error);
      } finally {
          isLoading = false;
      }
  }

  onMount(() => {
      fetchDashboardData();
  });
</script>

<div class="flex">
  <Sidebar />
  
  <div class="flex-1 p-6 ml-64">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      <!-- Schedule Tabs -->
      <div class="flex flex-wrap gap-2 mb-6">
          {#each schedules as schedule}
          <button 
              class="px-4 py-2 rounded-lg font-medium transition-colors {selectedSchedule === schedule ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
              onclick={() => handleScheduleChange(schedule)}
          >
              Schedule {schedule}
          </button>
          {/each}
      </div>
      
      {#key update}
          {#if isLoading}
              <div class="flex justify-center items-center h-64">
                  <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
              </div>
          {:else}
              <!-- Stats Overview -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div class="bg-white p-5 rounded-lg shadow border border-gray-200">
                      <div class="flex items-center">
                          <div class="p-3 rounded-full bg-green-100 mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                          </div>
                          <div>
                              <p class="text-sm text-gray-500 font-medium">Classes</p>
                              <p class="text-xl font-bold">{stats.totalClasses}</p>
                          </div>
                      </div>
                  </div>
                  
                  <div class="bg-white p-5 rounded-lg shadow border border-gray-200">
                      <div class="flex items-center">
                          <div class="p-3 rounded-full bg-blue-100 mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                          </div>
                          <div>
                              <p class="text-sm text-gray-500 font-medium">Instructors</p>
                              <p class="text-xl font-bold">{stats.activeInstructors}</p>
                          </div>
                      </div>
                  </div>
                  
                  <div class="bg-white p-5 rounded-lg shadow border border-gray-200">
                      <div class="flex items-center">
                          <div class="p-3 rounded-full bg-purple-100 mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                          </div>
                          <div>
                              <p class="text-sm text-gray-500 font-medium">Venues</p>
                              <p class="text-xl font-bold">{stats.venuesInUse}</p>
                          </div>
                      </div>
                  </div>
                  
                  <div class="bg-white p-5 rounded-lg shadow border border-gray-200">
                      <div class="flex items-center">
                          <div class="p-3 rounded-full bg-red-100 mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                          </div>
                          <div>
                              <p class="text-sm text-gray-500 font-medium">Conflicts</p>
                              <p class="text-xl font-bold">{stats.conflicts}</p>
                          </div>
                      </div>
                  </div>
              </div>
          {/if}
      {/key}
  </div>
</div>

<style>
  :global(body) {
      background-color: #f9fafb;
  }
</style>