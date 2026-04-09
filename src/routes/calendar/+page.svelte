<script>
    import Sidebar from '$lib/components/Sidebar.svelte';
    import { rooms } from '$lib/store.js'; 
    import { supabase } from "$lib/supabaseClient";
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    
    let allTerms = $state([]);
    let availableYears = $state([]);
    let allCalendarEvents = $state([]); 

    let currentDate = $state(new Date());
    let currentMonth = $derived(currentDate.getMonth());
    let currentYear = $derived(currentDate.getFullYear());
    
    let selectedVenue = $state("All Venues");
    let exportStartDate = $state("");
    let exportEndDate = $state("");

    let shortcutYear = $state("");
    let shortcutSem = $state("1");
    let venueClasses = $state([]);
    
    let showAddTermModal = $state(false);
    let newTermYear = $state("");
    let s1Start = $state(""); let s1End = $state("");
    let s2Start = $state(""); let s2End = $state("");
    let mStart = $state("");  let mEnd = $state("");
    let isSavingTerm = $state(false);

    let showExportPreviewModal = $state(false);
    let exportDataPreview = $state([]);

    let showAddEventModal = $state(false);
    let selectedDateForEvent = $state("");
    let newEventType = $state("holiday"); 
    let newEventTitle = $state("");
    let newEventVenue = $state("All Venues");
    let newEventStartTime = $state("");
    let newEventEndTime = $state("");
    let newEventEndDate = $state(""); 
    let isSavingEvent = $state(false);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap = ['Sn', 'M', 'T', 'W', 'Th', 'F', 'S']; 

    function formatSemName(sem) {
        if (sem === '1') return '1st Semester';
        if (sem === '2') return '2nd Semester';
        return 'Midyear';
    }

    $effect(() => {
        if (browser) {
            sessionStorage.setItem('cal_venue', selectedVenue);
            sessionStorage.setItem('cal_date', currentDate.toISOString());
        }
    });

    function jumpToDate(dateString) {
        if (dateString) {
            const [y, m, d] = dateString.split('-');
            currentDate = new Date(y, m - 1, 1);
        }
    }

    onMount(async () => {
        if (sessionStorage.getItem('cal_venue')) selectedVenue = sessionStorage.getItem('cal_venue');
        if (sessionStorage.getItem('cal_date')) currentDate = new Date(sessionStorage.getItem('cal_date'));
        await fetchAllTerms();
        await fetchCalendarEvents(); 
    });

    async function fetchAllTerms() {
        const { data } = await supabase.from('academic_terms').select('*');
        if (data) {
            allTerms = data;
            availableYears = [...new Set(data.map(d => d.academic_year))].sort();
        }
    }

    async function fetchCalendarEvents() {
        const { data } = await supabase.from('calendar_events').select('*');
        if (data) allCalendarEvents = data;
    }

    let viewedTerm = $derived.by(() => {
        if (allTerms.length === 0) return null;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const datesToCheck = [15, 1, 28].map(d => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        
        for (let dateStr of datesToCheck) {
            const found = allTerms.find(t => dateStr >= t.start_date && dateStr <= t.end_date);
            if (found) return found;
        }
        return null;
    });

    $effect(() => {
        if (viewedTerm) {
            shortcutYear = viewedTerm.academic_year;
            shortcutSem = viewedTerm.semester;
        }
    });

    function handleShortcutChange() {
        const term = allTerms.find(t => t.academic_year === shortcutYear && t.semester === shortcutSem);
        if (term) {
            const [y, m, d] = term.start_date.split('-');
            currentDate = new Date(y, m - 1, 1);
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') {
            showAddEventModal = false;
            showAddTermModal = false;
            showExportPreviewModal = false;
        }
        if (event.key === 'Enter') {
            if (showAddEventModal && !isSavingEvent) saveEvent();
            else if (showAddTermModal && !isSavingTerm) saveNewTerm();
            else if (showExportPreviewModal) downloadCSV();
        }
    }

    function resetTermModal() {
        newTermYear = ""; s1Start = ""; s1End = ""; s2Start = ""; s2End = ""; mStart = ""; mEnd = "";
        showAddTermModal = false;
    }

    async function saveNewTerm() {
        if (!newTermYear) return alert("Academic Year is required!");
        isSavingTerm = true;
        let inserts = [];
        if (s1Start && s1End) inserts.push({ academic_year: newTermYear, semester: '1', start_date: s1Start, end_date: s1End });
        if (s2Start && s2End) inserts.push({ academic_year: newTermYear, semester: '2', start_date: s2Start, end_date: s2End });
        if (mStart && mEnd) inserts.push({ academic_year: newTermYear, semester: 'Midyear', start_date: mStart, end_date: mEnd });

        if (inserts.length === 0) { isSavingTerm = false; return alert("Please fill in dates for at least one semester."); }
        const { error } = await supabase.from('academic_terms').insert(inserts);
        isSavingTerm = false;
        
        if (!error) {
            await fetchAllTerms();
            if (s1Start) { const [y, m, d] = s1Start.split('-'); currentDate = new Date(y, m - 1, 1); }
            resetTermModal();
        } else alert("Error saving terms.");
    }

    async function fetchVenueClasses() {
        if (selectedVenue === "All Venues") { venueClasses = []; return; }
        const { data } = await supabase.from('classes').select('*').eq('room', selectedVenue);
        if (data) venueClasses = data;
    }

    $effect(() => { fetchVenueClasses(); });

    function openEventModal(date) {
        selectedDateForEvent = date;
        newEventVenue = selectedVenue; 
        newEventType = "holiday";
        newEventTitle = "";
        newEventStartTime = "";
        newEventEndTime = "";
        newEventEndDate = ""; 
        showAddEventModal = true;
    }

    async function saveEvent() {
        if (!newEventTitle) return alert("Please provide a title for the event.");
        if (!viewedTerm) return alert("Cannot add an event outside of a defined academic term boundaries.");

        isSavingEvent = true;
        
        const eventData = {
            academic_year: viewedTerm.academic_year,
            semester: viewedTerm.semester,
            date: selectedDateForEvent,
            end_date: (newEventType === 'holiday' || newEventType === 'break') && newEventEndDate ? newEventEndDate : null,
            type: newEventType,
            title: newEventTitle,
            venue: newEventVenue === "All Venues" ? null : newEventVenue, 
            start_time: (newEventType !== 'holiday' && newEventType !== 'break' && newEventStartTime) ? newEventStartTime : null,
            end_time: (newEventType !== 'holiday' && newEventType !== 'break' && newEventEndTime) ? newEventEndTime : null
        };

        const { error } = await supabase.from('calendar_events').insert([eventData]);
        isSavingEvent = false;
        
        if (!error) {
            showAddEventModal = false;
            await fetchCalendarEvents(); 
        } else {
            alert("Failed to save event: " + error.message);
        }
    }

    async function confirmDeleteEvent(event) {
        if (confirm(`Are you sure you want to delete this event: "${event.title}"?`)) {
            const { error } = await supabase.from('calendar_events').delete().eq('id', event.id);
            if (!error) {
                await fetchCalendarEvents();
            } else {
                alert("Failed to delete the event.");
            }
        }
    }

    function generatePreview() {
        if (!exportStartDate || !exportEndDate) return alert("Please select both a Start and End date.");
        let data = [];
        let curr = new Date(exportStartDate);
        let end = new Date(exportEndDate);

        while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            const activeTermForDay = allTerms.find(t => dateStr >= t.start_date && dateStr <= t.end_date);
            
            const dayEvents = allCalendarEvents.filter(e => {
                const matchesVenue = e.venue === null || e.venue === selectedVenue;
                if (!matchesVenue) return false;
                if (e.end_date) return dateStr >= e.date && dateStr <= e.end_date;
                return dateStr === e.date;
            });

            const isFullDayOff = dayEvents.some(e => e.type === 'holiday' || e.type === 'break');

            if (activeTermForDay && venueClasses.length > 0 && !isFullDayOff) {
                const dayOfWeekAbbr = dayMap[curr.getDay()];
                let dayClasses = venueClasses.filter(c => c.days && typeof c.days === 'string' && c.days.includes(dayOfWeekAbbr));
                dayClasses.forEach(c => {
                    data.push({ date: dateStr, course: c.course, type: c.type, time: `${c.start_time.substring(0,5)} - ${c.end_time.substring(0,5)}` });
                });
            }
            curr.setDate(curr.getDate() + 1);
        }

        data.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });
        exportDataPreview = data;
        showExportPreviewModal = true;
    }

    function downloadCSV() {
        if (exportDataPreview.length === 0) return;
        let csvContent = "Date,Course,Type,Time\n";
        exportDataPreview.forEach(row => {
            const safeCourse = `"${row.course.replace(/"/g, '""')}"`;
            csvContent += `${row.date},${safeCourse},${row.type},${row.time}\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const cleanVenue = selectedVenue.replace(/\s+/g, '_');
        link.setAttribute("download", `iskedyul_${cleanVenue}_${exportStartDate}_to_${exportEndDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showExportPreviewModal = false;
    }

    let calendarDays = $derived.by(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let days = [];
        for (let i = 0; i < firstDay; i++) days.push({ day: null, fullDate: null, isHighlighted: false, projectedClasses: [], dayEvents: [], startOfTerms: [], endOfTerms: [] });
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            let highlighted = false;
            if (exportStartDate && exportEndDate) {
                const s = exportStartDate <= exportEndDate ? exportStartDate : exportEndDate;
                const e = exportStartDate <= exportEndDate ? exportEndDate : exportStartDate;
                highlighted = dateStr >= s && dateStr <= e;
            } else if (exportStartDate || exportEndDate) {
                highlighted = dateStr === exportStartDate || dateStr === exportEndDate;
            }

            const eventsForThisDay = allCalendarEvents.filter(e => {
                const matchesVenue = e.venue === null || e.venue === selectedVenue;
                if (!matchesVenue) return false;
                
                if (e.end_date) {
                    return dateStr >= e.date && dateStr <= e.end_date;
                }
                return dateStr === e.date;
            });

            const isFullDayOff = eventsForThisDay.some(e => e.type === 'holiday' || e.type === 'break');

            const activeTermForDay = allTerms.find(t => dateStr >= t.start_date && dateStr <= t.end_date);
            let dayClasses = [];
            
            if (activeTermForDay && venueClasses.length > 0 && !isFullDayOff) {
                const dayOfWeekAbbr = dayMap[new Date(year, month, i).getDay()];
                dayClasses = venueClasses.filter(c => c.days && typeof c.days === 'string' && c.days.includes(dayOfWeekAbbr));
                dayClasses.sort((a, b) => a.start_time.localeCompare(b.start_time));
            }

            days.push({ 
                day: i, 
                fullDate: dateStr, 
                isHighlighted: highlighted, 
                projectedClasses: dayClasses,
                dayEvents: eventsForThisDay, 
                startOfTerms: allTerms.filter(t => t.start_date === dateStr),
                endOfTerms: allTerms.filter(t => t.end_date === dateStr)
            });
        }
        return days;
    });

    function updateDate(month, year) { currentDate = new Date(year, month, 1); }
    function nextMonth() { updateDate(currentMonth + 1, currentYear); }
    function prevMonth() { updateDate(currentMonth - 1, currentYear); }
    function goToToday() { currentDate = new Date(); }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-screen bg-gray-50">
    <Sidebar />

    <div class="flex-1 p-6 ml-64 overflow-y-auto relative">
        <div class="flex justify-between items-end mb-6">
            <div>
                <div class="flex items-center gap-3">
                    <h1 class="text-3xl font-bold text-gray-800">Academic Calendar</h1>
                    {#if viewedTerm}
                        <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200 shadow-sm transition-all">
                            Viewing: {viewedTerm.academic_year} ({formatSemName(viewedTerm.semester)})
                        </span>
                    {:else}
                        <span class="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 shadow-sm transition-all">
                            Break / Out of Term
                        </span>
                    {/if}
                </div>
                <p class="text-gray-500 mt-1">Manage specific dates, holidays, and preview exports.</p>
            </div>
            
            <div class="flex flex-col items-end gap-2">
                <div class="flex items-center gap-3">
                    <select bind:value={selectedVenue} class="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="All Venues">All Venues</option>
                        {#each rooms as room}
                            <option value={room.name}>{room.name}</option>
                        {/each}
                    </select>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex flex-wrap items-center justify-between mb-6 gap-4">
                <div class="flex items-center gap-2">
                    <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                        <span class="text-sm font-medium text-gray-600"><i class="fa-solid fa-bolt"></i> Jump to:</span>
                        <select bind:value={shortcutYear} onchange={handleShortcutChange} class="text-sm font-bold text-gray-800 bg-transparent cursor-pointer hover:bg-gray-100 p-1 rounded focus:outline-none">
                            {#if availableYears.length === 0} <option value="">No Terms Found</option> {/if}
                            {#each availableYears as year} <option value={year}>{year}</option> {/each}
                        </select>
                        <select bind:value={shortcutSem} onchange={handleShortcutChange} class="text-sm font-bold text-gray-800 bg-transparent cursor-pointer hover:bg-gray-100 p-1 rounded focus:outline-none">
                            <option value="1">1st Semester</option>
                            <option value="2">2nd Semester</option>
                            <option value="Midyear">Midyear</option>
                        </select>
                    </div>
                    <button onclick={() => showAddTermModal = true} class="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-lg border border-gray-200 shadow-sm transition" title="Add Full Academic Year">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>

                <div class="flex items-center gap-3 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                    <div class="flex items-center bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
                        <button onclick={prevMonth} class="px-2 py-1.5 text-gray-600 hover:bg-gray-100 transition border-r border-gray-300"><i class="fa-solid fa-chevron-left"></i></button>
                        <select value={currentMonth} onchange={(e) => updateDate(parseInt(e.target.value), currentYear)} class="text-lg font-bold text-gray-800 bg-transparent cursor-pointer hover:bg-gray-50 px-2 py-1 focus:outline-none appearance-none text-center">
                            {#each monthNames as month, i} <option value={i}>{month}</option> {/each}
                        </select>
                        <button onclick={nextMonth} class="px-2 py-1.5 text-gray-600 hover:bg-gray-100 transition border-l border-gray-300"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                    <input type="number" value={currentYear} onchange={(e) => updateDate(currentMonth, parseInt(e.target.value))} class="always-show-spinners text-lg font-bold text-gray-800 bg-white border border-gray-300 shadow-sm p-1.5 rounded focus:outline-none w-24 text-center focus:ring-2 focus:ring-green-500" />
                    <div class="w-px h-6 bg-gray-300 mx-1"></div>
                    <button onclick={goToToday} class="px-4 py-1.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 hover:text-black transition">Today</button>
                </div>

                <div class="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 shadow-sm">
                    <input type="date" bind:value={exportStartDate} onchange={() => jumpToDate(exportStartDate)} class="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-green-500 bg-white">
                    <span class="text-gray-400">to</span>
                    <input type="date" bind:value={exportEndDate} onchange={() => jumpToDate(exportEndDate)} class="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-green-500 bg-white">
                    <button onclick={generatePreview} class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded font-medium shadow-sm flex items-center gap-2 transition-colors">
                        <i class="fa-solid fa-file-export"></i> Export CSV
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-7 gap-4 mb-2">
                {#each daysOfWeek as day} <div class="text-center font-semibold text-gray-500 uppercase text-sm py-2">{day}</div> {/each}
            </div>

            <div class="grid grid-cols-7 gap-4 auto-rows-fr">
                {#each calendarDays as {day, fullDate, isHighlighted, projectedClasses, dayEvents, startOfTerms, endOfTerms}}
                    <div class="min-h-[120px] p-2 rounded-lg border transition-colors relative group
                               {day ? 'bg-white shadow-sm border-gray-200 hover:border-blue-400' : 'bg-transparent border-transparent'}
                               {isHighlighted && day ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : ''}
                               {dayEvents.some(e => e.type === 'holiday' || e.type === 'break') ? 'bg-red-50/50 border-red-200' : ''}">
                        {#if day}
                            <div class="flex justify-between items-start">
                                <span class="text-sm font-medium
                                    {fullDate === new Date().toISOString().split('T')[0] ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}
                                    {isHighlighted && fullDate !== new Date().toISOString().split('T')[0] ? 'text-green-800' : ''}">
                                    {day}
                                </span>
                                
                                <button onclick={() => openEventModal(fullDate)} class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1 cursor-pointer">
                                    <i class="fa-solid fa-plus"></i>
                                </button>
                            </div>

                            {#each startOfTerms as t} <div class="mt-1 text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 w-max"><i class="fa-solid fa-flag text-blue-500"></i> Start of {formatSemName(t.semester)}</div> {/each}
                            {#each endOfTerms as t} <div class="mt-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 w-max"><i class="fa-solid fa-flag-checkered text-red-500"></i> End of {formatSemName(t.semester)}</div> {/each}

                            <div class="mt-2 flex flex-col gap-1 overflow-y-auto max-h-[90px] custom-scrollbar">
                                {#each dayEvents as ev}
                                    {#if ev.type === 'holiday' || ev.type === 'break'}
                                        <div class="relative w-full text-left p-1.5 rounded border shadow-sm bg-red-100 border-red-300 text-red-900 my-1">
                                            <div class="flex justify-between items-start">
                                                <div class="flex-1 min-w-0 pr-5">
                                                    <div class="text-[8px] uppercase font-extrabold opacity-75 flex items-center gap-1 mb-0.5">
                                                        <i class="fa-solid {ev.type === 'holiday' ? 'fa-umbrella-beach' : 'fa-mug-hot'}"></i> 
                                                        {ev.type === 'holiday' ? 'Holiday' : 'Break'}
                                                    </div>
                                                    <div class="text-[11px] font-bold leading-tight break-words">{ev.title}</div>
                                                </div>
                                            </div>
                                            
                                            <button onclick={() => confirmDeleteEvent(ev)} class="absolute top-1 right-1 text-red-400 hover:text-red-700 hover:bg-red-200 w-5 h-5 flex items-center justify-center rounded transition" title="Delete Event">
                                                <i class="fa-solid fa-minus"></i>
                                            </button>
                                        </div>
                                    {:else}
                                        <div class="relative w-full text-left p-1.5 rounded border shadow-sm bg-yellow-50 border-yellow-300 text-yellow-900 my-1">
                                            <div class="flex justify-between items-start">
                                                <div class="flex-1 min-w-0 pr-5">
                                                    <div class="text-[8px] uppercase font-extrabold opacity-75 flex items-center gap-1 mb-0.5">
                                                        <i class="fa-solid {ev.type === 'exam' ? 'fa-file-lines' : 'fa-star'}"></i> 
                                                        {ev.type === 'exam' ? 'Exam' : 'Event'}
                                                    </div>
                                                    <div class="text-[10px] font-bold leading-tight break-words">{ev.title}</div>
                                                    {#if ev.start_time && ev.end_time}
                                                        <div class="text-[9px] text-yellow-700 font-normal mt-0.5">{ev.start_time.substring(0,5)} - {ev.end_time.substring(0,5)}</div>
                                                    {/if}
                                                </div>
                                            </div>
                                            <button onclick={() => confirmDeleteEvent(ev)} class="absolute top-1 right-1 text-yellow-500 hover:text-yellow-800 hover:bg-yellow-200 w-5 h-5 flex items-center justify-center rounded transition" title="Delete Event">
                                                <i class="fa-solid fa-minus"></i>
                                            </button>
                                        </div>
                                    {/if}
                                {/each}

                                {#each projectedClasses as pClass}
                                    <div class="text-[10px] leading-tight p-1.5 rounded border shadow-sm {pClass.type === 'Lec' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-purple-50 border-purple-200 text-purple-800'}">
                                        <div class="font-bold truncate">{pClass.course}</div>
                                        <div class="text-gray-500 mt-0.5">{pClass.start_time.substring(0,5)} - {pClass.end_time.substring(0,5)}</div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>

    {#if showExportPreviewModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div class="bg-white rounded-lg p-6 w-[700px] shadow-xl max-h-[80vh] flex flex-col">
            <h2 class="text-xl font-bold mb-2">Export Preview</h2>
            <p class="text-sm text-gray-600 mb-4">Venue: <span class="font-bold">{selectedVenue}</span> | Range: <span class="font-bold">{exportStartDate}</span> to <span class="font-bold">{exportEndDate}</span></p>
            
            <div class="flex-1 overflow-y-auto border border-gray-200 rounded-lg mb-4">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 sticky top-0 border-b border-gray-200">
                        <tr><th class="px-4 py-2 text-gray-600">Date</th><th class="px-4 py-2 text-gray-600">Course</th><th class="px-4 py-2 text-gray-600">Type</th><th class="px-4 py-2 text-gray-600">Time</th></tr>
                    </thead>
                    <tbody>
                        {#if exportDataPreview.length === 0} <tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No classes found in this date range.</td></tr> {/if}
                        {#each exportDataPreview as row}
                            <tr class="border-b border-gray-100 hover:bg-gray-50">
                                <td class="px-4 py-2 font-medium">{row.date}</td><td class="px-4 py-2 font-bold text-blue-700">{row.course}</td><td class="px-4 py-2">{row.type}</td><td class="px-4 py-2 text-gray-600">{row.time}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <div class="flex justify-end gap-2">
                <button onclick={() => showExportPreviewModal = false} class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition">Cancel</button>
                <button onclick={downloadCSV} class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium transition" disabled={exportDataPreview.length === 0}><i class="fa-solid fa-download mr-1"></i> Download CSV</button>
            </div>
        </div>
    </div>
    {/if}

    {#if showAddEventModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div class="bg-white rounded-lg p-6 w-[500px] shadow-xl">
            <h2 class="text-xl font-bold mb-4">Add Event / Exception</h2>
            
            <div class="mb-4 bg-gray-50 p-3 rounded border border-gray-200 flex justify-between items-center">
                <p class="text-sm text-gray-600">Date: <span class="font-bold text-gray-900">{selectedDateForEvent}</span></p>
                {#if viewedTerm}
                    <p class="text-sm text-gray-600">Term: <span class="font-bold text-gray-900">{viewedTerm.academic_year} ({formatSemName(viewedTerm.semester)})</span></p>
                {/if}
            </div>

            <div class="flex flex-col gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Type of Event</label>
                    <select bind:value={newEventType} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none">
                        <option value="holiday">Holiday</option>
                        <option value="break">Break</option>
                        <option value="exam">Exam</option>
                        <option value="other">Others</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                    <input type="text" bind:value={newEventTitle} placeholder="e.g. Independence Day, Dept Meeting..." class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none">
                </div>

                {#if newEventType === 'holiday' || newEventType === 'break'}
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">End Date (Optional, for multi-day breaks)</label>
                    <input type="date" bind:value={newEventEndDate} min={selectedDateForEvent} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none">
                </div>
                {/if}

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Affected Venue</label>
                    <select bind:value={newEventVenue} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none">
                        <option value="All Venues">All Venues (Global)</option>
                        {#each rooms as room}
                            <option value={room.name}>{room.name}</option>
                        {/each}
                    </select>
                </div>

                {#if newEventType !== 'holiday' && newEventType !== 'break'}
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Start Time (Optional)</label>
                        <input type="time" bind:value={newEventStartTime} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">End Time (Optional)</label>
                        <input type="time" bind:value={newEventEndTime} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none">
                    </div>
                </div>
                {/if}
            </div>

            <div class="flex justify-end gap-2">
                <button onclick={() => showAddEventModal = false} class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition">Cancel</button>
                <button onclick={saveEvent} disabled={isSavingEvent} class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium transition disabled:opacity-50">
                    {isSavingEvent ? 'Saving...' : 'Save Event'}
                </button>
            </div>
        </div>
    </div>
    {/if}

    {#if showAddTermModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div class="bg-white rounded-lg p-6 w-[500px] shadow-xl">
            <h2 class="text-xl font-bold mb-4">Add Full Academic Year</h2>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                    <input type="text" bind:value={newTermYear} placeholder="e.g. 2026-2027" class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none">
                </div>
                
                <div class="col-span-2 mt-2 border-b pb-1 font-bold text-gray-700">1st Semester</div>
                <div><label class="block text-xs font-medium text-gray-500">Start of Classes</label><input type="date" bind:value={s1Start} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none"></div>
                <div><label class="block text-xs font-medium text-gray-500">End of Finals</label><input type="date" bind:value={s1End} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none"></div>

                <div class="col-span-2 mt-2 border-b pb-1 font-bold text-gray-700">2nd Semester</div>
                <div><label class="block text-xs font-medium text-gray-500">Start of Classes</label><input type="date" bind:value={s2Start} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none"></div>
                <div><label class="block text-xs font-medium text-gray-500">End of Finals</label><input type="date" bind:value={s2End} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none"></div>

                <div class="col-span-2 mt-2 border-b pb-1 font-bold text-gray-700">Midyear (Optional)</div>
                <div><label class="block text-xs font-medium text-gray-500">Start of Classes</label><input type="date" bind:value={mStart} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none"></div>
                <div><label class="block text-xs font-medium text-gray-500">End of Finals</label><input type="date" bind:value={mEnd} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none"></div>
            </div>

            <div class="flex justify-end gap-2">
                <button onclick={resetTermModal} class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition">Cancel</button>
                <button onclick={saveNewTerm} disabled={isSavingTerm} class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium transition disabled:opacity-50">{isSavingTerm ? 'Saving...' : 'Save Year'}</button>
            </div>
        </div>
    </div>
    {/if}
</div>

<style>
    .always-show-spinners::-webkit-inner-spin-button,
    .always-show-spinners::-webkit-outer-spin-button { opacity: 1; display: block; }
    .always-show-spinners { -moz-appearance: textfield; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
</style>