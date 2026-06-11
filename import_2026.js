const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function import2026() {
  const data = JSON.parse(fs.readFileSync('squads_2026.json', 'utf-8'));
  console.log(`Read ${Object.keys(data).length} teams from JSON.`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'worldcup_draft'
    });

    console.log("Connected to MySQL. Appending new teams and players...");

    // Batch insertions
    for (const [teamName, players] of Object.entries(data)) {
      const [result] = await connection.query('INSERT INTO teams (name) VALUES (?)', [teamName]);
      const teamId = result.insertId;

      if (players.length > 0) {
        const playerValues = players.map(p => {
          let pos = 'MID';
          if (p.position === 'GK') pos = 'GK';
          else if (p.position === 'DF') pos = 'DEF';
          else if (p.position === 'MF') pos = 'MID';
          else if (p.position === 'FW') pos = 'FWD';

          const rating = Math.floor(Math.random() * 21) + 75; // 75 to 95
          return [teamId, p.name, pos, rating];
        });
        await connection.query('INSERT INTO players (team_id, name, position, rating) VALUES ?', [playerValues]);
      }
    }

    console.log("Import of 2026 Squads Complete!");

  } catch (err) {
    console.error("Database error:", err);
  } finally {
    if (connection) await connection.end();
  }
}

import2026();
