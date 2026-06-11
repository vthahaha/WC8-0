const mysql = require('mysql2/promise');
require('dotenv').config();

const tier1Nations = ['Brazil', 'Germany', 'West Germany', 'Italy', 'Argentina', 'France', 'Spain'];
const tier2Nations = ['England', 'Netherlands', 'Portugal', 'Uruguay', 'Croatia'];
const tier3Nations = ['Mexico', 'USA', 'Japan', 'Senegal', 'Colombia', 'Chile', 'Belgium', 'Sweden', 'Switzerland', 'Denmark', 'Morocco', 'Korea Republic', 'Cameroon', 'Nigeria'];

const winners = [
    'Uruguay 1930', 'Italy 1934', 'Italy 1938', 'Uruguay 1950',
    'West Germany 1954', 'Brazil 1958', 'Brazil 1962', 'England 1966',
    'Brazil 1970', 'West Germany 1974', 'Argentina 1978', 'Italy 1982',
    'Argentina 1986', 'West Germany 1990', 'Brazil 1994', 'France 1998',
    'Brazil 2002', 'Italy 2006', 'Spain 2010', 'Germany 2014',
    'France 2018', 'Argentina 2022'
];

const finalists = [
    'Argentina 1930', 'Czechoslovakia 1934', 'Hungary 1938', 'Brazil 1950',
    'Hungary 1954', 'Sweden 1958', 'Czechoslovakia 1962', 'West Germany 1966',
    'Italy 1970', 'Netherlands 1974', 'Netherlands 1978', 'West Germany 1982',
    'West Germany 1986', 'Argentina 1990', 'Italy 1994', 'Brazil 1998',
    'Germany 2002', 'France 2006', 'Netherlands 2010', 'Argentina 2014',
    'Croatia 2018', 'France 2022'
];

const eraOverrides = {
    'Messi': { '2006': 86, '2010': 94, '2014': 98, '2018': 94, '2022': 99, '2026': 95 },
    'Maradona': { '1982': 90, '1986': 99, '1990': 95, '1994': 92 },
    'Cristiano Ronaldo': { '2006': 88, '2010': 92, '2014': 94, '2018': 96, '2022': 88, '2026': 86 },
    'Ronaldo': { '1994': 88, '1998': 97, '2002': 98, '2006': 92 },
    'Coutinho': { '2018': 88 },
    'Müller': { '1970': 96, '1974': 96, '2010': 91, '2014': 92, '2018': 85, '2022': 84 },
    'Muller': { '1970': 96, '1974': 96, '2010': 91, '2014': 92, '2018': 85, '2022': 84 },
    'Stankovic': { '1998': 85, '2006': 86, '2010': 86 },
    'Stanković': { '1998': 85, '2006': 86, '2010': 86 },
    'Modric': { '2006': 80, '2014': 86, '2018': 96, '2022': 93 },
    'Modrić': { '2006': 80, '2014': 86, '2018': 96, '2022': 93 },
    'Zidane': { '1998': 96, '2002': 94, '2006': 97 },
    'Pelé': { '1958': 98, '1962': 98, '1966': 97, '1970': 99 },
    'Edson Arantes do Nascimento': { '1958': 98, '1962': 98, '1966': 97, '1970': 99 },
    'Ronaldinho': { '2002': 94, '2006': 96 },
    'Cruyff': { '1974': 97 },
    'Beckenbauer': { '1966': 94, '1970': 96, '1974': 97 },
    'Platini': { '1978': 90, '1982': 94, '1986': 96 },
    'Iniesta': { '2006': 85, '2010': 95, '2014': 94, '2018': 88 },
    'Xavi': { '2002': 86, '2006': 91, '2010': 95, '2014': 92 },
    'Maldini': { '1990': 91, '1994': 95, '1998': 94, '2002': 92 },
    'Matthäus': { '1982': 86, '1986': 92, '1990': 95, '1994': 93, '1998': 90 },
    'Baggio': { '1990': 91, '1994': 95, '1998': 93 },
    'Romário': { '1990': 89, '1994': 96 },
    'Garrincha': { '1958': 94, '1962': 97, '1966': 91 },
    'Thierry Henry': { '1998': 88, '2002': 92, '2006': 94, '2010': 87 },
    'Lev Yashin': { '1958': 94, '1962': 95, '1966': 96, '1970': 92 },
    'Eusébio': { '1966': 96 },
    'van Basten': { '1990': 94 },
    'Gullit': { '1990': 93 },
    'Oliver Kahn': { '1994': 86, '1998': 90, '2002': 95, '2006': 89 },
    'Baresi': { '1982': 86, '1990': 95, '1994': 94 },
    'Carlos Alberto': { '1970': 93 },
    'Roberto Carlos': { '1998': 92, '2002': 94, '2006': 90 },
    'Rivaldo': { '1998': 93, '2002': 95 },
    'Kaká': { '2002': 82, '2006': 94, '2010': 91 },
    'Buffon': { '1998': 86, '2002': 91, '2006': 95, '2010': 92, '2014': 90 },
    'Casillas': { '2002': 88, '2006': 91, '2010': 95, '2014': 89 },
    'Neuer': { '2010': 89, '2014': 94, '2018': 91, '2022': 88 },
    'Sergio Ramos': { '2006': 85, '2010': 91, '2014': 93, '2018': 91 },
    'Cannavaro': { '1998': 90, '2002': 92, '2006': 96, '2010': 87 },
    'Neymar': { '2014': 91, '2018': 93, '2022': 92 },
    'Mbappé': { '2018': 92, '2022': 95 },
    'Luis Suárez': { '2010': 88, '2014': 92, '2018': 91, '2022': 85 },
    'Luis Suarez': { '2010': 88, '2014': 92, '2018': 91, '2022': 85 },
    'Batistuta': { '1994': 91, '1998': 93, '2002': 90 },
    'Rooney': { '2006': 89, '2010': 90, '2014': 88 },
    'Shevchenko': { '2006': 91 },
    'Puskás': { '1954': 96 },
    'Zico': { '1978': 93, '1982': 95, '1986': 92 }
};

