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

// Helper: simulate goals using a rating differential model.
// expectedGoals feeds into a Poisson-like approximation with gaussian noise.
function simulateGoals(expectedGoals) {
  // Approximate gaussian noise (Box-Muller-lite: sum of 4 uniforms → mean 0, std ~0.82)
  const noise = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.9;
  return Math.max(0, Math.round(expectedGoals + noise));
}

// Helper: compute expected goals from a rating differential.
// Base is 1.5 goals per team at equal ratings.
// Every 10-point advantage adds ~0.5 expected goals and removes ~0.5 from the opponent.
function expectedGoals(teamRating, opponentRating) {
  const diff = teamRating - opponentRating;
  return 1.5 + (diff / 20);
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
        
        matches.push({
          stage, opponent: oppTeam.name, userGoals, oppGoals,
          result: won ? 'W' : (drew ? 'D' : 'L'),
          oppRating, userRating
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

        matches.push({
          stage, opponent: oppTeam.name, userGoals, oppGoals,
          result: finalResult, penalties, oppRating, userRating
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
