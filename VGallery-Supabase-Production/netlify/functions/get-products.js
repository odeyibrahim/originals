const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
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

        // Apply filters if provided
        const { type, limit, offset } = event.queryStringParameters || {};
        
        if (type && type !== 'all') {
            query = query.eq('type', type);
        }
        
        if (limit) {
            query = query.limit(parseInt(limit));
        }
        
        if (offset) {
            query = query.range(parseInt(offset), parseInt(offset) + (parseInt(limit) || 20) - 1);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Supabase error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to fetch products' })
            };
        }

        // Get total count for pagination
        const { count: totalCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data,
                pagination: {
                    total: totalCount,
                    limit: parseInt(limit) || 20,
                    offset: parseInt(offset) || 0
                }
            })
        };
    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
