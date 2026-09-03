from copy import copy
from pathlib import Path
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

template_dir = Path(__file__).resolve().parent.parent / "FileTemplate_mau"
ref_file = template_dir / "Template__CongTy.xlsx"
ref_wb = load_workbook(ref_file)
ref_sheet = ref_wb.active

wb = Workbook()

# Sheet 1: DLN CHỨC DANH
ws1 = wb.active
ws1.title = "DLN CHỨC DANH"

headers = ["Mã chức danh", "Tên chức danh", "Mô tả nhiệm vụ & Chức năng", "Trạng thái"]
hints = ["<Text> - <Bắt buộc nhập *>", "<Text> - <Bắt buộc nhập *>", "<Text>", "<HOAT_DONG hoặc TAM_DUNG>"]

ws1.append(["DỮ LIỆU NỀN CHỨC DANH"])
ws1.append([])
ws1.append(headers)
ws1.append(hints)

for _ in range(20):
    ws1.append(["", "", "", ""])

ws1.merge_cells("A1:D1")

title_src = ref_sheet["A1"]
hdr_src = ref_sheet["A3"]
hint_src = ref_sheet["A4"]
data_src = ref_sheet["A5"]

def copy_cell_style(src, dst):
    if src.font:
        dst.font = copy(src.font)
    if src.fill:
        dst.fill = copy(src.fill)
    if src.border:
        dst.border = copy(src.border)
    if src.alignment:
        dst.alignment = copy(src.alignment)
    dst.number_format = src.number_format

copy_cell_style(title_src, ws1["A1"])
ws1.row_dimensions[1].height = 28
ws1.row_dimensions[2].height = 15
ws1.row_dimensions[3].height = 32
ws1.row_dimensions[4].height = 50

for cell in ws1[3]:
    copy_cell_style(hdr_src, cell)

for cell in ws1[4]:
    copy_cell_style(hint_src, cell)

for row_idx in range(5, 25):
    ws1.row_dimensions[row_idx].height = 20
    for cell in ws1[row_idx]:
        copy_cell_style(data_src, cell)

ws1.column_dimensions["A"].width = 25
ws1.column_dimensions["B"].width = 35
ws1.column_dimensions["C"].width = 45
ws1.column_dimensions["D"].width = 30

# Sheet 2: Huong_Dan
ws2 = wb.create_sheet(title="Huong_Dan")
guide_rows = [
    ["TEMPLATE IMPORT THACO AGRI", "DỮ LIỆU NỀN CHỨC DANH"],
    [],
    ["1. Quy định chung", "Không chỉnh sửa hoặc xóa dòng tiêu đề 1, 2, 3, 4. Dữ liệu bắt đầu nhập từ dòng 5."],
    ["2. Cột bắt buộc (*)", "Các cột có màu vàng ở dòng tiêu đề (Mã chức danh, Tên chức danh) là bắt buộc phải có."],
    ["3. Trạng thái", "Nhập HOAT_DONG (Đang hoạt động) hoặc TAM_DUNG (Tạm dừng). Mặc định là HOAT_DONG."],
    ["4. Tên Sheet dữ liệu", "Sheet dữ liệu chính phải đặt tên là 'DLN CHỨC DANH'."],
    ["5. Lưu file", "Lưu file dưới định dạng .xlsx hoặc .xls trước khi upload lên hệ thống."]
]

for r in guide_rows:
    ws2.append(r)

ws2.row_dimensions[1].height = 28
ws2["A1"].font = Font(name="Arial", size=12, bold=True, color="0A321A")
ws2["B1"].font = Font(name="Arial", size=12, bold=True, color="0A321A")

for row in ws2.iter_rows(min_row=3, max_row=8, min_col=1, max_col=2):
    row[0].font = Font(name="Arial", size=10, bold=True)
    row[1].font = Font(name="Arial", size=10)

ws2.column_dimensions["A"].width = 25
ws2.column_dimensions["B"].width = 90

out_paths = [
    template_dir / "Template__ChucDanh.xlsx",
    Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "templates" / "Template__ChucDanh.xlsx"
]

for p in out_paths:
    wb.save(p)
    print("Successfully generated:", p)
