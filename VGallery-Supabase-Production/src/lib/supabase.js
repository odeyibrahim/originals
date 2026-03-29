import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'vgallery-auth'
    }
});

export const subscribeToProducts = (callback) => {
    return supabase
        .channel('products-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'products' },
            callback
        )
        .subscribe();
};
