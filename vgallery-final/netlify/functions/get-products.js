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

        let query = supabase.from('products').select('*').eq('is_active', true);
        
        if (event.queryStringParameters?.type && event.queryStringParameters.type !== 'all') {
            query = query.eq('type', event.queryStringParameters.type);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data || [])
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify([])
        };
    }
};
