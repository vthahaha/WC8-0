import fitz
import re
import json

doc = fitz.open(r"d:\World Cup 38-0\SquadLists-English.pdf")

teams = {}
team_pattern = re.compile(r"^([^\(]+) \([A-Z]{3}\)$")
pos_pattern = re.compile(r"^(GK|DF|MF|FW)$")

current_team = None

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text("text")
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check team name
        team_match = team_pattern.match(line)
        if team_match and len(line) < 50: # Avoid matching long lines
            # e.g., "Algeria 2026"
            current_team = f"{team_match.group(1).strip()} 2026"
            if current_team not in teams:
                teams[current_team] = []
            i += 1
            continue
            
        # Check player
        if pos_pattern.match(line) and current_team:
            pos = line
            if i + 7 < len(lines) and re.match(r"^\d{2}/\d{2}/\d{4}$", lines[i+5]):
                player_name = lines[i+1]
                teams[current_team].append({
                    "name": player_name,
                    "position": pos
                })
                i += 8
                continue
            else:
                pass
                
        i += 1

with open("squads_2026.json", "w", encoding="utf-8") as f:
    json.dump(teams, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(teams)} teams.")
