# -*- coding: utf-8 -*-
"""
THACO AGRI Fleet Management - Mockup Data Generator
Tạo thông tin ảo chi tiết, chân thực cho toàn bộ 71 trang HTML trong hệ thống Mockup Quản lý Xe Cơ Giới KLH THACO AGRI.
"""

import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Helper functions for UI components
def make_pill(text, pill_type=""):
    cls = "module-pill"
    if pill_type == "danger" or "Cần xử lý" in text or "Vi phạm" in text or "Quá hạn" in text or "Mất kết nối" in text or "Hỏng" in text or "Vượt" in text or "Chưa xử lý" in text:
        cls += " danger"
    elif pill_type == "pending" or "Chờ" in text or "Tạm dừng" in text or "Sắp hết" in text or "Cảnh báo" in text or "Đang sửa" in text:
        cls += " pending"
    return f'<span class="{cls}">{text}</span>'

def make_stats(stat_list):
    # stat_list: [(small, strong, span), ...]
    items = []
    for s in stat_list:
        items.append(f'<div class="module-stat"><small>{s[0]}</small><strong>{s[1]}</strong><span>{s[2]}</span></div>')
    return '<div class="module-stats">' + ''.join(items) + '</div>'

def make_filters(filter_list):
    # filter_list: [btn1, btn2, sync_text]
    btns = ''.join([f'<button>{f} ⌄</button>' for f in filter_list[:-1]])
    sync = f'<span>● {filter_list[-1]}</span>' if len(filter_list) > 0 else '<span>● Dữ liệu đã đồng bộ</span>'
    return f'<div class="module-filters">{btns}{sync}</div>'

def make_head(eyebrow, title, desc, actions=["↗ Xuất Excel", "＋ Thêm mới"]):
    btn_html = ""
    for i, a in enumerate(actions):
        c = "btn btn-primary" if i == len(actions)-1 else "btn btn-light"
        btn_html += f'<button class="{c}">{a}</button>'
    return f'''<div class="module-head">
  <div>
    <p class="eyebrow">{eyebrow}</p>
    <h1>{title}</h1>
    <p>{desc}</p>
  </div>
  <div class="head-actions">{btn_html}</div>
</div>'''

def make_table(headers, rows, search_placeholder="Tìm kiếm...", total_text="Hiển thị 1–5 trên 128 bản ghi"):
    th_html = "".join([f"<th>{h}</th>" for h in headers]) + "<th></th>"
    tr_html = ""
    for r in rows:
        td_html = ""
        for cell in r:
            td_html += f"<td>{cell}</td>"
        td_html += "<td>•••</td>"
        tr_html += f"<tr>{td_html}</tr>"
        
    return f'''<section class="module-panel">
  <div class="module-toolbar">
    <label>⌕ <input placeholder="{search_placeholder}"></label>
    <select><option>Tất cả đơn vị</option><option>KLH Koun Mom</option><option>KLH Snuol</option><option>XN Chuối 1</option><option>XN Chuối 2</option><option>XN Cây ăn trái</option></select>
    <select><option>Tất cả trạng thái</option><option>Đang hoạt động</option><option>Chờ xác nhận</option><option>Cần xử lý</option></select>
    <button>☷ Bộ lọc nâng cao</button>
  </div>
  <div class="module-table-wrap">
    <table class="module-table">
      <thead><tr>{th_html}</tr></thead>
      <tbody>{tr_html}</tbody>
    </table>
  </div>
  <footer>
    {total_text}
    <span><button>‹</button><button class="active">1</button><button>2</button><button>3</button><button>›</button></span>
  </footer>
</section>'''

def make_kanban(columns):
    # columns: [(col_title, count, [ {id, title, subtitle, tag, time} ])]
    cols_html = ""
    for col in columns:
        title, count, cards = col
        card_html = ""
        for c in cards:
            pill_type = c.get("pill_type", "")
            badge = make_pill(c.get("tag", "100%"), pill_type)
            card_html += f'''<article>
  <small>{c.get("id", "")}</small>
  <h3>{c.get("title", "")}</h3>
  <p>{c.get("subtitle", "")}</p>
  <div>{badge}<time>{c.get("time", "")}</time></div>
</article>'''
        cols_html += f'''<section>
  <header><b>{title}</b><span>{count}</span></header>
  {card_html}
</section>'''
    return f'<div class="kanban">{cols_html}</div>'

