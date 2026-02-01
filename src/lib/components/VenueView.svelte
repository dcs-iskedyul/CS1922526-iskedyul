<script>
    import Table from "../../lib/components/Table.svelte";
    import { rooms } from "$lib/store.js"
    import { schedules } from '$lib/store.js';
    //sample data
    let pastelColors = {
    pink: "#df746a",   // pastel pink
    orange: "#eba434", // pastel orange
    green: "#43b770", // pastel green
    blue: "#6f80d3"      // pastel blue
  };
   const subjects1 = [
    { name: "CS140 Lec", professor: "Prof. Dela Cruz", day: "FRI", startTime: "8:30", endTime: "10:00", color: pastelColors["green"] },
    { name: "CS140 Lec", professor: "Prof. Dela Cruz", day: "WED", startTime: "8:30", endTime: "10:00", color: pastelColors["green"]},
    { name: "CS140 Lab", professor: "Prof. Dela Cruz", day: "FRI", startTime: "13:00", endTime: "16:00", color: pastelColors["green"]},
    
    { name: "CS 138", professor: "Prof. Juan", day: "TUES", startTime: "10:00", endTime: "11:30", color: pastelColors["blue"]},
    { name: "CS 138", professor: "Prof. Juan", day: "THURS", startTime: "10:00", endTime: "11:30", color: pastelColors["blue"]},
    
    { name: "CS 165", professor: "Prof. Lorem", day: "TUES", startTime: "11:30", endTime: "13:00", color: pastelColors["pink"]},
    { name: "CS 165", professor: "Prof. Ipsum", day: "THURS", startTime: "11:30", endTime: "13:00", color: pastelColors["pink"]},
    
    { name: "CS 150", professor: "Prof. Dolor", day: "WED", startTime: "10:00", endTime: "11:30", color: pastelColors["orange"]},
    { name: "CS 150", professor: "Prof. Dolor", day: "FRI", startTime: "10:00", endTime: "11:30", color: pastelColors["orange"]},
    
    
    ];
    const subjects2 = [
    { name: "CS 150", professor: "Prof. Dolor", day: "WED", startTime: "10:00", endTime: "11:30", color: pastelColors["orange"]},
    { name: "CS 150", professor: "Prof. Dolor", day: "FRI", startTime: "10:00", endTime: "11:30", color: pastelColors["orange"]},
    ];
    const subjects3 = [
    { name: "CS140 Lec", professor: "Prof. Dela Cruz", day: "TUES", startTime: "8:30", endTime: "10:00", color: pastelColors["blue"] },
    { name: "CS140 Lec", professor: "Prof. Dela Cruz", day: "THURS", startTime: "8:30", endTime: "10:00", color: pastelColors["blue"]},
    { name: "CS140 Lab", professor: "Prof. Dela Cruz", day: "TUES", startTime: "13:00", endTime: "16:00", color: pastelColors["blue"]},
    
    
    { name: "CS 165", professor: "Prof. Lorem", day: "TUES", startTime: "11:30", endTime: "13:00", color: pastelColors["orange"]},
    { name: "CS 165", professor: "Prof. Ipsum", day: "THURS", startTime: "11:30", endTime: "13:00", color: pastelColors["orange"]},
    
    { name: "CS 150", professor: "Prof. Dolor", day: "WED", startTime: "10:00", endTime: "11:30", color: pastelColors["pink"]},
    { name: "CS 150", professor: "Prof. Dolor", day: "FRI", startTime: "10:00", endTime: "11:30", color: pastelColors["pink"]},
  
    
    ];

    let selectedSchedule = $state("1")


    // Map rooms to their corresponding subjects
 
    // Track the selected room
    let selectedRoom = $state("AECH-Accenture Rm")
    let update = $state(true)


</script>

<div class="flex gap-2 mb-6">
  {#each schedules as schedule}
  <button 
    class="px-6 py-2 rounded-lg {selectedSchedule === schedule ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}"
    onclick={() => {selectedSchedule = schedule; console.log(selectedSchedule); update = !update}}
  >
    Schedule {schedule}
  </button>
  {/each}
</div>

<div style="display: flex;" class="room-list">
    <!-- Left list of rooms -->
    <div style="width: 200px; padding-right: 20px;">
      <h3 class="room-header">Rooms</h3>
      <ul>
        {#each rooms as room}
          <li
            onclick={() => {selectedRoom = room.name; console.log(selectedRoom); update = !update} }
            style="cursor: pointer; margin-bottom: 5px; padding:8px; border-radius:8px; background-color: {selectedRoom === room.name ? '#ADD6BD' : 'white'};"
          >
            {room.name}
          </li>
        {/each}
      </ul>
    </div>
     <!-- Right table for selected room's subjects -->
    <div style="flex: 1;">
      {#key update}
        <Table classroom={selectedRoom} schedule={selectedSchedule} />
        {console.log("Selected schedule")}
        {console.log(selectedSchedule)}
      {/key}
  </div>
</div>