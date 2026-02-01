<script >
    import Header from "./Header.svelte"
    import { supabase } from "$lib/supabaseClient";
    let showModal = (false);

    let { data } = $props();

    const toggleModal = () => {
        showModal = !showModal;
        console.log(showModal)
    }
    let id = 1;
    let class_name;
    let instructor_name;
    let location;
    let start_time;
    let end_time;



</script>
    <div>
        <Header/>
        <button on:click={toggleModal} class ="">Open Form</button>
    </div>
    <button on:click={toggleModal} class ="">Open Form</button>

    {#if showModal}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (because of reasons) -->
        <div class ="backdrop" on:click|self={toggleModal}>
            <div class = "modal">
                <h1 class ="title">Add a New Class</h1>
                <form>
                    <div class="form_total">
                        <div class ="form-row">
                            <div class = "center_col">
                                <div class="form-col">
                                    <label for="class name">Class Name</label>
                                    <input id = "class name" type ="text" placeholder = "Class Name" bind:value = {class_name}>
                                </div>
                                <div class = "form-col">
                                    <label for="instructor">Instructor Name</label>
                                    <input id = "instructor" type ="text" placeholder = "Instructor Name" bind:value = {instructor_name}>
                                </div>
                            </div>
                        </div>
                        
                        <div class ="form-row">
                            <div class = "center_col">
                                <div class="form-col">
                                    <label for="start">Start Time</label>
                                    <input type ="text" placeholder = "Start Time" bind:value = {start_time}>
                                </div>
                                <div class = "form-col">
                                    <label for="end">End Time</label>
                                    <input type ="text" placeholder = "End Time" bind:value = {end_time}>
                                </div>
                            </div>
                        </div>
                        <div class ="form-row">
                            <div class = "center_col">
                                <div class="form-col">
                                    <label for="start">Location</label>
                                    <input type ="text" placeholder = "Location" bind:value = {location}>
                                </div>
                            </div>
                        </div>
                    </div>
                
                    <button class = "submit-btn">Add Class</button>
                </form>
            </div>
        </div>
    {/if}



<style>
    .title{
        text-align: left;
        font-size: 1.125rem;
        font-weight:600;
    }
    .backdrop{
        width: 100%;
        height: 100%;
        position:fixed;
        background: rgba(0, 0, 0, 0.8)
    }
    .modal{
        text-align: center;
        padding: 100px;
        border-radius:10px;
        max-width: 60rem;
        margin: 10% auto;
        background: white;
        justify-items: center;
        justify-content: space-between;
    }
    .form_total {
        display:flex;
        flex-wrap: wrap;
        justify-items: center;
        justify-content: space-between;
    }
    .center_col{
        display: flex;
        flex-direction: row;
        place-items: center;
        justify-content: space-between;
    }
    input[type=text]{
        width: 12rem;
        background-color: rgb(243 244 246);
        border-color: rgb(209 213 219);
        border-radius: 0.25rem;
        padding: 1rem;
        margin-bottom:0.5rem;
    }
    .form-row{
        padding-top: 10px;
        width:100%;
        place-items: center;
    }
    .form-col{
        text-align: left;
        display: flex;
        flex-direction: column;
        padding-top: 10px;
        width:100%;
        margin-left: 2.5rem;
        margin-right: 2.5rem;

        
    }
    .submit-btn{
        margin-top: 1.5rem;
        background-color: green;
        color: white;
        padding-top: 0.625rem; 
        padding-bottom: 0.625rem; 
        padding-left: 1.5rem; 
        padding-right: 1.5rem; 
        border-radius:0.625rem;
    }
</style>