<script>

    //export dialog to be used elsewhere
    const { createClassDialog } = $props();

	import { supabase } from '$lib/supabaseClient.js';
	import { rooms } from '$lib/store.js'
	//const days = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
	
	let daysArray1 = $state([]);

	let newCourse1,
        newClassTest,
		newInstr1,
		newStart1,
		newEnd1,
		newLoc1;
		

        async function sendNewData() {
		newDays1 = daysArray1.join(',');
		const { data, error } = await supabase.from('classes').insert([
			{
				course: newCourse1,
				class_id: newClassTest,
				instructor: newInstr1,
				start_time: newStart1,
				end_time: newEnd1,
				location: newLoc1,
				days: newDays1
			}
		]);
		if (error) throw new Error(error.message);
		newDays1 = '';
		console.log(newDays1);
		return data;
	}

</script>



<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (because of reasons) -->
<div class="backdrop" >
    <div class="modal">
        <h1 class="title">Add a New Class</h1>
        <form>
            <div class="form_total">
                <div class="form-row">
                    <div class="center_col">
                        <div class="form-col">
                            <label for="class name">Course Name</label>
                            <input
                                id="class name"
                                type="text"
                                placeholder="Course Name"
                                bind:value={newCourse1}
                            />
                        </div>
                        <div class="form-col">
                            <label for="instructor">Class ID</label>
                            <input id="classID" type="text" placeholder="Class ID" bind:value={newClassTest} />
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
                                bind:value={newInstr1}
                            />
                        </div>
                        <div class="form-col">
                            <label for="location">Location</label>
                            <select bind:value={newLoc1}>
                                {#each rooms as room}
                                    <option value = {room}>{room}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="center_col">
                        <div class="form-col">
                            <label for="start">Start Time</label>
                            <select bind:value={newStart1}>
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
                            <select bind:value={newEnd1}>
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
                        <div><label for="days">Days</label></div>
                        <div class="new-row">
                            <div class="griddy">
                                <div>
                                    <input class="cont" type="checkbox" bind:group={daysArray1} value="Mon" /> Monday
                                    <br />
                                </div>
                                <div>
                                    <input class="cont" type="checkbox" bind:group={daysArray1} value="Tues" />
                                    Tuesday
                                    <br />
                                </div>
                                <div>
                                    <input class="cont" type="checkbox" bind:group={daysArray1} value="Wed" />
                                    Wednesday
                                    <br />
                                </div>
                            </div>
                            <div class="griddy">
                                <div>
                                    <input class="cont" type="checkbox" bind:group={daysArray1} value="Thurs" />
                                    Thursday
                                    <br />
                                </div>
                                <div>
                                    <input class="cont" type="checkbox" bind:group={daysArray1} value="Fri" />
                                    Friday<br />
                                </div>
                                <div>
                                    <input class="cont" type="checkbox" bind:group={daysArray1} value="Sat" />
                                    Saturday<br />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <input class="submit-btn" type="submit" value="Submit" on:click={sendNewData} />
             </form>
    </div>
</div>