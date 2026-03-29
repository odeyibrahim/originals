import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sampleProducts = [
    {
        product_id: 'ART-001',
        title: 'Midnight Dreams',
        description: 'A captivating original piece exploring the depths of nocturnal imagination.',
        type: 'original',
        base_price: 250000,
        stock: 1,
        images: ['https://placehold.co/600x600/2c2c2c/white?text=Art+1'],
        is_active: true,
        is_featured: true
    },
    {
        product_id: 'PRT-001',
        title: 'Sunset Serenade - Limited Edition',
        description: 'High-quality archival print. Signed and numbered edition of 100.',
        type: 'print',
        base_price: 75000,
        compare_at_price: 100000,
        stock: 45,
        images: ['https://placehold.co/600x600/2c2c2c/white?text=Print+1'],
        is_active: true
    },
    {
        product_id: 'MRCH-001',
        title: 'V. Gallery Signature T-Shirt',
        description: 'Premium cotton t-shirt featuring exclusive artwork.',
        type: 'merch',
        base_price: 15000,
        stock: 100,
        images: ['https://placehold.co/600x600/2c2c2c/white?text=Shirt'],
        is_active: true
    },
    {
        product_id: 'CRAFT-001',
        title: 'Handcrafted Ceramic Vase',
        description: 'Unique hand-thrown ceramic vase with organic glaze.',
        type: 'craft',
        base_price: 45000,
        stock: 8,
        images: ['https://placehold.co/600x600/2c2c2c/white?text=Vase'],
        is_active: true
    }
];

async function seedDatabase() {
    console.log('🌱 Seeding database with sample products...');
    
    for (const product of sampleProducts) {
        const { data, error } = await supabase
            .from('products')
            .upsert(product, { onConflict: 'product_id' })
            .select();
        
        if (error) {
            console.error(`❌ Failed to seed ${product.product_id}:`, error.message);
        } else {
            console.log(`✅ Seeded: ${product.title}`);
        }
    }
    
    console.log('\n🎉 Database seeding complete!');
}

seedDatabase().catch(console.error);
