const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const signature = event.headers['x-paystack-signature'];
    
    // Verify webhook signature
    const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(event.body)
        .digest('hex');
    
    if (hash !== signature) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }
    
    const webhookData = JSON.parse(event.body);
    
    if (webhookData.event === 'charge.success') {
        const { reference, metadata, customer, amount } = webhookData.data;
        
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        // Update order status
        const { error: updateError } = await supabase
            .from('orders')
            .update({ 
                payment_status: 'paid',
                status: 'processing',
                payment_details: webhookData.data,
                updated_at: new Date()
            })
            .eq('payment_reference', reference);
        
        if (updateError) {
            console.error('Failed to update order:', updateError);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to update order' })
            };
        }
        
        // Send confirmation email (implement with SendGrid)
        console.log(`Payment successful for reference: ${reference}`);
        console.log(`Customer: ${customer.email}`);
        console.log(`Amount: ${amount / 100} ${webhookData.data.currency}`);
    }
    
    return { 
        statusCode: 200, 
        body: JSON.stringify({ received: true })
    };
};
