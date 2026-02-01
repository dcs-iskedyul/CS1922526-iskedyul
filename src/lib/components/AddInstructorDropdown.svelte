<script>

    // On sort function from the parent Data page
    export let onSubmit;
    let years = ["UG1", "UG2", "UG3", "UG4", "-"]
    // State variables
    let isOpen = false;
    let newInstructor = ""; //
    let newMinUnits = ""; //
    let newType = "UNDERGRAD"; //
    let filterCategories = []; 
    $: allSelected = years.length === filterCategories.length

    function toggleAll() {
      filterCategories = allSelected ? [] : [...years]
		}


    // Sort and filter function
    function sortAndFilter() {
      isOpen = false;
      
      
      onSubmit(newInstructor.toUpperCase(), newMinUnits, newType);
    
    }
  </script>
  
  <div class="relative z-100">
    

    <button class="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 bg-white" on:click={() => isOpen = !isOpen} >
        + New Instructor
    </button>
    
    {#if isOpen}
      <div class="dropdown-panel">
        <div class="panel-header">
          <h2>Instructor Information</h2>
          <button on:click={() => isOpen = false} class="close-btn">×</button>
        </div>
        
        <!-- Sort Section -->
        <div class="section">
          <div class="section-header">
            <h3>Name</h3>
          </div>
          
          <div class="grid-options">
            <input
                id="class name"
                type="text"
                placeholder="Last, First"
                class = "block bg-gray-200 rounded-lg p-2.5"
                bind:value={newInstructor}
            />
          </div>

          <div class="section-header">
            <h3>Minimum Units</h3>
          </div>
          
          <div class="grid-options">
            <input
                id="class name"
                type="text"
                placeholder="12"
                class = "block bg-gray-200 rounded-lg p-2.5"
                bind:value={newMinUnits}
            />
          </div>

          <div class="section-header">
            <h3>Classification</h3>
          </div>
          
          <div class="grid-options">
            <select bind:value={newType} class ="block bg-gray-200 rounded-lg p-2.5">
                <option value = "UNDERGRAD">UNDERGRAD</option>
                <option value = "BIOINFO">BIOINFO</option>
                <option value = "OTHER">OTHER</option>
            </select>
          </div>
        </div>
        
       
        
        
        <!-- Clear and Results buttons -->
        <div class="actions">
          <button on:click={sortAndFilter} class=" bg-green-500 hover:bg-green-600 results-btn">Add</button>
        </div>
      </div>
    {/if}
  </div>
  
  <style>
    .relative {
      position: relative;
    }
    
    .dropdown-panel {
      position: absolute;
      top: 100%;
      left: 0;
      width: 350px; /* Increased width */
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 50;
    }
    
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #eee;
    }
    
    .panel-header h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
    
    .close-btn {
      font-size: 24px;
      background: none;
      border: none;
      cursor: pointer;
    }
    
    .section {
      border-bottom: 1px solid #eee;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 16px;
      cursor: pointer;
    }
    
    .section-header h3 {
      font-size: 16px;
      font-weight: 500;
      margin: 0;
    }
    
    .chevron {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      stroke-width: 2;
      fill: none;
    }
    
    .grid-options {
      padding: 0 16px 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    .radio-option, .checkbox-option {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    
    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
    }
    
    .clear-btn {
      background: none;
      border: none;
      color: #777;
      cursor: pointer;
      font-size: 14px;
    }
    
    .results-btn {
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 20px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      max-width: 200px;
    }
  </style>