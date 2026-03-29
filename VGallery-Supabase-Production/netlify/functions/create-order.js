const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const orderData = JSON.parse(event.body);
        const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        // Check stock
        for (const item of orderData.items) {
            const { data: product } = await supabase
                .from('products')
                .select('stock')
                .eq('product_id', item.product_id)
                .single();
            
            if (!product || product.stock < item.quantity) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: `Insufficient stock for item ${item.product_id}` })
                };
            }
        }
        
        // Create order
        const order = {
            order_number: orderNumber,
            customer_email: orderData.customer_email,
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            customer_address: orderData.customer_address,
            items: orderData.items,
            subtotal: orderData.subtotal,
            shipping_cost: orderData.shipping_cost || 0,
            tax_amount: orderData.tax_amount || 0,
            total_amount: orderData.total_amount,
            payment_method: orderData.payment_method,
            status: 'pending',
            payment_status: 'pending'
        };
        
        const { data: orderResult, error: orderError } = await supabase
            .from('orders')
            .insert([order])
            .select()
            .single();
        
        if (orderError) throw orderError;
        
        // Update stock
        for (const item of orderData.items) {
            const { data: product } = await supabase
                .from('products')
                .select('stock')
                .eq('product_id', item.product_id)
                .single();
            
            await supabase
                .from('products')
                .update({ stock: product.stock - item.quantity })
                .eq('product_id', item.product_id);
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, order: orderResult, orderNumber })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to create order' })
        };
    }
};
