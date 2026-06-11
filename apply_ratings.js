const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

async function applyRatings() {
    let client;
    try {
        const clientConfig = process.env.DATABASE_URL 
          ? {
              connectionString: process.env.DATABASE_URL,
              ssl: { rejectUnauthorized: false }
            }
          : {
              host: process.env.DB_HOST || 'localhost',
              user: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASSWORD || '',
              database: process.env.DB_NAME || 'worldcup_draft',
              port: process.env.DB_PORT || 5432,
              ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? {
                rejectUnauthorized: false
              } : undefined
            };

        client = new Client(clientConfig);
        await client.connect();

        const fileName = process.argv[2] || '../Ratings 30-74.txt';
        const lines = fs.readFileSync(fileName, 'utf8').split('\n');
        
        let currentTeam = "";

        let updateCount = 0;
        let insertCount = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Check if it's a player line
            const isPlayerLine = trimmed.match(/^-?\s*\[(.*?)\]/);

            // If it's not a player line and isn't a hashtag or a World Cup header, it's a team name
            // We also make sure it doesn't start with a hyphen to avoid typos being parsed as teams
            if (!isPlayerLine && !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('World Cup ')) {
                currentTeam = trimmed.trim();
                
                // Ensure team exists
                const { rows: teamRows } = await client.query('SELECT id FROM teams WHERE name = $1', [currentTeam]);
                if (teamRows.length === 0 && currentTeam) {
                    await client.query('INSERT INTO teams (name) VALUES ($1)', [currentTeam]);
                }
                continue;
            }

            // Parse optional hyphen, then brackets for pos, then name: rating
            // e.g. "- [LB, CB] Player Name: 85" or "[CB] Player Name: 85"
            const match = trimmed.match(/^-?\s*\[(.*?)\]\s*(.*?):\s*(\d+)/);
            if (match && currentTeam) {
                const pos = match[1].trim();
                const playerName = match[2].trim();
                const rating = parseInt(match[3], 10);

                const { rows: teamRows } = await client.query('SELECT id FROM teams WHERE name = $1', [currentTeam]);
                if (teamRows.length === 0) continue;
                const teamId = teamRows[0].id;

                const res = await client.query(`
                    UPDATE players
                    SET rating = $1, position = $2
                    WHERE team_id = $3 AND name = $4
                `, [rating, pos, teamId, playerName]);

                if (res.rowCount > 0) {
                    updateCount++;
                } else {
                    await client.query(`
                        INSERT INTO players (name, position, rating, team_id)
                        VALUES ($1, $2, $3, $4)
                    `, [playerName, pos, rating, teamId]);
                    insertCount++;
                }
            }
        }

        console.log(`Finished processing ${fileName}.`);
        console.log(`Updated: ${updateCount} players.`);
        console.log(`Inserted: ${insertCount} players.`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (client) await client.end();
    }
}

applyRatings();
