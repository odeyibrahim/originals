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

        const { productId, sessionId } = requestBody;

        if (!productId || !sessionId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Product ID and Session ID required' })
            };
        }

        // Check if like exists
        const { data: existing, error: findError } = await supabase
            .from('product_likes')
            .select('id')
            .eq('product_id', productId)
            .eq('session_id', sessionId)
            .maybeSingle();

        if (findError && findError.code !== 'PGRST116') {
            console.error('Find like error:', findError);
        }

        if (existing) {
            // Remove like
            await supabase
                .from('product_likes')
                .delete()
                .eq('id', existing.id);
            
            // Decrement likes count
            const { data: product } = await supabase
                .from('products')
                .select('likes_count')
                .eq('product_id', productId)
                .single();
            
            if (product) {
                await supabase
                    .from('products')
                    .update({ likes_count: Math.max(0, (product.likes_count || 0) - 1) })
                    .eq('product_id', productId);
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ liked: false })
            };
        } else {
            // Add like
            await supabase
                .from('product_likes')
                .insert({ product_id: productId, session_id: sessionId });
            
            // Increment likes count
            const { data: product } = await supabase
                .from('products')
                .select('likes_count')
                .eq('product_id', productId)
                .single();
            
            if (product) {
                await supabase
                    .from('products')
                    .update({ likes_count: (product.likes_count || 0) + 1 })
                    .eq('product_id', productId);
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ liked: true })
            };
        }
    } catch (error) {
        console.error('Toggle like error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to toggle like: ' + error.message })
        };
    }
};
