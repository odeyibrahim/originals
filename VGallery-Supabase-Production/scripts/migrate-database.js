import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateDatabase() {
    console.log('🚀 Starting database migration...');
    
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Migration file loaded. Please run this SQL in Supabase SQL Editor:');
    console.log('   https://app.supabase.com/project/_/sql');
    console.log('\n📋 Copy the SQL from:');
    console.log(`   ${sqlPath}`);
    console.log('\n✅ After running the SQL, your database will be ready!');
}

migrateDatabase();
