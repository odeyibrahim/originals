-- Run this SQL in your Supabase SQL Editor
-- Complete schema with all tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT DEFAULT 'V.',
    description TEXT,
    type TEXT CHECK (type IN ('original', 'print', 'merch', 'craft')),
    base_price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    orientation TEXT DEFAULT 'square',
    image_url TEXT,
    images TEXT[] DEFAULT '{}',
    frame_style JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discount codes
CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    type TEXT CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(10,2) NOT NULL,
    min_purchase DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT UNIQUE NOT NULL,
    customer_id UUID,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address JSONB,
    items JSONB NOT NULL,
    discount_code TEXT,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_reference TEXT UNIQUE,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'pending',
    shipping_method TEXT,
    tracking_number TEXT,
    notes TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    addresses JSONB DEFAULT '[]'::jsonb,
    wishlist TEXT[] DEFAULT '{}',
    orders_count INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    newsletter BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carts table
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES customers(id),
    session_id TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    discount_code TEXT,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abandoned carts tracking
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES carts(id),
    email TEXT,
    reminder_1_sent BOOLEAN DEFAULT false,
    reminder_1_sent_at TIMESTAMPTZ,
    reminder_2_sent BOOLEAN DEFAULT false,
    reminder_2_sent_at TIMESTAMPTZ,
    recovered BOOLEAN DEFAULT false,
    recovered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product likes
CREATE TABLE IF NOT EXISTS product_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL,
    user_id UUID REFERENCES customers(id),
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, user_id, session_id)
);

-- Admin sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory logs
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL,
    change_amount INTEGER NOT NULL,
    reason TEXT,
    order_id TEXT,
    previous_stock INTEGER,
    new_stock INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email logs
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email TEXT NOT NULL,
    subject TEXT,
    type TEXT,
    status TEXT,
    error TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(email);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active products" ON products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Customers can view own orders" ON orders
    FOR SELECT USING (auth.email() = customer_email);

CREATE POLICY "Customers can manage own profile" ON customers
    FOR ALL USING (auth.email() = email);

CREATE POLICY "Customers can manage own cart" ON carts
    FOR ALL USING (auth.email() = (SELECT email FROM customers WHERE id = user_id));

