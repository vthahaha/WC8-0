const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function exportPlayers() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'worldcup_draft'
        });

        const targetYears = ['1930', '1934', '1938', '1950', '1954', '1958', '1962', '1966', '1970', '1974'];
        
        let conditions = targetYears.map(year => `t.name LIKE '% ${year}'`).join(' OR ');

        const [rows] = await connection.query(`
            SELECT t.name as team_name, p.name as player_name, p.position
            FROM players p
            JOIN teams t ON p.team_id = t.id
            WHERE ${conditions}
            ORDER BY t.name ASC, p.position ASC, p.name ASC
        `);

        let output = "# World Cup Players (1930 - 1974)\n\n";
        output += "Please assign realistic FIFA ratings (1-99) for these players based on their tournament performance.\n\n";

        let currentTeam = "";
        for (const row of rows) {
            if (row.team_name !== currentTeam) {
                currentTeam = row.team_name;
                output += `\n## ${currentTeam}\n`;
            }
            output += `- [${row.position}] ${row.player_name}\n`;
        }

        const outputPath = "C:\\Users\\Hi\\.gemini\\antigravity-ide\\brain\\8f4cd6ad-5ec3-45a1-b49c-ab66463dd495\\scratch\\players_1930_1974.md";
        fs.writeFileSync(outputPath, output);
        console.log(`Exported ${rows.length} players to scratch directory!`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (connection) await connection.end();
    }
}

exportPlayers();
