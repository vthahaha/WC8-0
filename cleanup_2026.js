const mysql = require('mysql2/promise');
require('dotenv').config();

function format2026Name(name) {
    const parts = name.split(' ');
    let lastNames = [];
    let firstNames = [];
    for (const part of parts) {
        if (part === part.toUpperCase() && part.match(/[A-Z]/)) {
            lastNames.push(part.charAt(0) + part.slice(1).toLowerCase());
        } else {
            firstNames.push(part);
        }
    }
    if (lastNames.length === 0 || firstNames.length === 0) return name;
    return [...firstNames, ...lastNames].join(' ');
}

async function cleanup() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'worldcup_draft'
        });

        const [rows] = await connection.query(`
            SELECT p.id, p.name 
            FROM players p 
            JOIN teams t ON p.team_id = t.id 
            WHERE t.name LIKE '%2026%'
        `);

        let toDeleteIds = [];

        for (let r of rows) {
            // If formatting the name changes it, it means it has the old uppercase format
            if (format2026Name(r.name) !== r.name) {
                toDeleteIds.push(r.id);
            }
        }

        if (toDeleteIds.length > 0) {
            const [res] = await connection.query('DELETE FROM players WHERE id IN (?)', [toDeleteIds]);
            console.log(`Successfully deleted ${res.affectedRows} old 2026 players.`);
        } else {
            console.log('No old 2026 players found to delete.');
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (connection) await connection.end();
    }
}

cleanup();
