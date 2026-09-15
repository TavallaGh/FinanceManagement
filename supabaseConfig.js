
/* Filename: supabaseConfig.js */
const SUPABASE_URL = 'https://apmufgnvrncduflemjmk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbXVmZ252cm5jZHVmbGVtam1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjgzNDUsImV4cCI6MjA5Mjk0NDM0NX0.ZtGRKgMTUK1SLm3665rBLNQOw7Zg_viEZVSZJxxim9M';

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

const NETWORK_ERROR_PATTERNS = [
	'failed to fetch',
	'networkerror',
	'network request failed',
	'load failed',
	'fetch failed',
	'aborterror',
	'timeout',
	'ecconnreset',
	'enotfound',
	'eai_again'
];

window.isLikelyNetworkError = (error) => {
	const message = String(error?.message || error || '').toLowerCase();
	return NETWORK_ERROR_PATTERNS.some((token) => message.includes(token));
};

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const fetchWithTimeout = async (url, timeoutMs) => {
	const controller = new AbortController();
	const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

	try {
		await fetch(url, {
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

window.isSupabaseReachable = async (timeoutMs = 7000, retries = 2) => {
	for (let attempt = 0; attempt <= retries; attempt += 1) {
		const authHealthOk = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/health`, timeoutMs);
		if (authHealthOk) {
			return true;
		}

		if (attempt < retries) {
			await wait(250 * (attempt + 1));
		}
	}

	return false;
};

window.supabaseWithRetry = async (operation, options = {}) => {
	const retries = Number.isInteger(options.retries) ? options.retries : 2;
	const baseDelayMs = Number.isInteger(options.baseDelayMs) ? options.baseDelayMs : 250;

	for (let attempt = 0; attempt <= retries; attempt += 1) {
		try {
			const result = await operation();
			if (result?.error && window.isLikelyNetworkError(result.error)) {
				throw result.error;
			}
			return result;
		} catch (error) {
			const isNetworkError = window.isLikelyNetworkError(error);
			if (!isNetworkError || attempt >= retries) {
				throw error;
			}

			await wait(baseDelayMs * (attempt + 1));
		}
	}
};

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
