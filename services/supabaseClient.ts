
import { createClient } from '@supabase/supabase-js';

// User provided Supabase Project Credentials
const supabaseUrl = 'https://vodrscmxoshaebhicunk.supabase.co';
const supabaseKey = 'sb_publishable_L-rVjMzcdVlyciqJTAFu7g_lBIKG449';

export const supabase = createClient(supabaseUrl, supabaseKey);
