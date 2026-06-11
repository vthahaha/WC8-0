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
    res.status(500).json({ error: "Server error" });
  }
});

// Simulate the 8 matches
app.post('/api/simulate', async (req, res) => {
  try {
    const { draftedSquad } = req.body;
    
    if (!draftedSquad || draftedSquad.length !== 11) {
      return res.status(400).json({ error: "Must provide a drafted squad of 11 players." });
    }

    const userRating = Math.floor(
      draftedSquad.reduce((sum, p) => sum + p.rating, 0) / 11
    );

    const { rows: opponents } = await pool.query('SELECT * FROM teams ORDER BY RANDOM() LIMIT 8');
    
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

      const oppRating = oppTeam.rating || 75;

      // Base scores
      let userScoreBase = (userRating / 12) + (Math.random() * 3 - 1.5); 
      let oppScoreBase = (oppRating / 12) + (Math.random() * 3 - 1.5);

      // Add a progressive difficulty buff to make an 8-0 sweep very hard.
      // Even if the opponent is randomly drawn, the pressure of later stages gives them a momentum boost.
      const stageDifficultyBuff = i * 0.15; // up to +1.05 for the Final
      oppScoreBase += stageDifficultyBuff;

      let userGoals = Math.max(0, Math.floor(userScoreBase - 4));
      let oppGoals = Math.max(0, Math.floor(oppScoreBase - 4));
      
      // Dynamic bonus: user has 20% chance to convert rating gap, opp has 40% chance
      if (userRating - oppRating > 5 && Math.random() < 0.2) {
         userGoals += 1;
      } else if (oppRating - userRating > 5 && Math.random() < 0.4) {
         oppGoals += 1;
      }

      let won = userGoals > oppGoals;
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

        // End of group stage logic
        if (i === 2) {
          if (groupPoints < 4) {
            isEliminated = true;
            eliminatedAt = "Group Stage";
          } else if (groupPoints === 4) {
            // 50/50 chance to advance
            if (Math.random() < 0.5) {
              isEliminated = true;
              eliminatedAt = "Group Stage";
            }
          }
        }
      } else {
        // Knockout Stage
        let finalResult = won ? 'W' : 'L';
        if (drew) {
           isPerfect = false;
           // Penalties (70% user win chance)
           const userWinsPens = Math.random() < 0.7;
           const userPenScore = userWinsPens ? Math.floor(Math.random() * 2) + 3 : Math.floor(Math.random() * 3);
           const oppPenScore = userWinsPens ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2) + 3;
           
           penalties = { user: userPenScore, opp: oppPenScore };
           won = userWinsPens;
           lost = !userWinsPens;
           finalResult = won ? 'W' : 'L';
        }

        matches.push({
          stage, opponent: oppTeam.name, userGoals, oppGoals,
          result: finalResult,
          penalties,
          oppRating, userRating
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
      wonCup: !isEliminated && matches.length === 8,
      isPerfect: isPerfect && !isEliminated && matches.length === 8,
      eliminatedAt
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
