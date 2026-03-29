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
        author: 'V.',
        description: 'A captivating original piece exploring the depths of nocturnal imagination. Mixed media on canvas, 24x36 inches.',
        type: 'original',
        base_price: 250000,
        stock: 1,
        images: ['https://placehold.co/600x600/2c2c2c/white?text=Art+1'],
        featured_image: 'https://placehold.co/600x600/2c2c2c/white?text=Art+1',
        is_active: true,
        is_featured: true,
        metadata: { dimensions: '24x36in', medium: 'Oil on canvas', year: 2024 }
    },
    {
        product_id: 'PRT-001',
        title: 'Sunset Serenade - Limited Edition Print',
        author: 'V.',
        description: 'High-quality archival print of original artwork. Signed and numbered edition of 100.',
        type: 'print',
        base_price: 75000,
        compare_at_price: 100000,
        stock: 45,
        images: ['https://placehold.co/600x600/2c2c2c/white?text=Print+1'],
        featured_image: 'https://placehold.co/600x600/2c2c2c/white?text=Print+1',
        is_active: true,
        is_featured: true,
        metadata: { edition: '1/100', paper: 'Archival matte', dimensions: '18x24in' }
    },
    {
        product_id: 'MRCH-001',
        title: 'V. Gallery Signature T-Shirt',
        author: 'V.',
        description: 'Premium cotton t-shirt featuring exclusive artwork. Available in S-XXL.',
        type: 'merch',
        base_price: 15000,
        stock: 100,
        images: ['https://placehold.co/600x600/2c2c2c/white?text=Shirt'],
        featured_image: 'https://placehold.co/600x600/2c2c2c/white?text=Shirt',
        is_active: true,
        metadata: { sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: '100% Cotton' }
    },
    {
        product_id: 'CRAFT-001',
        title: 'Handcrafted Ceramic Vase',
        author: 'V. Studio',
        description: 'Unique hand-thrown ceramic vase with organic glaze. Each piece is one-of-a-kind.',
        type: 'craft',
        base_price: 45000,
        stock: 8,
        images: ['https://placehold.co/600x600/2c2c2c/white?text=Vase'],
        featured_image: 'https://placehold.co/600x600/2c2c2c/white?text=Vase',
        is_active: true,
        metadata: { dimensions: '8x8x10in', material: 'Stoneware', care: 'Hand wash only' }
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
            console.log(`✅ Seeded: ${product.title} (${product.product_id})`);
        }
    }
    
    console.log('\n🎉 Database seeding complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Replace sample images with your actual artwork');
    console.log('2. Update product details in Supabase dashboard');
    console.log('3. Add more products as needed');
}

seedDatabase().catch(console.error);
