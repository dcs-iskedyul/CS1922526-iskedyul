<script>
	// @fix: conflict-logic - Imported missing supabase client for CSV Insertion
	import { supabase } from '$lib/supabaseClient.js';

	import Sidebar from './Sidebar.svelte';
	import apiClient from '$lib/apiClient';
	import { Toaster, toast } from 'svelte-sonner';

	// @: Archive Module - Imported academicYears for filtering by academic year
	import { subject_info, schedules, rooms, storeClasses, obligationClasses, semesters, labSubjects, instructors as instructorsStore } from '$lib/store.js';
	import DropdownButton from './DropdownButton.svelte';
	import UploadDropdownButton from './UploadDropdownButton.svelte';
	import { clickOutside } from "svelte-outside";
	import { tapOutside } from "svelte-outside";

	// for incomplete adding class
	import {Notifications, acts} from '@tadashi/svelte-notification'

	///for the edit class stuff
	import { onMount, onDestroy } from 'svelte';

	import Papa from 'papaparse';
	import Classes from './Classes.svelte';
	import SortAndFilterDropdownButton from './SortAndFilterDropdownButton.svelte';
    import { browser } from '$app/environment';

	let academicYears = $state([]); // @: Archive Module - Reactive variable for academic years
	let newAcademicYearInput = $state(""); // @: Archive Module - Reactive variable for new academic year input
	let selectedAcademicYear = $state(""); // @: Archive Module - State Variable for Academic Year

    // --- NEW EXAM STATE ---
    let viewMode = $state('Schedule'); // 'Schedule' or 'Exam'
    let selectedExamType = $state('Midterm');
    let selectedExamDate = $state('');
    let examDates = $state([]);
    let showAddExamDateModal = $state(false);
    let newExamDateInput = $state('');
    
    let showEditExamDateModal = $state(false);
    let editExamDateInput = $state('');

    let eligibleExamClasses = $state([]);
    let selectedEligibleClass = $state("");

	// // @: Archive Module - Fetch Academic Years from Supabase
	// onMount(async () => {
	// 	await fetchAcademicYears();
	// });

	// @: Archive Module - Academic Years functions
	async function fetchAcademicYears() {
		const { data, error } = await supabase
			.from('academic_terms')
			.select('academic_year');

		if (error) {
			console.error('Error fetching academic years:', error);
			return;
		}

		if (data && data.length > 0) {
            // Extract unique years and sort
			academicYears = [...new Set(data.map(item => item.academic_year))].sort((a, b) => {
				const yearA = parseInt(a.split('-')[0]);
				const yearB = parseInt(b.split('-')[0]);
				return yearA - yearB;
			});

			if (selectedAcademicYear === "" && academicYears.length > 0) {
				const savedYear = sessionStorage.getItem('data_ay') || localStorage.getItem('iskedyul_saved_academic_year');
				if (savedYear && academicYears.includes(savedYear)) {
					selectedAcademicYear = savedYear;
				} else {
					selectedAcademicYear = academicYears[academicYears.length - 1];
				}
				recomputeDemandAnalysis();
                fetchExamDates(); // Load exam dates for the term
			}
		}
	}

    // --- NEW: Fetch dynamically created Exam Dates ---
    async function fetchExamDates() {
        if (!selectedAcademicYear || !selectedSemester) return;
        
        // Fetch from Exam table AND Calendar Events to ensure no orphans!
        const { data: schedData } = await supabase
            .from('exam_schedules').select('date')
            .eq('academic_year', selectedAcademicYear).eq('semester', selectedSemester).eq('type', selectedExamType);
            
        const { data: calData } = await supabase
            .from('calendar_events').select('date')
            .eq('academic_year', selectedAcademicYear).eq('semester', selectedSemester).eq('type', 'exam').ilike('title', `${selectedExamType}%`);

        let dates = new Set();
        if (schedData) schedData.forEach(d => dates.add(d.date));
        if (calData) calData.forEach(d => dates.add(d.date));

        examDates = [...dates].sort();

        // Only auto-select the first date if we haven't restored one from memory!
        if (examDates.length > 0 && !examDates.includes(selectedExamDate)) {
            selectedExamDate = examDates[0];
        } else if (examDates.length === 0) {
            selectedExamDate = '';
        }
    }

    // --- NEW: Fetch currently scheduled classes for Exam Dropdown ---
    async function fetchEligibleClasses() {
        const { data, error } = await supabase
            .from('classes')
            .select('course, class_id, schedule, instructor')
            .eq('academic_year', selectedAcademicYear)
            .eq('semester', selectedSemester)
            .order('course')
            .order('class_id');
        if (data) {
            eligibleExamClasses = data;
        }
    }

	async function addNewAcademicYear() {
		const newYear = newAcademicYearInput.trim();
		if (!newYear) return;

		// Format Validation
		const yearPattern = /^\d+-\d+$/;
		if (!yearPattern.test(newYear)) {
			toast.error("Invalid format! Please use numbers like 2026-2027");
			return;
		}

		// Logic Validation
		const [startYear, endYear] = newYear.split('-').map(Number);
		if (startYear + 1 !== endYear) {
			toast.error("Invalid A.Y.! The second year must be exactly 1 year after the first (e.g., 2026-2027).");
			return;
		}

		const { error } = await supabase
			.from('academic_years')
			.insert([{ year: newYear }]);
		
		if (error) {
			console.error('Error adding academic year:', error);
			toast.error('Failed to add A.Y. ' + newYear + '. It might already exist!');
			return;
		}

		newAcademicYearInput = "";
		await fetchAcademicYears();

		toast.success('Academic Year ' + newYear + ' added successfully!');

		selectedAcademicYear = newYear;

		currentAnalysis = [];
		demandData[selectedSchedule] = {rawDemand: [], analysis: {}};
		hasUploadedDemandFile[selectedSchedule] = false;
		recomputeDemandAnalysis();
        fetchExamDates();
		update = !update;
	}

	// Declared reactive state array to prevent undefined error in UI dropdowns
	let instructors = $state([]); // @fix: conflict-logic

	//-----------------Fetch Instructor---------------
		async function fetchInitialInstructors() {
			try {
				console.log("Data.svelte: Fetching initial instructors");
				const data = await apiClient.getInstructors();
				instructorsStore.set(data);
			} catch (error) {
				console.error("Error fetching initial instructors:", error);
				toast.error("Failed to load instructors list.");
			}
		}

	//------------------Sort and Filtering func ------------------

	let sortCategory = "";
	let filterCategories = [];

	//this just updates the selected sort and filter parameters passed to Classes.svelte
	//the actual sorting and filtering takes place in Classes.svelte
	function handleSort(newSortCategory, newFilterCategories){
		sortCategory = newSortCategory;
		filterCategories = newFilterCategories;
		update = !update;
		
	}

	// gets the storeClasses object from store.js which is updated in Classes.svelte.
	// this allows Data.svelte to know if the classes were edited/deleted, and hence demand must be recomputed for the Quick Numbers
	let classesValue = $state();

	const unsubscribe = (storeClasses.subscribe((value) => {
		classesValue = value;
		}))

	onDestroy(unsubscribe);

	// onDestroy(unsubscribe) gets the data from storeClasses everytime Classes.svelte does any change to the classes (edit/delete)

	// Important for updating the entire page. Update variable is frequently flipped (i.e. update = !update) to activate the various keys to update the page.
	let update = $state(false);

	// boolean to know if modal should be shown.
	let showModal = $state(false);

	// boolean to know if "Are you sure to delete" modal should be shown.
	let showDeleteModal = $state(false);

	// acts similar to update but just for the modal. Svelte will not update the page unless a key has been changed, hence modalUpdate is that key.
	let modalUpdate = $state(false);

	// acts similar to update but just for the delete modal. Svelte will not update the page unless a key has been changed, hence modalUpdate is that key.
	let modalDeleteUpdate = $state(false);

	// Uploading CSVs is implemented here, hence to save the list of classes in those CSVs, we store them here in a classes array.
	let uploadedClasses = $state([]);
	// Initialized missing reactive array used by CSV parser and Data insertion functions to prevent mapping errors
	let classes = $state([]); // @fix: conflict-logic

	// Shows which schedule and semester is selected to show their corresponding classes and obligations.
	let selectedSchedule = $state("1")

	let selectedSemester = $state("1")

	// Helps determine if a file of classes has been uploaded and is ready to be saved, replaced or etc.
	let hasUploadedFile = $state(false);

	// Shows which format was selected to determine how the code should parse the CSV (in CRS or Faculty Loading format)
	let selectedFormat = $state("faculty");

	let fileInputRef;

	let obligations = $state([])

	let searchValue = $state("")
	let searchSection = $state("")
	let searchCourse = $state("")

	// Shows the corresponding demands and analysis per each schedule.
	// Renamed from demandDataState to demandData to match the variable name across the HTML template
	let demandData = $state({	// @fix: conflict-logic
		"1": { rawDemand: [], analysis: {} },
		"2": { rawDemand: [], analysis: {} },
		"3": { rawDemand: [], analysis: {} }
	});

	// a converted analysis from demandData to an array as it is hard to do a #each in the HTML part for an object variable like analysis is in demandData
	let currentAnalysis = $state([])

	// checks if a demand file has been uploaded to either schedule
	let hasUploadedDemandFile = $state({
		"1": false,
		"2": false,
		"3": false
	});

	let parsedDemandFromCsv = $state([]);

	function openFileUpload() {
		fileInputRef.click();
	}

    // --- NEW VIEW MODE TOGGLES ---
    async function setScheduleView(sched) {
        viewMode = 'Schedule';
        selectedSchedule = sched;
        update = !update;
    }

    async function setExamView(type) {
        viewMode = 'Exam';
        selectedExamType = type;
        await fetchExamDates();
        update = !update;
    }

    // --- NEW: Add Exam Date pushes to Calendar! ---
    async function addExamDate() {
        if (!newExamDateInput) return;
        if (examDates.includes(newExamDateInput)) { toast.error("This date already exists!"); return; }

        // Push the event to the Calendar!
        const eventData = {
            academic_year: selectedAcademicYear,
            semester: selectedSemester,
            date: newExamDateInput,
            type: 'exam',
            title: `${selectedExamType} Exams`,
            venue: null,
            schedule: null
        };
        await supabase.from('calendar_events').insert([eventData]);

        examDates = [...examDates, newExamDateInput].sort();
        selectedExamDate = newExamDateInput;
        showAddExamDateModal = false;
        newExamDateInput = '';
        update = !update;

        toast.success(`Date added! ${selectedExamType} banner injected into Calendar.`);
    }

    // --- NEW: Edit Date Function ---
    function openEditDateModal() {
        editExamDateInput = selectedExamDate;
        showEditExamDateModal = true;
    }

    async function editExamDate() {
        if (!editExamDateInput || editExamDateInput === selectedExamDate) { showEditExamDateModal = false; return; }
        if (examDates.includes(editExamDateInput)) { toast.error("This date already exists in the exam schedule!"); return; }

        const { error: calErr } = await supabase.from('calendar_events').update({ date: editExamDateInput }).eq('date', selectedExamDate).eq('type', 'exam').eq('academic_year', selectedAcademicYear).eq('semester', selectedSemester).ilike('title', `${selectedExamType}%`);
        if (calErr) { toast.error("Error updating calendar."); return; }

        const { error: schedErr } = await supabase.from('exam_schedules').update({ date: editExamDateInput }).eq('date', selectedExamDate).eq('type', selectedExamType).eq('academic_year', selectedAcademicYear).eq('semester', selectedSemester);
        if (schedErr) { toast.error("Error updating exams."); return; }

        toast.success("Exam date successfully moved!");
        selectedExamDate = editExamDateInput;
        showEditExamDateModal = false;
        await fetchExamDates();
        update = !update;
    }

    // --- NEW: Delete Exam Date logic ---
    async function deleteExamDate() {
        if (!selectedExamDate) return;
        if (!confirm(`Are you sure you want to delete the date ${formatReadableDate(selectedExamDate)}? This will safely remove ALL exams scheduled on this day.`)) return;
        
        // Delete from calendar banner
        await supabase.from('calendar_events').delete().eq('date', selectedExamDate).eq('type', 'exam').eq('academic_year', selectedAcademicYear).eq('semester', selectedSemester).ilike('title', `${selectedExamType}%`);
        
        // Delete actual scheduled blocks on this day
        await supabase.from('exam_schedules').delete().eq('date', selectedExamDate).eq('type', selectedExamType).eq('academic_year', selectedAcademicYear).eq('semester', selectedSemester);

        toast.success("Exam date and all associated exams securely deleted.");
        
        selectedExamDate = '';
        await fetchExamDates();
        update = !update;
    }

    function formatReadableDate(dateStr) {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }

	function haveCommonItems(str1, str2) {
		var arr1 = str1.split(',');
		var arr2 = str2.split(',');
		const set1 = new Set(arr1);
		const commonItems = arr2.filter((item) => set1.has(item));
		return [commonItems, commonItems.length > 0];
	}

	// Function to download CSV in Faculty Loading Format
	async function downloadCSV() {
        const targetTable = viewMode === 'Exam' ? 'exam_schedules' : 'classes';
        
        let query = supabase.from(targetTable).select('*').eq("semester", selectedSemester).eq("academic_year", selectedAcademicYear);

        if (viewMode === 'Exam') {
            query = query.eq('type', selectedExamType).eq('date', selectedExamDate);
        } else {
            query = query.eq('schedule', selectedSchedule);
        }

		// Step 1: Fetch data from Supabase
		let { data, error } = await query;

		if (error) {
			console.error('Error fetching data:', error);
			return;
		}

		// Step 2: Convert to CSV format
        let headers, csvRows;

        if (viewMode === 'Exam') {
            headers = ['Course', 'Type', 'Section', 'Date', 'Time', 'Room', 'Instructor'];
            csvRows = [
                headers.join(','),
                ...data.map(row => [
                    `"${row.course || ''}"`, `"${row.type || ''}"`, `"${row.class_id || ''}"`, `"${row.date || ''}"`,
                    `="${row.start_time && row.end_time ? formatTime(row.start_time).slice(0,-2) + '-' + formatTime(row.end_time).slice(0,-2) : ''}"`,
                    `"${row.location || ''}"`, `"${row.instructor || ''}"`
                ].join(','))
            ];
        } else {
            headers = ['Course', 'Type', 'Section', 'Day', 'Time','Room', 'Instructor', 'Load', 'Remarks'];
            csvRows = [
            headers.join(','), // CSV header
            ...data.map(row => [
                `"${row.course || ''}"`,
                `"${row.type || ''}"`,
                `"${row.class_id || ''}"`,  // Renamed to 'section'
                `"${formatDays(row.days)}"`,
                `="${row.start_time && row.end_time ? formatTime(row.start_time).slice(0,-2) + '-' + formatTime(row.end_time).slice(0,-2) : ''}"`, // Merged 'time' column
                `"${formatRooms(row.location) || ''}"`,
                `"${row.instructor || ''}"`,
                `""`,
                `""`
            ].join(','))
        ];
        }

		const csvContent = csvRows.join('\n');

		// Step 3: Create a downloadable file
		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = viewMode === 'Exam' ? `${selectedExamType}_Exams_${selectedExamDate}.csv` : `classes_draft_${selectedSchedule}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Function to convert days format
	function formatDays(days) {
		if (!days) return '';
		return days
			.replace(/Mon/g, 'M')
			.replace(/Tues/g, 'T')
			.replace(/Wed/g, 'W')
			.replace(/Thurs/g, 'Th')
			.replace(/Fri/g, 'F')
			.replace(/Sat/g, 'S')
			.replace(/,/g, '');
	}

	// Function to convert time to 12-hour format
	function formatTime(time) {
		if (!time) return '';
		let [hour, minute] = time.split(':').map(Number);
		let period = hour >= 12 ? 'PM' : 'AM';
		hour = hour % 12 || 12; // Convert 0 to 12 for AM
		return `${hour}${minute === 0 ? '' : `:${minute}`}${period}`;
	}

	//function to return room names for faculty loading
	function formatRooms(str) {
		switch(str){
			case "AECH-Accenture Rm":
				return "Accenture"
			case "AECH-ERDT Rm":
				return "ERDT"
			case "AECH-CLR1":
				return "CLR1"
			case "AECH-CLR2":
				return "CLR2"
			case "AECH-CLR3":
				return "CLR3"
			case "AECH-CLR4":
				return "CLR4"
			case "AECH-TL1":
				return "TL1"
			case "AECH-TL2":
				return "TL2"
			case "AECH-TL3":
				return "TL3"
			case "AECH-Seminar Room":
				return "Seminar Room"
			default:
				return str
		}
	}

    // --- NEW: Exam CSV Uploader & Parser ---
    async function handleExamUpload(event) {
        const file = event.target.files[0];
        if (!file) { hasUploadedFile = false; classes = []; return; }
        hasUploadedFile = true;
        
        Papa.parse(file, {
            header: true, delimiter: ',', skipEmptyLines: true, transformHeader: h => h.trim(),
            complete: function(results) {
                const transformedData = results.data
                    .filter(row => row.Course && row.Section && row.Date)
                    .map(row => {
                        let { start_time, end_time } = parseTimeRangeFromFacultyFormat(row.Time);
                        let matchedRoom = findMatchingRoom(row.Room);
                        let fullInstructorName = findInstructorFullName(row.Instructor);
                        
                        return { course: row.Course, type: row.Type || selectedExamType, class_id: row.Section, instructor: fullInstructorName, start_time: start_time, end_time: end_time, location: matchedRoom, date: row.Date, size: getVenueCapacity(matchedRoom), academic_year: selectedAcademicYear, semester: selectedSemester };
                    });
                
                classes = transformedData;
                console.log("Transformed Exam CSV data:", classes);
            }
        });
    }

	async function insertData() {
		if (!hasUploadedFile) return;
		
		try {
            const targetTable = viewMode === 'Exam' ? 'exam_schedules' : 'classes';
            let dataToInsert = [];

            if (viewMode === 'Exam') {
                dataToInsert = classes.map(cls => ({
                    course: cls.course, class_id: cls.class_id, type: cls.type, instructor: cls.instructor, start_time: cls.start_time, end_time: cls.end_time, location: cls.location, date: selectedExamDate, year: subject_info[cls.course]? subject_info[cls.course]["year"] : "-", size: cls.size, academic_year: selectedAcademicYear, semester: selectedSemester 
                }));
            } else {
                dataToInsert = classes.map(cls => ({
                    course: cls.course, class_id: cls.section, type: cls.type, instructor: cls.instructor, start_time: cls.start_time, end_time: cls.end_time, location: cls.room, days: cls.days, schedule: selectedSchedule, year: subject_info[cls.course]? subject_info[cls.course]["year"] : "-", lec_partner: cls.lec_partner, academic_year: selectedAcademicYear, semester: selectedSemester // @: Archive Module: Insert schedule with selected semester and academic year
                }));
            }
			
			const { error } = await supabase.from(targetTable).insert(dataToInsert);
			
			if (error) {
				console.error("Error inserting data:", error);
				throw error;
			}
			
            if (viewMode === 'Schedule') {
                currentAnalysis = []
                demandData[selectedSchedule] = {rawDemand: [], analysis: {}}
                await recomputeDemandAnalysis();
            }

			update = !update;
			hasUploadedFile = false;
			classes = [];
            toast.success("CSV Imported Successfully!");
		} catch (err) {
			console.error("Error in insertData:", err);
			alert("Error inserting data: " + err.message);
		}
	}

	async function replaceData() {
		if (!hasUploadedFile) return;
		
		try {
            const targetTable = viewMode === 'Exam' ? 'exam_schedules' : 'classes';
            
            if (viewMode === 'Exam') {
                await supabase.from(targetTable).delete().eq("date", selectedExamDate).eq("type", selectedExamType).eq("semester", selectedSemester).eq("academic_year", selectedAcademicYear); 
            } else {
                const { error: deleteError } = await supabase
                .from('classes')
                .delete()
                .eq("schedule", selectedSchedule)
                .eq("semester", selectedSemester)
                .eq("academic_year", selectedAcademicYear); // @: Archive Module - Filter classes by selected semester and academic year
                
                if (deleteError) {
                    console.error("Error deleting existing data:", deleteError);
                    throw deleteError;
                }
            }

            await insertData();
		} catch (err) {
			console.error("Error in replaceData:", err);
			alert("Error replacing data: " + err.message);
		}
	}

	// @: Archive Module - Added Academic Year Change Handler
	function handleAcademicYearChange(event) {
		selectedAcademicYear = event.target.value;

		localStorage.setItem('iskedyul_saved_academic_year', selectedAcademicYear);

		currentAnalysis = [];
		demandData[selectedSchedule] = {rawDemand: [], analysis: {}};
		hasUploadedDemandFile[selectedSchedule] = false;

		recomputeDemandAnalysis();
        fetchExamDates();
		update = !update;
	}

	function handleScheduleChange(schedule) {
		selectedSchedule = schedule;

		currentAnalysis = []
		// demandData[selectedSchedule] = {rawDemand: [], analysis: {}}
		recomputeDemandAnalysis()
		// hasUploadedDemandFile[] = false
		if (hasUploadedFile && viewMode === 'Schedule') {
			const fileInput = document.getElementById('fileInput');
			if (fileInput && fileInput.files[0]) {
				parseCSV(fileInput.files[0], schedule);
			}
		}
		update = !update;
	}

	function handleSemesterChange(sem){
		selectedSemester = sem;
        // Fallback to empty array if Midyear doesn't have obligations in store.js
		obligations = obligationClasses[selectedSemester] || []; 

		currentAnalysis = [];
		demandData[selectedSchedule] = {rawDemand: [], analysis: {}};
		hasUploadedDemandFile[selectedSchedule] = false;

		recomputeDemandAnalysis();
        fetchExamDates();
		update = !update;
	}

	async function handleUpload(event) {
		const file = event.target.files[0];
		if (!file) {
			hasUploadedFile = false;
			classes = [];
			return;
		}

		hasUploadedFile = true;
		await parseFacultyLoadingFormat(file, selectedSchedule);
	}

	let parsedDemand = $state([])

	async function handleDemandUpload(event) {
		const file = event.target.files[0];
		
		if (!file) {
			hasUploadedDemandFile[selectedSchedule] = false;
			demandData[selectedSchedule] = { rawDemand: [], analysis: {} };
			return;
		}

		try {
			const text = await file.text();
			// console.log("File content:", text);
			
			demandData[selectedSchedule] = { rawDemand: [], analysis: {} };

			Papa.parse(text, {
				header: true,
				skipEmptyLines: true,
				complete: async function(results) {
					// console.log("Parsing results:", results);
					
					var { data: currentClasses, error } = await supabase
						.from('classes')
						.select('*')
						.eq('schedule', selectedSchedule);

					if (error) {
						// console.error('Error fetching classes:', error);
						currentClasses = []
					}

					parsedDemand = results.data
						.filter(row => row.Course && row.Demand)
						.map(row => ({
							course: (row.Course || '').toString().trim(),
							demand: parseInt(row.Demand) || 0
						}));

					// console.log("Parsed demand:", parsedDemand[0].course);

					const courseSections = {};
					currentClasses.forEach(cls => {
						if (!courseSections[cls.course]) {
							courseSections[cls.course] = {
								count: 0,
								rooms: [],
								lecAccomodated: 0,
								labAccomodated: 0
							};
						}
						courseSections[cls.course].count++;
						courseSections[cls.course].rooms.push(cls.location);
						var currRoom = rooms.find(r => r.name === cls.location)
						if(cls.type == 'Lec'){
							courseSections[cls.course].lecAccomodated += currRoom?.capacity
						}
						else{
							courseSections[cls.course].labAccomodated += currRoom?.capacity
						}
					});

					const analysis = {};
					parsedDemand.forEach(d => {
						const currentCourse = courseSections[d.course] || { count: 0, rooms: [], lecAccomodated: 0, labAccomodated: 0 };
						const courseRooms = currentCourse.rooms;
						
						const capacities = courseRooms.map(room => {
							const venue = rooms.find(r => r.name === room);
							return venue ? venue.capacity : 0;
						});
						
						const avgCapacity = capacities.length > 0 
							? capacities.reduce((a, b) => a + b, 0) / capacities.length
							: Math.max(...rooms.map(r => r.capacity));

						const requiredSections = Math.ceil(d.demand / avgCapacity);
						
						analysis[d.course] = {
							studentDemand: d.demand,
							currentSections: currentCourse.count,
							requiredSections: requiredSections,
							averageVenueCapacity: avgCapacity,
							lecAccomodation: currentCourse.lecAccomodated,
							labAccomodation: currentCourse.labAccomodated
						};
					});

					console.log("Parsed demand:", parsedDemand);
					console.log("Analysis:", analysis);

					demandData[selectedSchedule] = {
						rawDemand: parsedDemand,
						analysis: analysis
					};
					hasUploadedDemandFile[selectedSchedule] = true;
					update = !update;
					currentAnalysis = Object.keys(demandData[selectedSchedule].analysis).map((key) => [key, Object.values(demandData[selectedSchedule].analysis[key])]);
					console.log("Converted Analysis, ", currentAnalysis)
				},
				error: (error) => {
					console.error('Error parsing CSV:', error);
					alert('Error parsing CSV file');
				}
				
			});
		} catch (error) {
			console.error('Error reading file:', error);
			alert('Error reading file');
		}
	}

	function deleteDemandFile() {
		hasUploadedDemandFile[selectedSchedule] = false;
		demandData[selectedSchedule] = [];
		currentAnalysis = []
		recomputeDemandAnalysis();
		document.getElementById('demandFileInput').value = '';
	}

	async function deleteDatabaseDemand () {
		const {error} = await supabase
			.from('demand')
			.delete()
			.eq("schedule", selectedSchedule)
			.eq("semester", selectedSemester)	// @: Archive Module - Filter demand by selected semester
			.eq("academic_year", selectedAcademicYear); // @: Archive Module - Filter demand by selected academic year
		
		update = !update
		currentAnalysis = []
		demandData[selectedSchedule]={ rawDemand: [], analysis: {} }
		console.log("Current Analysis before recompute: ", currentAnalysis)

		recomputeDemandAnalysis()

		console.log("Current Analysis after recompute: ", currentAnalysis)
	}

	function getVenueCapacity(roomName) {
		const room = rooms.find(r => r.name === roomName);
		return room ? room.capacity : 0;
	}

	function calculateRequiredSections(demand, classes) {
		const courseSections = {};
		
		classes.forEach(classItem => {
			if (!courseSections[classItem.course]) {
				courseSections[classItem.course] = {
					currentSections: 0,
					venueCapacities: []
				};
			}
			courseSections[classItem.course].currentSections++;
			courseSections[classItem.course].venueCapacities.push(getVenueCapacity(classItem.location));
		});

		const analysis = {};
		demand.forEach(d => {
			const course = d.course;
			const studentDemand = parseInt(d.demand);
			const courseData = courseSections[course] || { currentSections: 0, venueCapacities: [] };
			
			let avgCapacity;
			if (courseData.venueCapacities.length > 0) {
				avgCapacity = courseData.venueCapacities.reduce((a, b) => a + b, 0) / courseData.venueCapacities.length;
			} else {
				// if no sections exist, use the largest venue capacity as default
				avgCapacity = Math.max(...rooms.map(r => r.capacity));
			}

			const requiredSections = Math.ceil(studentDemand / avgCapacity);
			
			analysis[course] = {
				studentDemand,
				currentSections: courseData.currentSections,
				requiredSections,
				averageVenueCapacity: avgCapacity,
				status: courseData.currentSections === requiredSections ? 'ok' :
					courseData.currentSections < requiredSections ? 'needMore' :
					'dissolve'
			};
		});

		return analysis;
	}

	async function parseFacultyLoadingFormat(file, scheduleId) {
		Papa.parse(file, {
			header: true,
			delimiter: ',',
			skipEmptyLines: true,
			transformHeader: h => h.trim(), // remove any leading/trailing whitespace from headers
			complete: async function(results) {
			console.log("Parsing Faculty Loading format", results.data);
			
			let flag = 0 

			const transformedData = results.data
				.filter(row => row.Course && row.Section)
				.map(row => {
				let type = ""
				let number = 1
				if(row.Type.includes(" ")){ // stuff like Lec 1, Lab 1, Lab 5
					type = row.Type.split(" ")[0]
					number = row.Type.split(" ")[1]
				}
				else{
					type = row.Type ? row.Type.replace(/\s+\d+$/, '') : '';
				}
				
				let days = parseDaysFromFacultyFormat(row.Day);
				
				let { start_time, end_time } = parseTimeRangeFromFacultyFormat(row.Time);
				
				let matchedRoom = findMatchingRoom(row.Room);
				
				let fullInstructorName = findInstructorFullName(row.Instructor);

				let lec_partner = null

				const lecPartnerKey = Object.keys(row).find(k => k.toLowerCase() === 'lec_partner'); // @fix: conflict-logic

				if(type == "Lab"){
					if (lecPartnerKey && row[lecPartnerKey] && row[lecPartnerKey].trim() !== "") { // @fix: conflict-logic - check if lec_partner column exists and has a value
						lec_partner = row[lecPartnerKey].trim();
					}
					else if(row.Section.includes("/")){ //like WFT/TBD
						lec_partner = row.Section.split('/')[0]
					}
					else if (row.Section.includes(" ")){ //like HONOR 1
						lec_partner = row.Section.split(' ')[0]
					}
					else{
						lec_partner = " "
						flag = 1
					}
				}
				
				return {
					course: row.Course,
					type: type,
					section: row.Section,
					instructor: fullInstructorName,
					start_time: start_time,
					end_time: end_time,
					room: matchedRoom,
					days: days,
					schedule: selectedSchedule,
					number: number,
					lec_partner: lec_partner
				};
				})
				// .filter(item => item !== null);
			
			console.log("Hi Im here")
			//check for empty lec_partners
			if(flag == 1){
				for(var i = 0; i < transformedData.length; i++){
					if (transformedData[i].lec_partner == " "){ //lab with no lec partner
						console.log("This lab class has no lec partner: ", transformedData[i])
						
						const candidates = transformedData.filter(value => isLecPartner(transformedData[i], value)); // find all the classes that can be the lec partner of this lab

						if (candidates.length > 0) {
							// Sort candidates by how many labs they already have assigned
							candidates.sort((a, b) => {
								const countA = transformedData.filter(t => t.lec_partner === a.section).length;
								const countB = transformedData.filter(t => t.lec_partner === b.section).length;
								return countA - countB;
							});
							transformedData[i].lec_partner = candidates[0].section;
						}
					}
				}
			}
			
			
			classes = transformedData;
			console.log("Transformed faculty loading data:", classes);
			}
		});
	}

	function isLecPartner(cls1, cls2){
		console.log("Checking this class: ", cls2)
		return (cls1.course == cls2.course && cls2.type == "Lec" && cls1.number == cls2.number)
	}

	function findRoom(str) {
		return rooms.find(room => str.includes(room)) || '';
	}

	function parseDays(dayStr) {
		const dayMap = {
			'Th': 'Thurs',
			'M': 'Mon',
			'T': 'Tues',
			'W': 'Wed',
			'F': 'Fri',
			'S': 'Sat'
		};
		
		return dayStr.match(/(?:Th|M|T|W|F|S)/g)?.map(d => dayMap[d]).join(',') || '';
	}

	function parseDaysFromFacultyFormat(dayStr) {
		if (!dayStr) return '';
		
		const dayMap = {
			'Th': 'Thurs',
			'M': 'Mon',
			'T': 'Tues',
			'W': 'Wed',
			'F': 'Fri',
			'S': 'Sat'
		};
		
		const matches = dayStr.match(/(?:Th|M|T|W|F|S)/g) || [];
		return matches.map(d => dayMap[d] || d).join(',');
	}

	function parseTimeRangeFromFacultyFormat(timeStr) {
		if (!timeStr) {
			return { start_time: '', end_time: '' };
		}
		
		const [startRaw, endRaw] = timeStr.split('-').map(t => t.trim());
		
		if (!startRaw || !endRaw) {
			return { start_time: '', end_time: '' };
		}
		
		let startHour = parseInt(startRaw.split(':')[0]);
		let startMinute = startRaw.includes(':') ? startRaw.split(':')[1] : '00';
		
		let endHour = parseInt(endRaw.split(':')[0]);
		let endMinute = endRaw.includes(':') ? endRaw.split(':')[1] : '00';
		
		if (startHour < 7) {
			startHour += 12;
		}
		
		if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
			endHour += 12;
		} else if (startHour - endHour > 4) {
			endHour += 12;
		}
		
		if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
			endHour += 12;
		}
		
		const formattedStartTime = `${startHour.toString().padStart(2, '0')}:${startMinute.padStart(2, '0')}`;
		const formattedEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.padStart(2, '0')}`;
		
		return { 
			start_time: formattedStartTime, 
			end_time: formattedEndTime 
		};
	}

	function findMatchingRoom(roomStr) {
		if (!roomStr) return 'TBA';
		
		const exactMatch = rooms.find(r => r.name === roomStr);
		if (exactMatch) return exactMatch.name;
		
		const partialMatch = rooms.find(r => 
			roomStr.includes(r.name) || 
			r.name.includes(roomStr) ||
			roomStr.includes(r.name.replace("Room", "Rm")) ||
			r.name.includes(roomStr.replace("Room", "Rm"))
		);
		
		return partialMatch ? partialMatch.name : 'TBA';
	}

	function findInstructorFullName(lastNameStr) {
		if (!lastNameStr) return 'TBA';
		// console.log(lastNameStr)
		const normalizedLastName = lastNameStr.trim().toUpperCase();
		
		// console.log(normalizedLastName)

		///I changed this to 'instructors' because getInstructorData is async, so it might cause an error
		const matchingInstructor = instructors.find(instructor => {
			const fullName = instructor.name;
			const nameParts = fullName.split(',');
			if (nameParts.length < 2) return false;
			console.log(nameParts)
			const instructorLastName = nameParts[0].trim().toUpperCase();
			console.log(normalizedLastName)
			return instructorLastName === normalizedLastName;
		});

		console.log(matchingInstructor)
		
		return matchingInstructor ? matchingInstructor.name : lastNameStr;
	}

	function convertTo24Hour(time, endTimeHasPM = false) {
		const timeWithoutMeridiem = time.replace(/[APap][Mm]/, '').trim();
		const [hours, minutes = '00'] = timeWithoutMeridiem.split(':');
		let hour = parseInt(hours);
		
		const hasAM = time.toLowerCase().includes('am');
		const hasPM = time.toLowerCase().includes('pm');
		
		if ((!hasAM && !hasPM && endTimeHasPM && hour <= 11) || hasPM) {
			hour += 12;
		}
		else if (hasAM && hour === 12) {
			hour = 0;
		}
		
		return `${hour.toString().padStart(2, '0')}:${minutes}`;
	}

	const deleteClass = async (clas) => {
		try {
			const { error } = await supabase
				.from('classes')
				.delete()
				.eq('id', clas.id);
				
			if (error) throw error;
			currentAnalysis = []
			demandData[selectedSchedule] = {rawDemand: [], analysis: {}}
			await recomputeDemandAnalysis();
			update = !update;
		} catch (err) {
			console.error(err);
		}
	};

	function needsMoreSections(course) {
		const courseData = demandData[selectedSchedule].find(d => d.course === course);
		if (!courseData) return false;
		
		const currentSections = classes.filter(c => c.course === course).length;
		
		const roomCapacity = rooms.find(r => r.name === classes.find(c => c.course === course)?.location)?.capacity || 0;
		
		const neededSections = Math.ceil(courseData.demand / roomCapacity);
		
		return currentSections < neededSections;
	}

	async function recomputeDemandAnalysis() {
		console.log("Recomputing demand analysis");

		const { data: currentDemand, error } = await supabase
			.from('demand')
			.select('*')
			.eq('schedule', selectedSchedule)
			.eq('semester', selectedSemester)	// @: Archive Module - Filter demand by selected semester
			.eq('academic_year', selectedAcademicYear); // @: Archive Module - Filter demand by selected academic year


		if (error) {
			demandData[selectedSchedule] = {rawDemand: [], analysis: {}}
			return;
		}
		
		// demandData[selectedSchedule] = []
		
		for(var i = 0; i < currentDemand.length; i++){
			delete currentDemand.id 
			delete currentDemand.schedule

			demandData[selectedSchedule].rawDemand = currentDemand
		}
		// console.log('Fetched Demand', currentDemand)
		// console.log('Demand Data', demandData[selectedSchedule])

		var { data: currentClasses, error2 } = await supabase
			.from('classes')
			.select('*')
			.eq('schedule', selectedSchedule)
			.eq('semester', selectedSemester)	// @: Archive Module - Filter classes by selected semester
			.eq('academic_year', selectedAcademicYear); // @: Archive Module - Filter classes by selected academic year

		if (error2) {
			// console.error('Error fetching classes:', error2);
			currentClasses = []
		}

		const courseSections = {};
		currentClasses.forEach(cls => {
			if (!courseSections[cls.course]) {
				courseSections[cls.course] = {
					count: 0,
					rooms: [],
					lecAccomodated: 0,
					labAccomodated: 0
				};
			}
			courseSections[cls.course].count++;
			courseSections[cls.course].rooms.push(cls.location);
			var currRoom = rooms.find(r => r.name === cls.location)
			if(cls.type == 'Lec'){
			courseSections[cls.course].lecAccomodated += currRoom?.capacity
			}
			else{
				courseSections[cls.course].labAccomodated += currRoom?.capacity
			}
		});

		const analysis = {};
		// if (demandData[selectedSchedule].length > 0){
			demandData[selectedSchedule].rawDemand.forEach(d => {
			const currentCourse = courseSections[d.course] || { count: 0, rooms: [], lecAccomodated: 0, labAccomodated: 0 };
			const courseRooms = currentCourse.rooms;
			
			const capacities = courseRooms.map(room => {
				const venue = rooms.find(r => r.name === room);
				return venue ? venue.capacity : 0;
			});
			
			const avgCapacity = capacities.length > 0 
				? capacities.reduce((a, b) => a + b, 0) / capacities.length
				: Math.max(...rooms.map(r => r.capacity));

			const requiredSections = Math.ceil(d.demand / avgCapacity);
			
			analysis[d.course] = {
				studentDemand: d.demand,
				currentSections: currentCourse.count,
				requiredSections: requiredSections,
				averageVenueCapacity: avgCapacity,
				lecAccomodation: currentCourse.lecAccomodated,
				labAccomodation: currentCourse.labAccomodated
			};
		});
		// }
		

		demandData[selectedSchedule].analysis = analysis
		// console.log("New analysis from recompute:", demandData[selectedSchedule].analysis);
		// var result = Object.values(demandData[selectedSchedule].analysis)
		currentAnalysis = Object.keys(demandData[selectedSchedule].analysis).map((key) => [key, Object.values(demandData[selectedSchedule].analysis[key])]);
		console.log("Classes in store: ", classesValue)
		// console.log("Converted Analysis, ", currentAnalysis)
		return currentDemand;
	}

	async function saveDemandFile(){
		await supabase
			.from('demand')
			.delete()
			.eq("schedule", selectedSchedule)
			.eq("semester", selectedSemester)	// @: Archive Module - Filter demand by selected semester
			.eq("academic_year", selectedAcademicYear); // @: Archive Module - Filter demand by selected academic year

		for(var i = 0; i < parsedDemand.length; i++){
			await supabase.from('demand').insert([
				{
					course: parsedDemand[i].course,
					demand: parsedDemand[i].demand,
					schedule: selectedSchedule,
					semester: selectedSemester, // @: Archive Module - Save demand with selected semester
					academic_year: selectedAcademicYear // @: Archive Module - Save demand with selected academic year
				}])
		}

		demandData[selectedSchedule] = {rawDemand: [], analysis: {}}
		currentAnalysis = []

		hasUploadedDemandFile[selectedSchedule] = false
		await recomputeDemandAnalysis();
		
		update = !update;
		hasUploadedDemandFile[selectedSchedule] = false;
	}

	// async function getDemand() {
	// 	const { data, error } = await supabase.from('demand').select().eq("schedule", selectedSchedule);

	// 	if (error) throw new Error(error.message);
	// 	// console.log(data);
	// 	conflicts = []
	// 	parseForConflicts(data);

	// 	return data;
	// }


	// ------------------------ Edit Class Helper Functions ----------------------


	let editingCell = null;
	let editValue = '';
	let editColumn = '';


	async function handleKeyDown(event, clas, column, value) {
		editValue = value;
		editColumn = column;
		console.log("handleKeyDown called", event.key);
		editingCell = clas;
		//if (!editingCell) return;
		
		if (event.key === 'Enter') {
		console.log("enter pressed");
		event.preventDefault();
		await saveEdit(clas, column, value);
		} else if (event.key === 'Escape') {
		editingCell = null;
		}
	}

	// @fix: conflict-logic
	// Secures loophole on table editing feature
	async function saveEdit(clas, column, value) {
		console.log("saveEdit called");
		
		// Creating the temporary class
		const proposedClass = { ...clas, [column]: value };

		// Gets the old schedule, but removes the current class being edited to prevent self-conflict
		const otherClasses = (classesValue || []).filter(c => c.id !== clas.id);

		// Check for conflicts
		const conflictCheck = checkConflict(proposedClass, otherClasses);

		if (conflictCheck.hasConflict) {
			acts.add({ mode: 'danger', message: `⚠ Update blocked: ${conflictCheck.reason}` });
			editingCell = null;
			update = !update;
			return;
		}
		
		// Proceed to update if it's safe
		try {
			const { error } = await supabase
				.from('classes')
				.update({ [column]: value })
				.eq('id', clas.id);
			
			if (error) throw error;
			console.log("Successfully updated");
		} catch (error) {
			console.error('Error updating:', error);
		}

		editingCell = null;
		update = !update;

		// OLD SAVE EDIT FUNCTION
		// //if (!editingCell) return;
		// console.log("saveEdit called");
		
		// try {
		// const { error } = await supabase
		// 	.from('classes')
		// 	.update({ [column]: value })
		// 	.eq('id', clas.id);
			
		// if (error) throw error;
		// console.log("Successfully updated");
		// // Only trigger re-render after successful save
		// //updateEdit++;
		// update = !update
		// } catch (error) {
		// console.error('Error updating:', error);
		// }
		
		// editingCell = null;
		// update = !update
	}

	// Click outside to cancel edit
	async function handleClickOutside(event) {
		console.log("handleClickOutside called");

		if(editingCell != null) {
			await saveEdit(editingCell, editColumn, editValue );
		}

		const tbody = document.querySelector('tbody');
			if (tbody && !tbody.contains(event.target)) {
				console.log('Clicked outside tbody');
				editingCell = null;
			}

		
		
	}

	async function fetchInstructorsForModal() {
		const { data, error } = await supabase
			.from('instructors')
			.select()
			.order('name', {ascending: true});
		if (!error && data) instructors = data;
	}

    // --- NEW: SESSION MEMORY MANAGER & KEYBOARD ESCAPE ---
	// @: Archive Module - Added fetching of academic years
	onMount(async () => {
        let urlOverrides = false;
        if (browser) {
            // Check URL for Router Jump
            const params = new URLSearchParams(window.location.search);
            if (params.get('mode') === 'Exam') {
                viewMode = 'Exam';
                selectedExamType = params.get('type') || 'Midterm';
                if (params.get('sem')) selectedSemester = params.get('sem');
                if (params.get('ay')) selectedAcademicYear = params.get('ay');
                if (params.get('date')) selectedExamDate = params.get('date');
                urlOverrides = true;
                window.history.replaceState({}, '', '/data');
            } else {
                // Restore from Session Memory!
                if (sessionStorage.getItem('data_ay')) selectedAcademicYear = sessionStorage.getItem('data_ay');
                if (sessionStorage.getItem('data_sem')) selectedSemester = sessionStorage.getItem('data_sem');
                if (sessionStorage.getItem('data_sched')) selectedSchedule = sessionStorage.getItem('data_sched');
                if (sessionStorage.getItem('data_mode')) viewMode = sessionStorage.getItem('data_mode');
                if (sessionStorage.getItem('data_examtype')) selectedExamType = sessionStorage.getItem('data_examtype');
                if (sessionStorage.getItem('data_examdate')) selectedExamDate = sessionStorage.getItem('data_examdate');
            }
        }

		await fetchAcademicYears();
        
        if (urlOverrides) {
            recomputeDemandAnalysis();
            await fetchExamDates();
            if (selectedExamDate && !examDates.includes(selectedExamDate)) {
                examDates = [...examDates, selectedExamDate].sort();
            }
        }

		await fetchInstructorsForModal();

		// // Replaced getInstructorData() to apiClient.getInstructorData() to prevent initialization crash
		// instructors = await apiClient.getInstructorData(); // @fix: conflict-logic

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

    $effect(() => {
        if (browser) {
            sessionStorage.setItem('data_ay', selectedAcademicYear);
            sessionStorage.setItem('data_sem', selectedSemester);
            sessionStorage.setItem('data_sched', selectedSchedule);
            sessionStorage.setItem('data_mode', viewMode);
            sessionStorage.setItem('data_examtype', selectedExamType);
            sessionStorage.setItem('data_examdate', selectedExamDate);
        }
    });

    // Handle Keyboard Actions
    function handleKeydown(event) {
        if (event.key === 'Escape') {
            showModal = false;
            showDeleteModal = false;
            showAddExamDateModal = false;
            showEditExamDateModal = false;
            modalUpdate = !modalUpdate;
            modalDeleteUpdate = !modalDeleteUpdate;
        }
    }


	// -------------- Modal Functions -------------

		const days = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
		let newDays = '';
		let daysArray = $state([]);

		let newCourse = $state(""),
			newType = $state("Lec"),
			newClass,
			newInstr,
			newStart,
			newEnd,
			newLoc,
			newSched,
			newLecPartner;


		let submit = $state(false);

		// async function handleSubmitEnd() {
		// 	console.log("HandelSubmitEnd Called")
		// 	submit = false;
		// 	update = false;
		// }

		async function handleDeleteSubmitEnd() {
			submit = false;
			update = false;
			deleteClassFinal();
			clickOutDeleteModal();
		}
		

		// @fix: conflict-logic
		// Helper function to convert HH:MM string to integer for math comparisons
		function timeToMinutes(timeStr) {
			if (!timeStr) return 0;
			const [hours, minutes] = timeStr.split(':').map(Number);
			return (hours * 60) + minutes;
		}

		// @fix: conflict-logic
		// Validation function to prevent overlaps
		function checkConflict(newClass, existingClasses) {
			// const newDays = newClass.days.split(',');
			const newDays = newClass.days ? newClass.days.split(',') : [];
			const newStart = timeToMinutes(newClass.start_time);
			const newEnd = timeToMinutes(newClass.end_time);

			for (const existing of existingClasses) {
				if (existing.schedule !== newClass.schedule) continue;
				
				const existingDays = existing.days ? existing.days.split(','): [];
				const sharesDay = newDays.some(day => existingDays.includes(day));

				if (sharesDay) {
					const existingStart = timeToMinutes(existing.start_time);
					const existingEnd = timeToMinutes(existing.end_time);

					if ((newStart < existingEnd) && (newEnd > existingStart)) {
						if (newClass.location === existing.location) {
							return { hasConflict: true, reason: `Room conflict: ${existing.location} is already booked for ${existing.course}.`};
						}
						if (newClass.instructor === existing.instructor && newClass.instructor !== "TBA") {
							return { hasConflict: true, reason: `Instructor conflict: ${existing.instructor} is already teaching ${existing.course}.`};
						}
					}
				}
			}
			return { hasConflict: false };
		}

        // --- UPDATED SEND DATA FOR DUAL TARGETING ---
        async function sendData() {
            submit = true;

            if (viewMode === 'Exam') {
                if (!selectedExamDate) { acts.add({mode: 'danger', message: '⚠️ Please select or create an Exam Date first.'}); submit = false; return; }
                if (!newStart || !newEnd || !newLoc) { acts.add({mode: 'danger', message: '⚠️ Time and location are required.'}); submit = false; return; }

                const newExamData = {
                    course: newCourse, type: selectedExamType, class_id: newClass, instructor: newInstr,
                    start_time: newStart, end_time: newEnd, location: newLoc, date: selectedExamDate,
                    year: subject_info[newCourse] ? subject_info[newCourse]["year"] : "-",
                    size: getVenueCapacity(newLoc), academic_year: selectedAcademicYear, semester: selectedSemester
                };

                const { error } = await supabase.from('exam_schedules').insert([newExamData]);
                if (error) { toast.error("Insertion failed: " + error.message); submit = false; return; }

                toast.success("Exam added successfully!");
            } else {
                // REGULAR CLASS LOGIC
                if (daysArray.length === 0) { acts.add({mode: 'danger', message: '⚠️ Cannot add class with no days.'}); submit = false; return; }
                if (!newSched) { acts.add({mode: 'danger', message: '⚠️ Cannot add class with no schedule.'}); submit = false; return; }
                newDays = daysArray.join(',');

                var year_level = '-'; var teaching_load = 0;
                if(subject_info[newCourse]){
                    year_level = subject_info[newCourse]["year"];
                    if(newType == "Lec"){ teaching_load = subject_info[newCourse]["lecTL"]; } 
                    else { if(subject_info[newCourse]["labTL"]){ teaching_load = subject_info[newCourse]["labTL"]; } }
                }

                // @fix:conflict-logic
			    // Package new class data
                const newClassData = {
                    course: newCourse, type: newType, class_id: newClass, instructor: newInstr,
                    start_time: newStart, end_time: newEnd, location: newLoc, days: newDays,
                    schedule: newSched, year: year_level, lec_partner: newLecPartner,
                    academic_year: selectedAcademicYear, semester: selectedSemester
                };

                // @fix:conflict-logic
			    // Run Conflict Check
                const conflictCheck = checkConflict(newClassData, classesValue || []);
                if (conflictCheck.hasConflict) {
                    acts.add({mode: 'danger', message: `⚠ ${conflictCheck.reason}`});
                    submit = false;
                    update = false;
                    return null; // Stop insertion
                }

                const { error } = await supabase.from('classes').insert([newClassData]);
                if (error) { toast.error("Insertion failed: " + error.message); submit = false; return; }
                toast.success("Class added successfully!");
            }

            // Clear inputs
            newCourse = ''; newClass = ''; daysArray = []; newDays = ''; newInstr = 'TBA'; newLecPartner = ''; selectedEligibleClass = "";
            submit = false; showModal = false; modalUpdate = !modalUpdate;
            
            if (viewMode === 'Schedule') {
                currentAnalysis = []
			    demandData[selectedSchedule] = {rawDemand: [], analysis: {}}
			    await recomputeDemandAnalysis()
            }
            update = !update;
        }

		const toggleModal = async () => {
            if (viewMode === 'Exam') {
                await fetchEligibleClasses();
                selectedEligibleClass = ""; 
                newCourse = "";
                newClass = "";
            }
			showModal = true;
			modalUpdate = !modalUpdate;
			console.log("THIS IS THE MODAL")
			console.log(showModal);
		};

		let deleteClassID;
		let deleteClassCourse;
		let deleteClassSection;

		const toggleDeleteModal = (id, course, section) => {
			deleteClassID = id;
			deleteClassCourse = course;
			deleteClassSection = section;

			showDeleteModal = true;
			modalDeleteUpdate = !modalDeleteUpdate;
			console.log("THIS IS THE DELETE MODAL")
			console.log(showDeleteModal);
		};

		const deleteClassFinal = async () => {
		try {
            const targetTable = viewMode === 'Exam' ? 'exam_schedules' : 'classes';
			const { error } = await supabase
				.from(targetTable)
				.delete()
				.eq('id', deleteClassID);
				
			if (error) throw error;
			
			
			update = !update;
		} catch (err) {
			console.error(err);
		}
		};

		async function clickOutModal() {
			try{
				showModal = false;
				modalUpdate = !modalUpdate
				
				console.log("I clicked outside the modal")
			}
			catch(err){
				console.log(err)
			}
		}

		async function clickOutDeleteModal() {
			try{
				showDeleteModal = false;
				modalDeleteUpdate = !modalDeleteUpdate
				//modalUpdate = !modalUpdate
				console.log("I clicked outside the delete modal, or i exited idk")
			}
			catch(err){
				console.log(err)
			}
		}
		
		function handleSearch(){
			var len = (searchValue.split(" ")).length
			var searchCourse = ""
			var searchSection = ""
			if(len >= 2){
				searchCourse = (searchValue.split(" "))[0] + (searchValue.split(" "))[1]
			}
			else if (len == 2){
				searchSection = ""
			}
			else if(len == 3){
				searchSection = (searchValue.split(" "))[2]
			}
			else{
				searchSection = searchValue
			}
			return [searchCourse, searchSection];

		}
		
// --- HTML PORTION STARTS HERE --- \\
</script>

<svelte:window onkeydown={handleKeydown} />

	<div>
		{#key classesValue}
			{#await recomputeDemandAnalysis()}
				<div> </div>
					{:then data}
				<div> </div>
			{/await}
		{/key}

	</div>

	<div class="flex">
	<Sidebar />

	<Toaster position="top-center" richColors={true} />

	<div class="flex-1 p-6 ml-64">
		<div class="flex justify-between items-center mb-6">
			<div class ="flex flex-row gap-10">
				<h1 class="text-3xl font-bold text-gray-800">Class Schedule</h1>
				
				<div class="flex flex-wrap items-center gap-2">
					<select
						bind:value={selectedAcademicYear}
						onchange={handleAcademicYearChange}
						class="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
					>
			{#if academicYears.length === 0}
					<option value="">No Terms Found</option>
			{/if}
						{#each academicYears as year}
							<option value={year}> A.Y. {year}</option>
						{/each}
					</select>

		</div>

				<div class="flex gap-4">
					<button class="px-4 py-2 rounded-lg font-medium transition-colors {selectedSemester === '1' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" onclick={() => handleSemesterChange('1')}>
						1st Semester
					</button>
					<button class="px-4 py-2 rounded-lg font-medium transition-colors {selectedSemester === '2' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" onclick={() => handleSemesterChange('2')}>
						2nd Semester
					</button>
					<button class="px-4 py-2 rounded-lg font-medium transition-colors {selectedSemester === 'Midyear' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" onclick={() => handleSemesterChange('Midyear')}>
						Midyear
					</button>
				</div>
				
			</div>

			{#if viewMode === 'Schedule'}
			<button 
				class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
				onclick={downloadCSV}
				>
				Export CSV
			</button>
            {/if}
		</div>

        <div class="flex flex-wrap gap-2 mb-6 items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-fit">
            {#each schedules as schedule}
                <button class="px-4 py-2 rounded-md font-bold transition-colors {viewMode === 'Schedule' && selectedSchedule === schedule ? 'bg-green-500 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-200'}" onclick={() => setScheduleView(schedule)}>
                    Schedule {schedule}
                </button>
            {/each}
            
            <div class="w-px h-8 bg-gray-300 mx-2"></div>
            
            <button class="px-4 py-2 rounded-md font-bold transition-colors {viewMode === 'Exam' && selectedExamType === 'Midterm' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-200'}" onclick={() => setExamView('Midterm')}>
                Midterms
            </button>
            <button class="px-4 py-2 rounded-md font-bold transition-colors {viewMode === 'Exam' && selectedExamType === 'Final' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-200'}" onclick={() => setExamView('Final')}>
                Finals
            </button>
        </div>

        {#if viewMode === 'Exam'}
        <div class="flex flex-wrap gap-2 mb-6 items-center bg-gray-100 p-3 rounded-lg border border-gray-200 shadow-sm transition-all">
            <span class="text-sm font-bold text-gray-600 mr-2 uppercase tracking-wide"><i class="fa-solid fa-calendar-day mr-1"></i> Exam Dates:</span>
            
            {#if examDates.length === 0}
                <span class="text-sm text-gray-400 italic">No dates scheduled yet.</span>
            {/if}
            
            {#each examDates as date}
                <button class="px-3 py-1.5 rounded-md text-sm font-bold transition-all {selectedExamDate === date ? 'bg-green-600 text-white shadow-md scale-105 ring-2 ring-green-300' : 'bg-white text-green-700 hover:bg-green-50 border border-gray-300'}" onclick={() => { selectedExamDate = date; update = !update; }}>
                    {formatReadableDate(date)}
                </button>
            {/each}
            
            <button class="px-3 py-1.5 rounded-md text-sm font-bold bg-white text-green-600 hover:bg-green-50 border border-green-300 ml-auto flex items-center gap-2 shadow-sm" onclick={() => showAddExamDateModal = true}>
                <i class="fa-solid fa-plus"></i> Add Date
            </button>

            {#if selectedExamDate}
            <button class="px-3 py-1.5 rounded-md text-sm font-bold bg-white text-green-600 hover:bg-green-50 border border-green-300 ml-2 flex items-center gap-2 shadow-sm" onclick={openEditDateModal}>
                <i class="fa-solid fa-pen"></i> Edit Date
            </button>
            <button class="px-3 py-1.5 rounded-md text-sm font-bold bg-white text-red-600 hover:bg-red-50 border border-red-300 flex items-center gap-2 shadow-sm" onclick={deleteExamDate}>
                <i class="fa-solid fa-trash-can"></i> Delete Date
            </button>
            {/if}
        </div>
        {/if}

        {#if viewMode === 'Schedule'}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

			{#key update}
			<div class="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col gap-2">
				<div class = "flex flex-row justify-between">
					<h2 class="text-lg font-semibold mb-3 text-gray-700 text-center">Quick Numbers</h2>
					<button 
							onclick={() => deleteDatabaseDemand()}
							class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs text-center"
						>
							Delete Demand
					</button>
				</div>
				<div class="overflow-y-auto max-h-48">
					{#if currentAnalysis.length > 0}
						<table class="w-full text-sm">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
									<th class="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
									<th class="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Current/Required</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200">
								{#each currentAnalysis as analysis}
									<tr>
										<td class="px-2 py-1.5 whitespace-nowrap font-medium text-gray-900 text-center">
											{#if (obligationClasses[selectedSemester].includes(analysis[0]))}
											<div class="relative">
												<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
											</div>
											{/if}
											{analysis[0]}
										</td>
										<td class="px-2 py-1.5 whitespace-nowrap font-medium text-gray-900 text-center">Lec</td>
										<td class="px-2 py-1.5 whitespace-nowrap text-center">
											<span class={analysis[1][4] >= analysis[1][0] ? 'text-green-500' : 'text-red-500'}>
												{analysis[1][4]} / {analysis[1][0]}
											</span>
										</td>
									</tr>
									{#if labSubjects.includes(analysis[0])}
									<tr>
										<td class="px-2 py-1.5 whitespace-nowrap font-medium text-gray-900 text-center">
											{#if (obligationClasses[selectedSemester].includes(analysis[0]))}
											<div class="relative">
												<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
											</div>
												{/if}
											<div>
												{analysis[0]}
											</div>
										</td>
										<td class="px-2 py-1.5 whitespace-nowrap font-medium text-gray-900 text-center">Lab</td>
										<td class="px-2 py-1.5 whitespace-nowrap text-center">
											<span class={analysis[1][5] >= analysis[1][0] ? 'text-green-500' : 'text-red-500'}>
												{analysis[1][5]} / {analysis[1][0]}
											</span>
										</td>
									</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					{:else}
						<p class="text-sm text-gray-500 text-center py-4">No demand data available</p>
					{/if}
				</div>
			</div>
			{/key}
			
			<div class="bg-white rounded-lg shadow p-4 border border-gray-200">
				<h2 class="text-lg font-semibold mb-3 text-gray-700 text-center">Schedule</h2>
				{#if !hasUploadedFile}
					<div class="flex flex-col items-center bg-gray-50 border border-dashed border-gray-300 rounded p-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
						</svg>
						<p class="text-sm text-gray-600 mb-3 text-center">Upload Schedule CSV</p>
						<button 
							class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded cursor-pointer text-sm flex items-center gap-1"
							onclick={openFileUpload}
							>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
							</svg>
							Upload Faculty Loading
						</button>
						<input 
							type="file" 
							id="fileInput" 
							accept=".csv" 
							onchange={handleUpload} 
							class="hidden"
							bind:this={fileInputRef}
						>
					</div>
				{:else}
					<div class="bg-gray-50 rounded border border-gray-200 p-3 mb-3">
						<div class="flex items-center gap-2">
							<div class="bg-green-100 p-1.5 rounded">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
							</div>
							<div class="flex-1 truncate">
								<p class="text-sm font-medium text-gray-900 truncate">
									{document.getElementById('fileInput')?.files[0]?.name || 'classes.csv'}
								</p>
								<p class="text-xs text-gray-500 text-center">{classes.length} classes</p>
								<p class="text-xs text-blue-500 text-center">Format: Faculty Loading</p>
							</div>
							<button 
								onclick={() => {
									hasUploadedFile = false;
									classes = [];
									document.getElementById('fileInput').value = '';
								}}
								class="text-gray-400 hover:text-gray-500"
								aria-label="cancel"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
							</button>
						</div>
					</div>
					<div class="flex gap-2">
						<button 
							onclick={insertData} 
							class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs flex-1 text-center"
						>
							Insert Classes
						</button>
						<button 
							onclick={replaceData} 
							class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs flex-1 text-center"
						>
							Replace All
						</button>
					</div>
				{/if}
			</div>

			<div class="bg-white rounded-lg shadow p-4 border border-gray-200">
				<h2 class="text-lg font-semibold mb-3 text-gray-700 text-center">Student Demand</h2>
				{#key update}
				{#if !hasUploadedDemandFile[selectedSchedule]}
					<div class="flex flex-col items-center bg-gray-50 border border-dashed border-gray-300 rounded p-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
						</svg>
						<p class="text-sm text-gray-600 mb-3 text-center">Upload Demand CSV</p>
						<label class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer text-sm">
							Choose File
							<input 
								type="file" 
								id="demandFileInput" 
								accept=".csv" 
								onchange={handleDemandUpload} 
								class="hidden"
							>
						</label>
					</div>
				{:else}
					<div class="bg-gray-50 rounded border border-gray-200 p-3 mb-3">
						<div class="flex items-center gap-2">
							<div class="bg-blue-100 p-1.5 rounded">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
							</div>
							<div class="flex-1 truncate">
								<p class="text-sm font-medium text-gray-900 truncate text-center">
									{document.getElementById('demandFileInput')?.files[0]?.name || 'demand.csv'}
								</p>
								<p class="text-xs text-gray-500 text-center">
									{demandData[selectedSchedule].rawDemand?.length || 0} courses
								</p>
							</div>
						</div>
					</div>
					<div class="flex gap-2">
						<button
							onclick={() => saveDemandFile()}
							class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs flex-1 text-center"
						>
							Save
						</button>
						<button 
							onclick={() => deleteDemandFile()}
							class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs flex-1 text-center"
						>
							Delete
						</button>
					</div>
				{/if}
				{/key}
			</div>
		</div>
        {:else if viewMode === 'Exam'}
        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
				<h2 class="text-lg font-semibold mb-3 text-gray-700 text-center">Schedule CSV</h2>
				{#if !hasUploadedFile}
					<div class="flex flex-col items-center bg-gray-50 border border-dashed border-gray-300 rounded p-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
						<p class="text-sm font-bold text-gray-700 mb-1 text-center">Upload Schedule CSV</p>
                        <p class="text-xs text-gray-500 mb-3 text-center">Format: Course, Type, Section, Day, Time, Room, Instructor</p>
						<button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded cursor-pointer text-sm flex items-center gap-1" onclick={openFileUpload}><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> Upload File </button>
						<input type="file" id="fileInput" accept=".csv" onchange={handleUpload} class="hidden" bind:this={fileInputRef} >
					</div>
				{:else}
					<div class="bg-gray-50 rounded border border-gray-200 p-3 mb-3">
						<div class="flex items-center gap-2">
							<div class="bg-green-100 p-1.5 rounded"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
							<div class="flex-1 truncate">
								<p class="text-sm font-medium text-gray-900 truncate"> {document.getElementById('fileInput')?.files[0]?.name || 'classes.csv'} </p>
								<p class="text-xs text-gray-500 text-center">{classes.length} classes pending</p>
							</div>
							<button onclick={() => { hasUploadedFile = false; classes = []; document.getElementById('fileInput').value = ''; }} class="text-gray-400 hover:text-gray-500" aria-label="cancel"> <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> </button>
						</div>
					</div>
					<div class="flex gap-2">
						<button onclick={insertData} class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs flex-1 text-center font-bold"> Add to Schedule </button>
						<button onclick={replaceData} class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs flex-1 text-center font-bold"> Replace Entire Schedule </button>
					</div>
				{/if}
			</div>
        {/if}

		<div class="flex flex-wrap gap-3 mb-4">
			<div class="flex-1 min-w-[200px] relative">
				<input 
					type="text" 
					placeholder="Search classes..." 
					class="w-full px-4 py-2 border border-gray-300 rounded-lg pl-10"
					bind:value={searchValue}
				>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
			
			<SortAndFilterDropdownButton  onSort={handleSort}/>
			
            <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition" onclick={toggleModal}>
                <i class="fa-solid fa-plus"></i>
                {viewMode === 'Exam' ? 'Add Exam Block' : 'Add Class'}
            </button>
		</div>

		{#if viewMode === 'Exam' && !selectedExamDate}
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 mt-6 flex flex-col items-center justify-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 class="text-xl font-bold text-gray-700 mb-2">No Exam Date Selected</h3>
                <p class="text-gray-500 max-w-md">You haven't selected a date for the {selectedExamType}s yet. Click the "Add Date" button above to start scheduling exams.</p>
            </div>
        {:else}
		<div>
		{#key update}
				<Classes 
					sortCategory={sortCategory}
					filterCategories={filterCategories}
					schedule={selectedSchedule} 
					demandData={demandData[selectedSchedule]?.rawDemand} 
					sectionAnalysis={demandData[selectedSchedule]?.analysis}
					semester = {selectedSemester}
					academicYear={selectedAcademicYear}
					onToggleDeleteModal= {toggleDeleteModal}
					searchCourse={handleSearch()[0]} 
                    searchSection={handleSearch()[1]}
                    isExamMode={viewMode === 'Exam'}
                    examDate={selectedExamDate}
                    examType={selectedExamType}
				/>
		{/key}
		</div>
        {/if}
	</div>
	</div>

{#if showAddExamDateModal}
<div class="backdrop z-100">
    <div class="delete-modal z-200" use:tapOutside={() => showAddExamDateModal = false}>
        <h3 class="title2 mb-4 font-bold text-gray-800">Add New Exam Date</h3>
        <p class="text-sm text-gray-600 mb-2">Select a date for this {selectedExamType} period.</p>
        <input type="date" bind:value={newExamDateInput} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none mb-4">
        
        <div class="flex justify-end gap-2">
            <button class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg" onclick={() => showAddExamDateModal = false}>Cancel</button>
            <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg" onclick={addExamDate}>Add Date</button>
        </div>
    </div>
</div>
{/if}

{#if showEditExamDateModal}
<div class="backdrop z-100">
    <div class="delete-modal z-200" use:tapOutside={() => showEditExamDateModal = false}>
        <h3 class="title2 mb-4 font-bold text-gray-800">Edit Exam Date</h3>
        <p class="text-sm text-gray-600 mb-2">Move all exams from {formatReadableDate(selectedExamDate)} to a new date.</p>
        <input type="date" bind:value={editExamDateInput} class="w-full border border-gray-300 rounded p-2 focus:ring-green-500 focus:outline-none mb-4">
        
        <div class="flex justify-end gap-2">
            <button class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg" onclick={() => showEditExamDateModal = false}>Cancel</button>
            <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg" onclick={editExamDate}>Save Changes</button>
        </div>
    </div>
</div>
{/if}

	{#key modalUpdate}
	{#if showModal}
	<div class="backdrop z-[100]">
		<div class="modal z-[200] max-h-[90vh] overflow-y-auto" use:tapOutside={(e) => clickOutModal()}>
			<h1 class="title1 mb-6 text-gray-800">{viewMode === 'Exam' ? 'Schedule Exam Block' : 'Add a New Class'}</h1>
            
            {#if viewMode === 'Exam'}
            <div class="mb-4 bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm flex justify-between items-center">
                <p class="text-sm text-green-800"><i class="fa-solid fa-circle-info mr-2"></i>You are scheduling a <strong>{selectedExamType}</strong> on <strong>{formatReadableDate(selectedExamDate)}</strong>.</p>
            </div>
            {/if}
            
			<form onsubmit={(e) => { e.preventDefault(); sendData(); }} name="add class">
				<div class="form_total gap-3">
					
                    <div class="form-row">
                        {#if viewMode === 'Exam'}
                        <div class="grid grid-cols-1 gap-4">
                            <div class="form-col gap-1">
                                <label for="select-class" class="title2 text-gray-700">Select Class for Exam</label>
                                <select id="select-class" bind:value={selectedEligibleClass} onchange={() => {
                                    if (selectedEligibleClass) {
                                        const parsed = JSON.parse(selectedEligibleClass);
                                        newCourse = parsed.course;
                                        newClass = parsed.class_id;
                                        newInstr = parsed.instructor || 'TBA';
                                    } else {
                                        newCourse = '';
                                        newClass = '';
                                        newInstr = 'TBA';
                                    }
                                }} class="w-full bg-gray-100 border border-gray-300 focus:border-green-500 rounded-lg p-2.5" required>
                                    <option value="">-- Choose a Scheduled Class --</option>
                                    {#each eligibleExamClasses as cls}
                                        <option value={JSON.stringify(cls)}>{cls.course} {cls.class_id} (Draft {cls.schedule})</option>
                                    {/each}
                                </select>
                            </div>
                        </div>
                        {:else}
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div class="form-col gap-1">
								<label for="class name" class="title2">Course</label>
								<input
									id="class name"
									type="text"
									placeholder="Course"
									class = "w-full bg-gray-100 border border-gray-300 focus:border-green-500 rounded-lg p-2.5"
									required
									bind:value={newCourse}
								/>
							</div>
                            <div class="form-col gap-1">
								<label for="class id" class="title2">Section</label>
								<input 
									id="classID" 
									type="text" 
									placeholder="Section" 
									bind:value={newClass} 
									class = "w-full bg-gray-100 border border-gray-300 focus:border-green-500 rounded-lg p-2.5"
									required
								/>
							</div>
							<div class="form-col gap-1">
								<label for="type" class="title2">Type</label>
								<select bind:value={newType} class ="w-full bg-gray-100 border border-gray-300 focus:border-green-500 rounded-lg p-2.5">
									{#if labSubjects.includes(newCourse)}
										<option value = "Lec">Lec</option>
										<option value = "Lab">Lab</option>
									{:else}
										<option value = "Lec">Lec</option>
									{/if}
								</select>
							</div>
						</div>
                        {/if}
					</div>

					<div class="form-row">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="form-col gap-1">
								<label for="instructor" class="title2">{viewMode === 'Exam' ? 'Proctor' : 'Instructor Name'}</label>
								<select bind:value={newInstr} class = "w-full bg-gray-100 border border-gray-300 focus:border-green-500 rounded-lg p-2.5">
									<option value = "TBA"> TBA </option>
									{#each instructors as instr}
										<option value = {instr.name}>{instr.name}</option>
									{/each}
								</select>
							</div>
							<div class="form-col gap-1">
								<label for="location" class="title2">Location</label>
								<select bind:value={newLoc} class = "w-full bg-gray-100 border border-gray-300 focus:border-green-500 rounded-lg p-2.5">
									{#each rooms as room}
										<option value = {room.name}>{room.name}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
					<div class="form-row">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="form-col gap-1">
								<label for="start" class="title2">Start Time</label>
								<select bind:value={newStart} class = "w-full bg-gray-100 border border-gray-300 focus:border-green-500 rounded-lg p-2.5">
									<option value="07:00"> 7:00 AM </option>
									<option value="07:15"> 7:15 AM </option>
									<option value="07:30"> 7:30 AM </option>
									<option value="07:45"> 7:45 AM </option>
									<option value="08:00"> 8:00 AM </option>
									<option value="08:15"> 8:15 AM </option>
									<option value="08:30"> 8:30 AM </option>
									<option value="08:45"> 8:45 AM </option>
									<option value="09:00"> 9:00 AM </option>
									<option value="09:15"> 9:15 AM </option>
									<option value="09:30"> 9:30 AM </option>
									<option value="09:45"> 9:45 AM </option>
									<option value="10:00"> 10:00 AM </option>
									<option value="10:15"> 10:15 AM </option>
									<option value="10:30"> 10:30 AM </option>
									<option value="10:45"> 10:45 AM </option>
									<option value="11:00"> 11:00 AM </option>
									<option value="11:15"> 11:15 AM </option>
									<option value="11:30"> 11:30 AM </option>
									<option value="11:45"> 11:45 AM </option>
									<option value="12:00"> 12:00 PM </option>
									<option value="12:15"> 12:15 PM </option>
									<option value="12:30"> 12:30 PM </option>
									<option value="12:45"> 12:45 PM </option>
									<option value="13:00"> 1:00 PM </option>
									<option value="13:15"> 1:15 PM </option>
									<option value="13:30"> 1:30 PM </option>
									<option value="13:45"> 1:45 PM </option>
									<option value="14:00"> 2:00 PM </option>
									<option value="14:15"> 2:15 PM </option>
									<option value="14:30"> 2:30 PM </option>
									<option value="14:45"> 2:45 PM </option>
									<option value="15:00"> 3:00 PM </option>
									<option value="15:15"> 3:15 PM </option>
									<option value="15:30"> 3:30 PM </option>
									<option value="15:45"> 3:45 PM </option>
									<option value="16:00"> 4:00 PM </option>
									<option value="16:15"> 4:15 PM </option>
									<option value="16:30"> 4:30 PM </option>
									<option value="16:45"> 4:45 PM </option>
									<option value="17:00"> 5:00 PM </option>
									<option value="17:15"> 5:15 PM </option>
									<option value="17:30"> 5:30 PM </option>
									<option value="17:45"> 5:45 PM </option>
									<option value="18:00"> 6:00 PM </option>
									<option value="18:15"> 6:15 PM </option>
									<option value="18:30"> 6:30 PM </option>
									<option value="18:45"> 6:45 PM </option>
									<option value="19:00"> 7:00 PM </option>
								</select>
							</div>
							<div class="form-col gap-1">
								<label for="end" class="title2">End Time</label>
								<select bind:value={newEnd} class = "w-full bg-gray-100 border border-gray-300 focus:border-green-500 rounded-lg p-2.5">
									<option value="07:00"> 7:00 AM </option>
									<option value="07:15"> 7:15 AM </option>
									<option value="07:30"> 7:30 AM </option>
									<option value="07:45"> 7:45 AM </option>
									<option value="08:00"> 8:00 AM </option>
									<option value="08:15"> 8:15 AM </option>
									<option value="08:30"> 8:30 AM </option>
									<option value="08:45"> 8:45 AM </option>
									<option value="09:00"> 9:00 AM </option>
									<option value="09:15"> 9:15 AM </option>
									<option value="09:30"> 9:30 AM </option>
									<option value="09:45"> 9:45 AM </option>
									<option value="10:00"> 10:00 AM </option>
									<option value="10:15"> 10:15 AM </option>
									<option value="10:30"> 10:30 AM </option>
									<option value="10:45"> 10:45 AM </option>
									<option value="11:00"> 11:00 AM </option>
									<option value="11:15"> 11:15 AM </option>
									<option value="11:30"> 11:30 AM </option>
									<option value="11:45"> 11:45 AM </option>
									<option value="12:00"> 12:00 PM </option>
									<option value="12:15"> 12:15 PM </option>
									<option value="12:30"> 12:30 PM </option>
									<option value="12:45"> 12:45 PM </option>
									<option value="13:00"> 1:00 PM </option>
									<option value="13:15"> 1:15 PM </option>
									<option value="13:30"> 1:30 PM </option>
									<option value="13:45"> 1:45 PM </option>
									<option value="14:00"> 2:00 PM </option>
									<option value="14:15"> 2:15 PM </option>
									<option value="14:30"> 2:30 PM </option>
									<option value="14:45"> 2:45 PM </option>
									<option value="15:00"> 3:00 PM </option>
									<option value="15:15"> 3:15 PM </option>
									<option value="15:30"> 3:30 PM </option>
									<option value="15:45"> 3:45 PM </option>
									<option value="16:00"> 4:00 PM </option>
									<option value="16:15"> 4:15 PM </option>
									<option value="16:30"> 4:30 PM </option>
									<option value="16:45"> 4:45 PM </option>
									<option value="17:00"> 5:00 PM </option>
									<option value="17:15"> 5:15 PM </option>
									<option value="17:30"> 5:30 PM </option>
									<option value="17:45"> 5:45 PM </option>
									<option value="18:00"> 6:00 PM </option>
									<option value="18:15"> 6:15 PM </option>
									<option value="18:30"> 6:30 PM </option>
									<option value="18:45"> 6:45 PM </option>
									<option value="19:00"> 7:00 PM </option>
									<option value="19:15"> 7:15 PM </option>
									<option value="19:30"> 7:30 PM </option>
									<option value="19:45"> 7:45 PM </option>
									<option value="20:00"> 8:00 PM </option>
									<option value="20:15"> 8:15 PM </option>
									<option value="20:30"> 8:30 PM </option>
									<option value="20:45"> 8:45 PM </option>
									<option value="21:00"> 9:00 PM </option>
								</select>
							</div>
						</div>
					</div>
                    
                    {#if viewMode === 'Schedule'}
					<div class="form-row">
						<div class="form-col gap-1">
							<div class = "title2"><label for="days">Days</label></div>
							<div class="flex flex-wrap gap-3 mt-2">
								{#each days as day}
									<label class="flex items-center p-2 bg-gray-100 border border-gray-200 rounded cursor-pointer hover:bg-gray-200 transition">
										<input type="checkbox" bind:group={daysArray} value={day} class="mr-2 w-4 h-4 text-green-600 focus:ring-green-500 rounded border-gray-300" />
										<span class="font-medium text-gray-700">{day}</span>
									</label>
								{/each}
							</div>
						</div>
					</div>

					<div class="flex flex-row form-row gap-6 mt-4">
						<div class="form-col">
							<div class = "title2 mb-2"><label for="schedule" >Schedule #</label></div>
							<div class="flex gap-4">
								<label class="flex items-center gap-2 cursor-pointer">
									<input type="radio" name="sched" bind:group={newSched} value="1" class="w-4 h-4 text-green-600 focus:ring-green-500"/> 
									<span class="font-bold">Draft 1</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input type="radio" name="sched" bind:group={newSched} value="2" class="w-4 h-4 text-green-600 focus:ring-green-500"/>
									<span class="font-bold">Draft 2</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input type="radio" name="sched" bind:group={newSched} value="3" class="w-4 h-4 text-green-600 focus:ring-green-500"/>
									<span class="font-bold">Draft 3</span>
								</label>
							</div>
						</div>
						{#key newType}
						{#if newType == "Lab"}
						<div class="form-col">
							<label for="class name" class="title2">Paired Lecture</label>
							<input
								id="class name"
								type="text"
								placeholder="Lecture Partner ID"
								class = "w-full bg-gray-100 border border-gray-300 focus:border-green-500 rounded-lg p-2"
								bind:value={newLecPartner}
							/>
						</div>
						{/if}
						{/key}
					</div>
                    {/if}

				</div>
				<div class="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-6">
                    <button type="button" class="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold transition" onclick={() => showModal = false}>Cancel</button>
                    <button class="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition shadow-md disabled:opacity-50" type="submit" disabled={submit}>
                        {submit ? 'Saving...' : (viewMode === 'Exam' ? 'Save Exam' : 'Save Class')}
                    </button>
                </div>
		</form> </div>
	</div>
	{/if}
	{/key}

	{#key modalDeleteUpdate}
		{#if showDeleteModal}
		<div class="delete-modal-backdrop">
			<div class="delete-modal z-200" use:tapOutside={(e) => clickOutDeleteModal()}>
				<h3 class="title2 text-gray-800">Are you sure to delete <span class="text-red-600">{deleteClassCourse} {deleteClassSection}</span>?</h3>
				<div class="flex">
					<button
						class="ml-auto mt-6 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition"
						onclick={handleDeleteSubmitEnd}
					>
						Delete
					</button>
				</div>
			</div>
		</div>
		{/if}
	{/key}

	<style>
		:global(body) {
			background-color: #f9fafb;
		}
		.cont {
			display: inline;
			gap: 10px;
			background-color: red;
		}
		.title1 {
			text-align: left;
			font-size: 2rem;
			font-weight: 800;
		}
		.title2{
			text-align: left;
			font-size: 1.1rem;
			font-weight: 600;
            margin-bottom: 0.25rem;
		}
		.backdrop {
			width: 100%;
			height: 100%;
			position: fixed;
            top: 0;
            left: 0;
			background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
			overflow-y: auto;
			z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
		}
		.modal {
			background: white;
            padding: 2.5rem;
            border-radius: 1rem;
            width: 90%;
            max-width: 800px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            z-index: 150;
		}

		.delete-modal {
			padding: 2rem;
			border-radius: 10px;
			max-width: 40rem;
			margin: 5% auto;
			background: white;
			justify-content: space-between;
			z-index: 150;
		}
		.form_total {
			display: flex;
			flex-wrap: wrap;
			justify-items: center;
			justify-content: space-between;
		}
		.center_col {
			display: flex;
			flex-direction: row;
			place-items: center;
			justify-content: space-between;
		}
		.form-row {
			padding-top: 10px;
			width: 100%;
		}
		.new-row {
			display: flex;
			flex-direction: row;
			gap: 50px;
			flex-wrap:wrap;
		}

		.form-col {
			text-align: left;
			display: flex;
			flex-direction: column;
			padding-top: 10px;
			width: 100%;
		}
	</style>