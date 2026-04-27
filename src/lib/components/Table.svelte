<script>
    import { supabase } from '$lib/supabaseClient.js';
    
    // Catching the Exam Mode Props
    let { classroom, schedule, academicYear, semester, isExamMode = false, examDate = "", examType = "" } = $props();

    let subjects = [];
    let final_subjects = $state([]);
    let conflicts = [];

    // Function to figure out where to place the exam on the Mon-Sun Grid
    function getDayOfWeek(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const daysMap = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
        return daysMap[d.getDay()];
    }

    // Data Fetching with Dual Engine
    async function getData(currentRoom, currentSchedule, currentYear, currentSem, isExam, eDate, eType) {
        if (!currentYear || !currentSem) return [];
        if (isExam && !eDate) return []; // Safety check for exams

        subjects = []; 
        
        let query = supabase.from(isExam ? 'exam_schedules' : 'classes')
            .select()
            .eq("academic_year", currentYear)
            .eq("semester", currentSem);

        if (isExam) {
            query = query.eq("type", eType).eq("date", eDate);
        } else {
            query = query.eq("schedule", currentSchedule);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        
        var clas, loc;
        for (var i = 0; i < data.length; i++) {
            clas = data[i];
            loc = clas.location;
            if (loc == currentRoom) {
                subjects.push(data[i]);
            }
        }
        
        parseForConflicts(subjects, isExam);
        final_subjects = [];
        for (var j = 0; j < subjects.length; j++) {
            if (!checkConflict(subjects[j], isExam ? eDate : currentSchedule, isExam)) {
                final_subjects.push(subjects[j]);
            }
        }

        return data;
    }

    const days = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
    const colors = ['#E03D3D', '#E8782E', '#F6DA24', '#22C55E', '#2563EB', '#9E4AED', '#ED4ABF'];
    
    function haveCommonItems(str1, str2) {
        var arr1 = str1.split(',');
        var arr2 = str2.split(',');
        const set1 = new Set(arr1);
        const commonItems = arr2.filter((item) => set1.has(item));
        return [commonItems, commonItems.length > 0];
    }

    function convertTimeToNumber(time) {
        if (!time) return 0;
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

    function parseForConflicts(data, isExam) {
        conflicts = [];
        
        for (var i = 0; i < data.length; i++) {
            let clas = data[i];
            let loc = clas.location;
            let teacher = clas.instructor;
            let s_t = convertTimeToNumber(clas.start_time);
            let e_t = convertTimeToNumber(clas.end_time);

            for (var j = i + 1; j < data.length; j++) {
                let n_clas = data[j];

                if (!isExam && clas.schedule !== n_clas.schedule) continue;
                if (isExam && clas.date !== n_clas.date) continue;
                
                let types_of_conflict = [];
                let n_loc = n_clas.location;
                let n_teacher = n_clas.instructor;
                let n_s_t = convertTimeToNumber(n_clas.start_time);
                let n_e_t = convertTimeToNumber(n_clas.end_time);

                if (n_loc == loc && loc !== 'TBA' && n_loc !== 'TBA')
                    types_of_conflict.push(isExam ? "Time & Room Overlap" : "Room Conflict");
                
                // Instructors can proctor multiple rooms for exams, ignore for exams!
                if (!isExam && n_teacher == teacher && teacher !== 'TBA' && n_teacher !== 'TBA')
                    types_of_conflict.push("Instructor Conflict");

                if (types_of_conflict.length > 0) { 
                    let check = false;
                    if (isExam) {
                        check = true; // Same date is already confirmed
                    } else {
                        let [common_days, c] = haveCommonItems(n_clas.days, clas.days);
                        check = c;
                    }

                    if (check) { 
                        if ((s_t >= n_s_t && s_t < n_e_t) || (e_t > n_s_t && e_t <= n_e_t) || (s_t <= n_s_t && e_t >= n_e_t)) { 
                            conflicts.push([
                                clas.course + ' ' + (clas.class_id || clas.section), 
                                n_clas.course + ' ' + (n_clas.class_id || n_clas.section), 
                                types_of_conflict.join(", "), 
                                isExam ? clas.date : clas.schedule
                            ]);
                        }
                    }
                }   
            }
        }
    }

    function checkConflict(clas, currentTarget, isExam) {
        var class_title = clas.course + ' ' + (clas.class_id || clas.section);
        for (var i = 0; i < conflicts.length; i++) {
            if ((conflicts[i][0] == class_title || conflicts[i][1] == class_title) && currentTarget == conflicts[i][3]) {
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

    function calculateRowspan(startTime, endTime) {
        if (!startTime || !endTime) return 1;
        const [startHour, startMinutes] = startTime.split(':').map(Number);
        const [endHour, endMinutes] = endTime.split(':').map(Number);
        const start = startHour * 60 + startMinutes;
        const end = endHour * 60 + endMinutes;
        const span = (end - start) / 15;
        return span > 0 ? span : 1;
    }
</script>

{#await getData(classroom, schedule, academicYear, semester, isExamMode, examDate, examType)}
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
                                (s) => (!isExamMode && s.days && s.days.includes(day) && s.start_time == time) ||
                                       (isExamMode && day === getDayOfWeek(examDate) && s.start_time == time)
                            )}
                            
                            {#if subject}
                                <td
                                    class="text-white text-xs font-medium p-2 rounded shadow-sm align-top overflow-hidden {isExamMode ? 'ring-2 ring-blue-400' : ''}"
                                    style="background-color:{isExamMode ? '#2563EB' : getSubjectColor(subject.course, subject.class_id || subject.section)};"
                                    rowspan={calculateRowspan(subject.start_time, subject.end_time)}
                                >
                                    <div class="font-bold leading-tight">{subject.course} {subject.class_id || subject.section}</div>
                                    <div class="opacity-90 leading-tight mt-1">{subject.instructor}</div>
                                </td>
                            {:else}
                                {#if !(final_subjects.some((s) => 
                                    (!isExamMode && s.days && s.days.includes(day) && convertTimeToNumber(s.start_time) <= convertTimeToNumber(time) && convertTimeToNumber(s.end_time) > convertTimeToNumber(time)) ||
                                    (isExamMode && day === getDayOfWeek(examDate) && convertTimeToNumber(s.start_time) <= convertTimeToNumber(time) && convertTimeToNumber(s.end_time) > convertTimeToNumber(time))
                                ))}
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
    .empty-cell { height: 24px; padding: 0; }
    .venue-table { border-collapse: separate; border-spacing: 4px 0; table-layout: fixed; }
    .venue-table th { width: 13%; }
</style>