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
    console.error('❌ Missing Supabase credentials. Please check your .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateDatabase() {
    console.log('🚀 Starting database migration...');
    
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL statements (basic split - for production, use a proper SQL parser)
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (!statement) continue;
        
        try {
            // Execute via Supabase's SQL API (requires pgmq extension or REST API)
            // For production, use Supabase's migrations CLI instead
            console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
            
            // Note: This requires Supabase's pg_graphql extension or use their CLI
            // Alternative: Use Supabase's REST API for schema creation
            const { error } = await supabase.rpc('exec_sql', { query: statement });
            
            if (error) {
                console.error(`❌ Error in statement ${i + 1}:`, error.message);
                errorCount++;
            } else {
                successCount++;
            }
        } catch (err) {
            console.error(`❌ Failed to execute statement ${i + 1}:`, err.message);
            errorCount++;
        }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    if (errorCount > 0) {
        console.log('\n⚠️  Some statements failed. You may need to run migrations manually via Supabase dashboard.');
        console.log('   Go to: SQL Editor → New Query → Paste the migration file');
    }
}

async function main() {
    console.log('=' .repeat(50));
    console.log('V. Gallery Database Migration Tool');
    console.log('=' .repeat(50));
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log('');
    
    await migrateDatabase();
}

main().catch(console.error);
