import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const ssr = false;

export async function load({ url }) {

    console.log("checking session");
    // Wait for Supabase to process session changes
    //await new Promise(resolve => setTimeout(resolve, 1000));
  const { data: { session } } = await supabase.auth.getSession();

  const publicRoutes = ['/']; // Only allow the login screen

  // Redirect users to login if they try to access protected pages
  if (!session && !publicRoutes.includes(url.pathname)) {
    console.log("session unlogged innn, redirecting");
    throw redirect(303, '/'); //-- parang this gets called agad so we dont see the print statement
  } else {
    console.log("session valid");
    //throw redirect(303, '/dashboard');
  }

  return { session };
}
