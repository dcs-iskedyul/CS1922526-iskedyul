<script>
  import Sidebar from './Sidebar.svelte';
  import { supabase } from '$lib/supabaseClient';
  import { schedules, semesters, parseForConflicts, parseForExamConflicts } from '$lib/store.js';
  import { onMount } from 'svelte';

  let selectedSchedule = $state("1");
  
  let academicYears = $state([]);
  let selectedYear = $state("");
  let selectedSemester = $state("1"); 

  let isLoading = $state(true);
  let stats = $state({
      totalClasses: 0,
      activeInstructors: 0,
      venuesInUse: 0,
      conflicts: 0
  });
  
  // FIX: Added state to store fetched classes for the Summary Table
  let recentClasses = $state([]); 
  let update = $state(false);

  function handleFilterChange() {
      fetchDashboardData();
      update = !update;
  }

  function handleScheduleChange(schedule) {
      selectedSchedule = schedule;
      handleFilterChange();
  }

  async function fetchAcademicYears() {
      try {
          const { data, error } = await supabase
              .from('academic_terms')
              .select('academic_year');
              
          if (error) {
              console.error('Error fetching academic years:', error);
              return;
          }
          
          if (data && data.length > 0) {
              // Extract unique years and sort numerically based on the first year (e.g., 2024 from 2024-2025)
              academicYears = [...new Set(data.map(item => item.academic_year))].sort((a, b) => {
                  const yearA = parseInt(a.split('-')[0]);
                  const yearB = parseInt(b.split('-')[0]);
                  return yearA - yearB;
              });
              
              // Set the default dropdown value to the most recent year (last in the sorted array)
              if (academicYears.length > 0 && (!selectedYear || !academicYears.includes(selectedYear))) {
                  selectedYear = academicYears[academicYears.length - 1];
              }
          } else {
              // Fallback if the table is completely empty
              academicYears = ["2024-2025"];
              selectedYear = "2024-2025";
          }
      } catch (error) {
          console.error("Error in fetchAcademicYears:", error);
          academicYears = ["2024-2025"];
          selectedYear = "2024-2025";
      }
  }

  async function fetchDashboardData() {
      if (!selectedYear) return; // Ensure selectedYear is set before fetching data

      isLoading = true;
      try {
          // IMPORTANT: Ensure your Supabase columns exactly match 'academic_year' and 'semester'
          const { data: classes, error: classError } = await supabase
              .from('classes')
              .select('*')
              .eq('academic_year', selectedYear)
              .eq('semester', selectedSemester)
              .eq('schedule', selectedSchedule);

          if (classError) throw classError;
          
          if (!classes || classes.length === 0) {
              stats = { totalClasses: 0, activeInstructors: 0, venuesInUse: 0, conflicts: 0 };
              recentClasses = []; 
              isLoading = false;
              return;
          }
          
          // Populate the summary table array
          recentClasses = classes;
          
          // Calculate Stats
          const totalClasses = classes.length;
          const uniqueInstructors = new Set();
          const uniqueVenues = new Set();
          
          classes.forEach(cls => {
              if (cls.instructor && cls.instructor !== 'TBA') uniqueInstructors.add(cls.instructor);
              // Handle both potential column names just in case
              const venue = cls.location || cls.room; 
              if (venue && venue !== 'TBA') uniqueVenues.add(venue);
          });
          
          const conflictCount = selectedSchedule === "Exams" 
              ? parseForExamConflicts(classes).length 
              : parseForConflicts(classes).length;
          
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

  onMount(async () => {
    isLoading = true;
    await fetchAcademicYears();
    await fetchDashboardData();
  });

</script>

<div class="flex">
  <Sidebar />
  
  <div class="flex-1 p-6 ml-64">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      <div class="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-lg shadow border border-gray-200">
          <div class="flex flex-col">
              <label class="text-sm font-medium text-gray-600 mb-1" for="academicYear">Academic Year</label>
              <select 
                  id="academicYear" 
                  bind:value={selectedYear} 
                  onchange={handleFilterChange} 
                  class="p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"
              >
                  {#each academicYears as year}
                      <option value={year}>{year}</option>
                  {/each}
              </select>
          </div>

          <div class="flex flex-col">
              <label class="text-sm font-medium text-gray-600 mb-1" for="semester">Semester</label>
              <select 
                  id="semester" 
                  bind:value={selectedSemester} 
                  onchange={handleFilterChange} 
                  class="p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"
              >
                  {#each semesters as sem}
                      <option value={sem}>
                          {sem === '3' || sem === 'Midyear' || sem.toLowerCase().includes('midyear') ? 'Midyear' : `Semester ${sem}`}
                      </option>
                  {/each}
              </select>
          </div>
      </div>
      
      <div class="flex flex-wrap gap-2 mb-6">
          {#each schedules as schedule}
          <button 
              class="px-4 py-2 rounded-lg font-medium transition-colors {selectedSchedule === schedule ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
              onclick={() => handleScheduleChange(schedule)}
          >
              {schedule === "Exams" ? "Exams" : `Schedule ${schedule}`}
          </button>
          {/each}
      </div>
      
      {#key update}
          {#if isLoading}
              <div class="flex justify-center items-center h-64">
                  <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
              </div>
          {:else}
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

              <div class="mt-8 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                      <h2 class="text-lg font-semibold text-gray-800">Classes Summary</h2>
                      <span class="text-sm text-gray-500">Showing classes for Schedule {selectedSchedule}</span>
                  </div>
                  <div class="overflow-x-auto">
                      {#if recentClasses.length > 0}
                          <table class="min-w-full divide-y divide-gray-200">
                              <thead class="bg-gray-50">
                                  <tr>
                                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
                                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                  </tr>
                              </thead>
                              <tbody class="bg-white divide-y divide-gray-200">
                                  {#each recentClasses as cls}
                                      <tr class="hover:bg-gray-50 transition-colors">
                                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cls.course || '-'}</td>
                                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cls.section || cls.class_id || '-'}</td>
                                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cls.instructor || '-'}</td>
                                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                              {cls.days ? cls.days : ''} {cls.start_time && cls.end_time ? `${cls.start_time} - ${cls.end_time}` : ''}
                                          </td>
                                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cls.location || '-'}</td>
                                      </tr>
                                  {/each}
                              </tbody>
                          </table>
                      {:else}
                          <div class="p-8 text-center flex flex-col items-center">
                              <svg class="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <p class="text-gray-500 text-lg">No classes found for this combination.</p>
                              <p class="text-gray-400 text-sm mt-1">Double check that your database has classes matching <strong>{selectedYear}</strong>, Semester <strong>{selectedSemester}</strong>, and Schedule <strong>{selectedSchedule}</strong>.</p>
                          </div>
                      {/if}
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