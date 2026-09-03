# -*- coding: utf-8 -*-
"""
Export all page mockup HTML into a JavaScript object `window.MOCKUP_PAGES`
so that SPA navigation in index.html renders the exact rich data!
"""

import json
import glob
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

from generator_data_part1 import data_part1
from generator_data_part2 import data_part2
from generator_data_part3 import data_part3
from generator_data_part4 import data_part4

# Combine all
all_data = {}
all_data.update(data_part1)
all_data.update(data_part2)
all_data.update(data_part3)
all_data.update(data_part4)

# Create a mapping by page name and by route
mapped_by_name = {}
for path, html in all_data.items():
    # Extract page name from H1
    h1 = re.search(r'<h1>(.*?)</h1>', html)
    if h1:
        name = h1.group(1).split(' (')[0].split(' & ')[0].strip()
        mapped_by_name[path] = html

# Also write directly as a JS file
js_content = f"window.MOCKUP_PAGE_DATA = {json.dumps(all_data, ensure_ascii=False, indent=2)};\n"

with open('page_data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Generated page_data.js with {len(all_data)} rich page mockups!")
