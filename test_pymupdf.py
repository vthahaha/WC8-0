import fitz

doc = fitz.open(r"d:\World Cup 38-0\SquadLists-English.pdf")
page = doc[0]
text = page.get_text("text")
lines = text.split('\n')
for i, line in enumerate(lines[:50]):
    print(f"{i}: {line}")
