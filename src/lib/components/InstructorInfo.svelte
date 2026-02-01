
<script>
    import { writable } from 'svelte/store';
    import { supabase } from '$lib/supabaseClient';
	import AddInstructorDropdown from './AddInstructorDropdown.svelte';
    import { Toaster, toast } from 'svelte-sonner';
let update = $state(false);
// Store to track which row is currently being edited
let editingRowIndex = writable(null);
// Temporary row data for editing
let editingRow = writable({});

// boolean to know if add instructor modal should be shown.
let showModal = $state(false);

// acts similar to update but just for the add instructor modal. Svelte will not update the page unless a key has been changed, hence modalUpdate is that key.
let modalUpdate = $state(false);

let newInstructor,
			newType = $state("UNDERGRAD"),
			newMinUnits

let { onDeleteInstructor } = $props();


async function addNewInstructor(name, min_units, type){

    if(name == '' || isNaN(min_units) || min_units == ""){
        toast.error("Invalid inputs");
        return;
    }
    const { data, error } = await supabase.from('instructors').insert([
			{
				name: name,
				min_units: min_units,
				type:type,
			}
		]);
		if (error) throw new Error(error.message);


        console.log("inserted instructor!")
         // Trigger a data refresh
         update = !update;
    
}

// Function to start editing a row
function startEditing(instructor, rowIndex) {
	// Reset any previous editing
	if ($editingRowIndex !== null) {
		editingRowIndex.set(null);
	}

	// Set the current row being edited
	editingRowIndex.set(rowIndex);
	
	// Create a deep copy of the class object for editing
	editingRow.set({...instructor});
}

async function getInstructorData() {

		console.log("From InstructorInfo.svelte: Getting data");
		const { data, error } = 
		await supabase
		.from('instructors')
		.select()
        .order("name", { ascending: true });
		if (error) throw new Error(error.message);
		
		console.log("inserted instructor:")
		console.log(data);

        
		return data;

	}


    async function saveEditedRow() {
    try {
        // Destructure the entire edited row from the store
        const rowToUpdate = $editingRow;
        
        // Update the entire row in Supabase
        const { error } = await supabase
            .from('instructors')
            .update({
                name: rowToUpdate.course,
                min_units: rowToUpdate.min_units,
                type: rowToUpdate.type,
              
            })
            .eq('id', rowToUpdate.id);
        
        if (error) throw error;
        
        // Trigger a data refresh
        update = !update;
        
        // Reset editing state
        editingRowIndex.set(null);

		// Optionally refresh data
		await getInstructorData();
    } catch (error) {
        console.error('Error updating row:', error);
        // Optionally show an error toast or message to the user
    }
}



</script>



<!--Add Instructor button-->
<Toaster />
<AddInstructorDropdown onSubmit={addNewInstructor}/>

<div class="instructor-container">
<table class="instructor-table inst-padding">
    <thead class="new-thead z-10">
        <tr>
            
            <th class="instructor inst-name">Instructor</th>
            <th class="load">Minimum Load</th>
			<th class="status">Status</th>
			<th>Delete</th>
			<th>Edit</th>
        </tr>
    </thead>




    <tbody>
		{#key update}
			{#await getInstructorData()}
				<tr><td>Updating...</td></tr>
			{:then data}
            {#each data as instructor, rowIndex}
            <tr class="inst-row">
                <!-- Name Column -->
                <td class="item inst-name">
                    {#if $editingRowIndex === rowIndex}
                        <input 
                            type="text" 
                            value={$editingRow.name} 
                            oninput={(e) => handleInputChange('name', e.target.value)}
                            class="w-full p-1 border"
                        />
                    {:else}
                        {instructor.name}
                    {/if}
                </td>
            <!-- Minimum units Column -->
                <td class="item type">
                    {#if $editingRowIndex === rowIndex}
                        <input 
                            type="text" 
                            value={$editingRow.min_units} 
                            oninput={(e) => handleInputChange('min_units', e.target.value)}
                            class="w-full p-1 border"
                        />
                    {:else}
                        {instructor.min_units}
                    {/if}
                </td>

        <!-- Type Column -->
                <td class="item type">
                    {#if $editingRowIndex === rowIndex}
                    <select bind:value={$editingRow.type} class ="block bg-gray-200 rounded-lg p-2.5">
									<option value = "UNDERGRAD">UNDERGRAD</option>
									<option value = "">Other</option>
								</select>
                        
                    {:else}
                        {instructor.type}
                    {/if}
                </td>

           <!-- Delete Column -->
        <td class="min-w-16 item">
            <button onclick={() => onDeleteInstructor(instructor.id, instructor.name)} aria-label="edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill= 'white' stroke="#404040" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        
            </button>
      
    </td>
            <!-- Edit/Save Column -->
						<td class="min-w-16 item">
							{#if $editingRowIndex === rowIndex}
								<!-- Save Button -->
								<button onclick={saveEditedRow} aria-label="save">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<polyline points="20 6 9 17 4 12"/>
									</svg>
								</button>
							{:else}
								<!-- Edit Button -->
								<button onclick={() => startEditing(instructor, rowIndex)} aria-label="edit">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#404040" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
										<polygon points="16 3 21 8 8 21 3 21 3 16 16 3" style = 'fill:white'/>
									</svg>
								</button>
							{/if}
						</td>

           
            </tr>
            {/each}
            {:catch error}
				<tr>
					<td>Something went wrong while fetching the data: <pre>{error}</pre></td>
				</tr>
			{/await}
		{/key}
</table>
</div>
<style>
    .inst-row {
        text-align: left;
    }

    .inst-name{
        text-align: left;
    }

    .inst-padding td, th, tr{
        padding: 10px;
    }



</style>