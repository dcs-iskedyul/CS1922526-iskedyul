<script>
    import { supabase } from '$lib/supabaseClient';
    import { subject_info, schedules, storeClasses } from '$lib/store.js';
    
    // Catching Exam Props and removing local schedule state
    let { selectedAcademicYear, selectedSemester, selectedSchedule = "1", isExamMode = false, examDate = "" } = $props();

    async function getData(currentSchedule, currentYear, currentSem, isExam, eDate) {
        if (!currentYear || !currentSem) return [];
        if (isExam && !eDate) return [];

        let query = supabase.from(isExam ? 'exam_schedules' : 'classes')
            .select()
            .eq("academic_year", currentYear)
            .eq("semester", currentSem)
            .order("instructor", { ascending: true });

        if (isExam) {
            query = query.eq("date", eDate);
        } else {
            query = query.eq("schedule", currentSchedule || 1);
        }

        const { data, error } = await query;
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
    
    function formatReadableDate(dateStr) {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
</script>

<div class="bg-white rounded-lg border border-gray-200 shadow-sm w-full">
    <table class="w-full text-left border-collapse text-sm table-auto">
        <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
                <th class="px-3 py-3 font-semibold text-gray-600 w-[18%]">Instructor</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Subject</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Section</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Type</th>
                <th class="px-2 py-3 font-semibold text-gray-600">{isExamMode ? 'Date' : 'Days'}</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Start Time</th>
                <th class="px-2 py-3 font-semibold text-gray-600">End Time</th>
                <th class="px-2 py-3 font-semibold text-gray-600">Room</th>
                {#if !isExamMode}
                <th class="px-2 py-3 font-semibold text-gray-600">Load</th>
                {/if}
                <th class="px-2 py-3 font-semibold text-gray-600">Remarks</th>
            </tr>
        </thead>
        <tbody>
            {#await getData(selectedSchedule, selectedAcademicYear, selectedSemester, isExamMode, examDate)}
                <tr><td colspan="10" class="p-8 text-center text-gray-500 font-medium animate-pulse">Fetching instructor data...</td></tr>
            {:then data}
                {#if data.length === 0}
                    <tr><td colspan="10" class="p-8 text-center text-gray-500">No classes found for this selection.</td></tr>
                {/if}
                {#each data as clas, rowIndex}
                    <tr class="hover:bg-gray-50 transition-colors {(rowIndex === 0 || data[rowIndex].instructor !== data[rowIndex - 1].instructor) ? 'border-t-4 border-gray-200' : 'border-t border-gray-100 border-dotted'}">
                        
                        {#if rowIndex === 0 || data[rowIndex].instructor !== data[rowIndex - 1].instructor}
                            {@const spanCount = data.slice(rowIndex).findIndex(item => item.instructor !== clas.instructor)}
                            {@const actualSpan = spanCount === -1 ? data.length - rowIndex : spanCount}
                            
                            <td class="align-top p-2 border-r border-gray-200" rowspan={actualSpan}>
                                <div class="merged-instructor shadow-sm {isExamMode ? 'bg-blue-50 border border-blue-200' : ''}">
                                    <div class="font-bold text-gray-800 text-base leading-tight break-words">{clas.instructor}</div>
                                    
                                    {#if !isExamMode}
                                    <div class="text-xs text-green-700 font-bold mt-2 bg-white inline-block px-2 py-1 rounded shadow-sm border border-green-200">
                                        Total Load: {calculateTotalLoad(data, clas.instructor)}
                                    </div>
                                    {:else}
                                    <div class="text-xs text-blue-700 font-bold mt-2 bg-white inline-block px-2 py-1 rounded shadow-sm border border-blue-200">
                                        Proctoring Duties
                                    </div>
                                    {/if}
                                </div>
                            </td>
                        {/if}
            
                        <td class="px-2 py-3 font-bold text-gray-800">{clas.course}</td>
                        <td class="px-2 py-3 text-gray-600">{clas.class_id || clas.section}</td>
                        <td class="px-2 py-3 text-gray-600">{clas.type}</td>
                        
                        <td class="px-2 py-3 text-gray-600">
                            {#if isExamMode}
                                <span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">{formatReadableDate(clas.date)}</span>
                            {:else}
                                {clas.days}
                            {/if}
                        </td>
                        
                        <td class="px-2 py-3 text-gray-600 whitespace-nowrap">{clas.start_time}</td>
                        <td class="px-2 py-3 text-gray-600 whitespace-nowrap">{clas.end_time}</td>
                        <td class="px-2 py-3 text-gray-600 text-xs">{clas.location}</td>
                        
                        {#if !isExamMode}
                        <td class="px-2 py-3 font-medium text-blue-700">{getTeachingLoad(clas)}</td>
                        {/if}
                        
                        <td class="px-2 py-3 text-gray-600">{(!isExamMode && clas.load) ? clas.load : '-'}</td>
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
