<script>
    import InstructorClass from "./InstructorClass.svelte";
    import InstructorInfo from  "./InstructorInfo.svelte";

    let { selectedAcademicYear, selectedSemester, onDeleteInstructor } = $props();
    let activeInstructorTab = $state('instructorClass');

    function setTab(tab) {
        activeInstructorTab = tab;
    }
</script>

<div>
    <div class="flex justify-end space-x-2 mb-6">
        <button 
            class="px-4 py-2 rounded-lg font-medium transition-colors {activeInstructorTab === 'instructorClass' ? 'bg-green-100 text-green-800 border border-green-300 shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'}" 
            onclick={() => setTab('instructorClass')}
        >
            Classes
        </button>
        <button 
            class="px-4 py-2 rounded-lg font-medium transition-colors {activeInstructorTab === 'instructorInfo' ? 'bg-green-100 text-green-800 border border-green-300 shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'}" 
            onclick={() => setTab('instructorInfo')}
        >
            Instructors
        </button>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {#if activeInstructorTab == 'instructorClass'}
            <InstructorClass {selectedAcademicYear} {selectedSemester} />
        {:else if activeInstructorTab == 'instructorInfo'}
            <InstructorInfo {selectedAcademicYear} {selectedSemester} onDeleteInstructor={onDeleteInstructor} />
        {/if}
    </div>
</div>