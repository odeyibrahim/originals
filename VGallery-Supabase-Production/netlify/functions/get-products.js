const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        let query = supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        const { type, limit } = event.queryStringParameters || {};
        
        if (type && type !== 'all') {
            query = query.eq('type', type);
        }
        
        if (limit) {
            query = query.limit(parseInt(limit));
        }

        const { data, error } = await query;

        if (error) throw error;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch products' })
        };
    }
};
