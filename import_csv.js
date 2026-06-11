const fs = require('fs');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');
require('dotenv').config();

const SQUADS_FILE = '../archive/squads.csv';

async function importCSV() {
  const teamsMap = new Map(); // "Argentina 1930" -> { id: null, players: [] }

  console.log("Reading CSV...");
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(SQUADS_FILE)
      .pipe(csv())
      .on('data', (row) => {
        // Ex: tournament_id = 'WC-1930'
        const year = row.tournament_id ? row.tournament_id.split('-')[1] : null;
        if (!year || !row.team_name) return;
        
        const fullTeamName = `${row.team_name} ${year}`;
        
        if (!teamsMap.has(fullTeamName)) {
          teamsMap.set(fullTeamName, { id: null, players: [] });
        }

        // Handle names
        let playerName = row.family_name;
        if (row.given_name && row.given_name !== 'not applicable' && row.given_name !== 'not available') {
          playerName = `${row.given_name} ${row.family_name}`;
        }
        if (playerName === 'not applicable') {
           playerName = "Unknown Player";
        }

        // Handle positions
        let pos = 'MID';
        if (row.position_code === 'GK') pos = 'GK';
        else if (row.position_code === 'DF') pos = 'DEF';
        else if (row.position_code === 'MF') pos = 'MID';
        else if (row.position_code === 'FW') pos = 'FWD';

        // Generate rating
        const rating = Math.floor(Math.random() * 21) + 75; // 75 to 95

        teamsMap.get(fullTeamName).players.push({
          name: playerName,
          position: pos,
          rating: rating
        });
      })
      .on('end', () => {
        resolve();
      })
      .on('error', reject);
  });

  console.log(`Found ${teamsMap.size} unique World Cup squads.`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'worldcup_draft'
    });

    console.log("Connected to MySQL. Clearing old data...");
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE players');
    await connection.query('TRUNCATE TABLE teams');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log("Inserting teams and players...");

    // Batch insertions
    for (const [teamName, data] of teamsMap.entries()) {
      const [result] = await connection.query('INSERT INTO teams (name) VALUES (?)', [teamName]);
      const teamId = result.insertId;

      if (data.players.length > 0) {
        const playerValues = data.players.map(p => [teamId, p.name, p.position, p.rating]);
        await connection.query('INSERT INTO players (team_id, name, position, rating) VALUES ?', [playerValues]);
      }
    }

    console.log("Import Complete!");

  } catch (err) {
    console.error("Database error:", err);
  } finally {
    if (connection) await connection.end();
  }
}

importCSV();
