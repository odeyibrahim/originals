const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const { action, password, token } = JSON.parse(event.body);
        
        if (action === 'login') {
            const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
            
            if (!valid) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid password' })
                };
            }
            
            const newToken = jwt.sign(
                { role: 'admin', exp: Math.floor(Date.now() / 1000) + 86400 },
                process.env.JWT_SECRET
            );
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, token: newToken })
            };
        }
        
        if (action === 'verify') {
            try {
                jwt.verify(token, process.env.JWT_SECRET);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ valid: true })
                };
            } catch {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ valid: false })
                };
            }
        }
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server error' })
        };
    }
};
