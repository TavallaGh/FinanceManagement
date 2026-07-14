
/* Filename: supabaseConfig.js */
const SUPABASE_URL = 'https://apmufgnvrncduflemjmk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbXVmZ252cm5jZHVmbGVtam1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjgzNDUsImV4cCI6MjA5Mjk0NDM0NX0.ZtGRKgMTUK1SLm3665rBLNQOw7Zg_viEZVSZJxxim9M';

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

window.isSupabaseReachable = async (timeoutMs = 4000) => {
	const controller = new AbortController();
	const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

	try {
		await fetch(`${SUPABASE_URL}/auth/v1/health`, {
			method: 'GET',
			headers: {
				apikey: SUPABASE_ANON_KEY,
				Authorization: `Bearer ${SUPABASE_ANON_KEY}`
			},
			signal: controller.signal,
			cache: 'no-store'
		});
		return true;
	} catch (error) {
		return false;
	} finally {
		window.clearTimeout(timeoutId);
	}
};

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);