def make_calendar(week_range, days):
    # days: [ (day_label, [ {title, sub, time} ]) ]
    day_cols = ""
    for d in days:
        label, events = d
        events_html = ""
        for e in events:
            events_html += f'''<article>
  <b>{e.get("title","")}</b>
  <small>{e.get("sub","")}</small>
  <span>{e.get("time","")}</span>
</article>'''
        day_cols += f'<section><b>{label}</b>{events_html}</section>'
    return f'''<section class="calendar">
  <header>‹ <b>{week_range}</b> ›</header>
  <div>{day_cols}</div>
</section>'''

def make_map(vehicles, center_info="86 phương tiện đang hoạt động · Cập nhật GPS mỗi 10 giây"):
    # vehicles: [ {code, sub, is_red, left, top} ]
    aside_btns = ""
    markers = ""
    for i, v in enumerate(vehicles):
        red_cls = "red" if v.get("is_red") else ("amber" if v.get("is_amber") else "")
        aside_btns += f'''<button>
  <i class="{red_cls}"></i>
  <span><b>{v.get("code","")}</b><small>{v.get("sub","")}</small></span>›
</button>'''
        markers += f'<span class="module-marker" style="left:{v.get("left", 20+i*15)}%;top:{v.get("top", 30+(i%3)*20)}%">{v.get("marker", v.get("code","")[-2:])}</span>'
        
    return f'''<section class="module-map">
  <aside>
    <label>⌕ <input placeholder="Tìm biển số, tài xế, lô thửa..."></label>
    {aside_btns}
  </aside>
  <div class="map-stage">
    <div class="map-grid"></div>
    {markers}
    <em>{center_info}</em>
  </div>
</section>'''

def make_analytics(chart_title, trend_path, donut_total, donut_legend, table_html=""):
    legend_html = "".join([f'<p>{k} <b>{v}</b></p>' for k, v in donut_legend])
    return f'''<section class="analytics">
  <div>
    <h2>{chart_title}</h2>
    <svg viewBox="0 0 700 230"><path d="{trend_path}"/></svg>
  </div>
  <aside>
    <h2>Phân bổ tỷ trọng</h2>
    <div class="donut"><b>{donut_total}<small>Tổng cộng</small></b></div>
    {legend_html}
  </aside>
</section>{table_html}'''

def make_timeline(events):
    # events: [ (title, desc, meta, action_btn) ]
    items_html = ""
    for e in events:
        items_html += f'''<article>
  <i></i>
  <div>
    <b>{e[0]}</b>
    <p>{e[1]}</p>
    <small>{e[2]}</small>
  </div>
  <button>{e[3] if len(e)>3 else 'Chi tiết'}</button>
</article>'''
    return f'<section class="timeline">{items_html}</section>'

def make_settings(page_title, desc, fields, tabs=["Thiết lập chung", "Quy tắc định mức", "Cấu hình phân quyền", "Nhật ký thay đổi"]):
    tabs_html = "".join([f'<button class="{ "active" if i==0 else "" }">{t}</button>' for i, t in enumerate(tabs)])
    fields_html = ""
    for f in fields:
        label = f.get("label", "")
        val = f.get("val", "")
        hint = f.get("hint", "")
        hint_html = f'<small style="color:var(--muted);font-size:8px;display:block;margin-top:3px">{hint}</small>' if hint else ""
        fields_html += f'<label>{label}<input value="{val}">{hint_html}</label>'
    return f'''<section class="settings">
  <aside>{tabs_html}</aside>
  <div>
    <h2>{page_title}</h2>
    <p>{desc}</p>
    {fields_html}
    <footer>
      <button>Khôi phục mặc định</button>
      <button class="save">Lưu cấu hình</button>
    </footer>
  </div>
</section>'''

print("Helper functions ready.")
