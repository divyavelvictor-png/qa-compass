import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL  || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const IS_CONFIGURED =
  !!url && url !== 'https://xxxx.supabase.co' && url.startsWith('https://');

export const supabase = IS_CONFIGURED ? createClient(url, key) : null;
