# -*- coding: utf-8 -*-
"""
Main Builder & Deployer for THACO AGRI Fleet Management
Generates 100% SELF-CONTAINED HTML files (Embedded CSS, Static Data, Google Fonts)
Perfect for importing directly into Figma (html.to.design / Figma HTML Importer)
"""

import os
import shutil
import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

from module_structure import MODULES
import generate_data_ab
import generate_data_cd
import generate_data_efg
import generate_data_hijk

# Aggregate all page data
ALL_PAGES = {}
ALL_PAGES.update(generate_data_ab.PAGES_DATA)
ALL_PAGES.update(generate_data_cd.PAGES_DATA)
ALL_PAGES.update(generate_data_efg.PAGES_DATA)
ALL_PAGES.update(generate_data_hijk.PAGES_DATA)

print(f"Total defined pages: {len(ALL_PAGES)}")

# Read styles.css and modules.css to embed directly
with open('styles.css', 'r', encoding='utf-8') as f:
    css_core = f.read()
with open('modules.css', 'r', encoding='utf-8') as f:
    css_modules = f.read()

EMBEDDED_CSS = css_core + "\n" + css_modules

# Target 11 directories
TARGET_DIRS = [m[2] for m in MODULES]

# Clean up pages directory
pages_dir = 'pages'
if os.path.exists(pages_dir):
    for entry in os.listdir(pages_dir):
        entry_path = os.path.join(pages_dir, entry)
        if os.path.isdir(entry_path):
            shutil.rmtree(entry_path)

# Recreate the 11 clean folders
for d in TARGET_DIRS:
    os.makedirs(os.path.join(pages_dir, d), exist_ok=True)

def build_sidebar_html(current_folder, current_filename):
    groups = []
    for m in MODULES:
        icon, name, folder, items = m[0], m[1], m[2], m[3]
        badge_group = m[4] if len(m) > 4 else ""
        
        is_cur_group = (folder == current_folder)
        group_cls = "nav-group open" if is_cur_group else "nav-group"
        parent_cls = "nav-parent active" if is_cur_group else "nav-parent"
        
        badge_html = f'<span class="badge">{badge_group}</span>' if badge_group else ''
        
        items_html = []
        for item in items:
            p_name, f_name, b_item = item[0], item[1], item[2]
            is_cur_item = (is_cur_group and f_name == current_filename)
            
            if is_cur_item:
                item_cls = "nav-child active"
                href = "#"
            else:
                item_cls = "nav-child"
                href = f"../{folder}/{f_name}"
                
            item_badge = f'<span class="badge" style="margin-left:auto">{b_item}</span>' if b_item else ''
            items_html.append(f'<a href="{href}" class="{item_cls}" style="text-decoration:none">{p_name}{item_badge}</a>')
            
        group_block = f'''<div class="{group_cls}">
  <button class="{parent_cls}" onclick="this.parentElement.classList.toggle('open')">
    <span class="nav-icon">{icon}</span>
    <span class="nav-label">{name}</span>
    {badge_html}
    <span class="chev">⌄</span>
  </button>
  <div class="nav-children">
    {''.join(items_html)}
  </div>
</div>'''
        groups.append(group_block)
    return '\n'.join(groups)

HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{page_title} - THACO AGRI Quản Lý Xe Cơ Giới</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
{embedded_css}
  </style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <a href="../A-dashboard/dashboard-van-hanh.html" class="brand-link" style="display:flex;align-items:center;text-decoration:none;flex:1">
          <svg id="thaco_agri_logo" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 184.07 18.7" style="height:22px;width:auto;display:block">
            <defs>
              <style>
                .logo-white {{ fill: #ffffff; }}
                .logo-clip {{ clip-path: url(#clippath-logo); }}
                .logo-none {{ fill: none; }}
                .logo-grad {{ fill: url(#linear-gradient-logo); }}
              </style>
              <clipPath id="clippath-logo">
                <path class="logo-none" d="M143.77,0c-5.1,0-9.31,4.2-9.31,9.3v9.24l5.38-4.29v-4.95c0-2.73,2.21-4.94,4.95-4.94h7.45l5.43-4.36h-13.9Z"/>
              </clipPath>
              <linearGradient id="linear-gradient-logo" x1="-433.17" y1="101.4" x2="-431.23" y2="101.4" gradientTransform="translate(6672.89 1540.57) scale(15.1 -15.1)" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#8cc540"/>
                <stop offset=".28" stop-color="#79b63f"/>
                <stop offset=".84" stop-color="#49903f"/>
                <stop offset="1" stop-color="#3b853f"/>
              </linearGradient>
            </defs>
            <g id="Layer_1-2" data-name="Layer 1">
              <g>
                <path class="logo-white" d="M159.05,18.54V3.09h14.23c4.56-.02,4.61,3.07,4.61,4.57v1.22c0,3.02-2.11,3.54-2.63,3.54v.04c.55,0,2.62,.32,2.61,3.41v2.67s-4.75,0-4.75,0v-1.92c.01-.59,.18-2.16-1.93-2.15h-7.41v4.06h-4.72Zm4.68-11.63v3.74h7.8c1.16,0,1.74-.54,1.74-1.61v-.51c0-.65,.03-1.62-2.17-1.62h-7.37Z"/>
                <g class="logo-clip">
                  <rect class="logo-grad" x="131.31" y="-5.49" width="29.52" height="29.52" transform="translate(36.23 106) rotate(-45)"/>
                </g>
                <path class="logo-white" d="M148.6,7.26l-5.14,4.1h8.32c-.78,1.71-2.5,2.9-4.5,2.9h-7.45l-5.37,4.29h13.91c4.39,0,8.08-3.07,9-7.19,.31-1.4,.23-4.1,.23-4.1h-9.01Z"/>
                <path class="logo-white" d="M118.86,3.09l-8.37,15.45h5.29l1.39-2.73h9.6l1.47,2.73h5.27l-8.49-15.45h-6.17Zm.09,9.39l2.99-5.8,3.07,5.8h-6.06Z"/>
                <rect class="logo-white" x="179.34" y="3.09" width="4.73" height="15.44"/>
                <polygon class="logo-white" points="34.75 8.6 24.77 8.6 24.77 3.09 0 3.09 0 6.93 7.82 6.93 7.82 18.54 12.56 18.54 12.56 6.93 20.03 6.93 20.03 18.54 24.77 18.54 24.77 12.69 34.75 12.69 34.75 18.54 39.49 18.54 39.49 3.09 34.75 3.09 34.75 8.6"/>
                <path class="logo-white" d="M48.8,3.09l-8.37,15.45h5.29l1.39-2.73h9.6l1.47,2.73h5.27L54.97,3.09h-6.17Zm.09,9.39l2.99-5.8,3.07,5.8h-6.06Z"/>
                <path class="logo-white" d="M84.57,10.81c0-4.99,0-7.89,6.8-7.89h7.59c6.8,0,6.8,2.7,6.8,7.89,0,4.83,0,7.89-6.8,7.89h-7.59c-6.8,0-6.8-3.04-6.8-7.89m4.86,0c0,3.11,.36,3.92,2.71,3.92h6.06c2.68,0,2.68-1.43,2.68-3.92s-.12-3.92-2.94-3.92h-5.55c-2.96,0-2.96,1.59-2.96,3.92"/>
                <path class="logo-white" d="M62.99,10.17c0-4.4-.16-7.24,6.8-7.24h6.74c6.59,0,6.4,3.12,6.4,5.82h-4.74s.25-1.86-1.66-1.86h-5.71c-2.44,.04-2.97,.93-2.97,3.6,0,2.95-.07,4.3,2.97,4.25h5.71c1.54-.03,1.86-1.15,1.86-2.13h4.73c0,3.2,.45,6.1-6.59,6.1h-6.74c-7.02,0-6.8-2.98-6.8-8.54"/>
              </g>
            </g>
          </svg>
        </a>
        <button class="icon-btn collapse-btn" id="collapseBtn" aria-label="Thu gọn">‹</button>
      </div>
      <nav id="mainNav">
{sidebar_html}
      </nav>
      <div class="sidebar-footer">
        <div class="support"><span class="nav-icon">?</span><div><b>Trung tâm hỗ trợ</b><small>Phiên bản 1.0.0</small></div></div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="breadcrumb"><span>{module_name}</span><b>/</b><strong>{page_title}</strong></div>
        <div class="top-actions">
          <div class="search"><input placeholder="Tìm nhanh xe, lái xe, lệnh điều động..." /></div>
          <button class="icon-btn notification" aria-label="Thông báo">🔔<span class="dot"></span></button>
          <div class="divider"></div>
          <button class="profile"><span class="avatar">LT</span><span class="profile-copy"><b>Chau Tiểu Long</b><small>Quản trị hệ thống</small></span><span>⌄</span></button>
        </div>
      </header>

      <section class="page">
{page_content}
      </section>
    </main>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    function showToast(msg) {{
      const t = document.querySelector('#toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(window.toastTimer);
      window.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    }}
    document.querySelectorAll('.btn,.text-btn,.select-btn,.select-mini,.notification,.profile,.module-toolbar button,.module-toolbar select,.module-panel footer button,.kanban article,.settings footer button,.timeline button,.module-map aside button,.zoom button').forEach(b => {{
      b.onclick = () => showToast('Đã ghi nhận: ' + b.textContent.trim());
    }});
    const cBtn = document.querySelector('#collapseBtn');
    if (cBtn) cBtn.onclick = () => document.querySelector('#sidebar').classList.toggle('collapsed');
  </script>
</body>
</html>
'''

# Write all 49 HTML files
for m in MODULES:
    icon, mod_name, folder, items = m[0], m[1], m[2], m[3]
    for item in items:
        page_title, filename, _ = item[0], item[1], item[2]
        key = f"pages/{folder}/{filename}"
        
        if key not in ALL_PAGES:
            print(f"WARNING: Key not found in data: {key}")
            continue
            
        page_content = ALL_PAGES[key]
        sidebar_html = build_sidebar_html(folder, filename)
        
        full_html = HTML_TEMPLATE.format(
            page_title=page_title,
            module_name=mod_name,
            sidebar_html=sidebar_html,
            page_content=page_content,
            embedded_css=EMBEDDED_CSS
        )
        
        out_path = os.path.join('pages', folder, filename)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(full_html)

print(f"Generated all {len(ALL_PAGES)} 100% self-contained HTML pages successfully!")

# Write page_data.js for SPA navigation
with open('page_data.js', 'w', encoding='utf-8') as f:
    f.write(f"window.MOCKUP_PAGE_DATA = {json.dumps(ALL_PAGES, ensure_ascii=False, indent=2)};\n")

print("Generated page_data.js successfully!")
