import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploySchema() {
    console.log('🚀 Deploying Supabase schema...');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase environment variables');
        console.log('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const schemaPath = path.join(__dirname, '../supabase/migrations/001_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
        console.error('❌ Schema deployment failed:', error.message);
        console.log('Please run the SQL manually in Supabase SQL Editor');
        process.exit(1);
    }
    
    console.log('✅ Schema deployed successfully!');
}

deploySchema();
