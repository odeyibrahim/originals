-- Enable UUID extension
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
    stock INTEGER DEFAULT 0,
    orientation TEXT DEFAULT 'square',
    image_url TEXT,
    frame_style JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT UNIQUE NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address JSONB,
    product_id UUID,
    product_title TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_reference TEXT,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'pending',
    shipping_method TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    orders_count INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product likes
CREATE TABLE IF NOT EXISTS product_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, session_id)
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Insert sample products
INSERT INTO products (product_id, title, author, description, type, base_price, stock, orientation, image_url, frame_style) VALUES
('prod_001', 'Archive Tee', 'V.', 'Archive Tee — a relic of soft cotton.\nScreen printed by hand in Los Angeles.\nEach piece carries the weight of memory.\n100% cotton, pre-shrunk.\nMade ethically in a small batch.', 'merch', 45, 10, 'square', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', '{}'),
('prod_002', 'Desert Landscape', 'V.', 'Archival photograph from the high desert.\nSigned and numbered on archival paper.\nEdition of 50.\nPrinted with pigment inks for longevity.\nComes with certificate of authenticity.', 'print', 195, 5, 'landscape', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800', '{"color":"white","width":5}'),
('prod_003', 'Silent Currents', 'V.', 'Original mixed media on canvas, 2024.\nLayers of acrylic, graphite, and cold wax.\nA unique piece, signed and dated on verso.\nReady to hang.', 'original', 8500, 1, 'landscape', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800', '{"color":"#2c2c2c","width":8,"padding":5}'),
('prod_004', 'Handwoven Wall Hanging', 'V.', 'Natural fibers dyed with plants.\nWoven on a wooden loom.\nMeasures 24 x 36 inches.\nOne of a kind.', 'craft', 380, 2, 'portrait', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800', '{}')
ON CONFLICT (product_id) DO NOTHING;

-- Function to create pending order
CREATE OR REPLACE FUNCTION create_pending_order(
    p_customer_email TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_product_id TEXT,
    p_quantity INTEGER,
    p_shipping_method TEXT,
    p_customer_address JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_subtotal DECIMAL;
    v_shipping DECIMAL;
    v_tax DECIMAL;
    v_total DECIMAL;
    v_order_id TEXT;
    v_order_uuid UUID;
BEGIN
    SELECT * INTO v_product FROM products WHERE product_id = p_product_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Product not found');
    END IF;
    
    IF v_product.stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock');
    END IF;
    
    v_subtotal = v_product.base_price * p_quantity;
    v_shipping = CASE 
        WHEN v_product.type = 'original' OR v_product.base_price > 1000 THEN 0
        WHEN p_shipping_method = 'express' THEN 15 * p_quantity
        ELSE 7 * p_quantity
    END;
    v_tax = CASE 
        WHEN v_product.type IN ('original', 'print') THEN 0
        ELSE v_subtotal * 0.08
    END;
    v_total = v_subtotal + v_shipping + v_tax;
    
    v_order_id = 'VG-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');
    
    INSERT INTO orders (
        order_id, customer_email, customer_name, customer_phone, customer_address,
        product_id, product_title, quantity, unit_price, subtotal,
        shipping_cost, tax_amount, total_amount, shipping_method
    ) VALUES (
        v_order_id, p_customer_email, p_customer_name, p_customer_phone, p_customer_address,
        v_product.id, v_product.title, p_quantity, v_product.base_price, v_subtotal,
        v_shipping, v_tax, v_total, p_shipping_method
    )
    RETURNING id INTO v_order_uuid;
    
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_uuid,
        'order_number', v_order_id,
        'amount', v_total,
        'product_title', v_product.title
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
    v_product RECORD;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;
    
    IF v_order.payment_status = 'success' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order already paid');
    END IF;
    
    SELECT * INTO v_product FROM products WHERE id = v_order.product_id FOR UPDATE;
    
    UPDATE orders
    SET 
        payment_status = 'success',
        payment_reference = p_payment_reference,
        payment_method = p_payment_method,
        paid_at = NOW(),
        order_status = 'processing'
    WHERE id = p_order_id;
    
    UPDATE products
    SET stock = stock - v_order.quantity
    WHERE id = v_order.product_id;
    
    INSERT INTO customers (email, name, phone, orders_count, total_spent, last_order_at)
    VALUES (v_order.customer_email, v_order.customer_name, v_order.customer_phone, 1, v_order.total_amount, NOW())
    ON CONFLICT (email) DO UPDATE
    SET orders_count = customers.orders_count + 1,
        total_spent = customers.total_spent + v_order.total_amount,
        last_order_at = NOW();
    
    RETURN jsonb_build_object('success', true, 'order_id', v_order.order_id);
END;
$$;
