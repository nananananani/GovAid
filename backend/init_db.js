const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PASSWORDS = ['', 'root', 'admin', '1234', '12345678', 'password', 'root123'];

async function findPassword() {
    console.log('--- PASSWORD DISCOVERY ENGINE ---');
    for (const pass of PASSWORDS) {
        try {
            console.log(`Testing password: "${pass}"...`);
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: pass
            });
            console.log(`✅ SUCCESS! Found password: "${pass}"`);
            
            // Update .env
            const envPath = path.join(__dirname, '.env');
            let envContent = fs.readFileSync(envPath, 'utf8');
            envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${pass}`);
            fs.writeFileSync(envPath, envContent);
            console.log('✅ Updated .env with correct password.');
            
            await connection.end();
            return true;
        } catch (err) {
            // console.log(`❌ Failed: ${err.message}`);
        }
    }
    console.log('❌ Could not find MySQL password automatically.');
    return false;
}

async function init() {
    const found = await findPassword();
    if (!found) {
        console.log('Please check your MySQL root password and update backend/.env manually.');
        return;
    }

    // Refresh env
    require('dotenv').config({ override: true });

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    });

    const schema = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8');
    const seed = fs.readFileSync(path.join(__dirname, '../src/db/seed.sql'), 'utf8');

    console.log('Cleaning up existing database...');
    await connection.query('DROP DATABASE IF EXISTS GovAid_DB');

    console.log('Executing schema.sql...');

    await connection.query(schema);
    
    console.log('Executing seed.sql...');
    await connection.query(seed);

    console.log('🚀 Database GovAid_DB initialized successfully!');
    await connection.end();
    
    console.log('\n--- NEXT STEPS ---');
    console.log('1. The database is now ready.');
    console.log('2. Run "node server.js" to start the portal.');
    console.log('3. Open http://localhost:8080 in your browser.');
}

init().catch(err => {
    console.error('Initialization failed:', err.message);
});
