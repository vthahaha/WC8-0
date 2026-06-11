const fs = require('fs');
const readline = require('readline');

async function extract2022() {
    const fileStream = fs.createReadStream('../player_stats.csv');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let isFirstLine = true;
    const teams = {};

    const posMap = {
        'MF': 'MID',
        'FW': 'FWD',
        'DF': 'DEF',
        'GK': 'GK'
    };

    for await (const line of rl) {
        if (isFirstLine) {
            isFirstLine = false;
            continue;
        }
        
        const cols = line.split(',');
        if (cols.length < 3) continue;

        const player = cols[0].trim();
        const position = cols[1].trim();
        const team = cols[2].trim();

        if (!teams[team]) {
            teams[team] = [];
        }

        const formattedPos = posMap[position] || position;
        teams[team].push({ pos: formattedPos, name: player });
    }

    let output = "# World Cup 2022\n";
    
    // Sort teams alphabetically
    const sortedTeams = Object.keys(teams).sort();

    for (const team of sortedTeams) {
        output += `\n## ${team} 2022\n`;
        
        // Sort players by position then name
        teams[team].sort((a, b) => {
            if (a.pos !== b.pos) return a.pos.localeCompare(b.pos);
            return a.name.localeCompare(b.name);
        });

        for (const player of teams[team]) {
            output += `- [${player.pos}] ${player.name}\n`;
        }
    }

    fs.writeFileSync('../players_2022_by_year.txt', output);
    console.log("Successfully exported to players_2022_by_year.txt");
}

extract2022();
