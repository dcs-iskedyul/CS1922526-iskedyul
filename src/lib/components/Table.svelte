<script>
	import { supabase } from '$lib/supabaseClient.js';
  
  	let { classroom, schedule } = $props()
 	console.log(classroom)
	console.log(schedule)

	let subjects = [];

	async function getData() {
		var clas, loc;
		const { data, error } = await supabase.from('classes').select().eq("schedule", schedule);
		if (error) throw new Error(error.message);
		console.log(data);
		for (var i = 0; i < data.length; i++) {
			clas = data[i];
			loc = clas.location;
			if (loc == classroom) {
				subjects.push(data[i]);
			}
		}
		parseForConflicts(subjects);
		checkConflict(subjects);
		final_subjects = []
		for (var j = 0; j < subjects.length; j++) {
			if (!checkConflict(subjects[j])) {
				final_subjects.push(subjects[j]);
			}
		}
		console.log("Final Subj:");
		console.log(final_subjects);

		return data;
	}
	// Array of days to render as columns
	const days = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];

	const colors = ['#E03D3D', '#E8782E', '#F6DA24', '#22C55E', '#2563EB', '#9E4AED', '#ED4ABF']

	let idx = 0;

	let skip = 0;

	let conflicts = [];
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
    '#E03D3D', // red
    '#E8782E', // orange
    '#F6DA24', // yellow
    '#22C55E', // green
    '#2563EB', // blue
    '#9E4AED', // violet
    '#ED4ABF', // pink
    '#6B7280'  // gray
  ];
  // Function to get a consistent color for a specific subject
  function getSubjectColor(course, classId) {
    // Combine course and class_id to create a unique string
    const uniqueStr = course + classId;
    
    // Create a simple hash from the string
    let hash = 0;
    for (let i = 0; i < uniqueStr.length; i++) {
      hash = uniqueStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use the hash to pick a color from the palette
    const colorIndex = Math.abs(hash) % colorPalette.length;
    return colorPalette[colorIndex];
  }
	function parseForConflicts(data) {
		var clas, loc, s_t, e_t, n_clas, n_loc, n_s_t, n_e_t, check, teacher, n_teacher, common_days;
		var types_of_conflict;
		conflicts = []
		types_of_conflict = []
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
					// console.log(clas.course + ' ' + clas.class_id + ',' + n_clas.course + ' ' + n_clas.class_id + " ROOM CONFLICT")
				if (n_teacher == teacher && teacher !== 'TBA' && n_teacher !== 'TBA')
					types_of_conflict.push("Instructor Conflict");
					// console.log(clas.course + ' ' + clas.class_id + ',' + n_clas.course + ' ' + n_clas.class_id + " INSTRUCTOR CONFLICT")
				if(types_of_conflict.length > 0){ // check if there is a conflict
					[common_days, check] = haveCommonItems(n_clas.days, clas.days);
					if (check) { // happens on at least 1 same day
						if ((s_t >= n_s_t && s_t < n_e_t) || (e_t > n_s_t && e_t <= n_e_t) || (s_t <= n_s_t && e_t >= n_e_t)) { // overlapping time
							// console.log(clas.course + ' ' + clas.class_id + ',' + n_clas.course + ' ' + n_clas.class_id);
							conflicts.push([clas.course + ' ' + clas.class_id, n_clas.course + ' ' + n_clas.class_id, types_of_conflict.join(", "), clas.schedule]);
						}
					}
				}	
				
			}
		}
		console.log(conflicts)
	}

	function checkConflict(clas) {
		var class_title = clas.course + ' ' + clas.class_id;
		for (var i = 0; i < conflicts.length; i++) {
			if ((conflicts[i][0] == class_title || conflicts[i][1] == class_title) && schedule == conflicts[i][3]) {
				// console.log('THERE IS A CONFLICT');
				return true;
			}
		}
		return false;
	}


	let final_subjects = $state([])


	// Array of time slots (7:00 - 21:00 in 15-minute increments)
	const times = Array.from({ length: 57 }, (_, i) => {
		const hour = Math.floor(i / 4) + 7;
		var hour_str = ""
		if (hour<10){
			hour_str = "0" + hour
		}
		else{
			hour_str = hour
		}
		var minutes;
		switch (i % 4){
			case 0:
				minutes = '00'
				break;
			case 1:
				minutes = '15'
				break;
			case 2:
				minutes = '30'
				break;
			case 3:
				minutes = '45'
				break;
		} 
		return `${hour_str}:${minutes}`;
	});

	console.log(times)

	// colors for subjects
	let pastelColors = {
		pink: '#df746a', // pastel pink
		orange: '#eba434', // pastel orange
		green: '#43b770', // pastel green
		blue: '#6f80d3' // pastel blue
	};

	// Function to calculate rowspan based on start and end times
	function calculateRowspan(startTime, endTime, course, class_id) {
		const [startHour, startMinutes] = startTime.split(':').map(Number);
		const [endHour, endMinutes] = endTime.split(':').map(Number);
		const start = startHour * 60 + startMinutes;
		const end = endHour * 60 + endMinutes;
		console.log("Subject is has this amount of rows:")
		console.log(course + class_id)
		console.log((end - start) / 15)
		return (end - start) / 15; // Each slot is 15 minutes

		function calculateDays(days) {
			const dotw = days.split(',');
			return dotw;
		}
	}

	function getRandomColor() {
		var letters = '0123456789ABCDEF';
		var color = '#';
		for (var i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
		}


	let color =""

	function randColor() {
		color = colors[idx]
		skip = skip + 1
		if (skip == 2){
			idx = idx + 1
			skip = 0
		}
		console.log("NEW COLOR" + color)
		return color
	}
</script>

{#await getData()}
	<tr><td>FETCHING DATA</td></tr>
{:then data}
	<div class="table-container">
		<table class="venue-table">
			<!-- Table header for days of the week -->
			<thead>
				<tr>
					<td colspan="1"></td>
					<td colspan="7" style="color: #001618">{classroom}</td>
				</tr>
				<tr>
					<th></th>
					{#each days as day}
						<th>{day}</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				{#each times as time}
					<tr>
						<td class="time"
							><p>{time}</p>
							<p></p>
						</td>
						{#each days as day}
							{@const subject = final_subjects.find(
								(s) => s.days.includes(day) && (s.start_time == time)
							)}
							{#if subject}
								<!-- If there's a subject that starts at this time, render it with rowspan -->
								<td
									
									style="background-color:{getSubjectColor(subject.course, subject.class_id)}"
									rowspan={calculateRowspan(subject.start_time, subject.end_time, subject.course, subject.class_id)}
								>
									<strong>{subject.course + ' ' + subject.class_id}</strong><br />
									{subject.instructor}
								</td>
							{:else}
								<!-- Render empty cells where there's no subject starting -->
								{#if !(final_subjects.some((s) => s.days.includes(day) && convertTimeToNumber(s.start_time) <= convertTimeToNumber(time) && convertTimeToNumber(s.end_time) >= convertTimeToNumber(time)))}
									<td class="empty-cell"></td>
								{/if}
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:catch error}
	<tr
		><td
			>Something went wrong while fetching the data: <pre>{error}</pre>
		</td>
	</tr>
{/await}

<style>
	th, td {
		max-width: 7vw; 
	}
	.empty-cell {
    height: 20px; /* Adjust this value to your preference */
    padding: 0;
  }

	.venue-table td {
		margin: 10px;
		padding: 5px;
		color: white;
		border-radius: 4px;
		text-align: center;
	}
	.venue-table {
		border-collapse: separate; 
		border-spacing: 0.3em;}
</style>