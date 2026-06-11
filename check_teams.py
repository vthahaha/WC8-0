import fitz
import re

doc = fitz.open(r'd:\World Cup 38-0\SquadLists-English.pdf')
teams = []
for page in doc:
    text = page.get_text('text')
    for line in text.split('\n'):
        line = line.strip()
        # Look for a line that ends with (XXX) where XXX is exactly 3 capital letters
        if re.search(r'\([A-Z]{3}\)$', line) and line.count('(') == 1:
            teams.append(line)

with open('teams_list.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(teams))
