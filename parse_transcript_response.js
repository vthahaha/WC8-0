const fs = require('fs');
const readline = require('readline');

async function parseTranscript() {
    const fileStream = fs.createReadStream('C:\\Users\\Hi\\.gemini\\antigravity-ide\\brain\\8f4cd6ad-5ec3-45a1-b49c-ab66463dd495\\.system_generated\\logs\\transcript.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentTeam = "";
    const teams = {};
    
    for await (const line of rl) {
        if (!line.includes('==Start of OCR for page')) continue;

        try {
            const obj = JSON.parse(line);
            if (obj.type === 'TOOL_RESPONSE' && obj.content && obj.content.includes('==Start of OCR for page')) {
                
                const textLines = obj.content.split('\n');
                let inPdfOutput = false;
                
                for (let tLine of textLines) {
                    tLine = tLine.replace(/^:/, "").trim(); // Remove leading colon from view_file output

                    if (tLine === '==Start of OCR for page 1==') inPdfOutput = true;
                    if (tLine.includes('==End of OCR for page')) continue;
                    if (tLine.includes('==Start of OCR for page')) continue;

                    if (inPdfOutput) {
                        if (tLine.match(/^[A-Za-z\s\-]+ \([A-Z]{3}\)$/)) {
                            currentTeam = tLine.match(/^([A-Za-z\s\-]+) \(/)[1].trim();
                            if (!teams[currentTeam]) teams[currentTeam] = [];
                        } else if (tLine.match(/^(GK|DF|MF|FW)\s+/)) {
                            const match = tLine.match(/^(GK|DF|MF|FW)\s+(.*)/);
                            if (match && currentTeam) {
                                let pos = match[1];
                                if (pos === 'FW') pos = 'FWD';
                                if (pos === 'MF') pos = 'MID';
                                
                                const rest = match[2];
                                const nameParts = rest.split(' ');
                                
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
                                    const formattedLast = lastNameUpper.map(n => n.charAt(0) + n.slice(1).toLowerCase()).join(' ');
                                    cleanName = firstNames.join(' ') + ' ' + formattedLast;
                                } else {
                                    cleanName = nameParts.slice(0, 2).join(' ');
                                }
                                
                                teams[currentTeam].push({ pos, name: cleanName });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    }

    let output = "# World Cup 2022\n";
    const sortedTeams = Object.keys(teams).sort();
    
    let totalPlayers = 0;
    for (const team of sortedTeams) {
        output += `\n## ${team} 2022\n`;
        teams[team].sort((a, b) => {
            if (a.pos !== b.pos) return a.pos.localeCompare(b.pos);
            return a.name.localeCompare(b.name);
        });

        for (const player of teams[team]) {
            output += `- [${player.pos}] ${player.name}\n`;
            totalPlayers++;
        }
    }

    fs.writeFileSync('d:\\World Cup 38-0\\players_2022_by_year.txt', output);
    console.log('Successfully generated players_2022_by_year.txt');
    console.log('Total teams:', sortedTeams.length);
    console.log('Total players:', totalPlayers);
}

parseTranscript();
