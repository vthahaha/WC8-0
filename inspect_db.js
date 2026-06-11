const pool = require('./db');

async function main() {
  const schema = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'teams'");
  console.log('Teams columns:', schema.rows.map(r => r.column_name));
  
  const sample = await pool.query('SELECT * FROM teams LIMIT 3');
  console.log('Sample teams:', JSON.stringify(sample.rows, null, 2));
  
  const players = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'players'");
  console.log('Players columns:', players.rows.map(r => r.column_name));
  
  const samplePlayers = await pool.query('SELECT * FROM players LIMIT 5');
  console.log('Sample players:', JSON.stringify(samplePlayers.rows, null, 2));
  
  await pool.end();
}

main().catch(e => { console.error(e.message); pool.end(); });
