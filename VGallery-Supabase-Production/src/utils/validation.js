import Joi from 'joi';

// Product validation schema
export const productSchema = Joi.object({
    product_id: Joi.string().required(),
    title: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(5000),
    type: Joi.string().valid('original', 'print', 'merch', 'craft').required(),
    base_price: Joi.number().positive().required(),
    compare_at_price: Joi.number().positive(),
    stock: Joi.number().integer().min(0).default(0),
    images: Joi.array().items(Joi.string().uri()),
    is_active: Joi.boolean().default(true)
});

// Order validation schema
export const orderSchema = Joi.object({
    customer_email: Joi.string().email().required(),
    customer_name: Joi.string().min(2).max(100).required(),
    customer_phone: Joi.string().pattern(/^[\+]?[0-9]{10,15}$/),
    customer_address: Joi.object({
        line1: Joi.string().required(),
        line2: Joi.string(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        postal_code: Joi.string(),
        country: Joi.string().default('NG')
    }).required(),
    items: Joi.array().items(Joi.object({
        product_id: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().positive().required()
    })).min(1).required(),
    payment_method: Joi.string().valid('paystack', 'nomba', 'bank_transfer'),
    shipping_method: Joi.string()
});

// Customer validation schema
export const customerSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(100),
    phone: Joi.string().pattern(/^[\+]?[0-9]{10,15}$/),
    newsletter_subscribed: Joi.boolean().default(false)
});

// Coupon validation schema
export const couponSchema = Joi.object({
    code: Joi.string().uppercase().min(3).max(20).required(),
    discount_type: Joi.string().valid('percentage', 'fixed_amount').required(),
    discount_value: Joi.number().positive().required(),
    minimum_order_amount: Joi.number().positive(),
    expires_at: Joi.date().greater('now').required()
});

export const validate = {
    product: (data) => {
        const { error, value } = productSchema.validate(data);
        if (error) throw new Error(error.details[0].message);
        return value;
    },
    
    order: (data) => {
        const { error, value } = orderSchema.validate(data);
        if (error) throw new Error(error.details[0].message);
        return value;
    },
    
    customer: (data) => {
        const { error, value } = customerSchema.validate(data);
        if (error) throw new Error(error.details[0].message);
        return value;
    },
    
    coupon: (data) => {
        const { error, value } = couponSchema.validate(data);
        if (error) throw new Error(error.details[0].message);
        return value;
    },
    
    email: (email) => {
        return Joi.string().email().validate(email).error === undefined;
    }
};
