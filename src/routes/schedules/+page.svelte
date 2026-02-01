

<script>
  import Table from "../../lib/components/Table.svelte";
  import VenueView from "../../lib/components/VenueView.svelte";
  import Sample from "../../lib/components/Sample.svelte";
  import InstructorView from "../../lib/components/InstructorView.svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import { supabase } from '$lib/supabaseClient';

  let update = $state(false);
  // boolean to know if "Are you sure to delete" modal should be shown.
let showDeleteInstructorModal = $state(false);

// acts similar to update but just for the delete modal. Svelte will not update the page unless a key has been changed, hence modalUpdate is that key.
let modalDeleteInstructorUpdate = $state(false);

let deleteInstructorID;
let deleteInstructorName;

const toggleDeleteInstructorModal = (id, name) => {
      deleteInstructorID = id;
			deleteInstructorName = name;

			showDeleteInstructorModal = true;
			modalDeleteInstructorUpdate = !modalDeleteInstructorUpdate;
			console.log("THIS IS THE DELETE INSTRUCTOR MODAL")
			console.log(showDeleteInstructorModal);
		};


    async function handleDeleteInstructorSubmitEnd() {
			//submit = false;
			//update = false;
			deleteInstructorFinal();
			clickOutDeleteInstructorModal();
		}

    async function clickOutDeleteInstructorModal() {
			try{
				showDeleteInstructorModal = false;
				modalDeleteInstructorUpdate = !modalDeleteInstructorUpdate
				//modalUpdate = !modalUpdate
				console.log("I clicked outside the delete instructor modal, or i exited idk")
			}
			catch(err){
				console.log(err)
			}
		}

    const deleteInstructorFinal = async () => {
		try {
			const { error } = await supabase
				.from('instructors')
				.delete()
				.eq('id', deleteInstructorID);

        
				
			if (error) throw error;
			
      // Update all the classes with that instructor to "TBA"
      const { error2 } = await supabase
            .from('classes')
            .update({
                instructor: "TBA",
            })
            .eq("instructor", deleteInstructorName)

            if (error2) throw error2;
			
			update = !update;
		} catch (err) {
			console.error(err);
		}
		};

   // colors for subjects
let pastelColors = {
  pink: "#df746a",   // pastel pink
  orange: "#eba434", // pastel orange
  green: "#43b770", // pastel green
  blue: "#6f80d3"      // pastel blue
  };

 
  let activeTab = $state('venue');

  /**
   * @param {string} tab
   */
  function setTab(tab) {
    activeTab = tab;
  }
</script>


<div class="flex h-screen">
<Sidebar />

{#key modalDeleteInstructorUpdate}
{#if modalDeleteInstructorUpdate}
<div class="backdrop z-100">
	<div class="delete-modal z-200" usetapOutside={(e) => clickOutDeleteInstructorModal()}>
    <h3><strong>WARNING: This instructor may have classes in the current schedules.</strong> </h3>
      <h3>Deleting will cause classes associated with this instructor to be changed to "TBA"</h3>
		<br/>
		<h3 class="title2">Are you sure to delete {deleteInstructorName}? </h3>
     <div class="flex">
			<button
				class="my-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
				onclick={clickOutDeleteInstructorModal}
			>
				Cancel
			</button>

      <button
				class="ml-auto my-6 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
				onclick={handleDeleteInstructorSubmitEnd}
			>
				Delete
			</button>
		</div>
		
	</div>
</div>
{/if}
{/key}
<div class="schedule-container flex-1 p-12 ml-64">
<div>
  <h1 class="sched-view-name">Schedule Name </h1>
  <p>Last Edited 7:04 PM</p>
  <div class="view-btns flex justify-end space-x-2">
    <p>View By:</p>
    <button class="sched-view-btn" onclick={() => setTab('venue')} style="background-color: {activeTab === 'venue' ? '#ADD6BD' : '#DADADA'}">Venue</button>
    <button class="sched-view-btn" onclick={() => setTab('instructor')} style="background-color: {activeTab === 'instructor' ? '#ADD6BD' : '#DADADA'}">Instructor</button>
     </div>
</div>

<div>
  {#if activeTab == 'venue'}
    <VenueView/>
  {:else if activeTab == 'instructor'}
  {#key update}
    <InstructorView onDeleteInstructor={toggleDeleteInstructorModal} />
  {/key}
  {/if}
</div>

</div>

</div>


<style>
  .delete-modal {
  /* text-align: center; */
  padding: 2rem;
  border-radius: 10px;
  max-width: 40rem;
  margin: 5% auto;
  background: white;
  /* justify-items: center; */
  justify-content: space-between;
  z-index: 150;
}

.backdrop {
  width: 100%;
  height: 100%;
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  overflow-y: auto;
  z-index: 100;
}
</style>