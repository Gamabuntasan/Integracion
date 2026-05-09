import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://ikeebacmdyobisrcysvr.supabase.co';
const supabaseKey = 'sb_publishable_Yb5P2e5VTqikB0H6cifwoA_0nIOZh6S';

export const supabase = createClient(supabaseUrl, supabaseKey);