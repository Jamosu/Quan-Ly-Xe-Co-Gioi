# -*- coding: utf-8 -*-
import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

html_files = glob.glob('pages/*/*.html')
print(f"Total HTML files to verify: {len(html_files)}")

broken_count = 0
for f in html_files:
    f_dir = os.path.dirname(f)
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        
    # Find all hrefs inside nav
    nav_match = re.search(r'<nav id="mainNav">(.*?)</nav>', content, re.DOTALL)
    if not nav_match:
        print(f"No mainNav found in {f}")
        broken_count += 1
        continue
        
    hrefs = re.findall(r'href="([^"#]+)"', nav_match.group(1))
    for href in hrefs:
        target_path = os.path.normpath(os.path.join(f_dir, href))
        if not os.path.isfile(target_path):
            print(f"Broken link in {f}: {href} -> {target_path}")
            broken_count += 1

if broken_count == 0:
    print("ALL 49 HTML files have 100% VALID links in sidebar! (0 broken links)")
else:
    print(f"Found {broken_count} broken links!")
