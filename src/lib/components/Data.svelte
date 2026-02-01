<script>
	import Sidebar from './Sidebar.svelte';
	import apiClient from '$lib/apiClient';
        import { Toaster, toast } from 'svelte-sonner';
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
	let demandDataState = $state({
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

	function haveCommonItems(str1, str2) {
		var arr1 = str1.split(',');
		var arr2 = str2.split(',');
		const set1 = new Set(arr1);
		const commonItems = arr2.filter((item) => set1.has(item));
		return [commonItems, commonItems.length > 0];
	}

	// Function to download CSV in Faculty Loading Format
	async function downloadCSV() {
        // Step 1: Fetch data from Supabase
        let { data, error } = await supabase
            .from('classes')
            .select('id, course, class_id, instructor, start_time, end_time, location, days, type')
			.eq("schedule", selectedSchedule);

        if (error) {
            console.error('Error fetching data:', error);
            return;
        }

        // Step 2: Convert to CSV format
        const headers = ['Course', 'Type', 'Section', 'Day', 'Time','Room', 'Instructor', 'Load', 'Remarks'];
        const csvRows = [
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

        const csvContent = csvRows.join('\n');

        // Step 3: Create a downloadable file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'classes.csv';
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

	async function insertData() {
		if (!hasUploadedFile) return;
		
		try {
			
			const dataToInsert = classes.map(cls => ({
				course: cls.course,
				class_id: cls.section,
				type: cls.type,
				instructor: cls.instructor,
				start_time: cls.start_time,
				end_time: cls.end_time,
				location: cls.room,
				days: cls.days,
				schedule: selectedSchedule,
				year: subject_info[cls.course]? subject_info[cls.course]["year"] : "-",
				lec_partner: cls.lec_partner
			}));
			
			const { data, error } = await supabase
				.from('classes')
				.insert(dataToInsert);
			
			if (error) {
				console.error("Error inserting data:", error);
				throw error;
			}
			currentAnalysis = []
			demandData[selectedSchedule] = {rawDemand: [], analysis: {}}
			await recomputeDemandAnalysis();
			update = !update;
			hasUploadedFile = false;
			classes = [];
		} catch (err) {
			console.error("Error in insertData:", err);
			alert("Error inserting data: " + err.message);
		}
	}

	async function replaceData() {
		if (!hasUploadedFile) return;
		
		try {
			
			const { error: deleteError } = await supabase
			.from('classes')
			.delete()
			.eq("schedule", selectedSchedule);
			
			if (deleteError) {
				console.error("Error deleting existing data:", deleteError);
				throw deleteError;
			}

				
			
			const dataToInsert = classes.map(cls => ({
				course: cls.course,
				class_id: cls.section,
				type: cls.type,
				instructor: cls.instructor,
				start_time: cls.start_time,
				end_time: cls.end_time,
				location: cls.room,
				days: cls.days,
				schedule: selectedSchedule,
				year: subject_info[cls.course]? subject_info[cls.course]["year"] : "-",
				lec_partner : cls.lec_partner
			}));
			
			const { data, error } = await supabase
				.from('classes')
				.insert(dataToInsert);
			
			if (error) {
			console.error("Error inserting new data:", error);
			throw error;
			}
			
			console.log("Successfully replaced data:", data);
			currentAnalysis = []
			demandData[selectedSchedule] = {rawDemand: [], analysis: {}}
			await recomputeDemandAnalysis();
			update = !update;
			hasUploadedFile = false;
			classes = [];
		} catch (err) {
			console.error("Error in replaceData:", err);
			alert("Error replacing data: " + err.message);
		}
	}

	function handleScheduleChange(schedule) {
		selectedSchedule = schedule;

		currentAnalysis = []
		// demandData[selectedSchedule] = {rawDemand: [], analysis: {}}
		// recomputeDemandAnalysis()
		// hasUploadedDemandFile[] = false
		if (hasUploadedFile) {
			const fileInput = document.getElementById('fileInput');
			if (fileInput && fileInput.files[0]) {
				parseCSV(fileInput.files[0], schedule);
			}
		}
		update = !update
	}

	function handleSemesterChange(sem){
		selectedSemester = sem;
		obligations = obligationClasses[selectedSemester]
		update = !update
	}

	// const toggleModal = () => {
	// 	showModal = true;
	// 	modalUpdate = !modalUpdate
	// 	console.log(modalUpdate);
	// };

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
			.eq("schedule", selectedSchedule);
		
		update = !update
		currentAnalysis = []
		demandData[selectedSchedule]={ rawDemand: [], analysis: {} }
		console.log("Current Anaalysis before recompute: ", currentAnalysis)

		recomputeDemandAnalysis()

		console.log("Current Anaalysis after recompute: ", currentAnalysis)
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

				if(type == "Lab"){
					if(row.Section.includes("/")){ //like WFT/TBD
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
						transformedData[i].lec_partner = (transformedData.find(
							(value, index) =>
							isLecPartner(transformedData[i], value))).section
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
			.eq('schedule', selectedSchedule);


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
			.eq('schedule', selectedSchedule);

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
			.eq("schedule", selectedSchedule);

		

		for(var i = 0; i < parsedDemand.length; i++){
			await supabase.from('demand').insert([
				{
					course: parsedDemand[i].course,
					demand: parsedDemand[i].demand,
					schedule: selectedSchedule
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
	
	async function saveEdit(clas, column, value) {

		//if (!editingCell) return;
		console.log("saveEdit called");
		
		try {
		const { error } = await supabase
			.from('classes')
			.update({ [column]: value })
			.eq('id', clas.id);
			
		if (error) throw error;
		console.log("Successfully updated");
		// Only trigger re-render after successful save
		//updateEdit++;
		update = !update
		} catch (error) {
		console.error('Error updating:', error);
		}
		
		editingCell = null;
		update = !update
	}
	
	// Click outside to cancel edit
	async function handleClickOutside(event) {
		console.log("handleClickOutside called");

		if(editingCell != null) {
			await saveEdit(editingCell, editColumn, editValue );
		}

		const tbody = document.querySelector('tbody');
			if (!tbody.contains(event.target)) {
				console.log('Clicked outside tbody');
				editingCell = null;
			}

		
		
	}
	
	onMount(async () => {
		instructors = await getInstructorData();
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
		
	});


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

		async function handleSubmit() {
			console.log("IM SUBMITTING")
			showModal = false;
			if(newDays == ""){
				acts.add({mode: 'danger' , message: '⚠ Cannot add class with no days.'})
				console.log("did it work?")
			}
			if(newSched == null || newSched == ""){
				acts.add({mode: 'danger' , message: '⚠ Cannot add class with no schedule.'})
				console.log("did it work?")
			}
			else{
				modalUpdate = !modalUpdate;
				submit = true;
				for (let i = 0; i < 7; i++) {
					if (daysArray[i] == true) {
						newDays.concat(days[i]);
					}
				}
			}
			update = true;
		}

		async function handleSubmitEnd() {
			console.log("HandelSubmitEnd Called")
			submit = false;
			update = false;
		}

		async function handleDeleteSubmitEnd() {
			submit = false;
			update = false;
			deleteClassFinal();
			clickOutDeleteModal();
		}

		async function sendData() {
			console.log("IM INSERTING")
			newDays = daysArray.join(',');

			if(newDays == ""){
				newDays = null
			}

			var year_level = '-';
			var teaching_load = 0;
			if(subject_info[newCourse]){
				///set year level of class
				year_level = subject_info[newCourse]["year"];


				///set teaching load
				if(newType == "Lec"){
					teaching_load = subject_info[newCourse]["lecTL"];
				} else {
					if(subject_info[newCourse]["labTL"]){
						teaching_load = subject_info[newCourse]["labTL"];
					}
				}

				///set units
			}

			const { data, error } = await supabase.from('classes').insert([
				{
					course: newCourse,
					type: newType,
					class_id: newClass,
					instructor: newInstr,
					start_time: newStart,
					end_time: newEnd,
					location: newLoc,
					days: newDays,
					schedule: newSched,
					year: year_level,
					lec_partner: newLecPartner
				}
			]);
			if (error) throw new Error(error.message);
			newDays = '';
			console.log(newDays);
			submit = false;
			update = false;
			
			currentAnalysis = []
			demandData[selectedSchedule] = {rawDemand: [], analysis: {}}

			// hasUploadedDemandFile[selectedSchedule] = false

			recomputeDemandAnalysis()
			return data;

		}

		const toggleModal = () => {
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
			const { error } = await supabase
				.from('classes')
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
			return searchCourse, searchSection

		}

</script>

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
	
	<div class="flex-1 p-6 ml-64">
		<div class="flex justify-between items-center mb-6">
			<div class ="flex flex-row gap-10">
				<h1 class="text-3xl font-bold text-gray-800">Class Schedule</h1>
				<!-- Semesters -->
				<div class = "flex gap-4">
					{#each semesters as sem}
					<button 
					class="px-4 py-2 rounded-lg font-medium transition-colors {selectedSemester === sem ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 '}"
					onclick={() => handleSemesterChange(sem)}
					>
						Semester {sem}
					</button>
					{/each}
				</div>
			</div>
			<!-- Download CSVs -->
			<button 
				class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
				onclick={downloadCSV}
				>
				Export CSV
			</button>
		</div>

		<!-- Upload and Quick Numbers -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

			<!-- Quick Numbers Section -->
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
												<!-- <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> -->
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
            
			<!-- Upload Class CSV Section -->
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

			<!-- Upload Demand CSV Section -->
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

		<!-- Search and Controls -->
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
			<!-- <button class="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 bg-white">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
				</svg>
				Filters
			</button> -->
			<SortAndFilterDropdownButton  onSort={handleSort}/>
			<button
				class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
				onclick={toggleModal}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
				Add Class
			</button>

			
		</div>

		<!-- Schedule Tabs -->
		<div class="flex flex-wrap gap-2 mb-4">
			{#each schedules as schedule}
			<button 
				class="px-4 py-2 rounded-lg font-medium transition-colors {selectedSchedule === schedule ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
				onclick={() => handleScheduleChange(schedule)}
			>
				Schedule {schedule}
			</button>
			{/each}
		</div>

		<!-- Classes Table -->
		<div>
		{#key update}
				<Classes 
					sortCategory={sortCategory}
					filterCategories={filterCategories}
					schedule={selectedSchedule} 
					demandData={demandData[selectedSchedule]?.rawDemand} 
					sectionAnalysis={demandData[selectedSchedule]?.analysis}
					semester = {selectedSemester}
					onToggleDeleteModal= {toggleDeleteModal}
					searchCourse, searchSection = {handleSearch()}
				/>
		{/key}
		</div>
	</div>
</div>

<!-- -------------------------------------------------------- -->
<!-- THe Modal for adding a class -->
 <!-- -------------------------------------------------------- -->
{#key modalUpdate}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (because of reasons) -->
{#if modalUpdate}
	<div class="backdrop z-100">
		<div class="modal z-200" use:tapOutside={(e) => clickOutModal()}>
			<h1 class="title1">Add a New Class</h1>
			<form onsubmit={handleSubmit} name="add class">
				<div class="form_total gap-3">
					<div class="form-row">
						<div class="center_col">
							<div class="form-col gap-2">
								<label for="class name" class="title2">Course</label>
								<input
									id="class name"
									type="text"
									placeholder="Course"
									class = "block bg-gray-200 rounded-lg p-2.5"
									required
									bind:value={newCourse}
								/>
							</div>
							<div class="form-col gap-2">
								<label for="type" class="title2">Type</label>
								<select bind:value={newType} class ="block bg-gray-200 rounded-lg p-2.5">
									{#if labSubjects.includes(newCourse)}
										<option value = "Lec">Lec</option>
										<option value = "Lab">Lab</option>
									{:else}
										<option value = "Lec">Lec</option>
									{/if}
								</select>
							</div>
							<div class="form-col gap-2">
								<label for="class id" class="title2">Class ID</label>
								<input 
									id="classID" 
									type="text" 
									placeholder="Class ID" 
									bind:value={newClass} 
									class = "bg-gray-200 rounded-lg p-2.5"
									required
								/>
							</div>
						</div>
					</div>

					<div class="form-row">
						<div class="center_col">
							<div class="form-col gap-2">
								<label for="instructor" class="title2">Instructor Name</label>
								<select bind:value={newInstr} class = "bg-gray-200 rounded-lg p-2.5">
									<option value = "TBA"> TBA </option>
									{#each instructors as instr}
										<option value = {instr.name}>{instr.name}</option>
									{/each}
								</select>
							</div>
							<div class="form-col gap-2">
								<label for="location" class="title2">Location</label>
								<select bind:value={newLoc} class = "bg-gray-200 rounded-lg p-2.5">
									{#each rooms as room}
										<option value = {room.name}>{room.name}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
					<div class="form-row">
						<div class="center_col">
							<div class="form-col gap-2">
								<label for="start" class="title2">Start Time</label>
								<select bind:value={newStart} class = "bg-gray-200 rounded-lg p-2.5">
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
							<div class="form-col gap-2">
								<label for="end" class="title2">End Time</label>
								<select bind:value={newEnd} class = "bg-gray-200 rounded-lg p-2.5">
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
					<div class="form-row">
						<div class="form-col gap-2">
							<div class = "title2"><label for="days" >Days</label></div>
							<div class="new-row" >
								<!-- <div class="griddy"> -->
									<div>
										<input class="cont" type="checkbox" bind:group={daysArray} value="Mon" /> Monday
										<br />
									</div>
									<div>
										<input class="cont" type="checkbox" bind:group={daysArray} value="Tues" />
										Tuesday
										<br />
									</div>
									<div>
										<input class="cont" type="checkbox" bind:group={daysArray} value="Wed" />
										Wednesday
										<br />
									</div>
									<div>
										<input class="cont" type="checkbox" bind:group={daysArray} value="Thurs" />
										Thursday
										<br />
									</div>
									<div>
										<input class="cont" type="checkbox" bind:group={daysArray} value="Fri" />
										Friday<br />
									</div>
									<div>
										<input class="cont" type="checkbox" bind:group={daysArray} value="Sat" />
										Saturday<br />
									</div>
							</div>
						</div>
					</div>

					<div class="flex flex-row form-row gap-4">
						<div class="form-col">
							<div class = "title2"><label for="schedule" >Schedule #</label></div>
							<div class="new-row">
								<div>
									<input class="cont" type="radio" name="sched" bind:group={newSched} value = "1"/> 
										1
									<br />
								</div>
								<div>
									<input class="cont" type="radio" name="sched" bind:group={newSched} value = "2"/>
										2
									<br />
								</div>
								<div>
									<input class="cont" type="radio" name="sched" bind:group={newSched} value = "3"/>
										3
									<br />
								</div>
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
								class = "block bg-gray-200 rounded-lg p-2.5"
								bind:value={newLecPartner}
							/>
						</div>
						{/if}
						{/key}
					</div>
				</div>
				<input class="submit-btn" type="submit" value="Submit" onclick={handleSubmitEnd} />
			</form>
		</div>
	</div>
{/if}
{/key}

{#key modalDeleteUpdate}
{#if modalDeleteUpdate}
<div class="backdrop z-100">
	<div class="delete-modal z-200" use:tapOutside={(e) => clickOutDeleteModal()}>
		<h3 class="title2">Are you sure to delete {deleteClassCourse} {deleteClassSection}?</h3>
		<div class="flex">
			<button
				class="ml-auto my-6 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
				onclick={handleDeleteSubmitEnd}
			>
				Delete
			</button>
		</div>
		
	</div>
</div>
{/if}
{/key}
<div>
    {#if submit}
        {#await sendData()}
            <p class="text-white">Sending data...</p>
        {:then data}
            <p class="text-white">Successfully sent data.</p>
        {:catch error}
            <p>Something went wrong while sending the data:</p>
            <pre>{error}</pre>
        {/await}
    {/if}
</div>
<style>
	:global(body) {
		background-color: #f9fafb;
	}
	/* .to_focus{
		--tw-ring-color: rgba(16, 185, 129, var(--tw-ring-opacity));
		border-color: var(--color-green-500);
	} */
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
		font-size: 1.25rem;
		font-weight: 600;
	}
	.backdrop {
		width: 100%;
		height: 100%;
		position: fixed;
		background: rgba(0, 0, 0, 0.8);
		overflow-y: auto;
		z-index: 100;
	}
	.modal {
		/* text-align: center; */
		padding: 5rem;
		border-radius: 10px;
		max-width: 60rem;
		margin: 10% auto;
		background: white;
		/* justify-items: center; */
		justify-content: space-between;
		z-index: 150;
	}

	.delete-modal {
		/* text-align: center; */
		padding: 2rem;
		border-radius: 10px;
		max-width: 40rem;
		margin: 5% auto;
		background: white;
		/* justify-items: center; */
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
	/* input[type='text'] {
		width: 15rem;
		background-color: rgb(243 244 246);
		border-color: rgb(209 213 219);
		border-radius: 0.25rem;
		padding: 1rem;
		margin-bottom: 0.5rem;
	} */
	.form-row {
		padding-top: 10px;
		width: 100%;
	}
	.new-row {
		display: flex;
		flex-direction: row;
		gap: 50px;
		/* background-color: aqua; */
		flex-wrap:wrap;
	}

	input[type='checkbox'] {
		-webkit-appearance:none;
		width:15px;
		height:15px;
		background:white;
		border-radius:5px;
		border:2px solid #555;
	}
	input[type='checkbox']:checked {
		background:green;
	}
	.form-col {
		text-align: left;
		display: flex;
		flex-direction: column;
		padding-top: 10px;
		width: 100%;
		/* margin-left: 2.5rem; */
		margin-right: 2.5rem;
	}
	.submit-btn {
		margin-top: 1.5rem;
		background-color: green;
		color: white;
		padding-top: 0.625rem;
		padding-bottom: 0.625rem;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
		border-radius: 0.625rem;
	}
</style>
