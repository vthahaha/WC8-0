const { Client } = require('pg');
require('dotenv').config();

// List of all WC participants (simplified to nations for this demo, you can expand to specific years like "Brazil 2002")
const wcTeams = [
  "Argentina 2022", "France 2018", "Germany 2014", "Spain 2010", "Italy 2006", 
  "Brazil 2002", "France 1998", "Brazil 1994", "West Germany 1990", "Argentina 1986",
  "Italy 1982", "Argentina 1978", "West Germany 1974", "Brazil 1970", "England 1966",
  "Brazil 1962", "Brazil 1958", "West Germany 1954", "Uruguay 1950", "Italy 1938",
  "Italy 1934", "Uruguay 1930",
  "Netherlands 2010", "Croatia 2018", "Morocco 2022", "South Korea 2002",
  "Turkey 2002", "Bulgaria 1994", "Sweden 1994", "Cameroon 1990",
  "Portugal 1966", "Soviet Union 1966", "Hungary 1954", "Austria 1954"
];

// Real historic squads
const historicSquads = {
  "Argentina 2022": [
    ["E. Martínez", "GK", 88], ["N. Molina", "DEF", 83], ["C. Romero", "DEF", 86], ["N. Otamendi", "DEF", 84], ["M. Acuña", "DEF", 84],
    ["R. De Paul", "MID", 85], ["E. Fernández", "MID", 86], ["A. Mac Allister", "MID", 85],
    ["L. Messi", "FWD", 98], ["J. Álvarez", "FWD", 87], ["A. Di María", "FWD", 88]
  ],
  "Brazil 2002": [
    ["Marcos", "GK", 85], ["Cafu", "DEF", 92], ["Lúcio", "DEF", 89], ["Edmílson", "DEF", 86], ["Roberto Carlos", "DEF", 93],
    ["Gilberto Silva", "MID", 86], ["Kléberson", "MID", 82], ["Ronaldinho", "MID", 94],
    ["Rivaldo", "FWD", 93], ["Ronaldo", "FWD", 97], ["Denilson", "FWD", 85]
  ],
  "Spain 2010": [
    ["I. Casillas", "GK", 92], ["S. Ramos", "DEF", 91], ["G. Piqué", "DEF", 88], ["C. Puyol", "DEF", 90], ["J. Capdevila", "DEF", 83],
    ["S. Busquets", "MID", 88], ["Xavi", "MID", 94], ["A. Iniesta", "MID", 95],
    ["Xabi Alonso", "MID", 89], ["D. Villa", "FWD", 91], ["Pedro", "FWD", 85]
  ],
  "France 1998": [
    ["F. Barthez", "GK", 88], ["L. Thuram", "DEF", 91], ["L. Blanc", "DEF", 89], ["M. Desailly", "DEF", 92], ["B. Lizarazu", "DEF", 88],
    ["D. Deschamps", "MID", 87], ["E. Petit", "MID", 86], ["Z. Zidane", "MID", 96],
    ["Y. Djorkaeff", "MID", 87], ["T. Henry", "FWD", 93], ["S. Guivarc'h", "FWD", 80]
  ]
};

// Generate generic players for a team
function generatePlayers(teamId, teamName) {
  const players = [];
  
  if (historicSquads[teamName]) {
    historicSquads[teamName].forEach(p => {
      players.push([teamId, p[0], p[1], p[2]]);
    });
    return players;
  }

  const positions = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
  positions.forEach((pos, index) => {
    // Generate random rating between 70 and 99 depending on team quality
    const rating = Math.floor(Math.random() * 20) + 75; 
    players.push([teamId, `${teamName} Player ${index + 1}`, pos, rating]);
  });
  return players;
}

async function seed() {
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
    console.log("Connected to PostgreSQL.");

    // Drop tables to re-seed fresh data
    await client.query('DROP TABLE IF EXISTS players');
    await client.query('DROP TABLE IF EXISTS teams');

    // Create Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        team_id INT,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(100) NOT NULL,
        rating INT NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `);

    console.log("Seeding teams and players...");

    // Insert Teams
    for (const teamName of wcTeams) {
      const result = await client.query('INSERT INTO teams (name) VALUES ($1) RETURNING id', [teamName]);
      const teamId = result.rows[0].id;
      
      // Insert generic players for this team
      const playersData = generatePlayers(teamId, teamName);
      for (const p of playersData) {
         await client.query(
            'INSERT INTO players (team_id, name, position, rating) VALUES ($1, $2, $3, $4)',
            p
         );
      }
    }

    console.log("Seeding complete! Added", wcTeams.length, "teams.");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    if (client) await client.end();
    process.exit(0);
  }
}

seed();
