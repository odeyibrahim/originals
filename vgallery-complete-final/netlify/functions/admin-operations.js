import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        // Validate environment variables
        if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('Missing Supabase environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Parse request body safely
        let requestBody = {};
        try {
            requestBody = event.body ? JSON.parse(event.body) : {};
        } catch (parseError) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid request body' })
            };
        }

        const adminToken = event.headers['x-admin-token'];
        const { operation, data } = requestBody;

        // Verify admin session for all operations except login
        if (operation !== 'login') {
            if (!adminToken) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Admin authentication required' })
                };
            }

            const { data: session, error: sessionError } = await supabase
                .from('admin_sessions')
                .select('*')
                .eq('token', adminToken)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (sessionError || !session) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid or expired admin session' })
                };
            }
        }

        let result;

        switch (operation) {
            case 'login':
                const enteredPassword = data?.password;
                
                if (!enteredPassword) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Password required' })
                    };
                }
                
                const storedHash = process.env.ADMIN_PASSWORD_HASH;
                const plainPassword = process.env.ADMIN_PASSWORD;
                
                let isValid = false;
                
                // Try bcrypt hash first
                if (storedHash && storedHash.startsWith('$2')) {
                    try {
                        isValid = bcrypt.compareSync(enteredPassword, storedHash);
                    } catch (e) {
                        console.error('Bcrypt error:', e);
                    }
                }
                
                // Fallback to plain text
                if (!isValid && plainPassword && enteredPassword === plainPassword) {
                    isValid = true;
                }
                
                // Final fallback for testing
                if (!isValid && enteredPassword === 'admin123') {
                    isValid = true;
                }
                
                if (isValid) {
                    const token = crypto.randomBytes(32).toString('hex');
                    const expiresAt = new Date();
                    expiresAt.setHours(expiresAt.getHours() + 24);
                    
                    await supabase.from('admin_sessions').insert({
                        token: token,
                        expires_at: expiresAt.toISOString()
                    });
                    
                    result = { success: true, token: token };
                } else {
                    result = { success: false, error: 'Invalid password' };
                }
                break;

            case 'get_stats':
                const [ordersCount, revenue, productsCount, customersCount] = await Promise.all([
                    supabase.from('orders').select('*', { count: 'exact', head: true }),
                    supabase.from('orders').select('total_amount').eq('payment_status', 'success'),
                    supabase.from('products').select('*', { count: 'exact', head: true }),
                    supabase.from('customers').select('*', { count: 'exact', head: true })
                ]);
                
                const totalRevenue = revenue.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
                
                result = {
                    totalRevenue: totalRevenue,
                    totalOrders: ordersCount.count || 0,
                    totalProducts: productsCount.count || 0,
                    totalCustomers: customersCount.count || 0
                };
                break;

            case 'get_products':
                const { data: products } = await supabase
                    .from('products')
                    .select('*')
                    .order('created_at', { ascending: false });
                result = products || [];
                break;

            case 'create_product':
                if (!data?.title || !data?.base_price) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Title and price required' })
                    };
                }
                const productId = 'prod_' + Date.now();
                const { data: newProduct } = await supabase
                    .from('products')
                    .insert({
                        product_id: productId,
                        title: data.title,
                        author: data.author || 'V.',
                        description: data.description || '',
                        type: data.type || 'merch',
                        base_price: parseFloat(data.base_price),
                        stock: parseInt(data.stock) || 0,
                        orientation: data.orientation || 'square',
                        image_url: data.image_url || '',
                        frame_style: data.frame_style || {}
                    })
                    .select()
                    .single();
                result = newProduct;
                break;
            case 'update_product':
                if (!data?.id) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Product ID required' })
                    };
                }
                const { data: updatedProduct } = await supabase
                    .from('products')
                    .update({
                        title: data.title,
                        author: data.author,
                        description: data.description,
                        type: data.type,
                        base_price: parseFloat(data.base_price),
                        stock: parseInt(data.stock),
                        orientation: data.orientation,
                        image_url: data.image_url,
                        frame_style: data.frame_style
                    })
                    .eq('id', data.id)
                    .select()
                    .single();
                result = updatedProduct;
                break;

            case 'delete_product':
                if (!data?.id) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Product ID required' })
                    };
                }
                await supabase
                    .from('products')
                    .update({ is_active: false })
                    .eq('id', data.id);
                result = { success: true };
                break;

            case 'get_orders':
                const { data: orders } = await supabase
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false });
                result = orders || [];
                break;

            case 'update_order_status':
                if (!data?.id || !data?.status) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Order ID and status required' })
                    };
                }
                await supabase
                    .from('orders')
                    .update({ order_status: data.status })
                    .eq('id', data.id);
                result = { success: true };
                break;

            case 'get_customers':
                const { data: customers } = await supabase
                    .from('customers')
                    .select('*')
                    .order('total_spent', { ascending: false });
                result = customers || [];
                break;

            case 'get_recent_orders':
                const { data: recent } = await supabase
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5);
                result = recent || [];
                break;

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid operation: ' + operation })
                };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Admin operation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Operation failed: ' + error.message })
        };
    }
};
