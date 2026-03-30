import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    try {
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

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

        const { reference } = requestBody;
        
        if (!reference) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Reference required' })
            };
        }

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('payment_reference', reference)
            .single();

        if (orderError || !order) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Order not found' })
            };
        }

        if (order.payment_status === 'success') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ status: 'success', order: order })
            };
        }

        let verification;
        const paystackKey = process.env.PAYSTACK_SECRET_KEY;
        const nombaKey = process.env.NOMBA_SECRET_KEY;
        
        if (order.payment_method === 'nomba') {
            if (!nombaKey) {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Nomba not configured' })
                };
            }
            const verifyRes = await fetch(`https://api.nomba.com/v1/transactions/verify/${reference}`, {
                headers: { 'Authorization': `Bearer ${nombaKey}` }
            });
            verification = await verifyRes.json();
        } else {
            if (!paystackKey) {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Paystack not configured' })
                };
            }
            const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
                headers: { 'Authorization': `Bearer ${paystackKey}` }
            });
            verification = await verifyRes.json();
        }

        if (verification.data?.status === 'success') {
            const { data: result, error: completeError } = await supabase
                .rpc('complete_order_payment', {
                    p_order_id: order.id,
                    p_payment_reference: reference,
                    p_amount_paid: verification.data.amount / 100,
                    p_payment_method: order.payment_method
                });

            if (completeError) {
                console.error('Complete order error:', completeError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Failed to complete order' })
                };
            }

            if (result?.success) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ status: 'success', order: result })
                };
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: 'pending' })
        };

    } catch (error) {
        console.error('Verification error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Verification failed: ' + error.message })
        };
    }
};
