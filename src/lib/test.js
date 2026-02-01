const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-supabase-url';
const supabaseKey = 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Schedule a task to ping the database every Monday and Thursday at 9:00 AM
cron.schedule('0 9 * * 1,4', async () => {
  try {
    const { data, error } = await supabase
      .from('your_table') // Specify your table name
      .select('id')
      .limit(1); // Limit to reduce load
    
    if (error) {
      console.error('Error pinging Supabase:', error);
    } else {
      console.log('Supabase ping successful at', new Date());
    }
  } catch (err) {
    console.error('Failed to ping Supabase:', err);
  }
});

console.log('Scheduled ping to Supabase every Monday and Thursday at 9:00 AM.');