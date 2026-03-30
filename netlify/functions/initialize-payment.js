import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
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

        const { email, name, phone, productId, quantity, shippingMethod, address, city, zip, paymentGateway } = requestBody;

        // Validate required fields
        if (!email || !name || !productId || !quantity) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        const items = [{
            product_id: productId,
            quantity: quantity
        }];

        const { data: orderData, error: orderError } = await supabase
            .rpc('create_pending_order', {
                p_customer_email: email,
                p_customer_name: name,
                p_customer_phone: phone || '',
                p_items: JSON.stringify(items),
                p_discount_code: null,
                p_shipping_method: shippingMethod || 'standard',
                p_customer_address: { street: address || '', city: city || '', zip: zip || '' }
            });

        if (orderError || !orderData?.success) {
            console.error('Order creation error:', orderError, orderData);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: orderData?.error || 'Failed to create order' })
            };
        }

        let paymentResponse;
        const amountInKobo = Math.round(orderData.amount * 100);

        const paystackKey = process.env.PAYSTACK_SECRET_KEY;
        const nombaKey = process.env.NOMBA_SECRET_KEY;

        if (paymentGateway === 'nomba') {
            if (!nombaKey) {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Nomba not configured' })
                };
            }
            paymentResponse = await fetch('https://api.nomba.com/v1/transactions/initialize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${nombaKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: amountInKobo,
                    currency: 'USD',
                    email: email,
                    reference: orderData.order_number,
                    callback_url: `${process.env.URL || 'https://' + event.headers.host}/checkout-success.html`
                })
            });
        } else {
            if (!paystackKey) {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Paystack not configured' })
                };
            }
            paymentResponse = await fetch('https://api.paystack.co/transaction/initialize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${paystackKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    amount: amountInKobo,
                    reference: orderData.order_number,
                    callback_url: `${process.env.URL || 'https://' + event.headers.host}/checkout-success.html`,
                    metadata: {
                        order_id: orderData.order_id,
                        product_title: orderData.product_title
                    }
                })
            });
        }

        const paymentData = await paymentResponse.json();

        if (!paymentData.status) {
            console.error('Payment gateway error:', paymentData);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: paymentData.message || 'Payment gateway error' })
            };
        }

        await supabase
            .from('orders')
            .update({ payment_reference: paymentData.data.reference, payment_method: paymentGateway })
            .eq('id', orderData.order_id);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                authorization_url: paymentData.data.authorization_url,
                reference: paymentData.data.reference,
                order_number: orderData.order_number
            })
        };

    } catch (error) {
        console.error('Payment initialization error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Payment initialization failed: ' + error.message })
        };
    }
};
