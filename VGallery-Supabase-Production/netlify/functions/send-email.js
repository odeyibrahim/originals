const sgMail = require('@sendgrid/mail');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }
    
    try {
        const { to, template, data } = JSON.parse(event.body);
        
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        let subject, html;
        
        // Email templates
        switch(template) {
            case 'order_confirmation':
                subject = `Order Confirmation #${data.orderNumber}`;
                html = `
                    <h1>Thank you for your order!</h1>
                    <p>Order #${data.orderNumber} has been confirmed.</p>
                    <p>Total: ${data.total}</p>
                    <p>We'll notify you when your order ships.</p>
                `;
                break;
            case 'order_shipped':
                subject = `Order #${data.orderNumber} Has Shipped!`;
                html = `
                    <h1>Your order is on the way!</h1>
                    <p>Tracking #: ${data.trackingNumber}</p>
                    <p>Estimated delivery: ${data.estimatedDelivery}</p>
                `;
                break;
            case 'password_reset':
                subject = 'Password Reset Request';
                html = `
                    <h1>Reset Your Password</h1>
                    <p>Click <a href="${data.resetLink}">here</a> to reset your password.</p>
                    <p>This link expires in 1 hour.</p>
                `;
                break;
            default:
                subject = 'Update from V. Gallery';
                html = `<p>${data.message}</p>`;
        }
        
        const msg = {
            to: to,
            from: process.env.FROM_EMAIL || 'noreply@vgallery.com',
            subject: subject,
            html: html
        };
        
        await sgMail.send(msg);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true })
        };
        
    } catch (error) {
        console.error('Email error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to send email' })
        };
    }
};
