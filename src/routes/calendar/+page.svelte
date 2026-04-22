<script>
    import Sidebar from '$lib/components/Sidebar.svelte';
    import { rooms } from '$lib/store.js'; 
    import { supabase } from "$lib/supabaseClient";
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation'; // <-- NEW: Router imported
    
    let allTerms = $state([]);
    let availableYears = $state([]);
    let allCalendarEvents = $state([]); 

    let currentDate = $state(new Date());
    let currentMonth = $derived(currentDate.getMonth());
    let currentYear = $derived(currentDate.getFullYear());
    
    let selectedSchedule = $state("1"); 
    let selectedVenue = $state("All Venues");
    let exportStartDate = $state("");
    let exportEndDate = $state("");

    let shortcutYear = $state("");
    let shortcutSem = $state("1");
    let venueClasses = $state([]);
    let examVenueClasses = $state([]); 
    
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
    let newEventScheduleTarget = $state("All"); 
    let newEventStartTime = $state("");
    let newEventEndTime = $state("");
    let newEventEndDate = $state(""); 
    let isSavingEvent = $state(false);

    let showAgendaModal = $state(false);
    let agendaDateStr = $state("");
    let agendaItems = $state([]);
    let agendaIsFullDayOff = $state(false);
    let agendaHolidayEvent = $state(null); 
    
    let agendaIsExamDay = $state(false);
    let agendaExamEvent = $state(null);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const dayAliases = [['sun', 'su', 'sn', 'sunday'], ['mon', 'm', 'monday'], ['tues', 't', 'tue', 'tuesday'], ['wed', 'w', 'wednesday'], ['thurs', 'th', 'thu', 'thursday'], ['fri', 'f', 'friday'], ['sat', 's', 'sa', 'saturday']];
    const colorPalette = ['#E03D3D', '#E8782E', '#F6DA24', '#22C55E', '#2563EB', '#9E4AED', '#ED4ABF', '#6B7280'];

    const autoHolidays = [
        { m: 1, d: 1, title: "New Year's Day" },
        { m: 2, d: 25, title: "EDSA Revolution Anniversary" },
        { m: 4, d: 9, title: "Araw ng Kagitingan" },
        { m: 5, d: 1, title: "Labor Day" },
        { m: 6, d: 12, title: "Independence Day" },
        { m: 8, d: 21, title: "Ninoy Aquino Day" },
        { m: 11, d: 1, title: "All Saints' Day" },
        { m: 11, d: 30, title: "Bonifacio Day" },
        { m: 12, d: 8, title: "Feast of the Immaculate Conception" },
        { m: 12, d: 25, title: "Christmas Day" },
        { m: 12, d: 30, title: "Rizal Day" },
        { m: 12, d: 31, title: "Last Day of the Year" }
    ];

    let agendaColumns = $derived(selectedVenue === "All Venues" ? rooms.map(r => r.name) : [selectedVenue]);

    const times = Array.from({ length: 57 }, (_, i) => {
        const hour = Math.floor(i / 4) + 7;
        const hour_str = hour < 10 ? "0" + hour : hour.toString();
        const minutes = ["00", "15", "30", "45"][i % 4];
        return `${hour_str}:${minutes}`;
    });

    function parseTimeStr(timeStr) {
        if (!timeStr) return 0;
        const lower = String(timeStr).toLowerCase();
        const isPM = lower.includes('pm');
        const isAM = lower.includes('am');
        const clean = lower.replace(/[a-z\s]/g, '');
        let [h, m] = clean.split(':').map(Number);
        if (isNaN(h)) h = 0;
        if (isNaN(m)) m = 0;
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        return h * 60 + m;
    }

    function timeToGridString(timeStr) {
        if (!timeStr) return "";
        const mins = parseTimeStr(timeStr);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    function calculateRowspan(startTime, endTime) {
        const start = parseTimeStr(startTime);
        const end = parseTimeStr(endTime);
        const span = Math.round((end - start) / 15);
        return span > 0 ? span : 1; 
    }

    function displayTime(timeStr) {
        if (!timeStr) return "";
        if (String(timeStr).toLowerCase().includes('m')) return timeStr; 
        let [h, m] = String(timeStr).split(':').map(Number);
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${String(m || 0).padStart(2, '0')} ${ampm}`;
    }

    function getSubjectColor(course, classId) {
        if (!course || !classId) return '#6B7280';
        const uniqueStr = course + classId;
        let hash = 0;
        for (let i = 0; i < uniqueStr.length; i++) hash = uniqueStr.charCodeAt(i) + ((hash << 5) - hash);
        return colorPalette[Math.abs(hash) % colorPalette.length];
    }

    function isClassOnDay(classDaysStr, targetDayIndex) {
        if (!classDaysStr) return false;
        const tokens = classDaysStr.toLowerCase().split(/[\s,\-]+/);
        const aliases = dayAliases[targetDayIndex];
        return tokens.some(token => aliases.includes(token));
    }

    function formatSemName(sem) {
        if (sem === '1') return '1st Semester';
        if (sem === '2') return '2nd Semester';
        return 'Midyear';
    }

    function formatReadableDate(dateStr) {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function getStartingItem(time, room) {
        return agendaItems.find(s => !s.isCancelled && timeToGridString(s.start_time) === time && (s.venue === room || s.location === room || s.venue === null));
    }

    function getSpanningItem(time, room) {
        const startMins = parseTimeStr(time);
        return agendaItems.find(s => !s.isCancelled && s.start_time && s.end_time && (s.venue === room || s.location === room || s.venue === null) && parseTimeStr(s.start_time) < startMins && parseTimeStr(s.end_time) > startMins);
    }

    function openAgendaModal(fullDate, events, classes) {
        agendaDateStr = fullDate;
        let items = [];
        agendaIsFullDayOff = false;
        agendaHolidayEvent = null;
        agendaIsExamDay = false;
        agendaExamEvent = null;

        events.forEach(e => {
            if (e.type === 'holiday' || e.type === 'break') {
                agendaIsFullDayOff = true;
                agendaHolidayEvent = e; 
            } else if (e.type === 'exam') {
                agendaIsExamDay = true;
                agendaExamEvent = e;
            } else if (e.type !== 'cancellation') {
                items.push({ ...e, isClass: false });
            }
        });

        classes.forEach(c => items.push({ ...c, isClass: true }));
        agendaItems = items;
        showAgendaModal = true;
    }

    function refreshAgendaModal() {
        if (!showAgendaModal) return;
        const updatedDay = calendarDays.find(d => d.fullDate === agendaDateStr);
        if (updatedDay) {
            openAgendaModal(updatedDay.fullDate, updatedDay.dayEvents, updatedDay.projectedClasses);
        }
    }

    // NEW: Router function to jump to specific Data tab!
    function navigateToDataTab(examEvent) {
        if (!examEvent) return;
        const type = examEvent.title.includes('Midterm') ? 'Midterm' : 'Final';
        const targetUrl = `/data?mode=Exam&type=${type}&date=${examEvent.date}&ay=${examEvent.academic_year}&sem=${examEvent.semester}`;
        goto(targetUrl);
    }

    function downloadICS() {
        if (!exportStartDate || !exportEndDate) return alert("Please select a date range.");
        if (exportStartDate > exportEndDate) return alert("Start date must be before end date.");

        let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Iskedyul//Calendar Export//EN\n";
        
        let startParts = exportStartDate.split('-');
        let endParts = exportEndDate.split('-');
        let start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        let end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
        
        const formatDateICS = (dateObj, timeStr) => {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            if (!timeStr) return `${year}${month}${day}`;
            
            const mins = parseTimeStr(timeStr);
            const h = String(Math.floor(mins / 60)).padStart(2, '0');
            const m = String(mins % 60).padStart(2, '0');
            return `${year}${month}${day}T${h}${m}00`;
        };

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const dayOfWeek = d.getDay();
            
            let activeTerm = allTerms.find(t => dateStr >= t.start_date && dateStr <= t.end_date);
            
            const eventsForThisDay = allCalendarEvents.filter(e => {
                const matchesVenue = selectedVenue === "All Venues" || e.venue === null || e.venue === selectedVenue;
                const matchesSched = selectedSchedule === "All" || e.schedule === null || e.schedule === selectedSchedule;
                if (!matchesVenue || !matchesSched) return false;
                if (e.end_date) return dateStr >= e.date && dateStr <= e.end_date;
                return dateStr === e.date;
            });

            const autoHol = autoHolidays.find(h => h.m === d.getMonth() + 1 && h.d === d.getDate());
            if (autoHol) eventsForThisDay.push({ type: 'holiday', title: autoHol.title, venue: null, schedule: null });

            const isFullDayOff = eventsForThisDay.some(e => e.type === 'holiday' || e.type === 'break');
            const isExamDay = eventsForThisDay.some(e => e.type === 'exam');
            const cancellations = eventsForThisDay.filter(e => e.type === 'cancellation');
            
            const examEvent = eventsForThisDay.find(e => e.type === 'exam');
            if (!activeTerm && examEvent) activeTerm = { academic_year: examEvent.academic_year, semester: examEvent.semester };

            if (activeTerm && !isFullDayOff) {
                if (venueClasses.length > 0 && !isExamDay) {
                    let projected = venueClasses.filter(c => isClassOnDay(c.days, dayOfWeek) && c.academic_year === activeTerm.academic_year && c.semester === activeTerm.semester);
                    projected.forEach(c => {
                        const isCancelled = cancellations.some(cancelEvent => cancelEvent.title === `${c.course} ${c.class_id}` && (cancelEvent.venue === null || cancelEvent.venue === c.location));
                        if (!isCancelled) icsContent += `BEGIN:VEVENT\nSUMMARY:${c.course} ${c.class_id}\nLOCATION:${c.location}\nDTSTART;TZID=Asia/Manila:${formatDateICS(d, c.start_time)}\nDTEND;TZID=Asia/Manila:${formatDateICS(d, c.end_time)}\nEND:VEVENT\n`;
                    });
                }
                if (examVenueClasses.length > 0 && isExamDay) {
                    let dayExams = examVenueClasses.filter(e => e.date === dateStr && e.academic_year === activeTerm.academic_year && e.semester === activeTerm.semester);
                    dayExams.forEach(e => icsContent += `BEGIN:VEVENT\nSUMMARY:[EXAM] ${e.course} ${e.class_id}\nLOCATION:${e.location}\nDTSTART;TZID=Asia/Manila:${formatDateICS(d, e.start_time)}\nDTEND;TZID=Asia/Manila:${formatDateICS(d, e.end_time)}\nEND:VEVENT\n`);
                }
            }

            eventsForThisDay.filter(e => e.type !== 'cancellation').forEach(e => {
                icsContent += `BEGIN:VEVENT\nSUMMARY:${e.title}\n${e.venue ? `LOCATION:${e.venue}\n` : ''}${e.start_time && e.end_time ? `DTSTART;TZID=Asia/Manila:${formatDateICS(d, e.start_time)}\nDTEND;TZID=Asia/Manila:${formatDateICS(d, e.end_time)}\n` : `DTSTART;VALUE=DATE:${formatDateICS(d)}\n`}END:VEVENT\n`;
            });
        }
        icsContent += "END:VCALENDAR\n";
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `Iskedyul_${exportStartDate}_to_${exportEndDate}.ics`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        showExportPreviewModal = false;
    }

    $effect(() => {
        if (browser) {
            sessionStorage.setItem('cal_venue', selectedVenue);
            sessionStorage.setItem('cal_schedule', selectedSchedule);
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
        if (sessionStorage.getItem('cal_schedule')) selectedSchedule = sessionStorage.getItem('cal_schedule');
        const savedDate = sessionStorage.getItem('cal_date');
        if (savedDate) {
            const parsed = new Date(savedDate);
            if (!isNaN(parsed)) currentDate = parsed;
        }
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

    $effect(() => {
        const room = selectedVenue;
        const sched = selectedSchedule;
        fetchVenueClasses(room, sched);
    });

    async function fetchVenueClasses(room, sched) {
        let query = supabase.from('classes').select('*').eq('schedule', sched);
        if (room !== "All Venues") query = query.eq('location', room);
        const { data, error } = await query;
        if (error) console.error("Error fetching classes:", error);
        if (data) venueClasses = data;

        let examQuery = supabase.from('exam_schedules').select('*');
        if (room !== "All Venues") examQuery = examQuery.eq('location', room);
        const { data: eData } = await examQuery;
        if (eData) examVenueClasses = eData;
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
            showAgendaModal = false; 
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
        if (!error) { await fetchAllTerms(); if (s1Start) { const [y, m, d] = s1Start.split('-'); currentDate = new Date(y, m - 1, 1); } resetTermModal(); } else alert("Error saving terms.");
    }

    function openEventModal(e, date) {
        if (e) e.stopPropagation();
        selectedDateForEvent = date;
        newEventVenue = selectedVenue; 
        newEventType = "holiday";
        newEventTitle = "";
        newEventStartTime = "";
        newEventEndTime = "";
        newEventEndDate = ""; 
        newEventScheduleTarget = selectedSchedule; 
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
            schedule: newEventScheduleTarget === "All" ? null : newEventScheduleTarget,
            start_time: (newEventType !== 'holiday' && newEventType !== 'break' && newEventStartTime) ? newEventStartTime : null,
            end_time: (newEventType !== 'holiday' && newEventType !== 'break' && newEventEndTime) ? newEventEndTime : null
        };
        const { error } = await supabase.from('calendar_events').insert([eventData]);
        isSavingEvent = false;
        if (!error) { 
            showAddEventModal = false; 
            await fetchCalendarEvents(); 
            refreshAgendaModal(); 
        } else { alert("Failed to save event: " + error.message); }
    }

    async function cancelSpecificClass(e, cls) {
        if (e) e.stopPropagation();
        if (cls.isCancelled) return alert("This class is already cancelled for this day.");

        if (confirm(`Cancel ${cls.course} ${cls.class_id} for today? This will clear the schedule slot.`)) {
            const eventData = {
                academic_year: viewedTerm.academic_year,
                semester: viewedTerm.semester,
                date: agendaDateStr,
                type: 'cancellation',
                title: `${cls.course} ${cls.class_id}`, 
                venue: cls.location,
                schedule: selectedSchedule 
            };
            const { error } = await supabase.from('calendar_events').insert([eventData]);
            if (!error) {
                await fetchCalendarEvents();
                refreshAgendaModal(); 
            } else { alert("Failed to cancel class: " + error.message); }
        }
    }

    async function undoCancellation(e, cls) {
        if (e) e.stopPropagation();
        const cancelEvent = allCalendarEvents.find(ev => 
            ev.type === 'cancellation' && 
            ev.date === agendaDateStr && 
            ev.title === `${cls.course} ${cls.class_id}` &&
            (ev.venue === null || ev.venue === cls.location) &&
            (ev.schedule === null || ev.schedule === selectedSchedule)
        );

        if (cancelEvent) {
            const { error } = await supabase.from('calendar_events').delete().eq('id', cancelEvent.id);
            if (!error) {
                await fetchCalendarEvents();
                refreshAgendaModal(); 
            } else { alert("Failed to restore class."); }
        }
    }

    async function confirmDeleteEvent(e, event) {
        if (e) e.stopPropagation();
        if (event.type === 'exam') {
            alert("To safely delete an entire Exam Date, please use the Data Tab.");
            return;
        }
        if (confirm(`Are you sure you want to delete this event: "${event.title}"?`)) {
            const { error } = await supabase.from('calendar_events').delete().eq('id', event.id);
            if (!error) { 
                await fetchCalendarEvents(); 
                refreshAgendaModal(); 
            } else { alert("Failed to delete the event."); }
        }
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
                const matchesVenue = selectedVenue === "All Venues" || e.venue === null || e.venue === selectedVenue;
                const matchesSched = selectedSchedule === "All" || e.schedule === null || e.schedule === selectedSchedule;
                if (!matchesVenue || !matchesSched) return false;
                if (e.end_date) return dateStr >= e.date && dateStr <= e.end_date;
                return dateStr === e.date;
            });

            const autoHol = autoHolidays.find(h => h.m === month + 1 && h.d === i);
            if (autoHol) {
                eventsForThisDay.push({ id: `auto-${year}-${month}-${i}`, type: 'holiday', title: autoHol.title, venue: null, schedule: null, start_time: null, end_time: null, is_auto: true });
            }

            const isFullDayOff = eventsForThisDay.some(e => e.type === 'holiday' || e.type === 'break');
            const isExamDay = eventsForThisDay.some(e => e.type === 'exam'); 
            
            // NEW: Fix for "Wrong Date" out of bounds exams! 
            let activeTermForDay = allTerms.find(t => dateStr >= t.start_date && dateStr <= t.end_date);
            const examEvent = eventsForThisDay.find(e => e.type === 'exam');
            if (!activeTermForDay && examEvent) {
                activeTermForDay = { academic_year: examEvent.academic_year, semester: examEvent.semester };
            }
            
            const cancellations = eventsForThisDay.filter(e => e.type === 'cancellation');
            let dayClasses = [];
            
            if (activeTermForDay && !isFullDayOff) {
                
                if (venueClasses.length > 0 && !isExamDay) {
                    const targetDayIndex = new Date(year, month, i).getDay();
                    let projected = venueClasses.filter(c => 
                        isClassOnDay(c.days, targetDayIndex) &&
                        c.academic_year === activeTermForDay.academic_year &&
                        c.semester === activeTermForDay.semester
                    );
                    
                    dayClasses = projected.map(c => {
                        const isCancelled = cancellations.some(cancelEvent => cancelEvent.title === `${c.course} ${c.class_id}` && (cancelEvent.venue === null || cancelEvent.venue === c.location));
                        return { ...c, isCancelled };
                    });
                }

                if (examVenueClasses.length > 0 && isExamDay) {
                    let dayExams = examVenueClasses.filter(e => 
                        e.date === dateStr &&
                        e.academic_year === activeTermForDay.academic_year &&
                        e.semester === activeTermForDay.semester
                    ).map(e => ({ ...e, isCancelled: false, isExam: true })); 
                    
                    dayClasses = [...dayClasses, ...dayExams];
                }

                dayClasses.sort((a, b) => parseTimeStr(a.start_time) - parseTimeStr(b.start_time));
            }

            days.push({ 
                day: i, fullDate: dateStr, isHighlighted: highlighted, projectedClasses: dayClasses,
                dayEvents: eventsForThisDay.filter(e => e.type !== 'cancellation'), 
                startOfTerms: allTerms.filter(t => t.start_date === dateStr), endOfTerms: allTerms.filter(t => t.end_date === dateStr)
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
                    <button onclick={() => showExportPreviewModal = true} class="bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 py-2 px-4 rounded-lg font-medium shadow-sm transition flex items-center gap-2">
                        <i class="fa-solid fa-file-export"></i> Export .ics
                    </button>

                    <select bind:value={selectedSchedule} class="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="1">Schedule 1</option> <option value="2">Schedule 2</option> <option value="3">Schedule 3</option>
                    </select>

                    <select bind:value={selectedVenue} class="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="All Venues">All Venues</option>
                        {#each rooms as room} <option value={room.name}>{room.name}</option> {/each}
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
                            <option value="1">1st Semester</option> <option value="2">2nd Semester</option> <option value="Midyear">Midyear</option>
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
            </div>

            <div class="grid grid-cols-7 gap-4 mb-2">
                {#each daysOfWeek as day} <div class="text-center font-semibold text-gray-500 uppercase text-sm py-2">{day}</div> {/each}
            </div>

            <div class="grid grid-cols-7 gap-4 auto-rows-fr">
                {#each calendarDays as {day, fullDate, isHighlighted, projectedClasses, dayEvents, startOfTerms, endOfTerms}}
                    <div class="min-h-[120px] p-2 rounded-lg border transition-all duration-200 relative group
                               {day ? 'bg-white cursor-pointer hover:border-blue-500 hover:shadow-md' : 'bg-transparent border-transparent'}
                               {isHighlighted && day ? 'border-green-500 ring-2 ring-green-500 bg-green-50 shadow-md' : 'border-gray-200 shadow-sm'}
                               {dayEvents.some(e => e.type === 'holiday' || e.type === 'break') && !isHighlighted ? 'bg-red-50/50 border-red-200' : ''}"
                         onclick={() => day ? openAgendaModal(fullDate, dayEvents, projectedClasses) : null}>
                        
                        {#if day}
                            <div class="flex justify-between items-start">
                                <span class="text-sm font-medium {fullDate === new Date().toISOString().split('T')[0] ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}">
                                    {day}
                                </span>
                                <button onclick={(e) => openEventModal(e, fullDate)} class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1 cursor-pointer z-10 relative">
                                    <i class="fa-solid fa-plus"></i>
                                </button>
                            </div>

                            {#each startOfTerms as t} <div class="mt-1 text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 w-max"><i class="fa-solid fa-flag text-blue-500"></i> Start of {formatSemName(t.semester)}</div> {/each}
                            {#each endOfTerms as t} <div class="mt-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 w-max"><i class="fa-solid fa-flag-checkered text-red-500"></i> End of {formatSemName(t.semester)}</div> {/each}

                            <div class="mt-2 flex flex-col gap-1 overflow-y-auto max-h-[90px] custom-scrollbar">
                                {#each dayEvents as ev}
                                    <div class="relative w-full text-left p-1.5 rounded border shadow-sm {ev.type === 'holiday' || ev.type === 'break' ? 'bg-red-100 border-red-300 text-red-900' : ev.type === 'exam' ? 'bg-blue-100 border-blue-300 text-blue-900' : 'bg-yellow-50 border-yellow-300 text-yellow-900'} my-1 z-10 group/event">
                                        <div class="flex justify-between items-start">
                                            <div class="flex-1 min-w-0 pr-5">
                                                <div class="text-[8px] uppercase font-extrabold opacity-75 flex items-center gap-1 mb-0.5">
                                                    {#if ev.is_auto} <i class="fa-solid fa-lock text-red-400 mr-0.5"></i> {/if}
                                                    <i class="fa-solid {ev.type === 'holiday' ? 'fa-umbrella-beach' : ev.type === 'exam' ? 'fa-file-pen' : 'fa-star'}"></i> {ev.type}
                                                </div>
                                                <div class="text-[10px] font-bold leading-tight break-words">{ev.title}</div>
                                                {#if ev.start_time && ev.end_time} <div class="text-[9px] opacity-80 font-normal mt-0.5">{displayTime(ev.start_time)} - {displayTime(ev.end_time)}</div> {/if}
                                            </div>
                                        </div>
                                        {#if !ev.is_auto && ev.type !== 'exam'}
                                            <button onclick={(e) => confirmDeleteEvent(e, ev)} class="absolute top-1 right-1 opacity-0 group-hover/event:opacity-100 hover:bg-white/50 w-5 h-5 flex items-center justify-center rounded transition text-red-600" title="Delete Event">
                                                <i class="fa-solid fa-trash-can text-xs"></i>
                                            </button>
                                        {/if}
                                    </div>
                                {/each}

                                {#each projectedClasses as pClass}
                                    <div class="text-[10px] leading-tight p-1.5 rounded border shadow-sm transition-all {pClass.isCancelled ? 'bg-gray-100 border-gray-300 text-gray-400 line-through' : pClass.isExam ? 'bg-blue-600 border-blue-700 text-white hover:brightness-110' : pClass.type?.toLowerCase() === 'lec' ? 'bg-blue-50 border-blue-200 text-blue-800 hover:brightness-95' : 'bg-purple-50 border-purple-200 text-purple-800 hover:brightness-95'}">
                                        <div class="font-bold truncate">{pClass.course} {pClass.class_id}</div>
                                        <div class="{pClass.isExam ? 'text-blue-100' : 'text-gray-500'} mt-0.5 {pClass.isCancelled ? 'line-through' : ''}">{displayTime(pClass.start_time)} - {displayTime(pClass.end_time)}</div>
                                        {#if selectedVenue === "All Venues"}
                                            <div class="{pClass.isExam ? 'text-blue-200' : 'text-gray-400'} mt-0.5 truncate text-[8px] opacity-80 {pClass.isCancelled ? 'line-through' : ''}">{pClass.location}</div>
                                        {/if}
                                        {#if pClass.isCancelled} <div class="mt-1 text-[8px] font-bold text-red-600 uppercase bg-red-100 px-1 py-0.5 rounded w-max inline-block no-underline tracking-wider">Cancelled</div> {/if}
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>

    {#if showAgendaModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-2 lg:p-6">
        <div class="bg-white rounded-xl shadow-2xl w-[98vw] h-[98vh] flex flex-col animate-fade-in-up border border-gray-300">
            
            <div class="p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl flex justify-between items-start shrink-0">
                <div>
                    <h2 class="text-3xl font-bold text-gray-800">Daily Timetable</h2>
                    <p class="text-gray-500 font-medium text-xl mt-1">{formatReadableDate(agendaDateStr)}</p>
                    <div class="mt-3 flex gap-2">
                        <div class="inline-flex items-center bg-white border border-gray-200 px-3 py-1.5 rounded shadow-sm text-sm font-bold text-gray-700"> <i class="fa-solid fa-door-open mr-2 text-gray-400"></i> {selectedVenue} </div>
                        <div class="inline-flex items-center bg-green-50 border border-green-200 px-3 py-1.5 rounded shadow-sm text-sm font-bold text-green-700"> <i class="fa-solid fa-calendar-check mr-2 text-green-500"></i> Schedule {selectedSchedule} </div>
                        
                        {#if !agendaIsExamDay}
                        <button onclick={(e) => openEventModal(e, agendaDateStr)} class="ml-2 inline-flex items-center bg-blue-50 border border-blue-200 px-4 py-1.5 rounded shadow-sm text-sm font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer">
                            <i class="fa-solid fa-plus mr-2 text-blue-500"></i> Add Event
                        </button>
                        {/if}
                    </div>
                </div>
                <button onclick={() => showAgendaModal = false} class="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 w-12 h-12 rounded-lg flex items-center justify-center transition shadow-sm">
                    <i class="fa-solid fa-xmark text-2xl"></i>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-0 relative bg-white custom-scrollbar flex flex-col">
                {#if agendaIsFullDayOff && agendaHolidayEvent}
                    <div class="m-6 p-5 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-900 flex justify-between items-start gap-4 shadow-sm shrink-0 group/suspend">
                        <div class="flex items-start gap-4">
                            <i class="fa-solid {agendaHolidayEvent.type === 'break' ? 'fa-mug-hot' : 'fa-umbrella-beach'} text-2xl mt-1 text-red-400"></i>
                            <div> <div class="font-bold text-lg tracking-tight">Classes Suspended</div> <div class="text-sm mt-1 opacity-90">{agendaHolidayEvent.title} is currently active. The grid below is suspended for today.</div> </div>
                        </div>
                        {#if !agendaHolidayEvent.is_auto}
                            <button onclick={(e) => confirmDeleteEvent(e, agendaHolidayEvent)} class="text-red-400 hover:text-red-700 bg-white/50 hover:bg-white border border-red-100 px-3 py-1.5 rounded transition font-bold text-sm shadow-sm flex items-center gap-2"> <i class="fa-solid fa-trash-can"></i> Delete Event </button>
                        {/if}
                    </div>
                {/if}

                {#if agendaIsExamDay && agendaExamEvent}
                    <div class="m-6 p-5 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg text-blue-900 flex justify-between items-center gap-4 shadow-sm shrink-0">
                        <div class="flex items-start gap-4">
                            <i class="fa-solid fa-file-pen text-2xl mt-1 text-blue-400"></i>
                            <div> 
                                <div class="font-bold text-lg tracking-tight">{agendaExamEvent.title} Active</div> 
                                <div class="text-sm mt-1 opacity-90">Regular classes are suspended. Only scheduled exams are shown on the grid below.</div> 
                            </div>
                        </div>
                        <button onclick={() => navigateToDataTab(agendaExamEvent)} class="text-sm font-bold text-blue-600 bg-white hover:bg-blue-100 px-4 py-2 rounded-lg border border-blue-300 shadow-sm transition flex items-center gap-2 cursor-pointer">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Manage in Data Tab
                        </button>
                    </div>
                {/if}

                {#if agendaItems.filter(i => !i.isClass && (!i.start_time || !i.end_time)).length > 0}
                    <div class="mx-6 mt-6 flex flex-wrap gap-2 shrink-0">
                        {#each agendaItems.filter(i => !i.isClass && (!i.start_time || !i.end_time) && i.type !== 'exam') as ev}
                            <div class="bg-yellow-100 text-yellow-800 border border-yellow-300 px-4 py-2 rounded text-sm font-bold shadow-sm flex items-center gap-3 group/bannerevent">
                                <span> {#if ev.is_auto} <i class="fa-solid fa-lock text-yellow-600 mr-1.5"></i> {/if} <i class="fa-solid fa-star"></i> {ev.title} (All Day) </span>
                                {#if !ev.is_auto} <button onclick={(e) => confirmDeleteEvent(e, ev)} class="text-yellow-600 hover:text-red-600 opacity-50 group-hover/bannerevent:opacity-100 transition"> <i class="fa-solid fa-trash-can"></i> </button> {/if}
                            </div>
                        {/each}
                    </div>
                {/if}

                <div class="overflow-x-auto w-full p-6 flex-1">
                    <table class="venue-table w-full border-collapse" style="table-layout: fixed;">
                        <thead>
                            <tr>
                                <th class="w-20 sticky left-0 bg-white z-20 border-b border-gray-200"></th>
                                {#each agendaColumns as col} <th class="px-2 py-4 text-gray-700 font-bold text-center border-b border-gray-200 min-w-[280px]">{col}</th> {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each times as time}
                                <tr>
                                    <td class="text-xs font-medium text-gray-400 text-right pr-3 border-r border-gray-200 align-top h-12 sticky left-0 bg-white z-10 pt-2"> {#if time.endsWith('00')} {time} {/if} </td>
                                    {#each agendaColumns as room}
                                        {@const startingItem = getStartingItem(time, room)}
                                        {#if startingItem}
                                            <td class="p-0 relative align-top" rowspan={calculateRowspan(startingItem.start_time, startingItem.end_time)}>
                                                <div class="absolute top-1 bottom-1 left-1 right-1 rounded-lg shadow-md p-3 flex flex-col justify-between text-white border border-black/10 group overflow-y-auto custom-scrollbar"
                                                     style="{startingItem.isExam ? 'background-color: #2563EB; color: white; border-color: #1D4ED8;' : `background-color: ${startingItem.isClass ? getSubjectColor(startingItem.course, startingItem.class_id) : '#F6C000'}; color: ${startingItem.isClass ? 'white' : '#713F12'}; border-color: ${startingItem.isClass ? 'rgba(0,0,0,0.1)' : '#FDE047'};`}">
                                                    
                                                    <div>
                                                        <div class="font-bold text-lg leading-tight drop-shadow-sm"> {startingItem.isClass ? `${startingItem.course} ${startingItem.class_id}` : startingItem.title} </div>
                                                        <div class="text-sm font-medium opacity-90 mt-1 drop-shadow-sm"> {displayTime(startingItem.start_time)} - {displayTime(startingItem.end_time)} </div>
                                                        <div class="text-sm opacity-90 mt-1 drop-shadow-sm font-semibold"> {startingItem.isClass ? startingItem.instructor : startingItem.type.toUpperCase()} </div>
                                                    </div>

                                                    <div class="mt-3 text-right">
                                                        {#if startingItem.isExam}
                                                            {:else if startingItem.isClass && !agendaIsFullDayOff}
                                                            <button onclick={(e) => cancelSpecificClass(e, startingItem)} class="bg-black/20 hover:bg-red-500 hover:text-white text-white px-3 py-1.5 rounded font-bold text-xs transition-colors backdrop-blur-sm shadow-sm"> <i class="fa-solid fa-ban"></i> Cancel Class </button>
                                                        {:else if !startingItem.isClass && !startingItem.is_auto}
                                                            <button onclick={(e) => confirmDeleteEvent(e, startingItem)} class="bg-yellow-900/10 hover:bg-red-500 hover:text-white text-yellow-900 px-3 py-1.5 rounded font-bold text-xs transition-colors shadow-sm border border-yellow-900/20"> <i class="fa-solid fa-trash-can"></i> Delete Event </button>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </td>
                                        {:else if !getSpanningItem(time, room)}
                                            <td class="border-b border-gray-100 border-dashed border-r border-gray-200"></td>
                                        {/if}
                                    {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl shrink-0">
                <h3 class="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wider"><i class="fa-solid fa-clipboard-list mr-1"></i> Remarks / Cancelled Classes</h3>
                
                {#if agendaItems.filter(i => i.isCancelled && i.isClass).length === 0}
                    <p class="text-sm text-gray-500 italic">No classes have been cancelled for today.</p>
                {:else}
                    <div class="flex flex-wrap gap-3">
                        {#each agendaItems.filter(i => i.isCancelled && i.isClass) as c}
                            <div class="bg-red-50 text-red-800 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-4 shadow-sm">
                                <span><i class="fa-solid fa-ban text-red-500 mr-1.5"></i> {c.course} {c.class_id} ({displayTime(c.start_time)} - {displayTime(c.end_time)}) - {c.location}</span>
                                <div class="w-px h-5 bg-red-200"></div>
                                <button onclick={(e) => undoCancellation(e, c)} class="text-red-500 hover:text-red-700 transition" title="Restore Class to Grid"> <i class="fa-solid fa-rotate-left"></i> Undo </button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

        </div>
    </div>
    {/if}

    {#if showAddEventModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center z-[100]">
        <div class="bg-white rounded-lg p-6 w-[500px] shadow-xl">
            <h2 class="text-xl font-bold mb-4">Add Event / Exception</h2>
            <div class="mb-4 bg-gray-50 p-3 rounded border border-gray-200 flex justify-between items-center">
                <p class="text-sm text-gray-600">Date: <span class="font-bold text-gray-900">{selectedDateForEvent}</span></p>
                {#if viewedTerm} <p class="text-sm text-gray-600">Term: <span class="font-bold text-gray-900">{viewedTerm.academic_year} ({formatSemName(viewedTerm.semester)})</span></p> {/if}
            </div>
            <form onsubmit={(e) => { e.preventDefault(); saveEvent(); }}>
                <div class="flex flex-col gap-4 mb-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Apply to Schedule Draft:</label>
                        <select bind:value={newEventScheduleTarget} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none bg-green-50 font-medium"> <option value="All">All Schedules (Global Event)</option> <option value="1">Schedule 1 Only</option> <option value="2">Schedule 2 Only</option> <option value="3">Schedule 3 Only</option> </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Type of Event</label>
                            <select bind:value={newEventType} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none"> <option value="holiday">Holiday</option> <option value="break">Break</option> <option value="other">Others</option> </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Affected Venue</label>
                            <select bind:value={newEventVenue} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none"> <option value="All Venues">All Venues</option> {#each rooms as room} <option value={room.name}>{room.name}</option> {/each} </select>
                        </div>
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
                    {#if newEventType !== 'holiday' && newEventType !== 'break'}
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Start Time (Optional)</label>
                            <select bind:value={newEventStartTime} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none"> <option value="07:00"> 7:00 AM </option> <option value="07:30"> 7:30 AM </option> <option value="08:00"> 8:00 AM </option> <option value="08:30"> 8:30 AM </option> <option value="09:00"> 9:00 AM </option> <option value="09:30"> 9:30 AM </option> <option value="10:00"> 10:00 AM </option> <option value="10:30"> 10:30 AM </option> <option value="11:00"> 11:00 AM </option> <option value="11:30"> 11:30 AM </option> <option value="12:00"> 12:00 PM </option> <option value="12:30"> 12:30 PM </option> <option value="13:00"> 1:00 PM </option> <option value="13:30"> 1:30 PM </option> <option value="14:00"> 2:00 PM </option> <option value="14:30"> 2:30 PM </option> <option value="15:00"> 3:00 PM </option> <option value="15:30"> 3:30 PM </option> <option value="16:00"> 4:00 PM </option> <option value="16:30"> 4:30 PM </option> <option value="17:00"> 5:00 PM </option> <option value="17:30"> 5:30 PM </option> <option value="18:00"> 6:00 PM </option> <option value="18:30"> 6:30 PM </option> <option value="19:00"> 7:00 PM </option> </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">End Time (Optional)</label>
                            <select bind:value={newEventEndTime} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none"> <option value="07:30"> 7:30 AM </option> <option value="08:00"> 8:00 AM </option> <option value="08:30"> 8:30 AM </option> <option value="09:00"> 9:00 AM </option> <option value="09:30"> 9:30 AM </option> <option value="10:00"> 10:00 AM </option> <option value="10:30"> 10:30 AM </option> <option value="11:00"> 11:00 AM </option> <option value="11:30"> 11:30 AM </option> <option value="12:00"> 12:00 PM </option> <option value="12:30"> 12:30 PM </option> <option value="13:00"> 1:00 PM </option> <option value="13:30"> 1:30 PM </option> <option value="14:00"> 2:00 PM </option> <option value="14:30"> 2:30 PM </option> <option value="15:00"> 3:00 PM </option> <option value="15:30"> 3:30 PM </option> <option value="16:00"> 4:00 PM </option> <option value="16:30"> 4:30 PM </option> <option value="17:00"> 5:00 PM </option> <option value="17:30"> 5:30 PM </option> <option value="18:00"> 6:00 PM </option> <option value="18:30"> 6:30 PM </option> <option value="19:00"> 7:00 PM </option> <option value="19:30"> 7:30 PM </option> <option value="20:00"> 8:00 PM </option> </select>
                        </div>
                    </div>
                    {/if}
                </div>
                <div class="flex justify-end gap-2">
                    <button type="button" onclick={() => showAddEventModal = false} class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition">Cancel</button>
                    <button type="submit" disabled={isSavingEvent} class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium transition disabled:opacity-50"> {isSavingEvent ? 'Saving...' : 'Save Event'} </button>
                </div>
            </form>
        </div>
    </div>
    {/if}

    {#if showAddTermModal}
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center z-[100]">
            <div class="bg-white rounded-lg p-6 w-[500px] shadow-xl">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Add Academic Year</h3>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                    <input type="text" bind:value={newTermYear} placeholder="e.g. 2026-2027" class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none">
                </div>

                <div class="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
                    <h4 class="font-bold text-gray-700 text-sm mb-2">1st Semester</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                            <input type="date" bind:value={s1Start} class="w-full border border-gray-300 rounded p-1.5 focus:ring-green-500 focus:outline-none text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                            <input type="date" bind:value={s1End} class="w-full border border-gray-300 rounded p-1.5 focus:ring-green-500 focus:outline-none text-sm">
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
                    <h4 class="font-bold text-gray-700 text-sm mb-2">2nd Semester</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                            <input type="date" bind:value={s2Start} class="w-full border border-gray-300 rounded p-1.5 focus:ring-green-500 focus:outline-none text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                            <input type="date" bind:value={s2End} class="w-full border border-gray-300 rounded p-1.5 focus:ring-green-500 focus:outline-none text-sm">
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 p-4 rounded border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-700 text-sm mb-2">Midyear</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                            <input type="date" bind:value={mStart} class="w-full border border-gray-300 rounded p-1.5 focus:ring-green-500 focus:outline-none text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                            <input type="date" bind:value={mEnd} class="w-full border border-gray-300 rounded p-1.5 focus:ring-green-500 focus:outline-none text-sm">
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2">
                    <button class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold" onclick={resetTermModal}>Cancel</button>
                    <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm" onclick={saveNewTerm} disabled={isSavingTerm}>
                        {isSavingTerm ? 'Saving...' : 'Save Academic Year'}
                    </button>
                </div>
            </div>
        </div>
    {/if}

    {#if showExportPreviewModal}
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center z-[100]">
            <div class="bg-white rounded-lg p-6 w-[500px] shadow-xl">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Export Calendar (.ics)</h3>
                <p class="text-sm text-gray-600 mb-4">Select the date range to export events and active classes for the currently selected schedule and venue.</p>
                
                <div class="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                            <input type="date" bind:value={exportStartDate} class="w-full border border-gray-300 rounded p-1.5 focus:ring-blue-500 focus:outline-none text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                            <input type="date" bind:value={exportEndDate} class="w-full border border-gray-300 rounded p-1.5 focus:ring-blue-500 focus:outline-none text-sm">
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2">
                    <button class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold" onclick={() => { showExportPreviewModal = false; exportStartDate = ''; exportEndDate = ''; }}>Cancel</button>
                    <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm" onclick={downloadICS}>
                        Download .ics
                    </button>
                </div>
            </div>
        </div>
    {/if}

</div>

<style>
    .always-show-spinners { -moz-appearance: textfield; appearance: textfield; }
    .always-show-spinners::-webkit-inner-spin-button, .always-show-spinners::-webkit-outer-spin-button { opacity: 1; display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .animate-fade-in-up { animation: fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

