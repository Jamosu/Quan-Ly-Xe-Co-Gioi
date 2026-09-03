# -*- coding: utf-8 -*-
"""
Clean all letter prefixes (A., B., C., etc.) from generator data files
"""

import re

files_to_clean = [
    'generate_data_ab.py',
    'generate_data_cd.py',
    'generate_data_efg.py',
    'generate_data_hijk.py'
]

prefix_pattern = re.compile(r'([A-K]\.\s+)')

for filename in files_to_clean:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
        
    cleaned_content = prefix_pattern.sub('', content)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(cleaned_content)
        
    print(f"Cleaned prefixes in {filename}")

print("All generator data files cleaned.")
