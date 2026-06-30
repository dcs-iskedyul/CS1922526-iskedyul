<script>
    import VenueView from "../../lib/components/VenueView.svelte";
    import InstructorView from "../../lib/components/InstructorView.svelte";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import { supabase } from '$lib/supabaseClient';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { schedules } from '$lib/store.js';

    let update = $state(false);
    let showDeleteInstructorModal = $state(false);
    let modalDeleteInstructorUpdate = $state(false);
    let deleteInstructorID;
    let deleteInstructorName;

    let availableYears = $state([]);
    let selectedAcademicYear = $state("");
    let selectedSemester = $state("1");
    let isTermLoaded = $state(false);

    let activeTab = $state('venue');
    let viewMode = $state('Schedule'); // 'Schedule' or 'Exam'
    let selectedSchedule = $state("1"); 
    const scheduleDrafts = schedules.filter((schedule) => schedule !== "Exams");
    let selectedExamDate = $state('');
    let examDates = $state([]);

    // --- THE MEMORY FIX ---
    // We only write to memory IF isTermLoaded is true, preventing accidental overwrites on reload!
    $effect(() => {
        if (browser && isTermLoaded) {
            sessionStorage.setItem('sched_term', selectedAcademicYear);
            sessionStorage.setItem('sched_sem', selectedSemester);
            sessionStorage.setItem('sched_tab', activeTab);
            sessionStorage.setItem('sched_mode', viewMode);
            sessionStorage.setItem('sched_schedule', selectedSchedule);
            sessionStorage.setItem('sched_examdate', selectedExamDate);
        }
    });

    onMount(async () => {
        if (sessionStorage.getItem('sched_term')) selectedAcademicYear = sessionStorage.getItem('sched_term');
        if (sessionStorage.getItem('sched_sem')) selectedSemester = sessionStorage.getItem('sched_sem');
        if (sessionStorage.getItem('sched_tab')) activeTab = sessionStorage.getItem('sched_tab');
        if (sessionStorage.getItem('sched_mode')) viewMode = sessionStorage.getItem('sched_mode');
        if (sessionStorage.getItem('sched_schedule')) selectedSchedule = sessionStorage.getItem('sched_schedule');
        if (sessionStorage.getItem('sched_examdate')) selectedExamDate = sessionStorage.getItem('sched_examdate');
        
        await fetchAllTerms();
        if (viewMode === 'Exam') await fetchExamDates();
        
        // Unlock the memory saver now that everything is safely loaded
        isTermLoaded = true;
    });

    async function fetchAllTerms() {
        const { data, error } = await supabase.from('academic_terms').select('*');
        if (data && data.length > 0) {
            availableYears = [...new Set(data.map(d => d.academic_year))].sort();
            if (!selectedAcademicYear || !availableYears.includes(selectedAcademicYear)) {
                selectedAcademicYear = availableYears[0];
            }
        }
    }

    async function fetchExamDates() {
        if (!selectedAcademicYear || !selectedSemester) return;
        const { data: schedData } = await supabase.from('exam_schedules').select('date').eq('academic_year', selectedAcademicYear).eq('semester', selectedSemester);
        const { data: calData } = await supabase.from('calendar_events').select('date').eq('academic_year', selectedAcademicYear).eq('semester', selectedSemester).eq('type', 'exam');

        let dates = new Set();
        if (schedData) schedData.forEach(d => dates.add(d.date));
        if (calData) calData.forEach(d => dates.add(d.date));

        examDates = [...dates].sort();
        if (examDates.length > 0 && !examDates.includes(selectedExamDate)) { selectedExamDate = examDates[0]; } 
        else if (examDates.length === 0) { selectedExamDate = ''; }
    }

    async function setScheduleView(sched) { viewMode = 'Schedule'; selectedSchedule = sched; update = !update; }
    async function setExamView() { viewMode = 'Exam'; await fetchExamDates(); update = !update; }

    function formatReadableDate(dateStr) {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }

    const toggleDeleteInstructorModal = (id, name) => { deleteInstructorID = id; deleteInstructorName = name; showDeleteInstructorModal = true; modalDeleteInstructorUpdate = !modalDeleteInstructorUpdate; };
    async function handleDeleteInstructorSubmitEnd() { deleteInstructorFinal(); clickOutDeleteInstructorModal(); }
    async function clickOutDeleteInstructorModal() { try { showDeleteInstructorModal = false; modalDeleteInstructorUpdate = !modalDeleteInstructorUpdate; } catch(err) {} }
    const deleteInstructorFinal = async () => {
        try {
            const { error } = await supabase.from('instructors').delete().eq('id', deleteInstructorID);
            if (error) throw error;
            const { error2 } = await supabase.from('classes').update({ instructor: "TBA" }).eq("instructor", deleteInstructorName);
            if (error2) throw error2;
            update = !update;
        } catch (err) {}
    };

    function handleKeydown(event) {
        if (event.key === 'Escape' && showDeleteInstructorModal) { showDeleteInstructorModal = false; modalDeleteInstructorUpdate = !modalDeleteInstructorUpdate; }
    }

    function setTab(tab) { activeTab = tab; }
