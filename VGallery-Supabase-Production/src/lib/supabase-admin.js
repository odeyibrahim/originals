import { createClient } from '@supabase/supabase-js';

// Server-side only! Do not expose in frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Service role key not available. Admin functions will be limited.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Admin-only operations
export const adminDb = {
    // Products
    getAllProducts: async () => {
        const { data, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    
    createProduct: async (product) => {
        const { data, error } = await supabaseAdmin
            .from('products')
            .insert([product])
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    
    updateProduct: async (productId, updates) => {
        const { data, error } = await supabaseAdmin
            .from('products')
            .update(updates)
            .eq('product_id', productId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    
    deleteProduct: async (productId) => {
        const { error } = await supabaseAdmin
            .from('products')
            .delete()
            .eq('product_id', productId);
        if (error) throw error;
        return true;
    },
    
    // Orders
    getAllOrders: async () => {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    
    updateOrderStatus: async (orderId, status) => {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .update({ status, updated_at: new Date() })
            .eq('order_number', orderId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    
    // Customers
    getAllCustomers: async () => {
        const { data, error } = await supabaseAdmin
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    
    // Analytics
    getSalesStats: async (period = 'month') => {
        let interval;
        switch(period) {
            case 'week': interval = '7 days'; break;
            case 'month': interval = '30 days'; break;
            case 'year': interval = '365 days'; break;
            default: interval = '30 days';
        }
        
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select('total_amount, created_at, status')
            .gte('created_at', new Date(Date.now() - (interval === '7 days' ? 7 : interval === '30 days' ? 30 : 365) * 24 * 60 * 60 * 1000));
        
        if (error) throw error;
        
        const totalSales = data
            .filter(o => o.status === 'delivered' || o.status === 'processing')
            .reduce((sum, o) => sum + o.total_amount, 0);
        
        const orderCount = data.filter(o => o.status !== 'cancelled').length;
        
        return { totalSales, orderCount, data };
    }
};
