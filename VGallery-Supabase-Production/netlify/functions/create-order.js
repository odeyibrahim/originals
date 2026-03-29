const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        
        // Generate unique order number
        const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        // Start a transaction using a stored procedure or manual transaction
        // First, check stock availability
        for (const item of orderData.items) {
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('stock, product_id, title')
                .eq('product_id', item.product_id)
                .single();
            
            if (productError || !product) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: `Product ${item.product_id} not found` 
                    })
                };
            }
            
            if (product.stock < item.quantity) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: `Insufficient stock for ${product.title}. Available: ${product.stock}` 
                    })
                };
            }
        }
        
        // Create customer if doesn't exist
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('email', orderData.customer_email)
            .single();
        
        if (!existingCustomer) {
            await supabase
                .from('customers')
                .insert([{
                    email: orderData.customer_email,
                    name: orderData.customer_name,
                    phone: orderData.customer_phone,
                    addresses: [orderData.customer_address]
                }]);
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
            shipping_method: orderData.shipping_method,
            status: 'pending',
            payment_status: 'pending',
            ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'],
            user_agent: event.headers['user-agent']
        };
        
        const { data: orderResult, error: orderError } = await supabase
            .from('orders')
            .insert([order])
            .select()
            .single();
        
        if (orderError) {
            console.error('Order creation error:', orderError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to create order' })
            };
        }
        
        // Update stock levels
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
            body: JSON.stringify({
                success: true,
                order: orderResult,
                orderNumber: orderNumber
            })
        };
        
    } catch (error) {
        console.error('Create order error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