</script>

<svelte:window onkeydown={handleKeydown} />

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
                    <select bind:value={selectedAcademicYear} onchange={fetchExamDates} class="text-sm font-bold text-gray-800 bg-transparent cursor-pointer hover:bg-gray-100 p-1 rounded focus:outline-none">
                        {#if availableYears.length === 0} <option value="">No Terms Found</option> {/if}
                        {#each availableYears as year} <option value={year}>{year}</option> {/each}
                    </select>
                    <select bind:value={selectedSemester} onchange={fetchExamDates} class="text-sm font-bold text-gray-800 bg-transparent cursor-pointer hover:bg-gray-100 p-1 rounded focus:outline-none">
                        <option value="1">1st Semester</option> <option value="2">2nd Semester</option> <option value="Midyear">Midyear</option>
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

        <div class="flex flex-wrap gap-2 mb-6 items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-fit">
            {#each scheduleDrafts as schedule}
                <button class="px-4 py-2 rounded-md font-bold transition-colors {viewMode === 'Schedule' && selectedSchedule === schedule ? 'bg-green-500 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-200'}" onclick={() => setScheduleView(schedule)}> Schedule {schedule} </button>
            {/each}
            <div class="w-px h-8 bg-gray-300 mx-2"></div>
            <button class="px-4 py-2 rounded-md font-bold transition-colors {viewMode === 'Exam' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-200'}" onclick={setExamView}> Exams </button>
        </div>

        {#if viewMode === 'Exam'}
        <div class="flex flex-wrap gap-2 mb-6 items-center bg-gray-100 p-3 rounded-lg border border-gray-200 shadow-sm transition-all">
            <span class="text-sm font-bold text-gray-600 mr-2 uppercase tracking-wide"><i class="fa-solid fa-calendar-day mr-1"></i> Date:</span>
            {#if examDates.length === 0} <span class="text-sm text-gray-400 italic">No exam dates found. Use Data Tab to add exams.</span> {/if}
            {#each examDates as date}
                <button class="px-3 py-1.5 rounded-md text-sm font-bold transition-all {selectedExamDate === date ? 'bg-green-600 text-white shadow-md scale-105 ring-2 ring-green-300' : 'bg-white text-green-700 hover:bg-green-50 border border-gray-300'}" onclick={() => { selectedExamDate = date; update = !update; }}> {formatReadableDate(date)} </button>
            {/each}
        </div>
        {/if}

        {#if viewMode === 'Exam' && !selectedExamDate}
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 mt-6 flex flex-col items-center justify-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <h3 class="text-xl font-bold text-gray-700 mb-2">No Exam Dates Available</h3>
                <p class="text-gray-500 max-w-md">There are no exams scheduled for this term. Please go to the Data Tab to add exam dates and assign rooms.</p>
            </div>
        {:else}
            <div>
                {#if activeTab == 'venue'}
                    {#key update}
                    <VenueView {selectedAcademicYear} {selectedSemester} {selectedSchedule} isExamMode={viewMode === 'Exam'} examDate={selectedExamDate} />
                    {/key}
                {:else if activeTab == 'instructor'}
                    {#key update}
                    <InstructorView {selectedAcademicYear} {selectedSemester} {selectedSchedule} onDeleteInstructor={toggleDeleteInstructorModal} isExamMode={viewMode === 'Exam'} examDate={selectedExamDate} />
                    {/key}
                {/if}
            </div>
        {/if}

    </div>
</div>

<style>
    .delete-modal { padding: 2rem; border-radius: 10px; max-width: 40rem; background: white; z-index: 150; }
    .backdrop { width: 100%; height: 100%; position: fixed; top: 0; left: 0; background: rgba(0, 0, 0, 0.5); z-index: 100; }
</style>
