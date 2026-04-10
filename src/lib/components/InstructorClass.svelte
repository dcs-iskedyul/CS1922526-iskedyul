<script>
    import { supabase } from '$lib/supabaseClient';
    import { subject_info, schedules, storeClasses } from '$lib/store.js';
    
    let { selectedAcademicYear, selectedSemester } = $props();
    let selectedSchedule = $state("1");
    
    function handleScheduleChange(schedule) {
        selectedSchedule = schedule;
    }

    async function getData(currentSchedule, currentYear, currentSem) {
        if (!currentYear || !currentSem) return []; 

        let finalSchedule = currentSchedule || 1;
        
        const { data, error } = await supabase
            .from('classes')
            .select()
            .eq("schedule", finalSchedule)
            .eq("academic_year", currentYear)
            .eq("semester", currentSem)
            .order("instructor", { ascending: true });
            
        if (error) throw new Error(error.message);
        storeClasses.set(data);
        return data;
    }

    function calculateTotalLoad(data, instructorName) {
        return data
            .filter(item => item.instructor === instructorName)
            .reduce((sum, item) => {
                const subjectData = subject_info[item.course];
                if (subjectData) {
                    const loadValue = item.type && item.type.toLowerCase() === "lab" 
                        ? subjectData.labTL 
                        : subjectData.lecTL;
                    return sum + Number(loadValue || 0);
                }
                return sum + Number(item.load || 0);
            }, 0);
    }

    function getTeachingLoad(clas) {
        var teachingLoad = 0;
        if (subject_info[clas.course]) {
            if (clas.type == "Lab") {
                if (subject_info[clas.course]["labTL"]) {
                    teachingLoad = subject_info[clas.course]["labTL"];
                } else {
                    teachingLoad = subject_info[clas.course]["lecTL"];
                }
            } else {
                 teachingLoad = subject_info[clas.course]["lecTL"]; 
            }
        }
        return teachingLoad;
    }
</script>

<div class="flex flex-wrap gap-2 mb-4">
    {#each schedules as schedule}
    <button 
        class="px-4 py-2 rounded-lg font-medium transition-colors {selectedSchedule === schedule ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
        onclick={() => handleScheduleChange(schedule)}
    >
        Schedule {schedule}
    </button>
    {/each}
</div>

<div class="bg-white rounded-lg border border-gray-200 shadow-sm w-full">
    <table class="w-full text-left border-collapse text-sm table-auto">
        <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
                <th class="px-3 py-3 font-semibold text-gray-600 w-[18%]">Instructor</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Subject</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Section</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Type</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Days</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Start Time</th>
                <th class="px-2 py-3 font-semibold text-gray-600">End Time</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Room</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Load</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Remarks</th>
            </tr>
        </thead>
        <tbody>
            {#await getData(selectedSchedule, selectedAcademicYear, selectedSemester)}
                <tr><td colspan="10" class="p-8 text-center text-gray-500 font-medium animate-pulse">Fetching instructor data...</td></tr>
            {:then data}
                {#if data.length === 0}
                    <tr><td colspan="10" class="p-8 text-center text-gray-500">No classes found for this term.</td></tr>
                {/if}
                {#each data as clas, rowIndex}
                    <tr class="hover:bg-gray-50 transition-colors {(rowIndex === 0 || data[rowIndex].instructor !== data[rowIndex - 1].instructor) ? 'border-t-4 border-gray-200' : 'border-t border-gray-100 border-dotted'}">
                        
                        {#if rowIndex === 0 || data[rowIndex].instructor !== data[rowIndex - 1].instructor}
                            {@const spanCount = data.slice(rowIndex).findIndex(item => item.instructor !== clas.instructor)}
                            {@const actualSpan = spanCount === -1 ? data.length - rowIndex : spanCount}
                            
                            <td class="align-top p-2 border-r border-gray-200" rowspan={actualSpan}>
                                <div class="merged-instructor shadow-sm">
                                    <div class="font-bold text-gray-800 text-base leading-tight break-words">{clas.instructor}</div>
                                    <div class="text-xs text-green-700 font-bold mt-2 bg-white inline-block px-2 py-1 rounded shadow-sm border border-green-200">
                                        Total Load: {calculateTotalLoad(data, clas.instructor)}
                                    </div>
                                </div>
                            </td>
                        {/if}
            
                        <td class="px-2 py-3 font-bold text-gray-800">{clas.course}</td>
                        <td class="px-2 py-3 text-gray-600">{clas.class_id}</td>
                        <td class="px-2 py-3 text-gray-600">{clas.type}</td>
                        <td class="px-2 py-3 text-gray-600">{clas.days}</td>
                        <td class="px-2 py-3 text-gray-600 whitespace-nowrap">{clas.start_time}</td>
                        <td class="px-2 py-3 text-gray-600 whitespace-nowrap">{clas.end_time}</td>
                        <td class="px-2 py-3 text-gray-600 text-xs">{clas.location}</td>
                        <td class="px-2 py-3 font-medium text-blue-700">{getTeachingLoad(clas)}</td>
                        <td class="px-2 py-3 text-gray-600">{clas.load || '-'}</td>
                    </tr>
                {/each}
            {:catch error}
                <tr>
                    <td colspan="10" class="p-8 text-center text-red-600 font-medium bg-red-50 rounded-lg border-b border-red-200">
                        Something went wrong while fetching the data: <pre class="mt-2 text-sm">{error.message}</pre>
                    </td>
                </tr>
            {/await}
        </tbody>
    </table>
</div>

<style>
    .merged-instructor {
        background-color: #D5F5E3;
        border-radius: 12px;
        padding: 12px;
    }
</style>