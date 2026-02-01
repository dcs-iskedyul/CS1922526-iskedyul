<!-- svelte-ignore non_reactive_update -->
<!-- <script>
  import Login from "../lib/components/Login.svelte";
</script>

<main class="flex flex-col">
  <Login />
</main> -->

<script>
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { supabase } from '$lib/supabaseClient.js';
	import { rooms } from '$lib/store.js'

	let conflicts = $state([]);

	function haveCommonItems(str1, str2) {
		var arr1 = str1.split(',');
		var arr2 = str2.split(',');
		const set1 = new Set(arr1);
		const commonItems = arr2.filter((item) => set1.has(item));
		return [commonItems, commonItems.length > 0];
	}

	async function getData() {
		const { data, error } = await supabase.from('classes').select();
		conflicts = [];
		if (error) throw new Error(error.message);
		console.log(data);
		var clas, loc, s_t, e_t, n_clas, n_loc, n_s_t, n_e_t, common_days, check, teacher, n_teacher;
		var types_of_conflict;
		for (var i = 0; i < data.length; i++) {
			clas = data[i];
			loc = clas.location;
			teacher = clas.instructor;
			s_t = convertTimeToNumber(clas.start_time);
			e_t = convertTimeToNumber(clas.end_time);
			for (var j = i + 1; j < data.length; j++) {
				n_clas = data[j];
				n_loc = n_clas.location;
				n_teacher = n_clas.instructor;
				types_of_conflict = [];
				n_s_t = convertTimeToNumber(n_clas.start_time);
				n_e_t = convertTimeToNumber(n_clas.end_time);
				if (n_loc == loc)
					types_of_conflict.push("Room Conflict");
					console.log(clas.course + ' ' + clas.class_id + ',' + n_clas.course + ' ' + n_clas.class_id + " ROOM CONFLICT")
				if (n_teacher == teacher)
					types_of_conflict.push("Instructor Conflict");
					console.log(clas.course + ' ' + clas.class_id + ',' + n_clas.course + ' ' + n_clas.class_id + " INSTRUCTOR CONFLICT")
				if(types_of_conflict.length > 0){ // check if there is a conflict
					[common_days, check] = haveCommonItems(n_clas.days, clas.days);
					if (check) { // happens on at least 1 same day
						if ((s_t >= n_s_t && s_t < n_e_t) || (e_t > n_s_t && e_t <= n_e_t) || (s_t <= n_s_t && e_t >= n_e_t)) { // overlapping time
							console.log(clas.course + ' ' + clas.class_id + ',' + n_clas.course + ' ' + n_clas.class_id);
							conflicts.push([clas.course + ' ' + clas.class_id, n_clas.course + ' ' + n_clas.class_id, types_of_conflict.join(", ")]);
						}
					}
				}	
			}
		}
		await handleChange();
		return data;
	}

	function convertTimeToNumber(time) {
		const hours = Number(time.split(':')[0]);
		const minutes = Number(time.split(':')[1]) / 60;
		return hours + minutes;
	}

	import Header from '$lib/components/Header.svelte';
	let showModal = $state(false);
	let hidden = $state(false);

	const toggleModal = () => {
		showModal = !showModal;
		console.log(showModal);
	};

	function checkConflict(clas) {
		var class_title = clas.course + ' ' + clas.class_id
		for (var i = 0 ; i < conflicts.length; i++){
			if(conflicts[i][0] == class_title || conflicts[i][1] == class_title){
				console.log('THERE IS A CONFLICT')
				return true;
			}
		}
		return false;
	}

	const toggleHidden = () => {
		hidden = !hidden;
		console.log(hidden);
	};

	const days = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
	let newDays = '';
	let changeDays = '';
	let daysArray = $state([]);
	let daysArray2 = $state([]);

	let newCourse,
		newClass,
		newInstr,
		newStart,
		newEnd,
		newLoc,
		changeCourse,
		changeClass,
		changeInstr,
		changeStart,
		changeEnd,
		changeLoc;

	let update = $state(true);
	let submit = $state(false);

	function handleChange() {
		update = true;
	}

	function handleChangeEnd() {
		update = false;
	}

	async function handleSubmit() {
		showModal = false;
		submit = true;
		update = true;
		for (let i = 0; i < 7; i++) {
			if (daysArray[i] == true) {
				newDays.concat(days[i]);
			}
		}
	}

	async function handleSubmitEnd() {
		submit = false;
		update = false;
	}

	async function sendData() {
		newDays = daysArray.join(',');
		const { data, error } = await supabase.from('classes').insert([
			{
				course: newCourse,
				class_id: newClass,
				instructor: newInstr,
				start_time: newStart,
				end_time: newEnd,
				location: newLoc,
				days: newDays
			}
		]);
		if (error) throw new Error(error.message);
		newDays = '';
		console.log(newDays);
		return data;
	}

	// async function editData(clas) {
	// changeDays = daysArray2.join(",")
	// 	editClass(clas)
	// }

	// async function removeData() {
	// 	const response = await supabase
	// 		.from('countries')
	// 		.delete()

	// }

	const deleteClass = async (clas) => {
		try {
			console.log("I pressed a delete class, showing classes is now : " + update);
			const { data, error } = await supabase.from('classes').delete().eq('id', clas.id);
			update = update
			console.log("I pressed a delete class, showing classes is now : " + update);
		} catch (err) {
			console.log(err);
		}
	};

	const editClass = async (clas) => {
		try {
			update = false;
			update = true;
			console.log(update);
			const { data, error } = await supabase
				.from('classes')
				.update({
					course: newCourse,
					class_id: newClass,
					instructor: newInstr,
					start_time: newStart,
					end_time: newEnd,
					location: newLoc,
					days: newDays
				})
				.eq('id', clas.id);
			await getData();
		} catch (err) {
			console.log(err);
		}
	};
