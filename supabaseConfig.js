
/* Filename: supabaseConfig.js */
const SUPABASE_URL = 'https://apmufgnvrncduflemjmk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbXVmZ252cm5jZHVmbGVtam1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjgzNDUsImV4cCI6MjA5Mjk0NDM0NX0.ZtGRKgMTUK1SLm3665rBLNQOw7Zg_viEZVSZJxxim9M';

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);