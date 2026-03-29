-- V. Gallery Production Schema for Supabase PostgreSQL

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT DEFAULT 'V.',
    description TEXT,
    type TEXT CHECK (type IN ('original', 'print', 'merch', 'craft')),
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    compare_at_price DECIMAL(10,2),
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    images JSONB DEFAULT '[]'::jsonb,
    featured_image TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address JSONB NOT NULL,
    items JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    payment_reference TEXT UNIQUE,
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    addresses JSONB DEFAULT '[]'::jsonb,
    orders_count INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    user_id TEXT,
    user_type TEXT CHECK (user_type IN ('admin', 'customer')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory logs
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL,
    change_amount INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Products are viewable by everyone" ON products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.email() = customer_email);

CREATE POLICY "Users can view own customer data" ON customers
    FOR SELECT USING (auth.email() = email);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
