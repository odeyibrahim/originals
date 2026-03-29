const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const { action, email, password, token } = JSON.parse(event.body);
        
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        // Login action
        if (action === 'login') {
            // Verify admin credentials from environment or database
            const adminEmail = process.env.ADMIN_EMAIL;
            const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
            
            if (email !== adminEmail) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid credentials' })
                };
            }
            
            const valid = await bcrypt.compare(password, adminPasswordHash);
            
            if (!valid) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid credentials' })
                };
            }
            
            // Create session token
            const token = jwt.sign(
                { 
                    email: adminEmail, 
                    role: 'admin',
                    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
                },
                process.env.JWT_SECRET
            );
            
            // Store session in database
            await supabase
                .from('sessions')
                .insert([{
                    token: token,
                    user_id: adminEmail,
                    user_type: 'admin',
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'],
                    user_agent: event.headers['user-agent']
                }]);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    token,
                    expiresIn: 86400
                })
            };
        }
        
        // Verify token action
        if (action === 'verify') {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // Check if session exists in database
                const { data: session } = await supabase
                    .from('sessions')
                    .select('*')
                    .eq('token', token)
                    .eq('user_type', 'admin')
                    .single();
                
                if (!session || new Date(session.expires_at) < new Date()) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Invalid or expired session' })
                    };
                }
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        valid: true, 
                        email: decoded.email,
                        role: decoded.role
                    })
                };
            } catch (err) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid token' })
                };
            }
        }
        
        // Logout action
        if (action === 'logout') {
            await supabase
                .from('sessions')
                .delete()
                .eq('token', token);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
            };
        }
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
        };
        
    } catch (error) {
        console.error('Admin auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