-- Insert sample products
INSERT INTO products (product_id, title, author, description, type, base_price, stock, orientation, image_url, frame_style, is_featured) VALUES
('prod_001', 'Archive Tee', 'V.', 'Archive Tee — a relic of soft cotton.\nScreen printed by hand in Los Angeles.\nEach piece carries the weight of memory.\n100% cotton, pre-shrunk.\nMade ethically in a small batch.', 'merch', 45, 10, 'square', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', '{}', true),
('prod_002', 'Desert Landscape', 'V.', 'Archival photograph from the high desert.\nSigned and numbered on archival paper.\nEdition of 50.\nPrinted with pigment inks for longevity.\nComes with certificate of authenticity.', 'print', 195, 5, 'landscape', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800', '{"color":"white","width":5}', true),
('prod_003', 'Silent Currents', 'V.', 'Original mixed media on canvas, 2024.\nLayers of acrylic, graphite, and cold wax.\nA unique piece, signed and dated on verso.\nReady to hang.', 'original', 8500, 1, 'landscape', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800', '{"color":"#2c2c2c","width":8,"padding":5}', true),
('prod_004', 'Handwoven Wall Hanging', 'V.', 'Natural fibers dyed with plants.\nWoven on a wooden loom.\nMeasures 24 x 36 inches.\nOne of a kind.', 'craft', 380, 2, 'portrait', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800', '{}', false)
ON CONFLICT (product_id) DO NOTHING;

-- Insert discount codes
INSERT INTO discounts (code, type, value, min_purchase, expires_at, usage_limit) VALUES
('WELCOME10', 'percentage', 10, 0, NOW() + INTERVAL '365 days', 100),
('FREESHIP', 'fixed', 7, 50, NOW() + INTERVAL '90 days', 50)
ON CONFLICT (code) DO NOTHING;

-- Function to create pending order
CREATE OR REPLACE FUNCTION create_pending_order(
    p_customer_email TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_items JSONB,
    p_discount_code TEXT,
    p_shipping_method TEXT,
    p_customer_address JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_product RECORD;
    v_subtotal DECIMAL := 0;
    v_discount_amount DECIMAL := 0;
    v_discount_record RECORD;
    v_shipping DECIMAL;
    v_tax DECIMAL;
    v_total DECIMAL;
    v_order_id TEXT;
    v_order_uuid UUID;
    v_insufficient_stock TEXT[] := '{}';
BEGIN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, quantity INTEGER)
    LOOP
        SELECT * INTO v_product FROM products WHERE product_id = v_item.product_id AND is_active = true;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Product not found: ' || v_item.product_id);
        END IF;
        IF v_product.stock < v_item.quantity THEN
            v_insufficient_stock := array_append(v_insufficient_stock, v_product.title);
        END IF;
        v_subtotal := v_subtotal + (v_product.base_price * v_item.quantity);
    END LOOP;
    
    IF array_length(v_insufficient_stock, 1) > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock for: ' || array_to_string(v_insufficient_stock, ', '));
    END IF;
    
    IF p_discount_code IS NOT NULL THEN
        SELECT * INTO v_discount_record FROM discounts 
        WHERE code = p_discount_code AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
        AND (usage_limit IS NULL OR used_count < usage_limit);
        
        IF FOUND THEN
            IF v_discount_record.type = 'percentage' THEN
                v_discount_amount := v_subtotal * (v_discount_record.value / 100);
                IF v_discount_record.max_discount IS NOT NULL AND v_discount_amount > v_discount_record.max_discount THEN
                    v_discount_amount := v_discount_record.max_discount;
                END IF;
            ELSE
                v_discount_amount := v_discount_record.value;
            END IF;
            UPDATE discounts SET used_count = used_count + 1 WHERE id = v_discount_record.id;
        END IF;
    END IF;
    
    v_shipping := CASE 
        WHEN v_subtotal - v_discount_amount > 100 THEN 0
        WHEN p_shipping_method = 'express' THEN 15 * (SELECT COUNT(*) FROM jsonb_to_recordset(p_items))
        ELSE 7 * (SELECT COUNT(*) FROM jsonb_to_recordset(p_items))
    END;
    v_tax := (v_subtotal - v_discount_amount) * 0.08;
    v_total := v_subtotal - v_discount_amount + v_shipping + v_tax;
    
    v_order_id := 'VG-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');
    
    INSERT INTO orders (
        order_id, customer_email, customer_name, customer_phone, customer_address,
        items, discount_code, discount_amount, subtotal,
        shipping_cost, tax_amount, total_amount, shipping_method
    ) VALUES (
        v_order_id, p_customer_email, p_customer_name, p_customer_phone, p_customer_address,
        p_items, p_discount_code, v_discount_amount, v_subtotal,
        v_shipping, v_tax, v_total, p_shipping_method
    )
    RETURNING id INTO v_order_uuid;
    
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_uuid,
        'order_number', v_order_id,
        'amount', v_total,
        'subtotal', v_subtotal,
        'discount', v_discount_amount,
        'shipping', v_shipping,
        'tax', v_tax
    );
END;
$$;

-- Function to complete order payment
CREATE OR REPLACE FUNCTION complete_order_payment(
    p_order_id UUID,
    p_payment_reference TEXT,
    p_amount_paid DECIMAL,
    p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_product RECORD;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;
    IF v_order.payment_status = 'success' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order already paid');
    END IF;
    
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_order.items) AS x(product_id TEXT, quantity INTEGER)
    LOOP
        SELECT * INTO v_product FROM products WHERE product_id = v_item.product_id FOR UPDATE;
        UPDATE products SET stock = stock - v_item.quantity, sales_count = sales_count + v_item.quantity WHERE product_id = v_item.product_id;
        INSERT INTO inventory_logs (product_id, change_amount, reason, order_id, previous_stock, new_stock)
        VALUES (v_item.product_id, -v_item.quantity, 'payment_confirmed', v_order.order_id, v_product.stock, v_product.stock - v_item.quantity);
    END LOOP;
    
    UPDATE orders SET 
        payment_status = 'success', 
        payment_reference = p_payment_reference, 
        payment_method = p_payment_method, 
        paid_at = NOW(), 
        order_status = 'processing' 
    WHERE id = p_order_id;
    
    INSERT INTO customers (email, name, phone, orders_count, total_spent, last_order_at)
    VALUES (v_order.customer_email, v_order.customer_name, v_order.customer_phone, 1, v_order.total_amount, NOW())
    ON CONFLICT (email) DO UPDATE
    SET orders_count = customers.orders_count + 1, 
        total_spent = customers.total_spent + v_order.total_amount, 
        last_order_at = NOW();
    
    RETURN jsonb_build_object('success', true, 'order_id', v_order.order_id);
END;
$$;
