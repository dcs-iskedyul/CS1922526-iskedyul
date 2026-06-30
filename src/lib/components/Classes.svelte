<script>
	import Sidebar from './Sidebar.svelte';
	import { supabase } from '$lib/supabaseClient';
	import { blocks, obligationClasses, rooms, schedules, instructors, storeClasses, labSubjects, conflictsStore, subject_info, parseForConflicts, parseForExamConflicts, timeConflict, parseForWarnings, delayed_blocks } from '$lib/store.js';
	import bin from '$lib/icons/bin.png';
	import { writable } from 'svelte/store';
	import {slide,fade} from 'svelte/transition'
	import { onMount } from 'svelte';
	import Papa from 'papaparse';

	let instructorsClasses = $state([]);
	onMount(async () => {
		instructorsClasses = await getInstructorData();
	});

	let conflicts = $state([]);
	let types = ["Normal", "Delayed"]
	let selectedType = $state("")
	let update = $state(false)

	let { onToggleDeleteModal, schedule, demandData = [], sectionAnalysis = {}, sortCategory = "", filterCategories = [], semester, searchCourse="", searchSection="", academicYear, isExamMode = false, examDate = "" } = $props();
	
	let final_subjects = $state([])
	let final_blocks = $state([])
	let missing_classes = $state([])
	let lab_warnings = $state([])
	let same_time_warnings = $state([])
	let consecutive_warnings = $state([])

  async function getInstructorData() {
    const { data, error } = await supabase.from('instructors').select().order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

	let showDeleteModal = $state(false);
	let classToDelete = $state(null);

	function cartesian(args) {
		var r = [], max = args.length-1;
		function helper(arr, i) {
			for (var j=0, l=args[i].length; j<l; j++) {
				var a = arr.slice(0);
				a.push(args[i][j]);
				if (i==max) r.push(a);
				else helper(a, i+1);
			}
		}
		helper([], 0);
		return r;
	}

	function groupClassesBySection(classesList) {
		const grouped = {};
		const courseTypes = {};

		classesList.forEach(cls => {
			if (!grouped[cls.course]) grouped[cls.course] = {};
			if (!courseTypes[cls.course]) courseTypes[cls.course] = new Set();
			
			courseTypes[cls.course].add(cls.type);
			const key = (cls.type === 'Lab' && cls.lec_partner && cls.lec_partner.trim() !== "") ? cls.lec_partner : cls.class_id;
			
			if (!grouped[cls.course][key]) grouped[cls.course][key] = [];
			grouped[cls.course][key].push(cls);
		});

		const options = {};
		for (const course in grouped) {
			options[course] = [];
			for (const key in grouped[course]) {
				const group = grouped[course][key];
				const lecs = group.filter(c => c.type === 'Lec');
				const labs = group.filter(c => c.type === 'Lab');
				const others = group.filter(c => c.type !== 'Lec' && c.type !== 'Lab');

				if (lecs.length > 0 && labs.length > 0) {
					lecs.forEach(l => {
						labs.forEach(b => {
							options[course].push([l, b, ...others]);
						});
					});
				} else {
					options[course].push(group);
				}
			}

			if (courseTypes[course].has('Lec') && courseTypes[course].has('Lab')) {
				options[course] = options[course].filter(pkg => {
					const hasLec = pkg.some(c => c.type === 'Lec');
					const hasLab = pkg.some(c => c.type === 'Lab');
					return hasLec && hasLab;
				});
			}
		}
		return options; 
	}

	function ifValidBlock(block){
		const flatBlock = block.flat();
		for (var i = 0; i < flatBlock.length; i++ ){
			for (var j = i+1; j < flatBlock.length; j++){
				if(timeConflict(flatBlock[i], flatBlock[j])) return false;
			}
		}
		return true;
	}

	function clearBlocks(obj){
		for (var i = 0; i<obj.length; i++){
			for(var j = 0; j< obj[i].length; j++){
				for(var member in obj[i][j]){
					Object.keys(obj[i][j][member]).forEach(key => delete obj[i][j][member][key]);
				}
			}
		}
	}

	function generateBlocks(type){
		selectedType = type
		clearBlocks(final_blocks)
		final_blocks = []
		update = !update
		if(type == "Normal") generateNormalBlocks()
		else generateDelayedBlocks()
	}

	function generateNormalBlocks() {
		selectedType = "Normal";
		final_blocks = [];
		missing_classes = [];
		
		const courseOptions = groupClassesBySection(final_subjects);
		var block_classes = blocks[semester];
		var fin_blocks = [];

		for (var i = 0; i < block_classes.length; i++){ 
			var current_block_options = [];
			var current_missing = [];

			for (var j = 0; j < block_classes[i].length; j++){ 
				const courseName = block_classes[i][j];
				if (courseOptions[courseName] && courseOptions[courseName].length > 0) {
					current_block_options.push(courseOptions[courseName]);
				} else {
					current_missing.push(courseName);
					current_block_options.push([]); 
				}
			}
			
			missing_classes.push(current_missing);

			if (current_missing.length === 0){
				let potential_blocks = cartesian(current_block_options);
				let valid_blocks = potential_blocks.filter(ifValidBlock);
				valid_blocks = valid_blocks.map(blk => blk.flat());
				fin_blocks.push(valid_blocks);
			}
			else{
				fin_blocks.push([]);
			}
		}
		final_blocks = fin_blocks;
		update = !update; 
	}

	function generateDelayedBlocks() {
		selectedType = "Delayed";
		final_blocks = [];
		missing_classes = [];

		const courseOptions = groupClassesBySection(final_subjects);
		var d_block_classes = Object.values(delayed_blocks[semester]);
		var d_fin_blocks = [];

		for (var i = 0; i < d_block_classes.length; i++){
			var current_block_options = [];
			var current_missing = [];
			for (var j = 0; j < d_block_classes[i].length; j++){
				const courseName = d_block_classes[i][j];
				if (courseOptions[courseName] && courseOptions[courseName].length > 0) {
					current_block_options.push(courseOptions[courseName]);
				} else {
					current_missing.push(courseName);
					current_block_options.push([]);
				}
			}
			missing_classes.push(current_missing);
			if (current_missing.length === 0){
				let potential_blocks = cartesian(current_block_options);
				let valid_blocks = potential_blocks.filter(ifValidBlock);
				valid_blocks = valid_blocks.map(blk => blk.flat());
				d_fin_blocks.push(valid_blocks);
			}
			else d_fin_blocks.push([]);
		}
		final_blocks = d_fin_blocks;
		update = !update;
	}

	function needsMoreSections(course) {
		if (isExamMode) return ""; 
		const courseData = (demandData.find(d => d.course == course.course));
		var courseDemand = courseData ? courseData.demand : 0;
		if (!sectionAnalysis[course.course]) return "Not in demand file";
		
		var courseAccomo = (course.type == "Lec") ? sectionAnalysis[course.course].lecAccomodation : sectionAnalysis[course.course].labAccomodation;
		return courseAccomo > courseDemand ? "+ " + String(courseAccomo - courseDemand) : "- " + String(courseDemand - courseAccomo);
	}

	async function getData() {
		var finalSort = sortCategory || 'course';
		if(filterCategories.length == 0) filterCategories.push("UG1", "UG2", "UG3", "UG4", "-", "G");

		let data, error;

		if (isExamMode) {
            // THE SAFETY NET: DO NOT QUERY IF NO DATE IS SELECTED
            if (!examDate) {
                conflicts = [];
                storeClasses.set([]);
                final_subjects = [];
                return [];
            }
			const res = await supabase
				.from('exam_schedules')
				.select()
				.eq("date", examDate)
				.eq("semester", semester)
				.eq("academic_year", academicYear)
				.in("year", filterCategories)
				.order(finalSort, { ascending: true })
				.order('id', { ascending: true });
			data = res.data; error = res.error;
		} else {
			const res = await supabase
				.from('classes')
				.select()
				.eq("schedule", schedule)
				.eq("semester", semester)
				.eq("academic_year", academicYear)
				.in("year", filterCategories)
				.order(finalSort, { ascending: true })
				.order('id', { ascending: true });
			data = res.data; error = res.error;
		}
		
		if (error) throw new Error(error.message);

		conflicts = isExamMode ? parseForExamConflicts(data) : parseForConflicts(data);
		
		storeClasses.set(data);
		final_subjects = data;

		if (!isExamMode) {
			[lab_warnings, same_time_warnings, consecutive_warnings] = parseForWarnings(final_subjects);
		}

		return data;
	}

	function checkConflict(clas) {
		const classId = clas.section || clas.class_id;
		const class_title = clas.course + ' ' + classId;
		for (var i = 0; i < conflicts.length; i++) {
			if ((conflicts[i][0] == class_title || conflicts[i][1] == class_title)) {
				if (isExamMode && clas.date == conflicts[i][3]) return true;
				if (!isExamMode && clas.schedule == conflicts[i][3]) return true;
			}
		}
		return false;
	}

	function checkWarning(clas){
		if (isExamMode) return false;
		const classId = clas.section || clas.class_id;
		const class_title = clas.course + ' ' + classId;
		for (var i = 0; i < lab_warnings.length; i++) {
			if ((lab_warnings[i][0] == class_title || lab_warnings[i][1] == class_title) && clas.schedule == conflicts[i][3]) return true;
		}
		return false;
	}

	function getConflict(clas) {
		const classId = clas.section || clas.class_id;
		const class_title = clas.course + ' ' + classId;
		var classConflicts = []
		for (var i = 0; i < conflicts.length; i++) {
			if ((conflicts[i][0] == class_title || conflicts[i][1] == class_title)) {
				if (isExamMode && clas.date == conflicts[i][3]) classConflicts.push(conflicts[i][2]);
				if (!isExamMode && clas.schedule == conflicts[i][3]) classConflicts.push(conflicts[i][2]);
			}
		}
		return ([...new Set(classConflicts)].sort());
	}

	let editingCell = null;
	let editingRowIndex = writable(null);
	let editingRow = writable({});

	async function saveEditedRow() {
		try {
			const rowToUpdate = $editingRow;
			const targetTable = isExamMode ? 'exam_schedules' : 'classes';

			const updatePayload = {
				course: rowToUpdate.course,
				type: rowToUpdate.type,
				class_id: rowToUpdate.class_id,
				start_time: rowToUpdate.start_time,
				end_time: rowToUpdate.end_time,
				location: rowToUpdate.location,
				instructor: rowToUpdate.instructor,
				size: rowToUpdate.size
			};
			
			if (!isExamMode) {
				updatePayload.days = rowToUpdate.days;
				updatePayload.load = rowToUpdate.load;
			}

			const { error } = await supabase.from(targetTable).update(updatePayload).eq('id', rowToUpdate.id);
			if (error) throw error;
			
			update = !update;
			editingRowIndex.set(null);
			await getData();
		} catch (error) {
			console.error('Error updating row:', error);
		}
	}
	
	function startEditing(clas, rowIndex) {
		if ($editingRowIndex !== null) editingRowIndex.set(null);
		editingRowIndex.set(rowIndex);
		editingRow.set({...clas});
	}

	function handleInputChange(field, value) {
		editingRow.update(current => ({ ...current, [field]: value }));
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
			const targetTable = isExamMode ? 'exam_schedules' : 'classes';
			const { error } = await supabase.from(targetTable).delete().eq('id', classToDelete.id);
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
            {#if !isExamMode}<th class="type">Type</th>{/if}
            <th class="section">Section</th>
            {#if !isExamMode}<th class="days">Day</th>{/if}
            <th class="time">Start Time</th>
            <th class="time">End Time</th>
            <th class="room">Room</th>
            <th class="size">Size</th>
            <th class="instructor">Instructor</th>
            {#if !isExamMode}<th class="load">Load</th>{/if}
			<th class="status">Status</th>
			{#if !isExamMode}<th>+/- Slots</th>{/if}
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
						
						<td class="item course" >
							<div class="flex flex-row items-center">
								{clas.course}
								{#if (!isExamMode && obligationClasses[semester].includes(clas.course))}
								<div class="relative ml-1">
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="z-40"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
								</div>
								{/if}
							</div>
						</td>
	
						{#if !isExamMode}
						<td class="item type">{clas.type}</td>
						{/if}
	
						<td class="item section">{clas.class_id || clas.section}</td>
	
						{#if !isExamMode}
						<td class="item days">
							{#if $editingRowIndex === rowIndex}
								<input type="text" value={$editingRow.days} oninput={(e) => handleInputChange('days', e.target.value)} class="w-full p-1 border"/>
							{:else}
								{clas.days}
							{/if}
						</td>
						{/if}
	
						<td class="item start_time">
							{#if $editingRowIndex === rowIndex}
								<select bind:value={$editingRow.start_time}>
									<option value="07:00"> 7:00 AM </option>
									<option value="07:30"> 7:30 AM </option>
									<option value="08:00"> 8:00 AM </option>
									<option value="08:30"> 8:30 AM </option>
									<option value="09:00"> 9:00 AM </option>
									<option value="09:30"> 9:30 AM </option>
									<option value="10:00"> 10:00 AM </option>
									<option value="10:30"> 10:30 AM </option>
									<option value="11:00"> 11:00 AM </option>
									<option value="11:30"> 11:30 AM </option>
									<option value="12:00"> 12:00 PM </option>
									<option value="12:30"> 12:30 PM </option>
									<option value="13:00"> 1:00 PM </option>
									<option value="13:30"> 1:30 PM </option>
									<option value="14:00"> 2:00 PM </option>
									<option value="14:30"> 2:30 PM </option>
									<option value="15:00"> 3:00 PM </option>
									<option value="15:30"> 3:30 PM </option>
									<option value="16:00"> 4:00 PM </option>
									<option value="16:30"> 4:30 PM </option>
									<option value="17:00"> 5:00 PM </option>
									<option value="17:30"> 5:30 PM </option>
									<option value="18:00"> 6:00 PM </option>
									<option value="18:30"> 6:30 PM </option>
									<option value="19:00"> 7:00 PM </option>
								</select>
							{:else}
								{clas.start_time}
							{/if}
						</td>
	
						<td class="item end_time">
							{#if $editingRowIndex === rowIndex}
								<select bind:value={$editingRow.end_time}>
									<option value="07:00"> 7:00 AM </option>
									<option value="07:30"> 7:30 AM </option>
									<option value="08:00"> 8:00 AM </option>
									<option value="08:30"> 8:30 AM </option>
									<option value="09:00"> 9:00 AM </option>
									<option value="09:30"> 9:30 AM </option>
									<option value="10:00"> 10:00 AM </option>
									<option value="10:30"> 10:30 AM </option>
									<option value="11:00"> 11:00 AM </option>
									<option value="11:30"> 11:30 AM </option>
									<option value="12:00"> 12:00 PM </option>
									<option value="12:30"> 12:30 PM </option>
									<option value="13:00"> 1:00 PM </option>
									<option value="13:30"> 1:30 PM </option>
									<option value="14:00"> 2:00 PM </option>
									<option value="14:30"> 2:30 PM </option>
									<option value="15:00"> 3:00 PM </option>
									<option value="15:30"> 3:30 PM </option>
									<option value="16:00"> 4:00 PM </option>
									<option value="16:30"> 4:30 PM </option>
									<option value="17:00"> 5:00 PM </option>
									<option value="17:30"> 5:30 PM </option>
									<option value="18:00"> 6:00 PM </option>
									<option value="18:30"> 6:30 PM </option>
									<option value="19:00"> 7:00 PM </option>
								</select>
							{:else}
								{clas.end_time}
							{/if}
						</td>
	
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
	
						<td class="item size">
							{#if isExamMode && $editingRowIndex === rowIndex}
								<input type="number" value={$editingRow.size} oninput={(e) => handleInputChange('size', e.target.value)} class="w-full p-1 border"/>
							{:else if isExamMode}
								{clas.size || 0}
							{:else}
								{(rooms.find(r => r.name === clas.location))?.capacity || 0}
							{/if}
						</td>
	
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
	
						{#if !isExamMode}
						<td class="item load">
							{#if (clas.course in subject_info)}
							{subject_info[clas.course]["units"] || ''}
							{:else}
							{"3"}
							{/if}
						</td>
						{/if}
	
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
							{:else if !isExamMode && sectionAnalysis && Object.keys(sectionAnalysis).length > 0 && sectionAnalysis[clas.course]}
								{@const analysis = sectionAnalysis[clas.course]}
								{@const roomObj = rooms.find(r => r.name === clas.location)}
								{@const roomCapacity = roomObj ? roomObj.capacity : 0}
								
								{#if clas.type === 'Lec'}
									{@const remainingCapacity = analysis.lecAccomodation - roomCapacity}
									{@const canDissolve = remainingCapacity >= analysis.studentDemand}
									{@const isOnlySection = analysis.currentSections <= 1}
									
									{#if canDissolve && !isOnlySection}
										<div class="status-indicator dissolve" title="Can be dissolved">
											<span class="status-text">Can be dissolved</span>
										</div>
									{:else if analysis.lecAccomodation < analysis.studentDemand}
										<div class="status-indicator more-needed" title="Needs more slots">
											<span class="status-text">Needs more slots</span>
										</div>
									{:else}
										<div class="status-indicator ok" title="OK">
											<span class="status-text">OK</span>
										</div>
									{/if}
								{:else if clas.type === 'Lab'}
									{@const remainingCapacity = analysis.labAccomodation - roomCapacity}
									{@const canDissolve = remainingCapacity >= analysis.studentDemand}
									{@const isOnlySection = analysis.currentSections <= 1}
									
									{#if canDissolve && !isOnlySection}
										<div class="status-indicator dissolve" title="Can be dissolved">
											<span class="status-text">Can be dissolved</span>
										</div>
									{:else if analysis.labAccomodation < analysis.studentDemand}
										<div class="status-indicator more-needed" title="Needs more slots">
											<span class="status-text">Needs more slots</span>
										</div>
									{:else}
										<div class="status-indicator ok" title="OK">
											<span class="status-text">OK</span>
										</div>
									{/if}
								{:else}
									<div class="status-indicator no-data" title="No type specified">
										<span class="status-text">No type specified</span>
									</div>
								{/if}
							{:else}
								<div class="status-indicator no-data" title={isExamMode ? "Clear" : "No demand data"}>
									<span class="status-text">{isExamMode ? "Clear" : "No demand data"}</span>
								</div>
							{/if}
						</td>

						{#if !isExamMode}
						<td class = "min-w-20 item">
							{#if sectionAnalysis[clas.course]}
								<div>{needsMoreSections(clas)}</div>
							{/if}
						</td>
						{/if}

						<td class="min-w-10 item">
							<button onclick={() => onToggleDeleteModal(clas.id, clas.course, clas.class_id)} aria-label="delete">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill= {checkConflict(clas) ? 'white' : 'none'} stroke="#404040" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
							</button>
						</td>
	
						<td class="min-w-16 item">
							{#if $editingRowIndex === rowIndex}
								<button onclick={saveEditedRow} aria-label="save">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<polyline points="20 6 9 17 4 12"/>
									</svg>
								</button>
							{:else}
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
        <span class="conflicts-count">{conflicts.filter(conf => (isExamMode ? conf[3] == examDate : conf[3] == schedule)).length} conflicts found</span>
      {/if}
    </div>
    
    {#key update}
      <div class="conflicts-list">
        {#if conflicts.filter(conf => (isExamMode ? conf[3] == examDate : conf[3] == schedule)).length === 0}
          <div class="no-conflicts">No conflicts detected for this {isExamMode ? "date" : "schedule"}</div>
        {:else}
          {#each conflicts as conf}
            {#if (isExamMode ? conf[3] == examDate : conf[3] == schedule)}
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

{#if !isExamMode}
<div class="blocks-container">
	<div class="blocks-header bg-green-700">
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="3" y="3" width="6" height="6"></rect>
			<rect x="14" y="3" width="6" height="6"></rect>
			<rect x="14" y="14" width="6" height="6"></rect>
			<rect x="3" y="14" width="6" height="6"></rect>
		</svg>
		<h2>Blocks</h2>
		<div class="p-2 flex flex-row gap-4">
			{#each types as type}
				<button class="px-4 py-2 rounded-lg font-medium transition-colors {selectedType === type ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" onclick={() => generateBlocks(type)}>
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
					<h2>Year {index + 1}</h2>
				{:else}
					<h2>{(Object.keys(delayed_blocks[semester]))[index]}</h2>
				{/if}
				{#if yr_blks.length == 0}
					<div>
						No possible blocks.  Schedule is missing: 
						{#each missing_classes[index] as ms_class}
						<div class="ml-5">{ms_class}</div>
						{/each}
					</div>
				{:else}
					{#each yr_blks as blk, idx}
						<div class="blocks-card">
							<h2>Block {idx + 1}</h2>
							{#each blk as cls}
								<div class="ml-5">{cls.course} {cls.class_id}</div>
							{/each}
						</div>
					{/each}
				{/if}
			</div>
		{/each}
  </div>
{/key}
</div>
{/if}

<style>
	.blocks-container { background-color: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; overflow: hidden; max-width: 100%; margin-left: 0; margin-right: 0; margin-bottom: 2rem; margin-top: 1rem; }
	.blocks-header { color: white; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.5rem; }
	.blocks-header h2 { font-size: 1.25rem; font-weight: 600; margin: 0; flex-grow: 1; }
	.blocks-list h2 { font-size: 1.1rem; font-weight: 600; margin: 0; flex-grow: 1; }
	.blocks-icon { height: 1.5rem; width: 1.5rem; }
	.blocks-count { font-size: 0.875rem; background-color: rgba(255, 255, 255, 0.2); padding: 0.25rem 0.75rem; border-radius: 9999px; }
	.blocks-list { padding: 1rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.5rem; background-color: #f2f2f2; border-radius: 1rem; align-content: baseline; }
	.blocks-card { border: 1px solid #e5e7eb; border-radius: 0.375rem; padding: 1rem; background-color: #f9fafb; }
	.blocks-card2 { border: 1px solid #e5e7eb; border-radius: 0.375rem; padding: 1rem; background-color: #dbdbdb; }
	.blocks-card h2 { font-size: 1.05rem; font-weight: 500; margin: 0; flex-grow: 1; }
	.blocks-type-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; margin-bottom: 0.5rem; }
	.conflicts-container { background-color: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; overflow: hidden; max-width: 100%; margin-left: 0; margin-right: 0; margin-bottom: 2rem; }
	.conflicts-header { background-color: #C03232; color: white; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.5rem; }
	.conflicts-header h2 { font-size: 1.25rem; font-weight: 600; margin: 0; flex-grow: 1; }
	.conflicts-icon { height: 1.5rem; width: 1.5rem; }
	.conflicts-count { font-size: 0.875rem; background-color: rgba(255, 255, 255, 0.2); padding: 0.25rem 0.75rem; border-radius: 9999px; }
	.conflicts-list { padding: 0.5rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.5rem; }
	.conflict-card { border: 1px solid #e5e7eb; border-radius: 0.375rem; padding: 1rem; background-color: #f9fafb; }
	.conflict-type-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; margin-bottom: 0.5rem; }
	.room-conflict { background-color: #FEE2E2; color: #E03D3D; }
	.instructor-conflict { background-color: #F3E8FF; color: #9E4AED; }
	.conflict-single-line { font-size: 0.95rem; padding: 0.25rem 0; }
	.no-conflicts { grid-column: 1 / -1; text-align: center; padding: 2rem; color: #6b7280; font-style: italic; }
	input[type="text"], input[type="number"] { transition: background-color 0.2s; }
	input[type="text"]:focus, input[type="number"]:focus { background-color: rgba(240, 240, 240); outline: none; }
	.conf-row [type="text"]:focus { background-color: rgba(150, 4, 4, 0.568); outline: none; }
	.conf-row select { background-color: rgba(150, 4, 4, 0.568); outline: none; }
	table { margin-bottom: 0; }
	.conf-row { background-color: rgba(177, 4, 4, 0.568); }
	.conf-row input { background-color: transparent; border:0px; }
	.conf-row .item { background-color: rgba(177, 4, 4, 0.568); color: white; }
	.row { background-color: white; }
	.row .item { background-color: white; }
	.course { min-width: 4.5vw; }
	.type { min-width: 3vw; }
	.section { min-width: 7vw; }
	.instructor { min-width: 12.5vw; }
	.time { min-width: 5.7vw; }
	.room { min-width: 10vw; }
	.days { min-width: 7vw; }
	.size { min-width: 4vw; }
	.load { min-width: 4vw; }
	thead, tbody { width: 100%; display: table-header-group; flex-wrap: wrap; flex-direction: column; }
	.new-thead { position: sticky; background-color: #f2f2f2; border: 1px solid #ddd; top: -1px; margin-top: 0%; width: 100%; }
	th, td { padding: 10px; text-align: left; border: 1px solid #ddd; background-color: white; width: 100%; }
	.status { min-width: 8.5vw; }
    .status-indicator { padding: 4px 8px; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; text-align: center; width: fit-content; }
    .status-indicator.conflict { background-color: #FEE2E2; color: #E03D3D; }
    .status-indicator.dissolve { background-color: #FFFBEB; color: #C55309; }
    .status-indicator.more-needed { background-color: #DBEAFE; color: #2563EB; }
    .status-indicator.ok { background-color: #DCFCE7; color: #16A34A; }
	.status-indicator.no-data { background-color: #F3F4F6; color: #6B7280; }
    .status-text { display: inline-block; }
    .conf-row .status-indicator { background-color: inherit; color: white; border: 1px solid white; }
	div > div.conflicts-container { background-color: transparent; border: none; box-shadow: none; }
</style>
