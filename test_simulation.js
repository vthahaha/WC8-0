const pool = require('./db');

// Replicate the helpers from server.js
async function getTeamRating(teamId) {
  const { rows } = await pool.query(
    'SELECT rating FROM players WHERE team_id = $1 ORDER BY rating DESC LIMIT 11',
    [teamId]
  );
  if (rows.length === 0) return 65;
  const avg = rows.reduce((sum, p) => sum + p.rating, 0) / rows.length;
  return Math.round(avg);
}

function simulateGoals(expectedGoals) {
  const noise = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.9;
  return Math.max(0, Math.round(expectedGoals + noise));
}

function expectedGoals(teamRating, opponentRating) {
  const diff = teamRating - opponentRating;
  return 1.5 + (diff / 20);
}

async function main() {
  // Test: lookup Dutch East Indies 1938 rating
  const { rows: dei } = await pool.query("SELECT * FROM teams WHERE name LIKE '%Dutch East Indies%'");
  if (dei.length > 0) {
    const deiRating = await getTeamRating(dei[0].id);
    console.log(`Dutch East Indies rating: ${deiRating}`);
  } else {
    console.log('Dutch East Indies not found in DB');
  }

  // Test: simulate 1000 games of user 83 vs opp 75 — what % does user win?
  let wins = 0, draws = 0, losses = 0;
  for (let i = 0; i < 1000; i++) {
    const ug = simulateGoals(expectedGoals(83, 75));
    const og = simulateGoals(expectedGoals(75, 83));
    if (ug > og) wins++;
    else if (ug === og) draws++;
    else losses++;
  }
  console.log(`\n83 vs 75 over 1000 games:`);
  console.log(`  Wins: ${wins} (${(wins/10).toFixed(1)}%)`);
  console.log(`  Draws: ${draws} (${(draws/10).toFixed(1)}%)`);
  console.log(`  Losses: ${losses} (${(losses/10).toFixed(1)}%)`);

  // Test: simulate 1000 games of user 83 vs very weak opp 60
  let wins2 = 0, draws2 = 0, losses2 = 0;
  for (let i = 0; i < 1000; i++) {
    const ug = simulateGoals(expectedGoals(83, 60));
    const og = simulateGoals(expectedGoals(60, 83));
    if (ug > og) wins2++;
    else if (ug === og) draws2++;
    else losses2++;
  }
  console.log(`\n83 vs 60 over 1000 games:`);
  console.log(`  Wins: ${wins2} (${(wins2/10).toFixed(1)}%)`);
  console.log(`  Draws: ${draws2} (${(draws2/10).toFixed(1)}%)`);
  console.log(`  Losses: ${losses2} (${(losses2/10).toFixed(1)}%)`);

  // Sample 5 random teams and their actual ratings
  const { rows: sampleTeams } = await pool.query('SELECT * FROM teams ORDER BY RANDOM() LIMIT 5');
  console.log('\nSample team ratings:');
  for (const t of sampleTeams) {
    const r = await getTeamRating(t.id);
    console.log(`  ${t.name}: ${r}`);
  }

  await pool.end();
}

main().catch(e => { console.error(e.message); pool.end(); });
