import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "sb_publishable_3rBhtwy1gJokTYOEKq9yvA_AaNZIlxQ";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbGFvZnhwdGV5c2p1c293bG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTk2MDYsImV4cCI6MjEwNzczNTYwNn0.e69fm_e97HzsoEys5udlFnRitkcKTn8XPvk_ILvGO80";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);