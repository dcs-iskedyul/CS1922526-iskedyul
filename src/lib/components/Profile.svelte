<script>
    import Sidebar from "./Sidebar.svelte";
    import { supabase } from "$lib/supabaseClient";
    import { onMount } from "svelte";
    import { Toaster, toast } from 'svelte-sonner';
    
    let user = {
        username: "",
        password: "••••••••"
    };
    
    let formData = {
        username: "",
        newPassword: "",
        confirmPassword: ""
    };
    
    let isEditing = false;

    let isLoading = true;
    
    onMount(async () => {
        await fetchUserData();
    });
    
    async function fetchUserData() {
        try {
            isLoading = true;
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) throw sessionError;
            
            if (!session) {
                window.location.href = "/login";
                return;
            }
            
            user.username = session.user.email;
            formData.username = user.username;
            
            const { data: adminData, error: adminError } = await supabase
                .from('admins')
                .select('admin_name, password')
                .eq('admin_name', user.username)
                .single();
            
        } catch (error) {
            toast.error("Error loading profile: " + error.message);
        } finally {
            isLoading = false;
        }
    }
    
    async function handleSubmit() {
        try {
            if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
                toast.error("New passwords do not match");
                return;
            }
            
            if (user.username !== formData.username) {
                const { error: emailError } = await supabase.auth.updateUser({
                    email: formData.username
                });
                
                if (emailError) throw emailError;
                
                const { data: adminData } = await supabase
                    .from('admins')
                    .select('admin_name')
                    .eq('admin_name', user.username);
                    
                if (adminData && adminData.length > 0) {
                    const { error: updateError } = await supabase
                        .from('admins')
                        .update({ admin_name: formData.username })
                        .eq('admin_name', user.username);
                        
                    if (updateError) console.log("Couldn't update admins table, but auth updated successfully");
                }
            }
            
            if (formData.newPassword) {
                const { error: passError } = await supabase.auth.updateUser({
                    password: formData.newPassword
                });
                
                if (passError) throw passError;
                
                const { data: adminData } = await supabase
                    .from('admins')
                    .select('admin_name')
                    .eq('admin_name', formData.username);
                    
                if (adminData && adminData.length > 0) {
                    const { error: updateError } = await supabase
                        .from('admins')
                        .update({ password: formData.newPassword })
                        .eq('admin_name', formData.username);
                }
            }
            
            user.username = formData.username;
            
            formData = {
                username: user.username,
                newPassword: "",
                confirmPassword: ""
            };
            
            toast.success("Profile updated successfully!");
            isEditing = false;
            
            await supabase.auth.refreshSession();
            
        } catch (error) {
            toast.error("Failed to update profile: " + error.message);
        }
    }
    
    function toggleEdit() {
        isEditing = !isEditing;
        message = { text: "", type: "" };
    }
</script>

<style>
    .profile-container {
        position: relative;
        padding: 2rem;
        background-color: #ffffff;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin-left: 1rem;
    }

    .edit-btn {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background-color: #34a853;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
    }
    
    .cancel-btn {
        position: absolute;
        top: 1rem;
        right: 7rem;
        background-color: #9e9e9e;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
    }
    
    .form-group {
        margin-bottom: 1rem;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }
    
    .form-group input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
    }
    
    .submit-btn {
        background-color: #34a853;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        border: none;
        margin-top: 1rem;
    }
    
    .user-info {
        margin-bottom: 1rem;
    }
    
    .user-info label {
        font-weight: bold;
        display: block;
    }
    
    .user-info p {
        margin-top: 0.25rem;
        margin-bottom: 1rem;
    }
    
</style>

<div class="flex">
    <Sidebar />
    <div class="flex-1 p-8 ml-64">
        <Toaster />
        <div class="header" style="margin-left: 1rem; margin-bottom: 1rem">
            <h2 class="text-2xl font-bold">Profile</h2>
        </div>

        {#if isLoading}
            <div class="profile-container">
                <p>Loading profile data...</p>
            </div>
        {:else}
            <div class="profile-container">
                {#if !isEditing}
                    <!-- View  -->
                    <div class="user-info">
                        <label for="username">Username:</label>
                        <p>{user.username}</p>
                        
                        <label for="password">Password:</label>
                        <p>{user.password}</p>
                    </div>
                    <button class="edit-btn" on:click={() => isEditing = true}>Edit profile</button>
                {:else}
                    <!-- Edit -->
                    <form on:submit|preventDefault={handleSubmit}>
                        <div class="form-group">
                            <label for="username">Username:</label>
                            <input 
                                type="text" 
                                id="username" 
                                bind:value={formData.username} 
                                required
                            />
                        </div>
                        
                        <div class="form-group">
                            <label for="newPassword">New Password (optional):</label>
                            <input 
                                type="password" 
                                id="newPassword" 
                                bind:value={formData.newPassword} 
                                placeholder="Leave blank to keep current password"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label for="confirmPassword">Confirm New Password:</label>
                            <input 
                                type="password" 
                                id="confirmPassword" 
                                bind:value={formData.confirmPassword}
                                placeholder="Retype new password"
                            />
                        </div>
                        
                        <button type="submit" class="submit-btn">Save Changes</button>
                    </form>
                    <button class="cancel-btn" on:click={() => {
                        isEditing = false;
                        formData.username = user.username;
                        formData.newPassword = "";
                        formData.confirmPassword = "";
                    }}>Cancel</button>
                {/if}
            </div>
        {/if}
    </div>
</div>