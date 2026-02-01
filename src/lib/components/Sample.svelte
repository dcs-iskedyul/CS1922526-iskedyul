<script>
    import Table from './Table.svelte'; // Assuming your Table component is in the same directory
    
    // Sample room list with subjects associated to each room
    const rooms = [
      { name: 'Room 101', subject: 'Math' },
      { name: 'Room 102', subject: 'Science' },
      { name: 'Room 103', subject: 'History' },
    ];
    
    // Create a reactive variable to hold the current subject to pass to Table
    let selectedSubject = rooms[0].subject;
    
    // Update the subject when a room is clicked
    function handleRoomClick(subject) {
      selectedSubject = subject;
    }
  </script>
  
  <style>
    .container {
      display: flex;
    }
    .list {
      width: 30%;
      border-right: 1px solid #ddd;
      padding: 10px;
    }
    .list-item {
      padding: 8px;
      cursor: pointer;
    }
    .list-item:hover {
      background-color: #f0f0f0;
    }
    .table-container {
      width: 70%;
      padding: 10px;
    }
  </style>
  
  <div class="container">
    <!-- Room List on the Left -->
    <div class="list">
      {#each rooms as room}
        <div 
          class="list-item" 
          on:click={() => handleRoomClick(room.subject)}>
          {room.name}
        </div>
      {/each}
    </div>
  
    <!-- Table Component on the Right -->
    <div class="table-container">
      <Table {selectedSubject} />
    </div>
  </div>
  