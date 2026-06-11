const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Get a random team for the draft phase
app.get('/api/draft/team', async (req, res) => {
  try {
    const { era, country, year } = req.query;

    let queryStr = 'SELECT * FROM teams WHERE 1=1';
    let params = [];

    if (country && country !== 'ALL') {
       params.push(`${country} %`);
       queryStr += ` AND name LIKE $${params.length}`;
    }

    if (year && year !== 'ALL') {
       params.push(`% ${year}`);
       queryStr += ` AND name LIKE $${params.length}`;
    } else if (era && era !== 'ALL') {
       if (era === 'PRE_1970') {
          queryStr += ' AND CAST(RIGHT(name, 4) AS INTEGER) < 1970';
       } else if (era === '1970_1998') {
          queryStr += ' AND CAST(RIGHT(name, 4) AS INTEGER) BETWEEN 1970 AND 1998';
       } else if (era === '2000_PLUS') {
          queryStr += ' AND CAST(RIGHT(name, 4) AS INTEGER) >= 2000';
       }
    }

    queryStr += ' ORDER BY RANDOM() LIMIT 1';

    // Get a random team
    const { rows: teams } = await pool.query(queryStr, params);
    if (teams.length === 0) return res.status(404).json({ error: "No teams found matching criteria" });
    
    const team = teams[0];
    
    // Get players for this team
    const { rows: players } = await pool.query('SELECT * FROM players WHERE team_id = $1', [team.id]);
    
    res.json({
      team: team.name,
      players: players
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: err.message, 
      databaseUrlStatus: process.env.DATABASE_URL ? "Configured" : "Missing"
    });
  }
});

// Helper: calculate a team's overall from their top 11 players
async function getTeamRating(teamId) {
  const { rows } = await pool.query(
    'SELECT rating FROM players WHERE team_id = $1 ORDER BY rating DESC LIMIT 11',
    [teamId]
  );
  if (rows.length === 0) return 65; // fallback for teams with no players
  const avg = rows.reduce((sum, p) => sum + p.rating, 0) / rows.length;
  return Math.round(avg);
}

