const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkRatings() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'worldcup_draft'
        });

        console.log("=== CHECKING MÜLLER ===");
        const [muller] = await connection.query(`
            SELECT p.name, p.rating, t.name as team_name 
            FROM players p
            JOIN teams t ON p.team_id = t.id
            WHERE p.name LIKE '%Müller%' OR p.name LIKE '%Muller%'
            ORDER BY p.rating DESC 
            LIMIT 10
        `);
        console.table(muller);

        console.log("\n=== CHECKING MESSI ===");
        const [messi] = await connection.query(`
            SELECT p.name, p.rating, t.name as team_name 
            FROM players p
            JOIN teams t ON p.team_id = t.id
            WHERE p.name LIKE '%Messi%'
            ORDER BY t.name ASC 
            LIMIT 10
        `);
        console.table(messi);

        console.log("\n=== CHECKING COUTINHO ===");
        const [coutinho] = await connection.query(`
            SELECT p.name, p.rating, t.name as team_name 
            FROM players p
            JOIN teams t ON p.team_id = t.id
            WHERE p.name LIKE '%Coutinho%'
            ORDER BY p.rating DESC 
            LIMIT 10
        `);
        console.table(coutinho);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (connection) await connection.end();
    }
}

checkRatings();
