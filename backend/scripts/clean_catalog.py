import re

with open('frontend/src/data/catalogData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix any broken status lines
text = re.sub(r'"status":\s*"HOAT_DONG[\r\n]+"\s*,', '"status": "HOAT_DONG",', text)

with open('frontend/src/data/catalogData.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Cleaned status in catalogData.ts!')
