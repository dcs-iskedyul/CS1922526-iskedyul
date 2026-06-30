<script>
    import Table from "./Table.svelte";
    import { rooms } from "$lib/store.js";
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    
    // Catching the props passed from the parent including Exam overrides
    let { selectedAcademicYear, selectedSemester, selectedSchedule = "1", isExamMode = false, examDate = "" } = $props();

    let selectedRoom = $state("AECH-Accenture Rm");
    let update = $state(true);

    $effect(() => {
        if (browser) {
            sessionStorage.setItem('sched_venue_room', selectedRoom);
        }
    });

    onMount(() => {
        if (sessionStorage.getItem('sched_venue_room')) {
            selectedRoom = sessionStorage.getItem('sched_venue_room');
        }
    });
</script>

<div style="display: flex;" class="room-list">
    <div style="width: 220px; padding-right: 20px;">
        <h3 class="font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2">Rooms</h3>
        <ul class="overflow-y-auto max-h-[600px] custom-scrollbar pr-2">
            {#each rooms as room}
                <li
                    onclick={() => {selectedRoom = room.name; update = !update} }
                    class="cursor-pointer mb-1.5 p-2.5 rounded-lg text-sm transition-colors {selectedRoom === room.name ? 'bg-green-100 text-green-900 font-bold border border-green-300' : 'bg-white hover:bg-gray-50 border border-transparent'}"
                >
                    {room.name}
                </li>
            {/each}
        </ul>
    </div>
    
    <div style="flex: 1; background: white; border-radius: 12px; padding: 1rem; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
        {#key update}
            <Table 
                classroom={selectedRoom} 
                schedule={selectedSchedule} 
                academicYear={selectedAcademicYear} 
                semester={selectedSemester} 
                {isExamMode}
                {examDate}
            />
        {/key}
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
</style>
