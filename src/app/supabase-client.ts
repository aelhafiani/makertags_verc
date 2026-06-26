import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jmxcrkagefzlcudzxpuk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpteGNya2FnZWZ6bGN1ZHp4cHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjQzNjIsImV4cCI6MjA3MDAwMDM2Mn0.IMyq3sucGXgM5hMbWLhBOoskf6a88ngyqzZSE_4r9mw'; // Replace with your real anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);