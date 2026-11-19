import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wllaofxpteysjusowlmb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbGFvZnhwdGV5c2p1c293bG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTk2MDYsImV4cCI6MjEwNzczNTYwNn0.e69fm_e97HzsoEys5udlFnRitkcKTn8XPvk_ILvGO80';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
