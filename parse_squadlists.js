const fs = require('fs');
const { execSync } = require('child_process');

function capitalize(str) {
    if (!str) return "";
    return str.split(' ').map(s => {
        if (s.length === 0) return "";
        if (s.match(/^[A-Z\-']+$/)) {
            return s.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('-');
        }
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }).join(' ');
}

function parseSquadLists() {
    const rawText = fs.readFileSync('squadlists_utf8.txt', 'utf8');
    const lines = rawText.split('\n');
    
    let output = "# World Cup 2022\n";
    let currentTeam = "";
    const teams = {};
    let totalPlayers = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        const teamMatch = line.match(/^([A-Za-z\s\-]+) \([A-Z]{3}\)$/);
        if (teamMatch && !line.includes('ROLE')) {
            currentTeam = teamMatch[1].trim();
            if (!teams[currentTeam]) {
                teams[currentTeam] = [];
            }
            continue;
        }

        const posMatch = line.match(/^(GK|DF|MF|FW)\s+(.*)/);
        if (posMatch && currentTeam) {
            let pos = posMatch[1];
            if (pos === 'FW') pos = 'FWD';
            if (pos === 'MF') pos = 'MID';
            
            const rest = posMatch[2];
            const cols = rest.split('\t').map(c => c.trim());
            
            if (cols.length >= 3) {
                const firstName = capitalize(cols[1]);
                const lastName = capitalize(cols[2]);
                
                let cleanName = "";
                if (firstName && lastName) {
                    cleanName = `${firstName} ${lastName}`;
                } else if (lastName) {
                    cleanName = lastName;
                } else if (firstName) {
                    cleanName = firstName;
                } else {
                    cleanName = capitalize(cols[0]);
                }
                
                teams[currentTeam].push({ pos, name: cleanName });
                totalPlayers++;
            }
        }
    }

    const sortedTeams = Object.keys(teams).sort();
    
    for (const team of sortedTeams) {
        output += `\n## ${team} 2022\n`;
        teams[team].sort((a, b) => {
            const posOrder = { 'GK': 1, 'DEF': 2, 'MID': 3, 'FWD': 4 };
            if (a.pos !== b.pos) return posOrder[a.pos] - posOrder[b.pos];
            return a.name.localeCompare(b.name);
        });

        for (const player of teams[team]) {
            output += `- [${player.pos}] ${player.name}\n`;
        }
    }

    fs.writeFileSync('../players_2022_by_year.txt', output, 'utf8');
    console.log('Successfully generated players_2022_by_year.txt');
    console.log('Total teams:', sortedTeams.length);
    console.log('Total players:', totalPlayers);
}

parseSquadLists();
