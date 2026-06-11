const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

function format2026Name(name) {
    const parts = name.split(' ');
    let lastNames = [];
    let firstNames = [];
    for (const part of parts) {
        // Special case for Mc/Mac if they are uppercase
        if (part === part.toUpperCase() && part.match(/[A-Z]/)) {
            // Capitalize first letter, lowercase the rest
            lastNames.push(part.charAt(0) + part.slice(1).toLowerCase());
        } else {
            firstNames.push(part);
        }
    }
    if (lastNames.length === 0 || firstNames.length === 0) return name;
    return [...firstNames, ...lastNames].join(' ');
}

async function exportLatest() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'worldcup_draft'
        });

        const years = ['2018', '2022', '2026'];
        const q = years.map(y => `t.name LIKE '% ${y}'`).join(' OR ');

        const [rows] = await connection.query(`
            SELECT RIGHT(t.name, 4) as yr, t.name as t, p.name as p, p.position as pos 
            FROM players p 
            JOIN teams t ON p.team_id = t.id 
            WHERE ${q} 
            ORDER BY yr ASC, t.name ASC, p.position ASC, p.name ASC
        `);

        let output = "";
        let currentYear = "";
        let currentTeam = "";

        for (let row of rows) {
            if (row.yr !== currentYear) {
                currentYear = row.yr;
                output += `\n# World Cup ${currentYear}\n`;
            }
            if (row.t !== currentTeam) {
                currentTeam = row.t;
                output += `\n## ${currentTeam}\n`;
            }

            let playerName = row.p;
            if (row.yr === '2026') {
                playerName = format2026Name(playerName);
            }

            output += `- [${row.pos}] ${playerName}\n`;
        }

        fs.writeFileSync('../players_latest_by_year.txt', output);
        console.log("Successfully exported to players_latest_by_year.txt");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (connection) await connection.end();
    }
}

exportLatest();
