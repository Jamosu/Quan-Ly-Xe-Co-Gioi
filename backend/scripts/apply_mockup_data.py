# -*- coding: utf-8 -*-
"""
THACO AGRI Fleet Management - Master Mockup Data Updater
Cập nhật nội dung HTML cho toàn bộ 71 trang trong d:/ThacoAgri_Code/Mockup/pages
"""

import os
import glob
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

from generator_data_part1 import data_part1
from generator_data_part2 import data_part2
from generator_data_part3 import data_part3
from generator_data_part4 import data_part4

# Combine all dictionaries
all_data = {}
all_data.update(data_part1)
all_data.update(data_part2)
all_data.update(data_part3)
all_data.update(data_part4)

print(f"Total pages defined in generator parts: {len(all_data)}")

updated_count = 0
skipped_count = 0
missing_pages = []

all_files = [f.replace('\\', '/') for f in glob.glob('pages/*/*.html')]

for fpath in all_files:
    if fpath == 'pages/1-tong-quan/dashboard-van-hanh.html':
        print(f"Skipping main dashboard template (already custom structured): {fpath}")
        skipped_count += 1
        continue
        
    if fpath not in all_data:
        print(f"WARNING: No data defined for {fpath}")
        missing_pages.append(fpath)
        continue
        
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace content inside <section class="page"> ... </section>
    new_page_inner = all_data[fpath]
    
    # Pattern to match <section class="page"> ... </section>
    # We want to replace everything between <section class="page"> and </section>
    pattern = re.compile(r'(<section class="page">)(.*?)(</section>\s*</main>)', re.DOTALL)
    
    match = pattern.search(content)
    if not match:
        print(f"ERROR: Could not match <section class='page'> in {fpath}")
        continue
        
    new_content = pattern.sub(r'\1\n\n' + new_page_inner + r'\n\n      \3', content)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    updated_count += 1

print(f"\n==========================================")
print(f"SUCCESS: Updated {updated_count} HTML pages with rich mockup data!")
print(f"Skipped: {skipped_count} (Dashboard)")
if missing_pages:
    print(f"Missing ({len(missing_pages)}): {missing_pages}")
print(f"==========================================")
