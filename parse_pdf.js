const fs = require('fs');
const pdf = require('pdf-parse');

async function extractPDF() {
    const dataBuffer = fs.readFileSync('../SquadLists-English.pdf');
    const data = await pdf(dataBuffer);
    
    const lines = data.text.split('\n');
    let output = "# World Cup 2022\n";
    let currentTeam = "";
    const teams = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Find team name, e.g. "Argentina (ARG)"
        const teamMatch = line.match(/^([A-Za-z\s\-]+) \([A-Z]{3}\)$/);
        if (teamMatch && !line.includes('ROLE')) {
            currentTeam = teamMatch[1].trim();
            if (!teams[currentTeam]) {
                teams[currentTeam] = [];
            }
            continue;
        }

        // Find player lines starting with POS (GK, DF, MF, FW)
        const posMatch = line.match(/^(GK|DF|MF|FW)\s+(.*)/);
        if (posMatch && currentTeam) {
            const pos = posMatch[1] === 'FW' ? 'FWD' : posMatch[1] === 'MF' ? 'MID' : posMatch[1];
            const rest = posMatch[2];
            
            // The line format in PDF is:
            // PLAYER NAME | FIRST NAME(S) | LAST NAME(S) | NAME ON SHIRT | DOB | CLUB | HEIGHT | CAPS | GOALS
            // Since it's space-separated, it's tricky to distinguish columns.
            // But we can extract the player name from the "FIRST NAME" and "LAST NAME" by relying on the fact that NAME ON SHIRT is often capitalized, DOB is DD/MM/YYYY.
            
            const dobMatch = rest.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dobMatch) {
                const beforeDob = rest.substring(0, dobMatch.index).trim();
                // beforeDob contains: PLAYER NAME | FIRST NAME(S) | LAST NAME(S) | NAME ON SHIRT
                // We just need a clean name. 
                // Alternatively, PLAYER NAME is uppercase for last name, e.g. "ARMANI Franco".
                // FIRST NAME(S) is "Franco".
                // LAST NAME(S) is "ARMANI".
                // Let's use a regex to capture FIRST NAME(S) and LAST NAME(S) if possible, or just parse PLAYER NAME.
                
                // Let's parse PLAYER NAME. It's usually the first few tokens. 
                // E.g., "ARMANI Franco Franco ARMANI ARMANI"
                // "MESSI Lionel Lionel Andres MESSI MESSI"
                // "DE PAUL Rodrigo Rodrigo Javier DE PAUL DE PAUL"
                
                // Since this is tricky, let's look for the pattern where FIRST NAME is mixed with LAST NAME.
                // Wait, it's actually much easier:
                const nameParts = beforeDob.split(' ');
                
                // The first part is usually LAST NAME (uppercase)
                // Let's find the first sequence of CamelCase words which represents FIRST NAME(S)
                let lastNameUpper = [];
                let iPart = 0;
                while (iPart < nameParts.length && nameParts[iPart].toUpperCase() === nameParts[iPart] && nameParts[iPart].match(/[A-Z]/)) {
                    lastNameUpper.push(nameParts[iPart]);
                    iPart++;
                }
                
                let firstNames = [];
                while (iPart < nameParts.length && (nameParts[iPart].toUpperCase() !== nameParts[iPart] || !nameParts[iPart].match(/[A-Z]/))) {
                    firstNames.push(nameParts[iPart]);
                    iPart++;
                }
                
                let cleanName = "";
                if (firstNames.length > 0 && lastNameUpper.length > 0) {
                    // Format as First Last (Capitalize Last)
                    const formattedLast = lastNameUpper.map(n => n.charAt(0) + n.slice(1).toLowerCase()).join(' ');
                    cleanName = firstNames.join(' ') + ' ' + formattedLast;
                } else {
                    // Fallback, just take the first two tokens
                    cleanName = nameParts.slice(0, 2).join(' ');
                }
                
                teams[currentTeam].push({ pos, name: cleanName, original: beforeDob });
            }
        }
    }

    const sortedTeams = Object.keys(teams).sort();
    for (const team of sortedTeams) {
        output += `\n## ${team} 2022\n`;
        
        teams[team].sort((a, b) => {
            if (a.pos !== b.pos) return a.pos.localeCompare(b.pos);
            return a.name.localeCompare(b.name);
        });

        for (const player of teams[team]) {
            output += `- [${player.pos}] ${player.name}\n`;
        }
    }

    fs.writeFileSync('../players_2022_by_year.txt', output);
    console.log('Successfully generated players_2022_by_year.txt');
    console.log('Total teams:', sortedTeams.length);
    console.log('Sample players from', sortedTeams[0], ':\n', teams[sortedTeams[0]].slice(0, 3));
}

extractPDF().catch(console.error);
