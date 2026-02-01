<script>
    import Sidebar from './Sidebar.svelte';
        import { supabase } from '$lib/supabaseClient';
        import { rooms, schedules, storeClasses, subject_info } from '$lib/store.js';
        import bin from '$lib/icons/bin.png';
        import { writable } from 'svelte/store';
    
      let selectedSchedule = $state("1");
      function handleScheduleChange(schedule) {
            selectedSchedule = schedule;}
    
      async function getData() {
        let finalSchedule = selectedSchedule;
        if(!selectedSchedule){
          finalSchedule = 1;
        }
            console.log("selectedSchedule");
        console.log(selectedSchedule);
            const { data, error } = 
            await supabase
            .from('classes')
            .select()
            .eq("schedule", finalSchedule)
        .order("instructor", { ascending: true });
            //
            if (error) throw new Error(error.message);
            storeClasses.set(data);
    
            return data;
        }
    
        // Function to calculate instructor's total load
        function calculateTotalLoad(data, instructorName) {
        return data
          .filter(item => item.instructor === instructorName)
          .reduce((sum, item) => {
            // Get the subject info from your store
            const subjectData = subject_info[item.course];
            
            // If subject exists in store, use the appropriate TL based on type
            if (subjectData) {
              // Use labTL for Lab types, otherwise use lecTL
              const loadValue = item.type && item.type.toLowerCase() === "lab" 
                ? subjectData.labTL 
                : subjectData.lecTL;
              
              return sum + Number(loadValue || 0);
            }
            
            // Fallback to item.load if subject not found in store
            return sum + Number(item.load || 0);
          }, 0);
      }


     function getTeachingLoad(clas){
      var teachingLoad = 0;
      ///if subject exists
      if(subject_info[clas.course]){
        if(clas.type == "Lab"){
          //if lab tl exists
          if(subject_info[clas.course]["labTL"]){
            teachingLoad = subject_info[clas.course]["labTL"];
          } else {
            subject_info[clas.course]["lecTL"];
          }
      }
    }
      return teachingLoad;
     }
      
      
    </script>
    
    <div class="flex flex-wrap gap-2 mb-4">
      {#each schedules as schedule}
      <button 
        class="px-4 py-2 rounded-lg font-medium transition-colors {selectedSchedule === schedule ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
        onclick={() => handleScheduleChange(schedule)}
      >
        Schedule {schedule}
      </button>
      {/each}
    </div>
    <div class="instructor-container">
    <table class="instructor-table">
    
    <thead>
      <tr>
        <th>Instructor</th>
        <th>Subject</th>
        <th>Section</th>
        <th>Type</th>
        <th>Days</th>
        <th>Start Time</th>
        <th>End Time</th>
        <th>Room</th>
        <th>Teaching Load</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
    
    
      {#await getData()}
        <tr><td>Fetching</td></tr>
      {:then data}
        {#each data as clas, rowIndex}
          <tr class='row instructor-row'>
              <!-- Instructor Column -->
              <!-- Instructor Column - only show for first occurrence of an instructor -->
          {#if rowIndex === 0 || data[rowIndex].instructor !== data[rowIndex - 1].instructor}
          <!-- Calculate how many rows this instructor spans -->
          {@const spanCount = data.slice(rowIndex).findIndex(item => item.instructor !== clas.instructor)}
          {@const actualSpan = spanCount === -1 ? data.length - rowIndex : spanCount}
         
          <td class="item instructor merged-instructor" rowspan={actualSpan}>
            {clas.instructor}
    
            
            <div class="instructor-load">Total Load: {calculateTotalLoad(data, clas.instructor)}</div>
          </td>
        {/if}
    
            <!-- Course Column -->
            <td class="item course"vv>
                {clas.course}
            </td>
    
              <!-- Section Column -->
              <td class="item section">
                {clas.class_id}
            </td>
    
            <!-- Type Column -->
            <td class="item type">
                {clas.type}
            </td>
    
          
    
            <!-- Days Column -->
            <td class="item days">
                {clas.days}
            </td>
    
            <!-- Start Time Column -->
            <td class="item start_time">
                {clas.start_time}
            </td>
    
            <!-- End Time Column -->
            <td class="item end_time">
                {clas.end_time}
            </td>
    
            <!-- Room Column -->
            <td class="item room">
              {clas.location}
            </td>
    
            <!-- Teaching load Column -->
            <td class="item size">
              <div>
                {getTeachingLoad(clas)}
              </div>
            </td>
    
          
            <!-- Load Column -->
            <td class="item load">
             
                {clas.load}
              
            </td>
    
    
    
          </tr>
        {/each}
      {:catch error}
        <tr>
          <td>Something went wrong while fetching the data: <pre>{error}</pre></td>
        </tr>
      {/await}
    </tbody>
    </table>
    </div>
    
    <style>
      .merged-instructor {
      background-color: #D5F5E3;
      border-radius: 24px;
      padding: 15px;
      border: 4px solid #ffffff;
    }
    
    .instructor-row {
      border-bottom: 1px dotted #c8c8c8;
    }
    </style>