// Extrapolated missing years
function getOverrideRating(playerName, year, teamName) {
    const pName = playerName.toLowerCase();
    for (const [matchName, ratings] of Object.entries(eraOverrides)) {
        if (pName.includes(matchName.toLowerCase())) {
            // Special check for Ronaldo vs Cristiano Ronaldo
            if (matchName === 'Ronaldo' && !teamName.includes('Brazil')) continue;
            
            // Check if exact year exists
            if (ratings[year]) {
                return ratings[year];
            }
            
            // If year isn't explicitly defined, try to find a nearby year and assign a generic high rating
            return 88; // Default elite floor if they missed the specific year dict mapping
        }
    }
    return null;
}

async function assignRatings() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'worldcup_draft'
        });

        console.log("Fetching all players...");
        const [players] = await connection.query(`
            SELECT p.id, p.name, t.name as team_name 
            FROM players p
            JOIN teams t ON p.team_id = t.id
        `);

        console.log(`Evaluating ${players.length} players...`);
        let updatePromises = [];

        for (const player of players) {
            let rating = 73; // Absolute base
            
            // Extract Nation and Year
            const parts = player.team_name.split(' ');
            const yearStr = parts.pop();
            const nation = parts.join(' ');
            
            // 1. Nation Prestige Base
            if (tier1Nations.includes(nation)) {
                rating = Math.floor(Math.random() * 5) + 80; // 80-84
            } else if (tier2Nations.includes(nation)) {
                rating = Math.floor(Math.random() * 5) + 78; // 78-82
            } else if (tier3Nations.includes(nation)) {
                rating = Math.floor(Math.random() * 5) + 75; // 75-79
            } else {
                rating = Math.floor(Math.random() * 4) + 73; // 73-76
            }
            
            // 2. Tournament Boost
            if (winners.includes(player.team_name)) {
                rating += 4;
            } else if (finalists.includes(player.team_name)) {
                rating += 2;
            }

            // 3. Explicit Era Overrides
            const explicitRating = getOverrideRating(player.name, yearStr, player.team_name);
            if (explicitRating !== null) {
                rating = explicitRating;
            }

            updatePromises.push(
                connection.query('UPDATE players SET rating = ? WHERE id = ?', [rating, player.id])
            );
        }

        console.log("Executing updates...");
        await Promise.all(updatePromises);
        console.log("All players have been successfully rated!");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (connection) await connection.end();
    }
}

assignRatings();
