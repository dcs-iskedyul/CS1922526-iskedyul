<script>
    import { supabase } from '$lib/supabaseClient.js';
  
    // Added: Catching Props
    let { classroom, schedule, academicYear, semester } = $props();

    let subjects = [];
    let final_subjects = $state([]);
    let conflicts = [];

    // Added: Data Fetching
    async function getData(currentRoom, currentSchedule, currentYear, currentSem) {
        // Safety check: don't fetch if terms haven't loaded yet
        if (!currentYear || !currentSem) return []; 

        subjects = []; // Reset subjects on new fetch
        
        // Upgraded Query - Fetch only relevant classes based on schedule, year, and semester
        const { data, error } = await supabase
            .from('classes')
            .select()
            .eq("schedule", currentSchedule)
            .eq("academic_year", currentYear)
            .eq("semester", currentSem);
            
        if (error) throw new Error(error.message);
        
        var clas, loc;
        for (var i = 0; i < data.length; i++) {
            clas = data[i];
            loc = clas.location;
            if (loc == currentRoom) {
                subjects.push(data[i]);
            }
        }
        
        parseForConflicts(subjects);
        
        final_subjects = [];
        for (var j = 0; j < subjects.length; j++) {
            if (!checkConflict(subjects[j], currentSchedule)) {
                final_subjects.push(subjects[j]);
            }
        }

        return data;
    }

    const days = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
    const colors = ['#E03D3D', '#E8782E', '#F6DA24', '#22C55E', '#2563EB', '#9E4AED', '#ED4ABF'];
    let idx = 0;
    let skip = 0;

    function haveCommonItems(str1, str2) {
        var arr1 = str1.split(',');
        var arr2 = str2.split(',');
        const set1 = new Set(arr1);
        const commonItems = arr2.filter((item) => set1.has(item));
        return [commonItems, commonItems.length > 0];
    }

    function convertTimeToNumber(time) {
        const hours = Number(time.split(':')[0]);
        const minutes = Number(time.split(':')[1]) / 60;
        return hours + minutes;
    }

    const colorPalette = [
        '#E03D3D', '#E8782E', '#F6DA24', '#22C55E', '#2563EB', '#9E4AED', '#ED4ABF', '#6B7280' 
    ];

    function getSubjectColor(course, classId) {
        const uniqueStr = course + classId;
        let hash = 0;
        for (let i = 0; i < uniqueStr.length; i++) {
            hash = uniqueStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = Math.abs(hash) % colorPalette.length;
        return colorPalette[colorIndex];
    }

    function parseForConflicts(data) {
        var clas, loc, s_t, e_t, n_clas, n_loc, n_s_t, n_e_t, check, teacher, n_teacher, common_days;
        var types_of_conflict;
        conflicts = [];
        
        for (var i = 0; i < data.length; i++) {
            clas = data[i];
            loc = clas.location;
            teacher = clas.instructor;
            s_t = convertTimeToNumber(clas.start_time);
            e_t = convertTimeToNumber(clas.end_time);
            
            for (var j = i + 1; j < data.length; j++) {
                n_clas = data[j];
                if (clas.schedule !== n_clas.schedule) continue;
                
                n_loc = n_clas.location;
                n_teacher = n_clas.instructor;
                types_of_conflict = [];
                n_s_t = convertTimeToNumber(n_clas.start_time);
                n_e_t = convertTimeToNumber(n_clas.end_time);
                
                if (n_loc == loc && loc !== 'TBA' && n_loc !== 'TBA')
                    types_of_conflict.push("Room Conflict");
                if (n_teacher == teacher && teacher !== 'TBA' && n_teacher !== 'TBA')
                    types_of_conflict.push("Instructor Conflict");
                
                if (types_of_conflict.length > 0) { 
                    [common_days, check] = haveCommonItems(n_clas.days, clas.days);
                    if (check) { 
                        if ((s_t >= n_s_t && s_t < n_e_t) || (e_t > n_s_t && e_t <= n_e_t) || (s_t <= n_s_t && e_t >= n_e_t)) { 
                            conflicts.push([clas.course + ' ' + clas.class_id, n_clas.course + ' ' + n_clas.class_id, types_of_conflict.join(", "), clas.schedule]);
                        }
                    }
                }   
            }
        }
    }

    function checkConflict(clas, currentSchedule) {
        var class_title = clas.course + ' ' + clas.class_id;
        for (var i = 0; i < conflicts.length; i++) {
            if ((conflicts[i][0] == class_title || conflicts[i][1] == class_title) && currentSchedule == conflicts[i][3]) {
                return true;
            }
        }
        return false;
    }

    const times = Array.from({ length: 57 }, (_, i) => {
        const hour = Math.floor(i / 4) + 7;
        var hour_str = hour < 10 ? "0" + hour : hour;
        var minutes;
        switch (i % 4) {
            case 0: minutes = '00'; break;
            case 1: minutes = '15'; break;
            case 2: minutes = '30'; break;
            case 3: minutes = '45'; break;
        } 
        return `${hour_str}:${minutes}`;
    });

    function calculateRowspan(startTime, endTime, course, class_id) {
        const [startHour, startMinutes] = startTime.split(':').map(Number);
        const [endHour, endMinutes] = endTime.split(':').map(Number);
        const start = startHour * 60 + startMinutes;
        const end = endHour * 60 + endMinutes;
        return (end - start) / 15; 
    }
</script>

{#await getData(classroom, schedule, academicYear, semester)}
    <div class="p-8 text-center text-gray-500 font-medium animate-pulse">
        Fetching schedule data...
    </div>
{:then data}
    <div class="table-container w-full overflow-x-auto">
        <table class="venue-table w-full">
            <thead>
                <tr>
                    <td colspan="1"></td>
                    <td colspan="7" class="text-xl font-bold text-gray-800 pb-4 text-center">{classroom}</td>
                </tr>
                <tr>
                    <th class="w-20"></th>
                    {#each days as day}
                        <th class="pb-2 text-gray-500 font-semibold">{day}</th>
                    {/each}
                </tr>
            </thead>

            <tbody>
                {#each times as time}
                    <tr>
                        <td class="time text-xs text-gray-400 text-right pr-2 border-r border-gray-200 align-top h-6">
                            {#if time.endsWith('00')}
                                {time}
                            {/if}
                        </td>
                        
                        {#each days as day}
                            {@const subject = final_subjects.find(
                                (s) => s.days.includes(day) && (s.start_time == time)
                            )}
                            
                            {#if subject}
                                <td
                                    class="text-white text-xs font-medium p-2 rounded shadow-sm align-top overflow-hidden"
                                    style="background-color:{getSubjectColor(subject.course, subject.class_id)};"
                                    rowspan={calculateRowspan(subject.start_time, subject.end_time, subject.course, subject.class_id)}
                                >
                                    <div class="font-bold leading-tight">{subject.course} {subject.class_id}</div>
                                    <div class="opacity-90 leading-tight mt-1">{subject.instructor}</div>
                                </td>
                            {:else}
                                {#if !(final_subjects.some((s) => s.days.includes(day) && convertTimeToNumber(s.start_time) <= convertTimeToNumber(time) && convertTimeToNumber(s.end_time) >= convertTimeToNumber(time)))}
                                    <td class="empty-cell border-b border-gray-50 border-dashed border-r"></td>
                                {/if}
                            {/if}
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{:catch error}
    <div class="p-8 text-center text-red-600 font-medium bg-red-50 rounded-lg">
        Something went wrong while fetching the data: <pre class="mt-2 text-sm">{error.message}</pre>
    </div>
{/await}

<style>
    .empty-cell {
        height: 24px;
        padding: 0;
    }
    
    .venue-table {
        border-collapse: separate; 
        border-spacing: 4px 0;
        table-layout: fixed;
    }
    
    .venue-table th {
        width: 13%;
    }
</style>