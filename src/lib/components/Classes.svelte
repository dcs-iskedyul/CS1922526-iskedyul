<script>
	// import Header from './Header.svelte';
	// import SectionWrapper from './SectionWrapper.svelte';
	import Sidebar from './Sidebar.svelte';
	import { supabase } from '$lib/supabaseClient';
	import { blocks, obligationClasses, rooms, schedules, instructors, storeClasses, labSubjects, conflictsStore, subject_info, parseForConflicts, timeConflict, parseForWarnings, delayed_blocks } from '$lib/store.js';
	import bin from '$lib/icons/bin.png';
	import { writable } from 'svelte/store';
	import {slide,fade} from 'svelte/transition'

	///for the edit class stuff
	import { onMount } from 'svelte';

	let instructorsClasses = [];
	onMount(async () => {
		instructorsClasses = await getInstructorData();
		
	});

	import Papa from 'papaparse';
	import { json } from '@sveltejs/kit';

	let conflicts = $state([]);

	let types = ["Normal", "Delayed"]
	
	let selectedType = $state("")

	let update = $state(false)

	let { onToggleDeleteModal, schedule, demandData = [], sectionAnalysis = {}, sortCategory = "", filterCategories = [], semester, searchCourse="", searchSection="" } = $props();

	let final_subjects = $state([])

	let final_blocks = $state([])
	let missing_classes = $state([])

	let lab_warnings = $state([])
	let same_time_warnings = $state([])
	let consecutive_warnings = $state([])

	
	// function checkDemand


  async function getInstructorData() {

    console.log("From InstructorInfo.svelte: Getting data");
    const { data, error } = 
    await supabase
    .from('instructors')
    .select()
    .order("name", { ascending: true });
    if (error) throw new Error(error.message);


    console.log(data);
    return data;
  }

	let showDeleteModal = $state(false);
	let classToDelete = $state(null);


	function cartesian(args) {
		var r = [], max = args.length-1;
		function helper(arr, i) {
			for (var j=0, l=args[i].length; j<l; j++) {
				var a = arr.slice(0); // clone arr
				a.push(args[i][j]);
				if (i==max)
					r.push(a);
				else
					helper(a, i+1);
			}
		}
		helper([], 0);
		return r;
	}

	function ifValidBlock(block){
		for (var i = 0; i < block.length; i++ ){
			for (var j = i+1; j<block.length; j++){
				if(timeConflict(block[i], block[j])){
					console.log("TIME CONFLICT IN BLOCK", (block[i].course + block[i].class_id), (block[j].course + block[j].class_id))
					return false
				}
				else if(block[i].course == block[j].course && block[i].type == "Lec" && block[j].type == "Lab"){
					if (block[j].lec_partner != block[i].class_id){
						console.log("Block wrong lab and lec partnership", block[j].lec_partner, block[i].class_id)
						return false
					}
				}
			}
		}
		return true
	}

	function clearBlocks(obj){
		for (var i = 0; i<obj.length; i++){
			console.log("1st step", obj[i])
			for(var j = 0; j< obj[i].length; j++){
				console.log("2nd step", obj[i])
				for(var member in obj[i][j]){
					console.log("I WILL DELETE:", obj[i][j][member])
					Object.keys(obj[i][j][member]).forEach(key => delete obj[i][j][member][key]);
				}
			}
		}
	}

	function generateBlocks(type){
		selectedType = type
		clearBlocks(final_blocks)
		final_blocks = []
		console.log("FINAL BLOCKS NOW: ", final_blocks)
		update = !update
		if(type == "Normal"){
			generateNormalBlocks()
		}
		else{
			generateDelayedBlocks()
		}
	}

	function generateNormalBlocks() {
		// group all classes by subject
		var avail_classes = final_subjects
		console.log("The avail classes are: ", avail_classes)
		var block_classes = blocks[semester]
		
		var fin_blocks = []
		// for(var k = 0; k< fin_blocks.length; k++){
		// 	fin_blocks = {}
		// }
		console.log("THESE ARE THE FIN BLOCKS:", fin_blocks)

		missing_classes = []
		console.log(block_classes)
		var blocks_per_yr = []

		var list_of_blocks = {}
		for (var member in list_of_blocks) delete list_of_blocks[member];
		for (var i = 0; i < block_classes.length; i++){
			list_of_blocks = {}
			console.log("THE LIST OF BLOCKS ARE: ", list_of_blocks)
			for (var j = 0; j < block_classes[i].length; j++){
				if (labSubjects.includes(block_classes[i][j])){
					list_of_blocks[(block_classes[i][j] + " Lec")] = []
					list_of_blocks[(block_classes[i][j] + " Lab")] = []
				}
				else{
					list_of_blocks[block_classes[i][j]] = []
				}
				
			}
			blocks_per_yr.push(list_of_blocks)
			console.log("For this year: ", i)
			console.log("these are the blocks: ", list_of_blocks)
		}
		console.log("These are the classes in the blocks", blocks_per_yr)
		// class_dict = {}
		for (i = 0; i < avail_classes.length; i++){
			var curr_class = avail_classes[i]
			if (curr_class.year != "-" && obligationClasses[semester].includes(curr_class.course)){
				console.log("The class being checked rn is: ", curr_class.course + " " + curr_class.class_id)
				var curr_year = parseInt((curr_class.year.slice(2))) - 1
				console.log("Its year is: ", curr_year)
				var current_arr = []
				if(labSubjects.includes(curr_class.course)){
					if (curr_class.type == "Lec"){
						console.log("I am a lec of a subject with labs")
						current_arr = blocks_per_yr[curr_year][curr_class.course + " Lec"]
					}
					else if (curr_class.type == "Lab"){
						console.log("I am a lab of a subject with labs")
						current_arr = blocks_per_yr[curr_year][curr_class.course + " Lab"]
					}
				}
				else{
					console.log("I have no labs")
					console.log("Curr year is: ", curr_year)
					console.log("blocks are in this year: ", blocks_per_yr[curr_year])
					console.log("Curr course is: ", curr_class.course)
					current_arr = blocks_per_yr[curr_year][curr_class.course]
				}
				console.log("The current classes in the subject are: ", current_arr)
				current_arr.push(curr_class)
				console.log("test2", current_arr)
				if(labSubjects.includes(curr_class.course)){
					if (curr_class.type == "Lec"){
						blocks_per_yr[curr_year][curr_class.course + " Lec"] = current_arr
					}
					else if (curr_class.type == "Lab"){
						blocks_per_yr[curr_year][curr_class.course + " Lab"] = current_arr
					}
				}
				else{
					blocks_per_yr[curr_year][curr_class.course] = current_arr
				}
			}
		}
		console.log("These are the blocks", blocks_per_yr)

		for (i = 0; i < 4; i++){
			var arr = []
			var values = Object.values(blocks_per_yr[i])
			var keys = Object.keys(blocks_per_yr[i])
			missing_classes.push((values.map(x => x.length==0 ? keys[values.indexOf(x)] : false)).filter(x => x))
			
			console.log("Values", (values.map(x => x.length==0 ? keys[values.indexOf(x)] : false)).filter(x => x))
			// for(j = 0; j < blocks_per_yr[i].length; j++){
				
			// }
		}
		console.log("Missing Classes", missing_classes)
		
		for (i = 0; i < 4; i++){
			if (missing_classes[i].length == 0){
				fin_blocks.push(cartesian(Object.values(blocks_per_yr[i])))
				console.log("Valid Block: ", cartesian(Object.values(blocks_per_yr[i])))
			}
			else{
				fin_blocks.push([])
			}
		}

		for(i = 0; i<4; i++){
			fin_blocks[i] = fin_blocks[i].filter(ifValidBlock)
			console.log("This Block: ", i, "has this: ", fin_blocks[i].filter(ifValidBlock))
		}

		final_blocks = JSON.parse(JSON.stringify(fin_blocks))
		fin_blocks = []
		console.log("Final Blocks: ", fin_blocks)

		for (member in list_of_blocks) delete list_of_blocks[member];
		blocks_per_yr = null
		console.log("These are the list_of_blocks: ", list_of_blocks)
		console.log("These are the blocks_per_yr: ", blocks_per_yr)
		update = !update
		
	}

	function generateDelayedBlocks() {
		// group all classes by subject
		var d_avail_classes = final_subjects
		console.log("The avail classes are: ", d_avail_classes)
		var d_block_classes = Object.values(delayed_blocks[semester])

		var d_fin_blocks = []
		console.log("THESE ARE THE D FIN BLOCKS:", d_fin_blocks)
		missing_classes = []
		var d_list_of_blocks = {}
		for (var member in d_list_of_blocks) delete d_list_of_blocks[member];
		console.log("These are the block classes", d_block_classes)
		var d_blocks_per_yr = []
		for (var i = 0; i < d_block_classes.length; i++){
			d_list_of_blocks = {}
			for (var j = 0; j < d_block_classes[i].length; j++){
				if (labSubjects.includes(d_block_classes[i][j])){
					d_list_of_blocks[(d_block_classes[i][j] + " Lec")] = []
					d_list_of_blocks[(d_block_classes[i][j] + " Lab")] = []
				}
				else{
					d_list_of_blocks[d_block_classes[i][j]] = []
				}
				
			}
			d_blocks_per_yr.push(d_list_of_blocks)
			console.log("For block: ", i)
			console.log("these are the classes: ", d_list_of_blocks)
		}
		console.log("These are the classes in the blocks", d_blocks_per_yr)
		// class_dict = {}
		for(j = 0; j < d_block_classes.length; j++){
			var d_curr_block = d_block_classes[j]
			for (i = 0; i < d_avail_classes.length; i++){
				var d_curr_class = d_avail_classes[i]
				if (d_curr_block.includes(d_curr_class.course)){
					console.log("The class being checked rn is: ", d_curr_class.course + " " + d_curr_class.class_id)
					console.log("Its block is: ", j)
					var d_current_arr = []
					if(labSubjects.includes(d_curr_class.course)){
						if (d_curr_class.type == "Lec"){
							console.log("I am a lec of a subject with labs")
							d_current_arr = d_blocks_per_yr[j][d_curr_class.course + " Lec"]
						}
						else if (d_curr_class.type == "Lab"){
							console.log("I am a lab of a subject with labs")
							d_current_arr = d_blocks_per_yr[j][d_curr_class.course + " Lab"]
						}
					}
					else{
						console.log("I have no labs")
						console.log("Curr block is: ", j)
						console.log("classes are in this block: ", d_blocks_per_yr[j])
						console.log("Curr course is: ", d_curr_class.course)
						d_current_arr = d_blocks_per_yr[j][d_curr_class.course]
					}
					console.log("The current classes in the subject are: ", d_current_arr)
					d_current_arr.push(d_curr_class)
					console.log("test2", d_current_arr)
					if(labSubjects.includes(d_curr_class.course)){
						if (d_curr_class.type == "Lec"){
							d_blocks_per_yr[j][d_curr_class.course + " Lec"] = d_current_arr
						}
						else if (d_curr_class.type == "Lab"){
							d_blocks_per_yr[j][d_curr_class.course + " Lab"] = d_current_arr
						}
					}
					else{
						d_blocks_per_yr[j][d_curr_class.course] = d_current_arr
					}
				}
			}
		}
		console.log("These are the blocks", d_blocks_per_yr)

		for (i = 0; i < d_block_classes.length; i++){
			var arr = []
			var values = Object.values(d_blocks_per_yr[i])
			var keys = Object.keys(d_blocks_per_yr[i])
			missing_classes.push((values.map(x => x.length==0 ? keys[values.indexOf(x)] : false)).filter(x => x))
			
			console.log("Values", (values.map(x => x.length==0 ? keys[values.indexOf(x)] : false)).filter(x => x))
			// for(j = 0; j < blocks_per_yr[i].length; j++){
				
			// }
		}
		console.log("Missing Classes", missing_classes)
		
		for (i = 0; i < d_block_classes.length; i++){
			if (missing_classes[i].length == 0){
				d_fin_blocks.push(cartesian(Object.values(d_blocks_per_yr[i])))
				console.log("Valid Block: ", cartesian(Object.values(d_blocks_per_yr[i])))
			}
			else{
				d_fin_blocks.push([])
			}
		}

		for(i = 0; i<d_block_classes.length; i++){
			d_fin_blocks[i] = d_fin_blocks[i].filter(ifValidBlock)
			console.log("This Block: ", i, "has this: ", d_fin_blocks[i].filter(ifValidBlock))
		}

		final_blocks = JSON.parse(JSON.stringify(d_fin_blocks))

		console.log("Final Blocks: ", final_blocks)
		d_fin_blocks = []
		for (member in d_list_of_blocks) delete d_list_of_blocks[member];
		d_blocks_per_yr = null
		update = !update
	}

	function needsMoreSections(course) {
		const courseData = (demandData.find(d => d.course == course.course));
		var courseDemand = 0
		if(courseData){
			courseDemand = courseData.demand
		}
		// console.log(sectionAnalysis)
		// console.log(course.course)
		if (!sectionAnalysis[course.course]) {
			return "Not in demand file";
		}
		
		var courseAccomo = 0;
		if(course.type == "Lec") {
			courseAccomo = sectionAnalysis[course.course].lecAccomodation;
		} else {
			courseAccomo = sectionAnalysis[course.course].labAccomodation;
		}
		
		if (courseAccomo > courseDemand) { // has free slots
			return "+ " + String(courseAccomo - courseDemand);
		} else {
			return "- " + String(courseDemand - courseAccomo);
		}
	}

	function getClassDemand(course) {
		const courseData = demandData[schedule]?.find(d => d.course === course);
		return courseData
	}
	async function downloadCSV() {
        // Step 1: Fetch data from Supabase
        let { data, error } = await supabase
            .from('classes')
            .select('id, course, section, type, instructor, start_time, end_time, room, days, load');

        if (error) {
            console.error('Error fetching data:', error);
            return;
        }

        // Step 2: Convert to CSV format
        const headers = ['id', 'course', 'section', 'type', 'instructor', 'start_time', 'end_time', 'room', 'days', 'load'];
        const csvRows = [
            headers.join(','), // CSV header
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(',')) // Each row
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

	async function getData() {
		console.log("From classes.svelte: Getting data");
		console.log(sortCategory);

		//default sort is by course
		var finalSort = 'course';

		//if filtering categories is empty, just include all
		if(filterCategories.length == 0){
			filterCategories.push("UG1", "UG2", "UG3", "UG4", "-", "G");
		}

		//if sortCategory exists
		if(sortCategory.length != 0 || sortCategory){
			console.log("no sortCategory selected");
			finalSort = sortCategory;
		}
		
		// if(searchCourse != "" || searchSection != ""){
		// 	const { data, error } = 
		// 	await supabase
		// 	.from('classes')
		// 	.select()
		// 	.eq("schedule", schedule)
		// 	.in("year", filterCategories)
		// 	.in("course", searchCourse)
		// 	.in("class_id", searchSection)
		// 	.order(finalSort, { ascending: true });
		// }
		// else{
			const { data, error } = 
			await supabase
			.from('classes')
			.select()
			.eq("schedule", schedule)
			.in("year", filterCategories)
			.order(finalSort, { ascending: true });
		// }
		//
		if (error) throw new Error(error.message);
		// console.log(data);
		// classes = data
		conflicts = []
		conflicts = parseForConflicts(data);
		storeClasses.set(data);
		console.log("CLASSES: ", data);
		for (var j = 0; j < data.length; j++) {
			if (!checkConflict(data[j])) {
				final_subjects.push(data[j]);
			}
		}
		lab_warnings = []
		same_time_warnings = []
		consecutive_warnings = []


		[lab_warnings, same_time_warnings, consecutive_warnings] = parseForWarnings(final_subjects);
		console.log("LAB WARNINGS ARE: ", lab_warnings)
		console.log("SAME TIME WARNINGS ARE: ", same_time_warnings)
		console.log("CONSECUTIVE WARNINGS ARE: ", consecutive_warnings)
		console.log("VALID CLASSES: ", final_subjects);

		return data;
	}

	function checkConflict(clas) {
		const classId = clas.section || clas.class_id;
		const class_title = clas.course + ' ' + classId;
		
		for (var i = 0; i < conflicts.length; i++) {
			if ((conflicts[i][0] == class_title || conflicts[i][1] == class_title) && clas.schedule == conflicts[i][3]) {
				return true;
			}
		}
		return false;
	}

	function checkWarning(clas){
		const classId = clas.section || clas.class_id;
		const class_title = clas.course + ' ' + classId;
		
		let lab_warnings = $state([])
		let same_time_warnings = $state([])
		let consecutive_warnings = $state([])


		for (var i = 0; i < lab_warnings.length; i++) {
			if ((lab_warnings[i][0] == class_title || lab_warnings[i][1] == class_title) && clas.schedule == conflicts[i][3]) {
				return true;
			}
		}
		return false;
	}

	function getConflict(clas) {
		const classId = clas.section || clas.class_id;
		const class_title = clas.course + ' ' + classId;
		
		var classConflicts = []

		for (var i = 0; i < conflicts.length; i++) {
			if ((conflicts[i][0] == class_title || conflicts[i][1] == class_title) && clas.schedule == conflicts[i][3]) {
				classConflicts.push(conflicts[i][2])
			}
		}



		return ([...new Set(classConflicts)].sort());
	}

    async function handleUpload(event) {
		const file = event.target.files[0];

		Papa.parse(file, {
			header: false,
			delimiter: ',',
			complete: async function(results) {
				const transformedData = results.data
					.slice(2)
					.filter(row => row[0] && !row[3]?.includes('DISSOLVED'))
					.map(row => {
						const scheduleStr = row[3];
						const courseInfo = row[1]?.trim().split(' ');
						
						const timeMatch = scheduleStr?.match(/([MTWThF]+)\s+(\d{1,2}(?::\d{2})?(?:AM)?)-(\d{1,2}(?::\d{2})?(?:(?:A|P)M)?(?:PM)?)/i);
						
						const locationMatch = scheduleStr?.match(/(?:AECH-[A-Za-z0-9]+(?:enture)?|TBA)/i);
						
						let instructorName = '';
						const instructorMatch = scheduleStr?.match(/(?:Rm|Room)\s+([A-Z]+(?:,\s*[A-Z\s]+)+)/) || 
												scheduleStr?.match(/\n([A-Z]+(?:,\s*[A-Z\s]+)+)/);
						instructorName = instructorMatch ? instructorMatch[1].trim() : '';

						return {
							course: `${courseInfo[0]} ${courseInfo[1]}`,
							section: courseInfo[2] || 'UNKNOWN', // Updated from class_id to section
							instructor: instructorName,
							start_time: timeMatch ? convertTo24Hour(timeMatch[2]) : '',
							end_time: timeMatch ? convertTo24Hour(timeMatch[3]) : '',
							room: locationMatch ? locationMatch[0] : '', // Updated from location to room
							days: timeMatch ? parseDays(timeMatch[1]) : '',
							type: '', // New field for type
							load: '' // New field for load
						};
					})
					.filter(item => item !== null);

				await supabase.from('classes').insert(transformedData).then(() => update = !update);
			}
		});
	}

	function findRoom(str) {
		return rooms.find(room => str.includes(room)) || '';
	}

	function parseDays(dayStr) {
		const dayMap = {
			'M': 'Mon',
			'T': 'Tues',
			'W': 'Wed',
			'Th': 'Thurs',
			'F': 'Fri',
			'S': 'Sat'
		};
		
		return dayStr.match(/(M|T|W|Th|F|S)/g)?.map(d => dayMap[d]).join(',') || '';
	}

	function convertTo24Hour(timeStr) {
		const [time, modifier] = timeStr.split(/(?=[AP]M)/);
		let [hours, minutes] = time.split(':');
		hours = parseInt(hours);
		
		if (modifier === 'PM' && hours < 12) hours += 12;
		if (modifier === 'AM' && hours === 12) hours = 0;
		
		return `${hours.toString().padStart(2, '0')}:${minutes || '00'}`;
	}


	const deleteClass = async (clas) => {
		try {
			const { error } = await supabase
				.from('classes')
				.delete()
				.eq('id', clas.id);
				
			if (error) throw error;
			
			await getData();
			update = !update;
		} catch (err) {
			console.error(err);
		}
	};


	// ------------------------ Edit Class Helper Functions ----------------------
	
	
	let editingCell = null;

  
  

  
//-----------------------new editing stuff

async function saveEditedRow() {
    try {
        // Destructure the entire edited row from the store
        const rowToUpdate = $editingRow;
        
        // Update the entire row in Supabase
        const { error } = await supabase
            .from('classes')
            .update({
                course: rowToUpdate.course,
                type: rowToUpdate.type,
                class_id: rowToUpdate.class_id,
                days: rowToUpdate.days,
                start_time: rowToUpdate.start_time,
                end_time: rowToUpdate.end_time,
                location: rowToUpdate.location,
                instructor: rowToUpdate.instructor,
                load: rowToUpdate.load
            })
            .eq('id', rowToUpdate.id);
        
        if (error) throw error;
        
        // Trigger a data refresh
        update = !update;
        
        // Reset editing state
        editingRowIndex.set(null);

		// Optionally refresh data
		await getData();
    } catch (error) {
        console.error('Error updating row:', error);
        // Optionally show an error toast or message to the user
    }
}
  
// Store to track which row is currently being edited
let editingRowIndex = writable(null);

// Temporary row data for editing
let editingRow = writable({});

// Function to start editing a row
function startEditing(clas, rowIndex) {
	// Reset any previous editing
	if ($editingRowIndex !== null) {
		editingRowIndex.set(null);
	}

	// Set the current row being edited
	editingRowIndex.set(rowIndex);
	
	// Create a deep copy of the class object for editing
	editingRow.set({...clas});
}


// Function to handle input changes during editing
function handleInputChange(field, value) {
	editingRow.update(current => ({
		...current,
		[field]: value
	}));
}

	function confirmDelete(clas) {
		classToDelete = clas;
		showDeleteModal = true;
	}

	function cancelDelete() {
		showDeleteModal = false;
		classToDelete = null;
	}

	async function confirmDeleteClass() {
		if (!classToDelete) return;
		
		try {
			const { error } = await supabase
				.from('classes')
				.delete()
				.eq('id', classToDelete.id);
				
			if (error) throw error;
			
			await getData();
			update = !update;
		} catch (err) {
			console.error(err);
		}
		
		showDeleteModal = false;
		classToDelete = null;
	}
</script>

<table>
    <thead class="new-thead z-10">
        <tr>
            <th class="course">Course</th>
            <th class="type">Type</th>
            <th class="section">Section</th>
            <th class="days">Day</th>
            <th class="time">Start Time</th>
            <th class="time">End Time</th>
            <th class="room">Room</th>
            <th class="size">Size</th>
            <th class="instructor">Instructor</th>
            <th class="load">Load</th>
			<th class="status">Status</th>
			<th>+/- Slots</th>
            <th>Delete</th>
			<th>Edit</th>
        </tr>
    </thead>
    

	<tbody>
		{#key update}
			{#await getData()}
				<tr><td>Fetching</td></tr>
			{:then data}
				{#each data as clas, rowIndex}
					<tr class={checkConflict(clas) ? 'conf-row' : 'row'} transition:fade>
						<!-- Course Column -->
						<td class="item course" >
							{#if $editingRowIndex === rowIndex}
								<input 
									type="text" 
									value={$editingRow.course} 
									oninput={(e) => handleInputChange('course', e.target.value)}
									class="w-full p-1 border"
								/>
							{:else}
							<div class = "flex flex-row items-center">
								{clas.course}
								{#if (obligationClasses[semester].includes(clas.course))}
								<div class="relative ml-1">
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="z-40"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
								</div>
								{/if}
							</div>
								
							{/if}
						</td>
	
						<!-- Type Column -->
						<td class="item type">
							{#if $editingRowIndex === rowIndex}
								<input 
									type="text" 
									value={$editingRow.type} 
									oninput={(e) => handleInputChange('type', e.target.value)}
									class="w-full p-1 border"
								/>
							{:else}
								{clas.type}
							{/if}
						</td>
	
						<!-- Section Column -->
						<td class="item section">
							{#if $editingRowIndex === rowIndex}
								<input 
									type="text" 
									value={$editingRow.class_id} 
									oninput={(e) => handleInputChange('class_id', e.target.value)}
									class="w-full p-1 border"
								/>
							{:else}
								{clas.class_id}
							{/if}
						</td>
	
						<!-- Days Column -->
						<td class="item days">
							{#if $editingRowIndex === rowIndex}
								<input 
									type="text" 
									value={$editingRow.days} 
									oninput={(e) => handleInputChange('days', e.target.value)}
									class="w-full p-1 border"
								/>
							{:else}
								{clas.days}
							{/if}
						</td>
	
						<!-- Start Time Column -->
						<td class="item start_time">
							{#if $editingRowIndex === rowIndex}
								
								<select bind:value={$editingRow.start_time}>
									<option value="7:00"> 7:00 AM </option>
									<option value="7:15"> 7:15 AM </option>
									<option value="7:30"> 7:30 AM </option>
									<option value="7:45"> 7:45 AM </option>
									<option value="8:00"> 8:00 AM </option>
									<option value="8:15"> 8:15 AM </option>
									<option value="8:30"> 8:30 AM </option>
									<option value="8:45"> 8:45 AM </option>
									<option value="9:00"> 9:00 AM </option>
									<option value="9:15"> 9:15 AM </option>
									<option value="9:30"> 9:30 AM </option>
									<option value="9:45"> 9:45 AM </option>
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
							{:else}
								{clas.start_time}
							{/if}
						</td>
	
						<!-- End Time Column -->
						<td class="item end_time">
							{#if $editingRowIndex === rowIndex}
								
								<select bind:value={$editingRow.end_time}>
									<option value="7:00"> 7:00 AM </option>
									<option value="7:15"> 7:15 AM </option>
									<option value="7:30"> 7:30 AM </option>
									<option value="7:45"> 7:45 AM </option>
									<option value="8:00"> 8:00 AM </option>
									<option value="8:15"> 8:15 AM </option>
									<option value="8:30"> 8:30 AM </option>
									<option value="8:45"> 8:45 AM </option>
									<option value="9:00"> 9:00 AM </option>
									<option value="9:15"> 9:15 AM </option>
									<option value="9:30"> 9:30 AM </option>
									<option value="9:45"> 9:45 AM </option>
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
							{:else}
								{clas.end_time}
							{/if}
						</td>
	
						<!-- Room Column -->
						<td class="item room">
							{#if $editingRowIndex === rowIndex}
								
								<select bind:value={$editingRow.location}>
									{#each rooms as room}
										<option value = {room.name}>{room.name}</option>
									{/each}
								</select>
									
							{:else}
								{clas.location}
							{/if}
						</td>
	
						<!-- Size Column -->
						<td class="item size">
							<div>
								{(rooms.find(r => r.name === clas.location))?.capacity || 0}
							</div>
						</td>
	
						<!-- Instructor Column -->
						<td class="item instructor">
							{#if $editingRowIndex === rowIndex}

								<select bind:value={$editingRow.instructor} class = "bg-gray-200 rounded-md">
									<option value = "TBA"> TBA </option>
									{#each instructorsClasses as instr}
										<option value = {instr.name}>{instr.name}</option>
									{/each}
								</select>
							{:else}
								{clas.instructor}
							{/if}
						</td>
	
						<!-- Load Column -->
						<td class="item load">
							{#if (clas.course in subject_info)}
							{subject_info[clas.course]["units"] || ''}
							{:else}
							{"3"}
							{/if}
						</td>
	
						<!-- Status Column -->
						<td class="item status">
							{#if checkConflict(clas)}
								<div class="flex flex-wrap gap-2">
									{#each getConflict(clas) as statConf}
									<div class="status-indicator conflict" title="This class has scheduling conflicts">
										<span class="status-text">{statConf}</span>
									</div>
									{/each}
								</div>
							{:else if clas.location === 'TBA'}
								<div class="status-indicator no-data" title="Venue not yet assigned">
									<span class="status-text">Not enough data</span>
								</div>
							{:else if sectionAnalysis && Object.keys(sectionAnalysis).length > 0 && sectionAnalysis[clas.course]}
								{@const analysis = sectionAnalysis[clas.course]}
								
								<!-- Get this class's room capacity -->
								{@const roomObj = rooms.find(r => r.name === clas.location)}
								{@const roomCapacity = roomObj ? roomObj.capacity : 0}
								
								{#if clas.type === 'Lec'}
									{@const remainingCapacity = analysis.lecAccomodation - roomCapacity}
									{@const canDissolve = remainingCapacity >= analysis.studentDemand}
									
									{@const isOnlySection = analysis.currentSections <= 1}
									
									{#if canDissolve && !isOnlySection}
										<div class="status-indicator dissolve" 
											title={`This section can be dissolved while still meeting demand (${remainingCapacity} >= ${analysis.studentDemand})`}>
											<span class="status-text">Can be dissolved</span>
										</div>
									{:else if analysis.lecAccomodation < analysis.studentDemand}
										<div class="status-indicator more-needed" 
											title={`Lecture capacity insufficient for demand (${analysis.lecAccomodation} < ${analysis.studentDemand})`}>
											<span class="status-text">Needs more slots</span>
										</div>
									{:else}
										<div class="status-indicator ok" title="Lecture capacity is sufficient for demand">
											<span class="status-text">OK</span>
										</div>
									{/if}
								{:else if clas.type === 'Lab'}
									{@const remainingCapacity = analysis.labAccomodation - roomCapacity}
									{@const canDissolve = remainingCapacity >= analysis.studentDemand}
									
									{@const isOnlySection = analysis.currentSections <= 1}
									
									{#if canDissolve && !isOnlySection}
										<div class="status-indicator dissolve" 
											title={`This section can be dissolved while still meeting demand (${remainingCapacity} >= ${analysis.studentDemand})`}>
											<span class="status-text">Can be dissolved</span>
										</div>
									{:else if analysis.labAccomodation < analysis.studentDemand}
										<div class="status-indicator more-needed" 
											title={`Lab capacity insufficient for demand (${analysis.labAccomodation} < ${analysis.studentDemand})`}>
											<span class="status-text">Needs more slots</span>
										</div>
									{:else}
										<div class="status-indicator ok" title="Lab capacity is sufficient for demand">
											<span class="status-text">OK</span>
										</div>
									{/if}
								{:else}
									<div class="status-indicator no-data" title="No type specified">
										<span class="status-text">No type specified</span>
									</div>
								{/if}
							{:else}
								<div class="status-indicator no-data" title="No demand data">
									<span class="status-text">No demand data</span>
								</div>
							{/if}
						</td>

						<!-- Demand needed per Course -->
						<td class = "min-w-20 item">
							<!-- {#if needsMoreSections(clas)} -->
							{#if sectionAnalysis[clas.course]}
								<div>
									{needsMoreSections(clas)}
								</div>
							{/if}
						</td>

						<!-- Delete Column -->
						<td class="min-w-10 item">
						

							<button onclick={() => onToggleDeleteModal(clas.id, clas.course, clas.class_id)} aria-label="delete">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill= {checkConflict(clas) ? 'white' : 'none'} stroke="#404040" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
							</button>

						</td>
	
						<!-- Edit/Save Column -->
						<td class="min-w-16 item">
							{#if $editingRowIndex === rowIndex}
								<!-- Save Button -->
								<button onclick={saveEditedRow} aria-label="save">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<polyline points="20 6 9 17 4 12"/>
									</svg>
								</button>
							{:else}
								<!-- Edit Button -->
								<button onclick={() => startEditing(clas, rowIndex)} aria-label="edit">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#404040" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
										<polygon points="16 3 21 8 8 21 3 21 3 16 16 3" style = 'fill:white'/>
									</svg>
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			{:catch error}
				<tr>
					<td>Something went wrong while fetching the data: <pre>{error}</pre></td>
				</tr>
			{/await}
		{/key}
	</tbody>
</table>

<div class="bg-white rounded-lg shadow overflow-hidden mt-6">
  <div class="conflicts-container">
    <div class="conflicts-header">
      <svg xmlns="http://www.w3.org/2000/svg" class="conflicts-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h2>Scheduling Conflicts</h2>
      {#if conflicts.length > 0}
        <span class="conflicts-count">{conflicts.filter(conf => conf[3] == schedule).length} conflicts found</span>
      {/if}
    </div>
    
    {#key update}
      <div class="conflicts-list">
        {#if conflicts.filter(conf => conf[3] == schedule).length === 0}
          <div class="no-conflicts">No conflicts detected for this schedule</div>
        {:else}
          {#each conflicts as conf}
            {#if conf[3] == schedule}
              <div class="conflict-card">
                <div class="conflict-type-badge {conf[2].includes('Room') ? 'room-conflict' : 'instructor-conflict'}">
                  {conf[2]}
                </div>
                <div class="conflict-single-line">
                  <strong>{conf[0]}</strong> & <strong>{conf[1]}</strong>
                </div>
              </div>
            {/if}
          {/each}
        {/if}
      </div>
    {/key}

	
</div>


</div>


<div class="blocks-container">

	<!-- Block Title -->
	<div class="blocks-header bg-green-700">
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="3" y="3" width="6" height="6"></rect>
			<rect x="14" y="3" width="6" height="6"></rect>
			<rect x="14" y="14" width="6" height="6"></rect>
			<rect x="3" y="14" width="6" height="6"></rect>
		</svg>
		<h2>Blocks</h2>
		<!-- Container for Block Type Generation -->
		<div class="p-2 flex flex-row gap-4">
			{#each types as type}
				<button 
					class="px-4 py-2 rounded-lg font-medium transition-colors {selectedType === type ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
					onclick={() => generateBlocks(type)}
					>
					{type}
				</button>
			{/each}
		</div>
	</div> 
{#key update}
  
	<div class="gap-3 flex flex-row m-5">
		{#each final_blocks as yr_blks, index}
			<div class = "flex flex-col blocks-list">
				{#if selectedType == "Normal"}
					<h2>
						Year {index + 1}
					</h2>
				{:else}
					<h2>
						{(Object.keys(delayed_blocks[semester]))[index]}
					</h2>
				{/if}
				{#if yr_blks.length == 0}
					<div>
						No possible blocks.  Schedule is missing: 
						{#each missing_classes[index] as ms_class}
						<div class="ml-5">
							{ms_class}
						</div>
						{/each}
					</div>
					<!-- {idx % 2 ? "blocks-card" : "blocks-card2"} -->
				{:else}
					{#each yr_blks as blk, idx}
						<div class="blocks-card">
							<h2>Block {idx + 1}</h2>

							{#each blk as cls}
								<div class="ml-5">
									{cls.course} {cls.class_id}
								</div>
							{/each}
						</div>
					{/each}
				{/if}
			</div>
		{/each}
  </div>
{/key}
</div>
<!-- <div>
	{#each [1,2,3,4] as year}
		Year {year}
		{#each blocks[semester][year] as block}

	{/each}
</div> -->

{#if showDeleteModal && classToDelete}
	<div class="delete-modal-backdrop">
		<div class="delete-modal">
			<div class="delete-modal-content">
				<h2 class="delete-modal-title">Confirm Deletion</h2>
				<p class="delete-modal-message">
					Are you sure you want to delete {classToDelete.course} {classToDelete.class_id}?
				</p>
				<div class="delete-modal-actions">
					<button 
						class="delete-modal-cancel" 
						onclick={cancelDelete}
					>
						Cancel
					</button>
					<button 
						class="delete-modal-confirm" 
						onclick={confirmDeleteClass}
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}


<style>
	.blocks-container {
		background-color: white;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
		overflow: hidden;
		max-width: 100%;
		margin-left: 0;
		margin-right: 0;
		margin-bottom: 2rem;
		margin-top: 1rem;
	}

	.blocks-header {
		color: white;
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.blocks-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
		flex-grow: 1;
	}

	.blocks-list h2 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
		flex-grow: 1;
	}

	.blocks-icon {
		height: 1.5rem;
		width: 1.5rem;
	}

	.blocks-count {
		font-size: 0.875rem;
		background-color: rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
	}

	.blocks-list {
		padding: 1rem;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 0.5rem;
		background-color: #f2f2f2;
		border-radius: 1rem;
		align-content: baseline;
	}

	.blocks-card {
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		padding: 1rem;
		background-color: #f9fafb;
	}

	.blocks-card2 {
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		padding: 1rem;
		background-color: #dbdbdb;
	}

	.blocks-card h2 {
		font-size: 1.05rem;
		font-weight: 500;
		margin: 0;
		flex-grow: 1;
	}

	.blocks-type-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.conflicts-container {
		background-color: white;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
		overflow: hidden;
		max-width: 100%;
		margin-left: 0;
		margin-right: 0;
		margin-bottom: 2rem;
	}

	.conflicts-header {
		background-color: #C03232;
		color: white;
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.conflicts-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
		flex-grow: 1;
	}

	.conflicts-icon {
		height: 1.5rem;
		width: 1.5rem;
	}

	.conflicts-count {
		font-size: 0.875rem;
		background-color: rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
	}

	.conflicts-list {
		padding: 0.5rem;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 0.5rem;
	}

	.conflict-card {
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		padding: 1rem;
		background-color: #f9fafb;
	}

	.conflict-type-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.room-conflict {
		background-color: #FEE2E2;
		color: #E03D3D;
	}

	.instructor-conflict {
		background-color: #F3E8FF;
		color: #9E4AED;
	}

	.conflict-single-line {
		font-size: 0.95rem;
		padding: 0.25rem 0;
	}

	.no-conflicts {
		grid-column: 1 / -1;
		text-align: center;
		padding: 2rem;
		color: #6b7280;
		font-style: italic;
	}

	input[type="text"] {
    transition: background-color 0.2s;
  }
	input[type="text"]:focus {
    	background-color: rgba(240, 240, 240);
		outline: none;
    }
	.conf-row [type="text"]:focus {
    	background-color: rgba(150, 4, 4, 0.568);
		outline: none;
    }

	.conf-row select {
    	background-color: rgba(150, 4, 4, 0.568);
		outline: none;
    }
	table {
		margin-bottom: 0;
		/* border-bottom: none; */
	}
	.conf-row {
		background-color: rgba(177, 4, 4, 0.568);
	}
	

	.conf-row input {
		background-color: transparent;
		border:0px;
	}

	.conf-row .item {
		background-color: rgba(177, 4, 4, 0.568);
		color: white;
	}
	.row {
		background-color: white;
	}
	.row .item {
		background-color: white;
	}
	.course {
		min-width: 4.5vw;
	}
	
	.type {
		min-width: 3vw;
	}

	.section {
		min-width: 7vw;
	}

	.instructor {
		min-width: 12.5vw;
	}

	.time {
		min-width: 5.7vw;
	}

	.room {
		min-width: 10vw;
	}

	.days {
		min-width: 7vw;
	}

	.size{
		min-width: 4vw;
	}
	
	
	
	.load {
		min-width: 4vw;
	}

	thead,
	tbody {
		width: 100%;
		display: table-header-group;
		flex-wrap: wrap;
		flex-direction: column;
	}

	.new-thead {
		position: sticky;
		background-color: #f2f2f2;
		border: 1px solid #ddd;
		top: -1px;
		margin-top: 0%;
		width: 100%;
	}

	th,
	td {
		padding: 10px;
		text-align: left;
		border: 1px solid #ddd;
		background-color: white;
		width: 100%;
	}

.status {
        min-width: 8.5vw;
    }

    .status-indicator {
        padding: 4px 8px;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 500;
        text-align: center;
        width: fit-content;
    }

    .status-indicator.conflict {
        background-color: #FEE2E2;
        color: #E03D3D;
    }

    .status-indicator.dissolve {
        background-color: #FFFBEB;
        color: #C55309;
    }

    .status-indicator.more-needed {
        background-color: #DBEAFE;
        color: #2563EB;
    }

    .status-indicator.ok {
        background-color: #DCFCE7;
        color: #16A34A;
    }

	.status-indicator.no-data {
		background-color: #F3F4F6;
		color: #6B7280;
	}

    .status-text {
        display: inline-block;
    }

    .conf-row .status-indicator {
        background-color: inherit;
        color: white;
        border: 1px solid white;
    }

	div > div.conflicts-container {
		background-color: transparent;
		border: none;
		box-shadow: none;
	}

	.delete-modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.delete-modal {
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		width: 400px;
		max-width: 90%;
	}

	.delete-modal-content {
		padding: 1.5rem;
	}

	.delete-modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: #1F2937;
	}

	.delete-modal-message {
		margin-bottom: 1.5rem;
		color: #4B5563;
	}

	.delete-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.delete-modal-cancel {
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		background-color: #F3F4F6;
		color: #4B5563;
		font-weight: 500;
		border: none;
	}

	.delete-modal-confirm {
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		background-color: #EF4444;
		color: white;
		font-weight: 500;
		border: none;
	}

	.delete-modal-cancel:hover {
		background-color: #E5E7EB;
	}

.delete-modal-confirm:hover {
	background-color: #DC2626;
}
</style>