// Helper: Poisson random variable generator using Knuth's algorithm
function poissonRandom(lambda) {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1.0;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// Helper: simulate goals using Poisson distribution
function simulateGoals(expectedGoals) {
  return poissonRandom(expectedGoals);
}

// Helper: compute expected goals from a rating differential.
// Base is 1.4 goals per team at equal ratings.
// Every 10-point advantage adds 0.35 expected goals.
function expectedGoals(teamRating, opponentRating) {
  const diff = teamRating - opponentRating;
  const lambda = 1.4 + (diff * 0.035);
  return Math.max(0.2, lambda);
}

async function getTeamPlayers(teamId) {
  const { rows } = await pool.query(
    'SELECT name, position, rating FROM players WHERE team_id = $1',
    [teamId]
  );
  return rows;
}

function simulateGoalscorers(players, numGoals) {
  if (numGoals <= 0) return [];
  
  // Assign goalscoring weights based on position
  const weightedGoalscorers = players.map(p => {
    let weight = 1.0;
    const pos = p.position.toUpperCase();
    
    if (pos.includes('ST') || pos.includes('CF') || pos.includes('LW') || pos.includes('RW') || pos.includes('FWD') || pos.includes('SS')) {
      weight = 10.0;
    } else if (pos.includes('CAM')) {
      weight = 6.0;
    } else if (pos.includes('CM') || pos.includes('LM') || pos.includes('RM') || pos.includes('MID')) {
      weight = 4.0;
    } else if (pos.includes('CDM')) {
      weight = 1.5;
    } else if (pos.includes('CB') || pos.includes('LB') || pos.includes('RB') || pos.includes('LWB') || pos.includes('RWB') || pos.includes('DEF')) {
      weight = 0.5;
    } else if (pos.includes('GK')) {
      weight = 0.01;
    }
    weight *= (p.rating / 70);
    return { name: p.name, rating: p.rating, position: p.position, goalWeight: weight };
  });

  const totalGoalWeight = weightedGoalscorers.reduce((sum, wp) => sum + wp.goalWeight, 0);

  // Assign assist weights based on position
  const weightedAssistors = players.map(p => {
    let weight = 1.0;
    const pos = p.position.toUpperCase();
    
    if (pos.includes('CAM') || pos.includes('LM') || pos.includes('RM') || pos.includes('CM') || pos.includes('MID')) {
      weight = 10.0;
    } else if (pos.includes('LW') || pos.includes('RW') || pos.includes('ST') || pos.includes('CF') || pos.includes('FWD') || pos.includes('SS')) {
      weight = 5.0;
    } else if (pos.includes('LWB') || pos.includes('RWB') || pos.includes('LB') || pos.includes('RB')) {
      weight = 3.0;
    } else if (pos.includes('CB') || pos.includes('CDM') || pos.includes('DEF')) {
      weight = 1.0;
    } else if (pos.includes('GK')) {
      weight = 0.2;
    }
    weight *= (p.rating / 70);
    return { name: p.name, rating: p.rating, position: p.position, assistWeight: weight };
  });

  const scorers = [];
  for (let i = 0; i < numGoals; i++) {
    // 1. Pick scorer
    let scorer = null;
    if (totalGoalWeight <= 0) {
      scorer = players[Math.floor(Math.random() * players.length)];
    } else {
      let r = Math.random() * totalGoalWeight;
      for (const wp of weightedGoalscorers) {
        r -= wp.goalWeight;
        if (r <= 0) {
          scorer = wp;
          break;
        }
      }
    }
    if (!scorer) scorer = players[0];

    // 2. Pick assist (approx. 70% chance of assist)
    let assist = null;
    if (Math.random() < 0.70 && players.length > 1) {
      // Exclude scorer from assist candidates
      const assistCandidates = weightedAssistors.filter(p => p.name !== scorer.name);
      const totalAssistWeight = assistCandidates.reduce((sum, wp) => sum + wp.assistWeight, 0);
      
      if (totalAssistWeight <= 0) {
        assist = assistCandidates[Math.floor(Math.random() * assistCandidates.length)];
      } else {
        let r = Math.random() * totalAssistWeight;
        for (const wp of assistCandidates) {
          r -= wp.assistWeight;
          if (r <= 0) {
            assist = wp;
            break;
          }
        }
      }
    }

    const minute = Math.floor(Math.random() * 90) + 1;
    scorers.push({
      name: scorer.name,
      minute,
      assist: assist ? assist.name : null
    });
  }

  scorers.sort((a, b) => a.minute - b.minute);
  return scorers;
}

// Simulate the 8 matches
app.post('/api/simulate', async (req, res) => {
  try {
    const { draftedSquad } = req.body;
    
    if (!draftedSquad || draftedSquad.length !== 11) {
      return res.status(400).json({ error: "Must provide a drafted squad of 11 players." });
    }

    const userRating = Math.round(
      draftedSquad.reduce((sum, p) => sum + p.rating, 0) / 11
    );

    // Draw 8 opponents — later stages preferentially stronger (pick best from 2-3 random teams)
    const { rows: allOpponents } = await pool.query('SELECT * FROM teams ORDER BY RANDOM() LIMIT 24');
    const opponents = [];
    for (let i = 0; i < 8; i++) {
      // For stages 0-2 (group), just pick a random team
      // For stages 3+ (knockouts), pick the stronger of 2 candidates to simulate tougher opponents
      const poolSize = i < 3 ? 1 : 2;
      const candidates = allOpponents.slice(i * poolSize, i * poolSize + poolSize);
      
      if (candidates.length === 0) break;

      if (candidates.length === 1) {
        opponents.push(candidates[0]);
      } else {
        // Resolve candidates and pick stronger
        const ratings = await Promise.all(candidates.map(c => getTeamRating(c.id)));
        const bestIdx = ratings[0] >= ratings[1] ? 0 : 1;
        candidates[bestIdx]._precomputedRating = ratings[bestIdx];
        opponents.push(candidates[bestIdx]);
      }
    }

    const matches = [];
    let isEliminated = false;
    let groupPoints = 0;
    let isPerfect = true;
    let eliminatedAt = null;

    const stageNames = [
      "Group Stage Match 1", "Group Stage Match 2", "Group Stage Match 3",
      "Round of 32", "Round of 16", "Quarterfinal", "Semifinal", "World Cup Final"
    ];

    for (let i = 0; i < 8; i++) {
      if (isEliminated) break;

      const stage = stageNames[i];
      const isGroupStage = i < 3;
      const oppTeam = opponents[i];

      // Get opponent rating from their actual players (cached if precomputed)
      const oppRating = oppTeam._precomputedRating ?? await getTeamRating(oppTeam.id);

      // Progressive difficulty: later knockout stages get a small opponent buff
      // Representing home advantage / tournament pressure / momentum (max +5 rating equivalent)
      const stagePressureBuff = i < 3 ? 0 : (i - 2) * 1.5;

      const userExpected = expectedGoals(userRating, oppRating + stagePressureBuff);
      const oppExpected  = expectedGoals(oppRating + stagePressureBuff, userRating);

      let userGoals = simulateGoals(userExpected);
      let oppGoals  = simulateGoals(oppExpected);

      let won  = userGoals > oppGoals;
      let drew = userGoals === oppGoals;
      let lost = userGoals < oppGoals;
      let penalties = null;

      if (!won) isPerfect = false;

      if (isGroupStage) {
        if (won) groupPoints += 3;
        if (drew) groupPoints += 1;
        
        const oppPlayers = await getTeamPlayers(oppTeam.id);
        const userScorers = simulateGoalscorers(draftedSquad, userGoals);
        const oppScorers = simulateGoalscorers(oppPlayers, oppGoals);

        matches.push({
          stage, opponent: oppTeam.name, userGoals, oppGoals,
          result: won ? 'W' : (drew ? 'D' : 'L'),
          oppRating, userRating,
          userScorers, oppScorers
        });

        if (i === 2) {
          if (groupPoints < 4) {
            isEliminated = true;
            eliminatedAt = "Group Stage";
          } else if (groupPoints === 4) {
            if (Math.random() < 0.5) {
              isEliminated = true;
              eliminatedAt = "Group Stage";
            }
          }
        }
      } else {
        // Knockout: draws go to penalties
        let finalResult = won ? 'W' : 'L';
        if (drew) {
          isPerfect = false;
          // User wins pens based on rating advantage (55-80% chance)
          const ratingAdv = Math.min(Math.max((userRating - oppRating) / 30, -0.25), 0.25);
          const userWinsPens = Math.random() < (0.65 + ratingAdv);
          const userPenScore = userWinsPens ? Math.floor(Math.random() * 2) + 4 : Math.floor(Math.random() * 3) + 2;
          const oppPenScore  = userWinsPens ? userPenScore - 1           : userPenScore + 1;
          
          penalties = { user: userPenScore, opp: oppPenScore };
          won = userWinsPens;
          lost = !userWinsPens;
          finalResult = won ? 'W' : 'L';
        }

        const oppPlayers = await getTeamPlayers(oppTeam.id);
        const userScorers = simulateGoalscorers(draftedSquad, userGoals);
        const oppScorers = simulateGoalscorers(oppPlayers, oppGoals);

        matches.push({
          stage, opponent: oppTeam.name, userGoals, oppGoals,
          result: finalResult, penalties, oppRating, userRating,
          userScorers, oppScorers
        });

        if (lost) {
          isEliminated = true;
          eliminatedAt = stage;
        }
      }
    }

    res.json({
      matches,
      groupPoints,
      userRating,
      wonCup: !isEliminated && matches.length === 8,
      isPerfect: isPerfect && !isEliminated && matches.length === 8,
      eliminatedAt
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: err.message, 
      databaseUrlStatus: process.env.DATABASE_URL ? "Configured" : "Missing"
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
