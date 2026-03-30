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

        const { productId, sessionId } = JSON.parse(event.body);

        const { data: existing } = await supabase
            .from('product_likes')
            .select('id')
            .eq('product_id', productId)
            .eq('session_id', sessionId)
            .single();

        if (existing) {
            await supabase.from('product_likes').delete().eq('id', existing.id);
            await supabase
                .from('products')
                .update({ likes_count: supabase.rpc('decrement', { x: 1 }) })
                .eq('product_id', productId);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ liked: false })
            };
        } else {
            await supabase.from('product_likes').insert({ product_id: productId, session_id: sessionId });
            await supabase
                .from('products')
                .update({ likes_count: supabase.rpc('increment', { x: 1 }) })
                .eq('product_id', productId);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ liked: true })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to toggle like' })
        };
    }
};
