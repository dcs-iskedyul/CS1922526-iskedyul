// @fix: conflict-logic
// Middle of the file, added apiClient import and replaced getInstructorData() with apiClient.getInstructorData() to prevent initialization crash due to undefined function call. Also initialized missing reactive arrays to prevent mapping errors in the UI.

// src/lib/apiClient.js
import { supabase } from './supabaseClient.js';

const apiClient = {
    getInstructors: async () => {
        const { data, error } = await supabase
            .from('instructors')
            .select('*');
        
        if (error) {
            console.error("Error fetching instructors:", error);
            throw error;
        }
        return data || [];
    }
};

export default apiClient;