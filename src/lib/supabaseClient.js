import { createClient } from '@supabase/supabase-js'
//import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'

export const supabase = createClient("https://cdkmzodjgvxnuijsqtbh.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNka216b2RqZ3Z4bnVpanNxdGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5MDc4ODMsImV4cCI6MjA0NjQ4Mzg4M30.6JbmCKMEBQH6AnFc0_J5_LRoAi2LC2NioQXEYVmMzu8")