</script>

{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (because of reasons) -->
	<div class="backdrop" on:click|self={toggleModal}>
		<div class="modal">
			<h1 class="title">Add a New Class</h1>
			<form on:submit|preventDefault={handleSubmit}>
				<div class="form_total">
					<div class="form-row">
						<div class="center_col">
							<div class="form-col">
								<label for="class name">Course Name</label>
								<input
									id="class name"
									type="text"
									placeholder="Course Name"
									bind:value={newCourse}
								/>
							</div>
							<div class="form-col">
								<label for="instructor">Class ID</label>
								<input id="classID" type="text" placeholder="Class ID" bind:value={newClass} />
							</div>
						</div>
					</div>

					<div class="form-row">
						<div class="center_col">
							<div class="form-col">
								<label for="instructor">Instructor Name</label>
								<input
									id="instructor"
									type="text"
									placeholder="Instructor Name"
									bind:value={newInstr}
								/>
							</div>
							<div class="form-col">
								<label for="location">Location</label>
								<select bind:value={newLoc}>
									{#each rooms as room}
										<option value = {room.name}>{room.name}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
					<div class="form-row">
						<div class="center_col">
							<div class="form-col">
								<label for="start">Start Time</label>
								<select bind:value={newStart}>
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
							</div>
							<div class="form-col">
								<label for="end">End Time</label>
								<select bind:value={newEnd}>
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
						<div class="form_col">
							<div class = "title"><label for="days" >Days</label></div>
							<div class="new-row">
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
								<!-- </div> -->
								<!-- <div class="griddy"> -->
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
								<!-- </div> -->
							</div>
						</div>
					</div>
				</div>

				<input class="submit-btn" type="submit" value="Submit" on:click={handleSubmitEnd} />
			</form>
		</div>
	</div>
{/if}

<div>
	<Header />

	<div class="total-table">
		<div class="tab-row">
			<div class="heading">Classes</div>
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
			<!-- <button on:click={toggleHidden} class = "edit">Edit</button>   -->
			<button on:click={toggleModal} class="open-form">Make a Class</button>
		</div>

		<table>
			<thead class={showModal ? 'diff-thead' : 'new-thead'}>
				<tr>
					<th class="course">Course</th>
					<th class="classID">Class ID</th>
					<th class="instructor">Instructor</th>
					<th class="time">Start Time</th>
					<th class="time">End Time</th>
					<th class="location">Location</th>
					<th class="days">Days</th>
					<th class="min-w-20"></th>
				</tr>
			</thead>
			<tbody>
				{#if update}
					{#await getData()}
						<tr><td>FETCHING DATA</td></tr>
					{:then data}
						{#each data as clas}
							<tr class = {(checkConflict(clas)) ? 'conf-row' : 'row'}>
								<td class="course item">{clas.course}</td>
								<td class="classID item">{clas.class_id}</td>
								<td class="instructor item">{clas.instructor}</td>
								<td class="time item">{clas.start_time}</td>
								<td class="time item">{clas.end_time}</td>
								<td class="location item">{clas.location}</td>
								<td class="days item">{clas.days}</td>
								<td class="min-w-20 item"><button on:click= {() => deleteClass(clas)}>Delete</button></td>
								<!-- <td class="min-w-20 item"><button on:click= {() => editClass(clas)}>Edit</button></td> -->
								<!-- <td class = "min-w-20"><button on:click={() => editData(this);}>Edit</button></td> -->
							</tr>
						{/each}
					{:catch error}
						<tr
							><td
								>Something went wrong while fetching the data: <pre>{error}</pre>
							</td></tr
						>
					{/await}
				{/if}
			</tbody>
		</table>

		<!-- <div class="table">
			{#if update}
				{#await getData()}
					<p>Fetching data...</p>
				{:then data}
					{#each data as clas}
						<p>done</p>
						<li>{clas.course}</li>
					{/each}
				{:catch error}
					<p>Something went wrong while fetching the data:</p>
					<pre>{error}</pre>
				{/await}
			{/if}
		</div> -->
	</div>
	<div>
		<div class = "conflict-table">
			<div class="conflict-head">Conflicts</div>
			{#each conflicts as conf}
			<div class = "conflict">
				{conf[0] + ' is conflicting with ' + conf[1] + ' with Conflict Type: ' + conf[2]}
			</div>
			{/each}
		</div>
	</div>

</div>


<style>
	table {
		width: 100%;
		border-collapse: collapse;
		display: block;
		flex-direction: column;
		flex-wrap: wrap;
		overflow-y: auto;
	}
	.conflict-head{
		width:100%;
		font-size: 1.5vw;
		color: rgb(173, 15, 15);
	}
	.conflict{
		width: 100%;
		margin-top: 15px;

	}
	.conf-row{
		background-color: rgba(177, 4, 4, 0.568);
	}

	.conf-row .item{
		background-color: rgba(177, 4, 4, 0.568);
		color: white;
	}
	.row{
		background-color: white;
	}
	.row .item{
		background-color: white;
	}

	.conflict-table {
		display: block;
		justify-content: center;
		margin-left: 24rem;
		margin-top: 64px;
		margin-right: 8rem;
		flex-direction: column;
		border: 1px;
		border-color: rgba(63, 62, 62, 0.589);
		margin-bottom: 64px;
	}

	.heading {
		color: white;
		font-size: 50px;
		text-align: center;
		padding: 10px;
		margin-top: auto;
		margin-bottom: auto;
	}
	.course {
		min-width: 80px;
		background-size: 100% auto;
		text-wrap: nowrap;
	}

	.classID {
		min-width: 90px;
	}

	.instructor {
		min-width: 200px;
	}

	.time {
		min-width: 110px;
	}

	.location {
		min-width: 200px;
	}

	.days {
		min-width: 450px;
	}

	/* thead,
	tbody {
		width: 100%;
		display: block;
		flex-wrap: wrap;
		flex-direction: column;
	} */

	.new-thead {
		position: sticky;
		top: 0;
		background-color: #f2f2f2; /* Set a background color for the sticky header */
		width: 100%;
	}

	.diff-thead {
		top: 0;
		background-color: #f2f2f2;
		width: 100%;
	}

	th,
	td {
		padding: 10px;
		text-align: left;
		border: 1px solid #ddd; /* Add a border for better visibility */
		background-color: white;
		width: 100%;
	}

	.total-table {
		display: block;
		justify-content: center;
		margin-left: 24rem;
		margin-top: 128px;
		background-color: green;
		margin-right: 8rem;
		flex-direction: column;
		border: 1px;
		border-color: rgba(63, 62, 62, 0.589);
	}
	.open-form {
		background-color: rgb(1, 65, 1);
		color: white;
		padding-top: 0.625rem;
		padding-bottom: 0.625rem;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
		border-radius: 0.625rem;
		margin: 10px;
		margin-left: auto;
	}
	.tab-row {
		display: flex;
		vertical-align: middle;
		flex-direction: row;
	}
	/* .table {
		width: 100%;
		height: 400px;
		overflow-y: scroll;
    background-color: white;
    padding: 10px;
	} */
	.cont {
		display: inline;
		gap: 10px;
		background-color: red;
	}
	.griddy {
		display: flex;
		flex-wrap: wrap;
		flex-direction: column;
		justify-content: flex-start;
		gap: 5px;
		align-items: flex-start;
		align-content: center;
	}
	.title {
		text-align: left;
		font-size: 1.125rem;
		font-weight: 600;
	}
	.backdrop {
		width: 100%;
		height: 100%;
		position: fixed;
		background: rgba(0, 0, 0, 0.8);
		overflow-y: auto;
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
	input[type='text'] {
		width: 12rem;
		background-color: rgb(243 244 246);
		border-color: rgb(209 213 219);
		border-radius: 0.25rem;
		padding: 1rem;
		margin-bottom: 0.5rem;
	}
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
