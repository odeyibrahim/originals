import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (limited permissions)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'vgallery-auth-token'
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    },
    global: {
        headers: {
            'X-Application-Name': 'vgallery-production'
        }
    }
});

// Helper for real-time subscriptions
export const subscribeToTable = (table, callback, filter = null) => {
    let query = supabase
        .channel(`${table}-changes`)
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: table },
            (payload) => {
                callback(payload);
            }
        );
    
    return query.subscribe();
};

// Product-specific subscription
export const subscribeToProducts = (callback) => {
    return subscribeToTable('products', callback);
};

// Order-specific subscription for a customer
export const subscribeToCustomerOrders = (customerEmail, callback) => {
    return supabase
        .channel(`orders-${customerEmail}`)
        .on('postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'orders',
                filter: `customer_email=eq.${customerEmail}`
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();
};
