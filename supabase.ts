import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ujharjngjoneeghirnsq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'Sb_publishable_ld2zGgtvEvuJ0_qpnyXFhg_pMcfepmf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionUrl: false,
  },
});
