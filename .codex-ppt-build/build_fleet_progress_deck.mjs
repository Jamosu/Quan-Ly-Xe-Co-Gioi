import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "D:/ThacoAgri_Code/Mockup";
const sourceTemplatePath = path.join(workspaceDir, ".codex-ppt-build/template-source-copy.pptx");
const outputDir = path.join(workspaceDir, "deliverables");
const stagingDir = path.join(workspaceDir, ".codex-finalizer");
const finalPath = path.join(outputDir, "Gioi_thieu_phan_mem_va_so_do_nghiep_vu_xe_co_gioi_2026-09-22_v8.pptx");
const skillDir = "C:/Users/chaut/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations";
const runtimePython = "C:/Users/chaut/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";

const utils = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);
const { finalizePresentation, makeNativeBulletParagraphs } = utils;
const deck = await PresentationFile.importPptx(await FileBlob.load(sourceTemplatePath));
const diagramTemplateSlide = deck.slides.getItem(9);
const diagramSlides = [];
for (let i = 0; i < 12; i += 1) {
  const slide = diagramTemplateSlide.duplicate();
  slide.moveTo(deck.slides.items.length - 1);
  diagramSlides.push(slide);
}

const W = 1280;
const H = 720;
const FONT = "Cambria";
const GREEN = "#006B35";
const GREEN_2 = "#5FAE3E";
const PALE_GREEN = "#E8F2E2";
const RED = "#E00000";
const BLUE = "#075AA7";
const ORANGE = "#E87518";
const PALE_YELLOW = "#FFF5CE";
const INK = "#17212B";
const MUTED = "#59636E";
const BORDER = "#B8C1C7";
const WHITE = "#FFFFFF";

function addText(slide, text, left, top, width, height, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: options.name,
    position: { left, top, width, height },
    fill: options.fill ?? "none",
    line: options.line ?? { fill: "none", width: 0 },
    borderRadius: options.borderRadius,
  });
  shape.text = text;
  shape.text.style = {
    typeface: options.fontFamily ?? FONT,
    fontSize: options.fontSize ?? 21,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    color: options.color ?? INK,
    alignment: options.align ?? "left",
    verticalAlignment: options.valign ?? "top",
    autoFit: options.autoFit ?? "shrinkText",
    wrap: "square",
    lineSpacing: options.lineSpacing ?? 1,
    insets: options.insets ?? { top: 2, right: 4, bottom: 2, left: 4 },
  };
  return shape;
}

function addTitle(slide, title) {
  return addText(slide, title, 270, 15, 965, 62, {
    name: "slide-title",
    fontSize: 28,
    bold: true,
    color: RED,
    align: "center",
    valign: "middle",
  });
}

function addFooter(slide, page) {
  addText(slide, "Giới thiệu phần mềm và tiến độ phát triển | THACO AGRI Fleet | 21/09/2026", 28, 686, 780, 20, {
    fontSize: 11,
    color: "#8A8F93",
    italic: true,
    valign: "middle",
  });
  addText(slide, String(page), 1224, 686, 24, 20, {
    fontSize: 11,
    color: "#8A8F93",
    align: "right",
    valign: "middle",
  });
}

function addBullets(slide, items, left, top, width, height, options = {}) {
  const box = addText(slide, "", left, top, width, height, {
    fontSize: options.fontSize ?? 20,
    color: options.color ?? INK,
    lineSpacing: options.lineSpacing ?? 1.04,
  });
  box.text = makeNativeBulletParagraphs(items, {
    marginLeftPoints: options.marginLeftPoints ?? 19,
    hangingPoints: options.hangingPoints ?? 9,
    spaceAfterPoints: options.spaceAfterPoints ?? 7,
  });
  box.text.style = {
    typeface: FONT,
    fontSize: options.fontSize ?? 20,
    color: options.color ?? INK,
    autoFit: "shrinkText",
    wrap: "square",
    lineSpacing: options.lineSpacing ?? 1.04,
    insets: { top: 2, right: 4, bottom: 2, left: 4 },
  };
  return box;
}

function addRule(slide, left, top, width, color = GREEN_2, height = 2) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left, top, width, height },
    fill: color,
    line: { fill: color, width: 0 },
  });
}

function clearSlide(slide) {
  slide.shapes.deleteAll();
  for (const table of [...slide.tables.items]) slide.tables.deleteById(table.id);
  for (const chart of [...slide.charts.items]) slide.charts.deleteById(chart.id);
  for (const image of [...slide.images.items]) {
    const frame = image.frame ?? image.position;
    const fullCanvas = frame && frame.width >= 1200 && frame.height >= 680;
    if (!fullCanvas) slide.images.deleteById(image.id);
  }
}

function styleTable(table, { headerRows = 1, fontSize = 15, headerFill = GREEN } = {}) {
  table.borders.assign({ style: "solid", fill: BORDER, width: 1 });
  table.cells.block({ row: 0, column: 0, rowCount: table.rows.length, columnCount: table.columns.length }).assign({
    textStyle: { typeface: FONT, fontSize, color: INK, verticalAlignment: "middle" },
    margins: { top: 4, right: 6, bottom: 4, left: 6 },
    anchor: "middle",
  });
  if (headerRows > 0) {
    table.cells.block({ row: 0, column: 0, rowCount: headerRows, columnCount: table.columns.length }).assign({
      fill: headerFill,
      textStyle: { typeface: FONT, fontSize, bold: true, color: WHITE, alignment: "center", verticalAlignment: "middle" },
      anchor: "middle",
    });
  }
  for (let r = 0; r < table.rows.length; r += 1) {
    for (let c = 0; c < table.columns.length; c += 1) {
      table.getCell(r, c).text.style = {
        typeface: FONT,
        fontSize,
        bold: r < headerRows,
        color: r < headerRows ? WHITE : INK,
        alignment: r < headerRows ? "center" : "left",
        verticalAlignment: "middle",
        autoFit: "shrinkText",
        wrap: "square",
      };
    }
  }
  for (let r = headerRows; r < table.rows.length; r += 1) {
    if ((r - headerRows) % 2 === 1) {
      table.cells.block({ row: r, column: 0, rowCount: 1, columnCount: table.columns.length }).assign({ fill: "#F4F7F4" });
    }
  }
  for (let r = 0; r < table.rows.length; r += 1) {
    for (let c = 0; c < table.columns.length; c += 1) {
      const cell = table.getCell(r, c);
      cell.fill = r < headerRows ? headerFill : ((r - headerRows) % 2 === 1 ? "#F4F7F4" : WHITE);
      cell.text.style = {
        typeface: FONT,
        fontSize,
        bold: r < headerRows,
        color: r < headerRows ? WHITE : INK,
        alignment: r < headerRows ? "center" : "left",
        verticalAlignment: "middle",
        autoFit: "shrinkText",
        wrap: "square",
      };
    }
  }
}

function setNotes(slide, text) {
  slide.speakerNotes.textFrame.setText(text);
  slide.speakerNotes.setVisible(false);
}

function addFlowNode(slide, config) {
  const {
    left, top, width = 280, height = 70, text,
    type = "process", fill, color = INK, fontSize = 16,
  } = config;
  const geometry = type === "decision" ? "diamond" : type === "start" || type === "end" ? "roundRect" : "rect";
  const shape = slide.shapes.add({
    geometry,
    position: { left, top, width, height },
    fill: fill ?? (type === "decision" ? "#F8D1B0" : type === "start" || type === "end" ? PALE_GREEN : PALE_YELLOW),
    line: { style: "solid", fill: GREEN, width: 1.4 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: FONT,
    fontSize,
    bold: type === "decision" || type === "start" || type === "end",
    color,
    alignment: "center",
    verticalAlignment: "middle",
    autoFit: "shrinkText",
    wrap: "square",
    insets: { top: 5, right: 7, bottom: 5, left: 7 },
  };
  return shape;
}

function connectFlow(slide, from, to, options = {}) {
  return slide.shapes.connect(from, to, {
    kind: options.kind ?? "elbow",
    fromSide: options.fromSide,
    toSide: options.toSide,
    line: { style: options.dashed ? "dashed" : "solid", fill: options.color ?? GREEN_2, width: options.width ?? 2 },
    tail: { type: "arrow", width: "med", length: "med" },
  });
}

function addSwimlaneFrame(slide, lanes) {
  const left = 34;
  const top = 94;
  const width = 1212;
  const laneWidth = width / lanes.length;
  lanes.forEach((lane, index) => {
    const x = left + index * laneWidth;
    addText(slide, lane, x, top, laneWidth, 42, {
      fontSize: 17,
      bold: true,
      color: index % 2 === 0 ? GREEN : BLUE,
      align: "center",
      valign: "middle",
      fill: index % 2 === 0 ? "#F3F8F0" : "#F1F6FB",
      line: { fill: GREEN_2, width: 1 },
    });
    if (index > 0) addRule(slide, x, 136, 1.5, GREEN_2, 500);
  });
  return { left, top, width, laneWidth };
}

function renderSwimlane(slide, definition, page) {
  addTitle(slide, definition.title);
  const frame = addSwimlaneFrame(slide, definition.lanes);
  const rowY = [158, 278, 398, 518];
  const shapes = new Map();
  for (const node of definition.nodes) {
    const left = frame.left + node.lane * frame.laneWidth + (node.offsetX ?? 50);
    const top = node.top ?? rowY[node.row ?? 0];
    const shape = addFlowNode(slide, {
      left,
      top,
      width: node.width ?? 304,
      height: node.height ?? (node.type === "decision" ? 86 : 72),
      text: node.text,
      type: node.type,
      fill: node.fill,
      color: node.color,
      fontSize: node.fontSize ?? 15.5,
    });
    shapes.set(node.id, shape);
  }
  for (const edge of definition.edges) {
    connectFlow(slide, shapes.get(edge.from), shapes.get(edge.to), edge);
    if (edge.label) {
      addText(slide, edge.label, edge.labelLeft, edge.labelTop, edge.labelWidth ?? 70, 22, {
        fontSize: 12.5,
        bold: true,
        color: edge.labelColor ?? MUTED,
        align: "center",
        valign: "middle",
        fill: WHITE,
      });
    }
  }
  if (definition.note) {
    addText(slide, definition.note, 74, 642, 1132, 28, {
      fontSize: 13.5,
      italic: true,
      color: definition.noteColor ?? MUTED,
      align: "center",
      valign: "middle",
    });
  }
  addFooter(slide, page);
  setNotes(slide, definition.sources);
}

for (const slide of deck.slides.items) clearSlide(slide);

// 1. Cover
{
  const s = deck.slides.getItem(0);
  addText(s, "GIỚI THIỆU PHẦN MỀM VÀ BÁO CÁO TIẾN ĐỘ", 150, 202, 980, 52, {
    fontSize: 27, bold: true, color: GREEN, align: "center", valign: "middle",
  });
  addText(s, "HỆ THỐNG QUẢN LÝ XE CƠ GIỚI & PTVC", 125, 270, 1030, 70, {
    fontSize: 42, bold: true, color: RED, align: "center", valign: "middle",
  });
  addText(s, "Phạm vi chức năng, trải nghiệm người dùng, tiến độ mã nguồn và các bất cập hiện tại", 150, 350, 980, 48, {
    fontSize: 24, italic: true, color: MUTED, align: "center", valign: "middle",
  });
  addText(s, "Phạm vi rà soát: web React, API NestJS, Prisma/MySQL và ứng dụng tài xế", 180, 420, 920, 34, {
    fontSize: 20, bold: true, color: GREEN, align: "center", valign: "middle",
  });
  addText(s, "PHÒNG VẬN HÀNH SỐ\nKLH Koun Mom, Ratanakiri, Cambodia | 21.09.2026", 250, 592, 780, 58, {
    fontSize: 19, bold: true, color: GREEN, align: "center", valign: "middle",
  });
  setNotes(s, "Nguồn: repository D:/ThacoAgri_Code/Mockup, rà soát tại working tree ngày 21/09/2026. Nội dung giới thiệu dựa trên code, schema và tài liệu nghiệp vụ. File mẫu chỉ được dùng làm chuẩn nhận diện và bố cục.");
}

// 2. Agenda
{
  const s = deck.slides.getItem(1);
  addTitle(s, "NỘI DUNG BÁO CÁO");
  const agenda = [
    "Phần mềm phục vụ ai và giải quyết công việc gì",
    "Các nhóm chức năng và module A–K",
    "Quy trình tạo lệnh và chuyển lệnh đến tài xế",
    "Sơ đồ quy trình cho từng nghiệp vụ chính",
    "Dữ liệu, kiến trúc và kênh sử dụng",
    "Tiến độ phát triển hiện tại",
    "Kết quả kiểm thử và build",
    "Bất cập, khó khăn và rủi ro",
    "Lộ trình hoàn thiện đề xuất",
  ];
  agenda.forEach((label, i) => {
    const y = 104 + i * 55;
    addText(s, String(i + 1).padStart(2, "0"), 48, y, 72, 38, {
      fontSize: 22, bold: true, color: WHITE, align: "center", valign: "middle",
      fill: i % 2 === 0 ? GREEN : BLUE,
    });
    addText(s, label, 130, y, 1048, 38, {
      fontSize: 21, color: GREEN, valign: "middle",
      fill: "#F8F9F8", line: { fill: "#D8DDDA", width: 1 },
    });
  });
  addFooter(s, 2);
  setNotes(s, "Cấu trúc báo cáo cân bằng hai mục tiêu: giới thiệu phần mềm đang có những gì và mô tả tiến độ, bất cập, khó khăn hiện tại.");
}

// 3. Product purpose
{
  const s = deck.slides.getItem(2);
  addTitle(s, "PHẦN MỀM PHỤC VỤ VẬN HÀNH GÌ");
  addText(s, "Mục tiêu", 82, 112, 250, 36, { fontSize: 24, bold: true, color: GREEN });
  addBullets(s, [
    "Quản lý tập trung xe cơ giới, thiết bị nông nghiệp và tình trạng sẵn sàng",
    "Kết nối kế hoạch sản xuất với điều xe, thực hiện công việc và nghiệm thu",
    "Theo dõi GPS, nhiên liệu, bảo dưỡng, sửa chữa và hiệu quả lái xe",
  ], 76, 155, 520, 230, { fontSize: 21, spaceAfterPoints: 10 });
  addText(s, "Người sử dụng", 676, 112, 300, 36, { fontSize: 24, bold: true, color: BLUE });
  addBullets(s, [
    "Ban Xe cơ giới và cán bộ điều hành tại đơn vị",
    "Quản lý nông trường, nhân sự xưởng BTSC và kho nhiên liệu",
    "Lái xe qua ứng dụng mobile, quản trị hệ thống và lãnh đạo theo dõi báo cáo",
  ], 670, 155, 530, 230, { fontSize: 21, spaceAfterPoints: 10 });
  addRule(s, 88, 418, 1104, GREEN_2, 2);
  addText(s, "Giá trị dự kiến khi dữ liệu và quy trình được khép kín", 82, 445, 620, 36, { fontSize: 23, bold: true, color: RED });
  addText(s, "Một nguồn dữ liệu vận hành để biết xe nào sẵn sàng, công việc nào đang chậm, chi phí phát sinh ở đâu và ai chịu trách nhiệm xử lý.", 82, 492, 1108, 112, {
    fontSize: 25, bold: true, color: INK, align: "center", valign: "middle",
    fill: PALE_GREEN, line: { fill: GREEN_2, width: 1 }, borderRadius: 8,
  });
  addFooter(s, 3);
  setNotes(s, "Nguồn: AI_PROJECT_CONTEXT.md; docs/BRD_extracted.txt; .agents/context/project-overview.md; backend/prisma/schema.prisma. Giá trị nêu trên là mục tiêu vận hành, không phải cam kết đã đạt production.");
}

// 4. Users and architecture
{
  const s = deck.slides.getItem(3);
  addTitle(s, "ĐỐI TƯỢNG SỬ DỤNG VÀ KIẾN TRÚC");
  addText(s, "Vai trò và công việc chính", 55, 105, 360, 32, { fontSize: 23, bold: true, color: GREEN });
  const table = s.tables.add({
    rows: 6, columns: 2, left: 50, top: 145, width: 1180, height: 330,
    columnWidths: [330, 850],
    values: [
      ["NHÓM NGƯỜI DÙNG", "CÔNG VIỆC TRÊN HỆ THỐNG"],
      ["Ban Xe cơ giới / điều hành", "Lập kế hoạch, phân bổ xe, theo dõi tiến độ và xử lý điều chỉnh"],
      ["Đơn vị / nông trường", "Đăng ký nhu cầu, điều xe trong phạm vi kế hoạch, xác nhận kết quả"],
      ["Xưởng và kho nhiên liệu", "Bảo dưỡng, sửa chữa, phụ tùng, tồn kho và cấp phát nhiên liệu"],
      ["Lái xe", "Nhận việc, bắt đầu hoặc kết thúc chuyến, gửi minh chứng và SOS"],
      ["Lãnh đạo / quản trị", "Dashboard, báo cáo, danh mục, người dùng, vai trò và phạm vi dữ liệu"],
    ],
  });
  styleTable(table, { headerRows: 1, fontSize: 17 });
  table.rows[0].height = 48;
  for (let i = 1; i < 6; i += 1) table.rows[i].height = 56;
  addText(s, "Kiến trúc triển khai", 55, 505, 280, 32, { fontSize: 23, bold: true, color: GREEN });
  addText(s, "Web React/Vite, API NestJS, Prisma/MySQL và ứng dụng tài xế Expo/React Native", 55, 548, 1170, 58, {
    fontSize: 23, bold: true, color: INK, align: "center", valign: "middle", fill: PALE_GREEN, line: { fill: GREEN_2, width: 1 }, borderRadius: 6,
  });
  addText(s, "JWT và role guard đã có. Kiểm soát dữ liệu theo đơn vị cần tiếp tục chuẩn hóa ở từng service.", 60, 620, 1160, 36, { fontSize: 18, italic: true, color: MUTED, align: "center" });
  addFooter(s, 4);
  setNotes(s, "Nguồn: AI_PROJECT_CONTEXT.md; docs/business/ROLE_PERMISSION.md; docs/architecture/SYSTEM_OVERVIEW.md; backend/src/app.module.ts; frontend/src/App.tsx; Frontend_Driver/package.json.");
}

// 5. Detailed business operations
{
  const s = deck.slides.getItem(4);
  addTitle(s, "CÁC NGHIỆP VỤ CHÍNH NGOÀI ĐIỀU XE");
  const data = [
    ["NGHIỆP VỤ", "THAO TÁC CỤ THỂ TRÊN HỆ THỐNG", "MODULE"],
    ["Kế hoạch sản xuất", "Lập kế hoạch theo lô/công việc, phê duyệt, điều chỉnh có lý do, theo dõi tiến độ và sinh lệnh", "D"],
    ["Vận chuyển", "Khai báo hàng, tuyến, điểm lấy/giao, xếp dỡ, hành trình về bãi, đối soát và nghiệm thu", "D"],
    ["Đội xe và thiết bị", "Quản lý hồ sơ xe, phân về đội, gán tài xế, gắn/tháo nông cụ, lịch sử và khả dụng", "C"],
    ["Bảo dưỡng và sửa chữa", "Theo dõi giờ máy/ODO, lập kế hoạch BTSC, phiếu sửa chữa, phụ tùng còn nợ và bàn giao xe", "E"],
    ["Nhiên liệu", "Quản lý kho/bồn, phiếu cấp phát, định mức theo xe, chênh lệch tiêu hao và đối soát tồn", "J"],
    ["Lái xe", "Hồ sơ, GPLX/sức khỏe, ca làm, nhận việc trên mobile, tiến độ, ảnh, SOS và KPI", "I"],
    ["GPS và cảnh báo", "Vị trí hiện tại, lịch sử hành trình, cảnh báo mất tín hiệu, sai tuyến, vượt tốc, SOS và BTSC", "B, K"],
    ["Quản trị và báo cáo", "Danh mục, import/export Excel, người dùng/vai trò, phạm vi đơn vị, dashboard và báo cáo quản trị", "A, F, G, H"],
  ];
  const table = s.tables.add({ rows: data.length, columns: 3, left: 40, top: 100, width: 1200, height: 548, columnWidths: [245, 805, 150], values: data });
  styleTable(table, { headerRows: 1, fontSize: 14 });
  table.rows[0].height = 44;
  for (let i = 1; i < data.length; i += 1) table.rows[i].height = 62;
  for (let i = 1; i < data.length; i += 1) {
    table.getCell(i, 2).text.style = { typeface: FONT, fontSize: 16, bold: true, color: GREEN, alignment: "center", verticalAlignment: "middle" };
  }
  addFooter(s, 5);
  setNotes(s, "Nguồn: .agents/context/module-map.md; docs/architecture/MODULE_MAP.md; backend/src các domain production-plans, transport, vehicles, implements, maintenance, repairs, fuel, mobile-driver, alerts, driver-kpi, catalogs và dashboard; backend/prisma/schema.prisma. Các nghiệp vụ có mức độ hoàn thiện khác nhau.");
}

// 6. A-K matrix
{
  const s = deck.slides.getItem(5);
  addTitle(s, "BẢN ĐỒ MODULE A–K VÀ MỨC ĐỘ TRIỂN KHAI");
  const rows = [
    ["A", "Dashboard", "Có API tổng hợp, UI đã nối", "Đang hoàn thiện số liệu"],
    ["B", "GPS", "Telemetry, realtime, SOS", "Hybrid / cần tích hợp thiết bị"],
    ["C", "Đội xe", "Vehicle, implement, lịch sử", "Tích hợp tương đối sâu"],
    ["D", "Điều xe", "Plan, dispatch, work order", "Luồng chính đã có"],
    ["E", "BTSC", "Maintenance, repair, workshop", "Luồng chính đã có"],
    ["F", "Báo cáo", "6 trang báo cáo khởi tạo rỗng", "Khoảng trống rõ"],
    ["G", "Phân quyền", "JWT, roles, scope utilities", "Scope đơn vị chưa đồng đều"],
    ["H", "Danh mục", "Catalog API và import Excel", "Còn fallback local"],
    ["I", "Lái xe", "Web, mobile, KPI, sync", "Đang hoàn thiện đầu cuối"],
    ["J", "Nhiên liệu", "Kho, phiếu cấp phát, variance", "UI còn màn hình demo"],
    ["K", "Cảnh báo", "Alert theo nhiều domain", "Alert center còn phân tán"],
  ];
  const table = s.tables.add({
    rows: rows.length + 1, columns: 4, left: 36, top: 100, width: 1208, height: 552,
    columnWidths: [52, 190, 470, 496],
    values: [["M", "PHÂN HỆ", "BẰNG CHỨNG ĐÃ CÓ", "NHẬN ĐỊNH HIỆN TẠI"], ...rows],
  });
  styleTable(table, { headerRows: 1, fontSize: 15 });
  table.rows[0].height = 46;
  for (let i = 1; i < table.rows.length; i += 1) table.rows[i].height = 46;
  table.cells.block({ row: 1, column: 0, rowCount: rows.length, columnCount: 1 }).assign({
    fill: "#EAF2E6", textStyle: { typeface: FONT, fontSize: 16, bold: true, color: GREEN, alignment: "center" },
  });
  addFooter(s, 6);
  setNotes(s, "Nguồn: .agents/context/module-map.md; docs/architecture/MODULE_MAP.md; backend/src/app.module.ts; frontend/src/App.tsx; kiểm tra trực tiếp pages/services/schema.");
}

// 7. Dispatch creation to driver receipt
{
  const s = deck.slides.getItem(6);
  addTitle(s, "QUY TRÌNH TẠO LỆNH VÀ CHUYỂN ĐẾN TÀI XẾ");
  const data = [
    ["BƯỚC", "NGƯỜI / HỆ THỐNG", "XỬ LÝ CỤ THỂ", "KẾT QUẢ"],
    ["1. Chuẩn bị", "Admin / Điều phối / Quản lý nông trường", "Nguồn trực tiếp hoặc kế hoạch. Chọn đơn vị, đội, KLH, nông trường, vị trí, công việc, khối lượng, ca và thời gian", "Hồ sơ đúng phạm vi"],
    ["2. Nguồn lực", "Web + preparation-context", "GET nguồn lực: xe, tài xế, nông cụ + selectable + lý do khóa. Chọn 1 xe, tài xế cố định/lệnh mở và nông cụ tương thích", "Nguồn lực hợp lệ"],
    ["3. Phát hành", "Work Orders API", "POST /work-orders/manual hoặc ISSUE. Kiểm tra quyền, xung đột, availability, tương thích rồi ghi transaction", "DispatchOrder + WorkOrder + assignment + audit"],
    ["4. Đến app", "Mobile sync", "JWT → GET /mobile/sync/pull theo driverId → lưu SQLite → hiển thị Hôm nay/Tuần", "Lệnh ASSIGNED"],
    ["5. Nhận lệnh", "Ứng dụng tài xế", "Nhận nhiệm vụ → queue ORDER_ACCEPTED → POST /mobile/sync/push khi có mạng", "ACCEPTED → DRIVER_ACCEPTED + acceptedAt + KPI"],
  ];
  const table = s.tables.add({
    rows: data.length, columns: 4, left: 30, top: 94, width: 1220, height: 390,
    columnWidths: [130, 210, 650, 230], values: data,
  });
  styleTable(table, { headerRows: 1, fontSize: 11.5 });
  table.rows[0].height = 38;
  for (let i = 1; i < data.length; i += 1) table.rows[i].height = 62;
  addFooter(s, 7);
  setNotes(s, "Nguồn: frontend/src/components/dispatch/DispatchOrderForm.tsx; frontend/src/api/scheduling.ts; backend/src/work-orders/work-orders.controller.ts; backend/src/work-orders/work-orders.service.ts; backend/src/mobile-driver/mobile-sync.controller.ts; backend/src/mobile-driver/mobile-sync.service.ts; Frontend_Driver/src/syncEngine.ts; Frontend_Driver/src/screens/TaskDetailScreen.tsx. VERIFIED: pull/sync và ORDER_ACCEPTED. GAP: chưa tìm thấy thư viện hoặc service push notification hệ điều hành, và mobile UI chưa có nút cannot-accept riêng.");
}

// 8. Data integration
{
  const s = deck.slides.getItem(7);
  addTitle(s, "DỮ LIỆU VÀ TÍCH HỢP");
  const table = s.tables.add({
    rows: 6, columns: 3, left: 55, top: 120, width: 1170, height: 410,
    columnWidths: [260, 465, 445],
    values: [
      ["LỚP", "HIỆN TRẠNG", "ĐIỂM CẦN KIỂM SOÁT"],
      ["Danh mục nền", "Company, đơn vị, đội, loại xe, tuyến, công việc", "Chuẩn hóa mã và quan hệ cha–con"],
      ["Đội xe / thiết bị", "Vehicle, VehicleType, Implement, assignment", "Mapping workbook MMTB và lịch sử phân công"],
      ["Vận hành", "Plan, DispatchOrder, OperationalWorkOrder, event", "Đồng bộ nguồn lệnh và idempotency"],
      ["Hỗ trợ", "Fuel, maintenance, repair, alerts, KPI", "Quy tắc còn thiếu xác nhận nghiệp vụ"],
      ["Kênh sử dụng", "Web, mobile, realtime, import/export Excel", "Không để fallback che lỗi dữ liệu thật"],
    ],
  });
  styleTable(table, { headerRows: 1, fontSize: 17 });
  table.rows[0].height = 48;
  for (let i = 1; i < 6; i += 1) table.rows[i].height = 70;
  addText(s, "Điểm tích cực", 60, 565, 220, 30, { fontSize: 22, bold: true, color: GREEN });
  addText(s, "Schema đã mô hình hóa quan hệ vận hành và có migration/backfill gần đây.", 260, 565, 920, 34, { fontSize: 20, color: INK });
  addText(s, "Rủi ro", 60, 610, 220, 30, { fontSize: 22, bold: true, color: RED });
  addText(s, "Mapping đầy đủ giữa workbook nhiều sheet và dữ liệu chuẩn vẫn chưa được xác nhận.", 260, 610, 920, 34, { fontSize: 20, color: INK });
  addFooter(s, 8);
  setNotes(s, "Nguồn: backend/prisma/schema.prisma; backend/prisma/migrations; backend/scripts/import-*; .agents/context/database-overview.md; workbook MMTB là dữ liệu tham chiếu, không phải schema.");
}

// 9. Web experience
{
  const s = deck.slides.getItem(8);
  addTitle(s, "TRẢI NGHIỆM WEB CHO KHỐI ĐIỀU HÀNH");
  addText(s, "70", 74, 132, 210, 76, { fontSize: 56, bold: true, color: GREEN, align: "center", valign: "middle" });
  addText(s, "trang chức năng", 74, 208, 210, 40, { fontSize: 20, bold: true, color: INK, align: "center" });
  addText(s, "104", 326, 132, 210, 76, { fontSize: 56, bold: true, color: BLUE, align: "center", valign: "middle" });
  addText(s, "đường dẫn web", 326, 208, 210, 40, { fontSize: 20, bold: true, color: INK, align: "center" });
  addText(s, "49", 578, 132, 210, 76, { fontSize: 56, bold: true, color: ORANGE, align: "center", valign: "middle" });
  addText(s, "trang có dấu hiệu\nkết nối API*", 578, 208, 210, 54, { fontSize: 18, bold: true, color: INK, align: "center" });
  addText(s, "24", 830, 132, 210, 76, { fontSize: 56, bold: true, color: RED, align: "center", valign: "middle" });
  addText(s, "trang vừa dùng API\nvừa có mock/fallback*", 830, 208, 210, 54, { fontSize: 18, bold: true, color: INK, align: "center" });
  addText(s, "Trải nghiệm giao diện đã được xây dựng", 70, 322, 470, 34, { fontSize: 23, bold: true, color: GREEN });
  addBullets(s, [
    "Xem dashboard, bản đồ, danh sách xe và trạng thái vận hành",
    "Lập kế hoạch, điều xe, quản lý lệnh và theo dõi tiến độ",
    "Quản lý BTSC, nhiên liệu, lái xe, danh mục và phân quyền",
  ], 65, 360, 530, 205, { fontSize: 20 });
  addText(s, "Phần cần hoàn thiện", 670, 322, 320, 34, { fontSize: 23, bold: true, color: RED });
  addBullets(s, [
    "Loại mock và fallback khỏi các luồng vận hành quan trọng",
    "Nối dữ liệu thật cho sáu trang báo cáo đang khởi tạo rỗng",
    "Chuẩn hóa lỗi API, tách bundle và kiểm chứng dữ liệu đầu cuối",
  ], 665, 360, 530, 205, { fontSize: 20 });
  addText(s, "* Chỉ báo từ quét source code; cần audit từng trang trước khi công bố tỷ lệ hoàn tất.", 80, 610, 1100, 34, { fontSize: 17, italic: true, color: MUTED, align: "center" });
  addFooter(s, 9);
  setNotes(s, "Nguồn: frontend/src/App.tsx; frontend/src/pages; frontend/src/api; quét source code theo dấu hiệu apiClient/apiService và mock/fallback/localStorage. Sáu trang báo cáo trong frontend/src/pages/reports khởi tạo list rỗng và không gọi API trực tiếp.");
}

// 10. Mobile
{
  const s = deck.slides.getItem(9);
  addTitle(s, "TÀI XẾ NHẬN LỆNH VÀ THỰC HIỆN TRÊN MOBILE");
  addText(s, "Luồng thao tác đã có", 65, 118, 440, 36, { fontSize: 24, bold: true, color: GREEN });
  addBullets(s, [
    "Đồng bộ lệnh được giao về SQLite và hiển thị theo Hôm nay/Tuần",
    "Mở chi tiết để xem thời gian, địa điểm, xe và nội dung công việc",
    "Nhận nhiệm vụ, xác nhận nhận xe, nhập ODO/giờ máy và bắt đầu",
    "Tạm dừng, nghỉ, tiếp tục, cập nhật tiến độ và chụp ảnh minh chứng",
    "Kết thúc ngày, gửi báo cáo hoặc đề nghị nghiệm thu toàn bộ công việc",
  ], 60, 165, 570, 330, { fontSize: 20, spaceAfterPoints: 8 });
  addText(s, "Đồng bộ và ngoại lệ", 680, 118, 440, 36, { fontSize: 24, bold: true, color: BLUE });
  addBullets(s, [
    "Sự kiện được xếp hàng offline và đẩy lên /mobile/sync/push khi có mạng",
    "Ảnh được tải riêng, sự kiện SOS và báo hỏng có độ ưu tiên cao hơn",
    "Có xin điều chỉnh lịch, yêu cầu chuyển việc, báo sự cố và SOS",
    "Backend kiểm tra version/quyền sở hữu lệnh và giữ dữ liệu khi xung đột",
    "Chưa xác minh push notification nền và nút từ chối lệnh trên mobile",
  ], 675, 165, 535, 330, { fontSize: 20, spaceAfterPoints: 8 });
  addText(s, "Điểm cần kiểm chứng tại pilot", 65, 520, 340, 34, { fontSize: 23, bold: true, color: RED });
  addText(s, "Thời gian lệnh xuất hiện sau khi phát, hành vi khi mất mạng dài, xung đột đồng bộ, nhận lệnh trễ, tải ảnh và phân lại lệnh khi tài xế không thể nhận.", 65, 562, 1140, 66, {
    fontSize: 21, color: INK, align: "center", valign: "middle", fill: PALE_YELLOW, line: { fill: "#E4C45A", width: 1 }, borderRadius: 7,
  });
  addFooter(s, 10);
  setNotes(s, "Nguồn: Frontend_Driver/src/syncEngine.ts; Frontend_Driver/src/database.ts; Frontend_Driver/src/screens/TaskDetailScreen.tsx; backend/src/mobile-driver/mobile-sync.service.ts; backend/src/work-orders/work-orders.service.ts. Main backend là API mặc định của app. Repository vẫn có Backend_Driver độc lập nên cần kiểm soát nguy cơ phân kỳ.");
}

// 11. Current development progress
{
  const s = deck.slides.getItem(10);
  addTitle(s, "TIẾN ĐỘ PHÁT TRIỂN HIỆN TẠI");
  const metrics = [
    ["104", "đường dẫn web", GREEN],
    ["27", "backend controllers", BLUE],
    ["66", "Prisma models", ORANGE],
    ["170", "tests đạt", RED],
  ];
  metrics.forEach(([value, label, color], i) => {
    const x = 76 + i * 292;
    addText(s, value, x, 105, 240, 68, { fontSize: 48, bold: true, color, align: "center", valign: "middle" });
    addText(s, label, x, 170, 240, 34, { fontSize: 18, bold: true, color: INK, align: "center", valign: "middle" });
  });
  const data = [
    ["LỚP", "BẰNG CHỨNG ĐÃ CÓ", "NHẬN ĐỊNH TIẾN ĐỘ"],
    ["Web", "Bao phủ module A–K, 70 trang chức năng", "Giao diện rộng, tích hợp API chưa khép kín"],
    ["Backend", "27 controller, 28 service, transaction ở nhiều luồng", "Mô hình nghiệp vụ đã đi khá sâu"],
    ["Dữ liệu", "66 model, 85 enum, 27 migration", "Schema phong phú, mapping và backfill cần kiểm soát"],
    ["Mobile", "Nhận việc, GPS, ảnh, SOS, offline sync", "Năng lực chính đã có, cần thống nhất backend"],
    ["Phát hành", "170 test đạt và từng lớp build được", "Chưa chốt baseline production và CI"],
  ];
  const table = s.tables.add({
    rows: data.length, columns: 3, left: 52, top: 230, width: 1176, height: 360,
    columnWidths: [210, 480, 486], values: data,
  });
  styleTable(table, { headerRows: 1, fontSize: 16 });
  table.rows[0].height = 48;
  for (let i = 1; i < data.length; i += 1) table.rows[i].height = 62;
  addText(s, "Không dùng phần trăm hoàn thành vì repository chưa có tiêu chí nghiệm thu chung cho từng module.", 75, 615, 1130, 36, { fontSize: 17, italic: true, color: MUTED, align: "center" });
  addFooter(s, 23);
  setNotes(s, "Nguồn: đếm trực tiếp frontend/src/App.tsx, frontend/src/pages, backend/src, backend/prisma/schema.prisma và kết quả test. Các số liệu thể hiện độ rộng codebase, không phải phần trăm hoàn thành nghiệp vụ.");
}

// 12. Verification
{
  const s = deck.slides.getItem(11);
  addTitle(s, "KẾT QUẢ KIỂM THỬ VÀ BUILD");
  const data = [
    ["HẠNG MỤC", "KẾT QUẢ", "GHI CHÚ"],
    ["Backend Jest", "ĐẠT", "31 suites, 129 tests"],
    ["Frontend Vitest", "ĐẠT", "13 files, 37 tests"],
    ["Driver app Vitest", "ĐẠT", "1 file, 4 tests"],
    ["Prisma validate", "ĐẠT", "Schema hợp lệ"],
    ["Nest build chính", "ĐẠT", "Build trực tiếp thành công"],
    ["Web production build", "ĐẠT CÓ CẢNH BÁO", "Main JS 3.39 MB, exceljs 0.94 MB"],
    ["Driver app typecheck", "ĐẠT", "tsc --noEmit"],
    ["Driver backend build", "ĐẠT", "Nest build thành công"],
    ["Root npm run build", "CHƯA ĐẠT", "prisma generate bị khóa DLL trên Windows"],
  ];
  const table = s.tables.add({ rows: data.length, columns: 3, left: 58, top: 105, width: 1164, height: 505, columnWidths: [340, 255, 569], values: data });
  styleTable(table, { headerRows: 1, fontSize: 16 });
  table.rows[0].height = 44;
  for (let i = 1; i < data.length; i += 1) table.rows[i].height = 51;
  for (let r = 1; r < data.length; r += 1) {
    const status = data[r][1];
    const fill = status === "ĐẠT" ? "#E6F4E3" : status.includes("CẢNH BÁO") ? "#FFF1D7" : "#FFE4E4";
    const color = status === "ĐẠT" ? GREEN : status.includes("CẢNH BÁO") ? "#A95400" : RED;
    table.getCell(r, 1).fill = fill;
    table.getCell(r, 1).text.style = { typeface: FONT, fontSize: 15, bold: true, color, alignment: "center", verticalAlignment: "middle" };
  }
  addText(s, "Mã nguồn biên dịch được khi tách bước generate Prisma. Quy trình build tổng cần xử lý khóa tiến trình và chuẩn hóa CI.", 70, 625, 1140, 42, { fontSize: 18, italic: true, color: MUTED, align: "center", valign: "middle" });
  addFooter(s, 24);
  setNotes(s, "Lệnh chạy ngày 21/09/2026: npm test; backend nest build; frontend npm run build; Frontend_Driver npm run typecheck và npm test; Backend_Driver npm run build; prisma validate. Root build dừng tại EPERM rename query_engine-windows.dll.node do file đang bị tiến trình khác giữ.");
}

// 13. Risk matrix
{
  const s = deck.slides.getItem(12);
  addTitle(s, "BẤT CẬP VÀ RỦI RO ƯU TIÊN");
  const data = [
    ["RỦI RO", "BẰNG CHỨNG", "TÁC ĐỘNG", "ƯU TIÊN"],
    ["Mock/fallback trong luồng thật", "24 trang có cả dấu hiệu API và fallback*", "Sai số liệu, khó phát hiện lỗi", "P0"],
    ["Cô lập dữ liệu theo đơn vị", "Scope utility mới dùng ở một số service", "Lộ dữ liệu chéo đơn vị", "P0"],
    ["Xóa vật lý dữ liệu", "Delete/deleteMany ở catalog, vehicle, plan…", "Mất lịch sử, khó audit", "P0"],
    ["Công thức nghiệp vụ chưa chốt", "KPI, năng suất, GPS threshold còn UNKNOWN", "Kết quả báo cáo không được chấp nhận", "P1"],
    ["Hai backend mobile", "Main backend và Backend_Driver song song", "Lệch API, tăng chi phí bảo trì", "P1"],
    ["Quy trình phát hành", "Không có GitHub Actions, 325 entry thay đổi", "Khó truy vết và rollback", "P1"],
    ["Kích thước bundle", "Main JS 3.39 MB sau minify", "Tải chậm, khó dùng mạng yếu", "P2"],
  ];
  const table = s.tables.add({
    rows: data.length, columns: 4, left: 34, top: 102, width: 1212, height: 540,
    columnWidths: [270, 385, 400, 157], values: data,
  });
  styleTable(table, { headerRows: 1, fontSize: 15 });
  table.rows[0].height = 50;
  for (let i = 1; i < data.length; i += 1) table.rows[i].height = 68;
  for (let r = 1; r < data.length; r += 1) {
    const p = data[r][3];
    const fill = p === "P0" ? "#FFE1E1" : p === "P1" ? "#FFF0D3" : "#E7F0FB";
    const color = p === "P0" ? RED : p === "P1" ? "#A95400" : BLUE;
    table.getCell(r, 3).fill = fill;
    table.getCell(r, 3).text.style = { typeface: FONT, fontSize: 18, bold: true, color, alignment: "center", verticalAlignment: "middle" };
  }
  addText(s, "* Dấu hiệu từ quét source, chưa phải tỷ lệ hoàn tất chính thức.", 65, 650, 1100, 24, { fontSize: 15, italic: true, color: MUTED, align: "center" });
  addFooter(s, 25);
  setNotes(s, "Nguồn: scan source hiện tại và các tài liệu business-rule evidence. P0/P1/P2 là khuyến nghị ưu tiên của báo cáo, không phải trạng thái nghiệp vụ đã được phê duyệt.");
}

// 14. Difficulties
{
  const s = deck.slides.getItem(13);
  addTitle(s, "KHÓ KHĂN HIỆN TẠI");
  const sections = [
    ["NGHIỆP VỤ", "Chưa chốt công thức KPI, năng suất xe, ngưỡng GPS/sai tuyến, ưu tiên xe và loại minh chứng khi đổi kế hoạch."],
    ["DỮ LIỆU", "Workbook MMTB nhiều sheet, mã cũ không đồng nhất, cần mapping được duyệt và backfill có thể kiểm tra/rollback."],
    ["KỸ THUẬT", "Frontend vẫn phụ thuộc fallback. Báo cáo thiếu endpoint/mapper. Hai backend mobile có nguy cơ phân kỳ và bundle web còn lớn."],
    ["TRIỂN KHAI", "Nhiều thay đổi chưa gom baseline, chưa có CI tự động, môi trường Windows đang khóa Prisma engine khi build tổng."],
  ];
  sections.forEach(([heading, body], i) => {
    const y = 115 + i * 130;
    addText(s, heading, 62, y, 240, 46, { fontSize: 23, bold: true, color: i < 2 ? GREEN : RED, valign: "middle" });
    addRule(s, 305, y + 12, 3, i < 2 ? GREEN_2 : RED, 74);
    addText(s, body, 335, y, 855, 90, { fontSize: 21, color: INK, valign: "middle" });
  });
  addText(s, "Các khó khăn trên cần được xử lý theo thứ tự rủi ro. Việc bổ sung thêm màn hình trước khi khóa dữ liệu và quyền truy cập sẽ làm tăng chi phí sửa lại.", 72, 615, 1130, 52, {
    fontSize: 19, italic: true, color: MUTED, align: "center", valign: "middle", fill: PALE_YELLOW, line: { fill: "#E4C45A", width: 1 }, borderRadius: 7,
  });
  addFooter(s, 26);
  setNotes(s, "Nguồn: .agents/context/business-rules.md; CURRENT_SYSTEM_ANALYSIS.md; build/test output; package versions; repository status.");
}

// 15. Roadmap
{
  const s = deck.slides.getItem(14);
  addTitle(s, "LỘ TRÌNH HOÀN THIỆN ĐỀ XUẤT");
  const data = [
    ["GIAI ĐOẠN", "MỤC TIÊU", "ĐẦU RA CHÍNH"],
    ["0. Ổn định baseline\n2–3 ngày", "Chốt nhánh và build lặp lại", "Dọn working tree, thiết lập CI, xử lý Prisma lock và lập danh sách trang mock"],
    ["1. Khép kín dữ liệu/API\n1–2 tuần", "Loại gap P0 trên luồng chính", "Scope đơn vị, policy delete/audit, API báo cáo và bỏ fallback quan trọng"],
    ["2. Xác nhận nghiệp vụ\n1–2 tuần", "Chốt các rule UNKNOWN", "KPI, GPS, năng suất, ưu tiên xe, minh chứng và nghiệm thu"],
    ["3. Pilot có kiểm soát\n1 tuần", "Kiểm chứng đầu cuối tại một đơn vị", "UAT theo role, đối soát dữ liệu, offline sync và rollback/runbook"],
    ["4. Mở rộng", "Nhân rộng sau khi pilot đạt", "Theo dõi SLA, lỗi dữ liệu, hiệu năng và adoption"],
  ];
  const table = s.tables.add({
    rows: data.length, columns: 3, left: 48, top: 105, width: 1184, height: 500,
    columnWidths: [280, 350, 554], values: data,
  });
  styleTable(table, { headerRows: 1, fontSize: 16 });
  table.rows[0].height = 50;
  for (let i = 1; i < data.length; i += 1) table.rows[i].height = 90;
  addText(s, "Thời lượng là ước lượng phục vụ lập kế hoạch. Cần điều chỉnh sau khi chốt phạm vi pilot và nguồn lực thực tế.", 78, 620, 1120, 45, {
    fontSize: 18, italic: true, color: MUTED, align: "center", valign: "middle",
  });
  addFooter(s, 27);
  setNotes(s, "Đây là khuyến nghị triển khai dựa trên mức độ rủi ro quan sát được. Thời lượng chưa phải cam kết tiến độ chính thức.");
}

// 16. Closing
{
  const s = deck.slides.getItem(15);
  addText(s, "TRÂN TRỌNG CẢM ƠN", 250, 260, 780, 80, { fontSize: 48, bold: true, color: GREEN, align: "center", valign: "middle" });
  addText(s, "Ba quyết định cần chốt tiếp theo", 320, 382, 640, 38, { fontSize: 23, bold: true, color: RED, align: "center" });
  addText(s, "1. Phạm vi và đơn vị pilot   2. Quy tắc nghiệp vụ còn UNKNOWN   3. Tiêu chí nghiệm thu production", 115, 435, 1050, 55, {
    fontSize: 20, color: INK, align: "center", valign: "middle",
  });
  addText(s, "PHÒNG VẬN HÀNH SỐ\nKLH Koun Mom, Ratanakiri, Cambodia | 21.09.2026", 250, 590, 780, 56, {
    fontSize: 19, bold: true, color: GREEN, align: "center", valign: "middle",
  });
  setNotes(s, "Kết thúc báo cáo. Đề nghị dùng deck này làm tài liệu chốt scope pilot và danh sách quyết định nghiệp vụ.");
}

const diagramDefinitions = [
  {
    title: "LUỒNG NGHIỆP VỤ VẬN HÀNH TỔNG THỂ",
    lanes: ["KẾ HOẠCH VÀ ĐIỀU PHỐI", "HỆ THỐNG VÀ DỮ LIỆU", "TÀI XẾ VÀ HIỆN TRƯỜNG"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "Lập kế hoạch hoặc tạo lệnh trực tiếp" },
      { id: "b", lane: 1, row: 0, text: "Kiểm tra phạm vi, lịch và nguồn lực" },
      { id: "c", lane: 0, row: 1, text: "Duyệt và phát hành lệnh" },
      { id: "d", lane: 1, row: 1, text: "Ghi WorkOrder, phân công, sự kiện và audit" },
      { id: "e", lane: 2, row: 1, text: "Đồng bộ lệnh và xác nhận nhận việc" },
      { id: "f", lane: 2, row: 2, text: "Thực hiện, cập nhật tiến độ, ODO và minh chứng" },
      { id: "g", lane: 1, row: 2, type: "decision", text: "NGHIỆM THU ĐẠT?" },
      { id: "h", lane: 0, row: 3, type: "end", text: "Dashboard, KPI, cảnh báo và báo cáo" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "right", toSide: "left" },
      { from: "b", to: "c", fromSide: "left", toSide: "right" },
      { from: "c", to: "d", fromSide: "right", toSide: "left" },
      { from: "d", to: "e", fromSide: "right", toSide: "left" },
      { from: "e", to: "f", fromSide: "bottom", toSide: "top" },
      { from: "f", to: "g", fromSide: "left", toSide: "right" },
      { from: "g", to: "h", fromSide: "left", toSide: "right", label: "Đạt", labelLeft: 388, labelTop: 520 },
    ],
    note: "Mỗi chuyển trạng thái chính phải để lại người thực hiện, thời điểm, lý do và dữ liệu liên quan.",
    sources: "Nguồn: docs/business/DISPATCH_ORDER_FLOW.md; ACCEPTANCE_FLOW.md; backend/prisma/schema.prisma; backend/src/work-orders; backend/src/mobile-driver.",
  },
  {
    title: "KẾ HOẠCH SẢN XUẤT ĐẾN LỆNH THỰC HIỆN",
    lanes: ["NÔNG TRƯỜNG", "HỆ THỐNG", "ĐIỀU PHỐI"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "Tạo kế hoạch, hạng mục, lô và khối lượng" },
      { id: "b", lane: 0, row: 1, text: "Trình duyệt kế hoạch" },
      { id: "c", lane: 1, row: 1, type: "decision", text: "DUYỆT KẾ HOẠCH?" },
      { id: "d", lane: 1, row: 2, text: "Tạo ProductionOrder và generationKey" },
      { id: "e", lane: 2, row: 2, text: "Sinh lệnh điều xe hoặc vận chuyển" },
      { id: "f", lane: 2, row: 3, text: "Cập nhật tiến độ lô và sản lượng" },
      { id: "g", lane: 1, row: 3, type: "decision", text: "CẦN ĐIỀU CHỈNH?\nCó: ghi lý do, trình lại", fontSize: 13.5 },
      { id: "h", lane: 0, row: 3, type: "end", text: "Hoàn thành hoặc quyết toán kế hoạch" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "bottom", toSide: "top" },
      { from: "b", to: "c", fromSide: "right", toSide: "left" },
      { from: "c", to: "d", fromSide: "bottom", toSide: "top", label: "Có", labelLeft: 724, labelTop: 374 },
      { from: "d", to: "e", fromSide: "right", toSide: "left" },
      { from: "e", to: "f", fromSide: "bottom", toSide: "top" },
      { from: "f", to: "g", fromSide: "left", toSide: "right" },
      { from: "g", to: "h", fromSide: "left", toSide: "right", label: "Không", labelLeft: 396, labelTop: 546 },
    ],
    note: "Điều chỉnh kế hoạch có thể hủy các lệnh sinh tự động chưa bắt đầu và ghi audit thay đổi.",
    sources: "Nguồn: backend/src/production-plans/production-plans.controller.ts; production-plans.service.ts; schema.prisma PlanStatus, PlotStatus.",
  },
  {
    title: "TẠO LỆNH VÀ CHUYỂN LỆNH ĐẾN TÀI XẾ",
    lanes: ["ĐIỀU PHỐI", "BACKEND", "ỨNG DỤNG TÀI XẾ"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "1. Chọn đội, công việc, vị trí, ca và thời gian" },
      { id: "b", lane: 1, row: 0, text: "2. GET preparation-context trả xe, tài xế, nông cụ và lý do khóa" },
      { id: "c", lane: 0, row: 1, text: "3. Chọn một xe, tài xế cố định hoặc lệnh mở" },
      { id: "d", lane: 1, row: 1, type: "decision", text: "4. NGUỒN LỰC HỢP LỆ?\nKhông: chọn lại" },
      { id: "e", lane: 1, row: 2, text: "5. ISSUE ghi DispatchOrder, WorkOrder, assignment, event và audit" },
      { id: "f", lane: 2, row: 2, text: "6. Đồng bộ lệnh về SQLite và hiển thị trên ứng dụng" },
      { id: "g", lane: 2, row: 3, type: "end", text: "7. Nhận nhiệm vụ, gửi ORDER_ACCEPTED khi có mạng" },
      { id: "h", lane: 0, row: 3, text: "Ngoại lệ: phân lại khi tài xế không thể nhận", fill: "#FCE8E6" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "b", to: "c", fromSide: "left", toSide: "right" },
      { from: "c", to: "d", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "d", to: "e", fromSide: "bottom", toSide: "top", kind: "straight", label: "Có", labelLeft: 720, labelTop: 380 },
      { from: "e", to: "f", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "f", to: "g", fromSide: "bottom", toSide: "top", kind: "straight" },
      { from: "g", to: "h", fromSide: "left", toSide: "right", kind: "straight", dashed: true },
    ],
    note: "Hiện trạng code: lệnh đến ứng dụng qua đồng bộ pull. Chưa thấy cơ chế push notification của hệ điều hành.",
    noteColor: RED,
    sources: "Nguồn: DispatchOrderForm.tsx; scheduling.ts; work-orders.service.ts; mobile-sync.service.ts; Frontend_Driver/src/syncEngine.ts.",
  },
  {
    title: "TÀI XẾ THỰC HIỆN VÀ NGHIỆM THU CÔNG VIỆC",
    lanes: ["TÀI XẾ", "HỆ THỐNG", "NGƯỜI NGHIỆM THU"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "1. Nhận lệnh và bắt đầu phiên làm việc" },
      { id: "b", lane: 0, row: 1, text: "2. Nhập ODO hoặc giờ máy, cập nhật tiến độ và ảnh" },
      { id: "c", lane: 1, row: 1, text: "3. Lưu WorkSession, progress, break và event" },
      { id: "d", lane: 0, row: 2, text: "4. Kết thúc và gửi đề nghị nghiệm thu" },
      { id: "e", lane: 1, row: 2, text: "5. Tạo WorkAcceptance PENDING" },
      { id: "f", lane: 2, row: 2, type: "decision", text: "6. KẾT QUẢ ĐẠT?" },
      { id: "g", lane: 2, row: 3, type: "end", text: "7A. APPROVED, ACCEPTED, sau đó CLOSED" },
      { id: "h", lane: 1, row: 3, text: "7B. REWORK_REQUIRED, trả lại IN_PROGRESS" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "bottom", toSide: "top", kind: "straight" },
      { from: "b", to: "c", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "c", to: "d", fromSide: "left", toSide: "right" },
      { from: "d", to: "e", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "e", to: "f", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "f", to: "g", fromSide: "bottom", toSide: "top", kind: "straight", label: "Đạt", labelLeft: 1110, labelTop: 500 },
      { from: "f", to: "h", fromSide: "left", toSide: "right", kind: "straight", label: "Làm lại", labelLeft: 808, labelTop: 477 },
    ],
    note: "Nghiệm thu phải giữ người duyệt, thời điểm, minh chứng và lý do yêu cầu làm lại.",
    sources: "Nguồn: docs/business/ACCEPTANCE_FLOW.md; backend/src/work-orders; schema.prisma WorkAcceptanceStatus, WorkSessionStatus.",
  },
  {
    title: "VẬN CHUYỂN HÀNG HÓA VÀ GIAO NHẬN",
    lanes: ["ĐIỀU PHỐI", "TÀI XẾ", "HỆ THỐNG VÀ NƠI NHẬN"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "1. Tạo vận đơn và ít nhất một dòng hàng" },
      { id: "b", lane: 0, row: 1, text: "2. Trình duyệt, phê duyệt và phân xe, tài xế" },
      { id: "c", lane: 1, row: 1, text: "3. Nhận lệnh, đến điểm lấy và bốc hàng" },
      { id: "d", lane: 1, row: 2, text: "4. Rời điểm lấy, đang vận chuyển, gửi telemetry" },
      { id: "e", lane: 2, row: 2, type: "decision", text: "5. LỆCH TUYẾN HOẶC QUÁ TỐC?\nCó: tạo cảnh báo", fontSize: 13.5 },
      { id: "f", lane: 1, row: 3, text: "6. Đến điểm giao, dỡ hàng và xác nhận đã giao" },
      { id: "g", lane: 2, row: 3, type: "end", text: "7. Nơi nhận xác nhận, hoàn tất và giải phóng nguồn lực" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "bottom", toSide: "top", kind: "straight" },
      { from: "b", to: "c", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "c", to: "d", fromSide: "bottom", toSide: "top", kind: "straight" },
      { from: "d", to: "e", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "e", to: "f", fromSide: "left", toSide: "right", label: "Tiếp tục", labelLeft: 810, labelTop: 513 },
      { from: "f", to: "g", fromSide: "right", toSide: "left", kind: "straight" },
    ],
    note: "Trạng thái chính: DRAFT, APPROVED, ASSIGNED, DRIVER_ACCEPTED, AT_PICKUP, IN_TRANSIT, DELIVERED, ACCEPTED, COMPLETED.",
    sources: "Nguồn: backend/src/transport/transport.controller.ts; transport.service.ts; schema.prisma TransportStatus; internal-feed module.",
  },
  {
    title: "QUẢN LÝ ĐỘI XE, TÀI XẾ VÀ NÔNG CỤ",
    lanes: ["QUẢN TRỊ DANH MỤC", "QUẢN LÝ ĐỘI XE", "ĐIỀU PHỐI VẬN HÀNH"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "1. Khai báo loại xe, xe, nông cụ và thông số kỹ thuật" },
      { id: "b", lane: 1, row: 0, text: "2. Gán xe và nông cụ vào đơn vị quản lý cơ giới" },
      { id: "c", lane: 1, row: 1, text: "3. Phân tài xế chính hoặc phụ, lưu thời gian hiệu lực" },
      { id: "d", lane: 1, row: 2, type: "decision", text: "4. NÔNG CỤ TƯƠNG THÍCH VÀ TỐT?\nKhông: không cho gắn", fontSize: 13.5 },
      { id: "e", lane: 1, row: 3, text: "5. Gắn nông cụ vào xe, tạo attachment log" },
      { id: "f", lane: 2, row: 1, text: "6. Đưa nguồn lực vào preparation-context" },
      { id: "g", lane: 2, row: 2, text: "7. Điều xe theo trạng thái và lịch rảnh" },
      { id: "h", lane: 2, row: 3, type: "end", text: "8. Tháo nông cụ hoặc kết thúc phân công, giữ lịch sử" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "b", to: "c", fromSide: "bottom", toSide: "top", kind: "straight" },
      { from: "c", to: "d", fromSide: "bottom", toSide: "top", kind: "straight" },
      { from: "d", to: "e", fromSide: "bottom", toSide: "top", kind: "straight", label: "Có", labelLeft: 720, labelTop: 501 },
      { from: "c", to: "f", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "f", to: "g", fromSide: "bottom", toSide: "top", kind: "straight" },
      { from: "g", to: "h", fromSide: "bottom", toSide: "top", kind: "straight" },
      { from: "e", to: "h", fromSide: "right", toSide: "left", kind: "straight" },
    ],
    note: "Xe thanh lý lưu TAM_DUNG, không có đơn vị quản lý và không xuất hiện như nguồn lực điều xe.",
    sources: "Nguồn: docs/business/VEHICLE_FLOW.md; vehicles.service.ts; implements.service.ts; vehicle-driver-assignments.service.ts.",
  },
  {
    title: "BẢO DƯỠNG ĐỊNH KỲ VÀ SỬA CHỮA",
    lanes: ["TÀI XẾ VÀ TELEMETRY", "XƯỞNG BTSC", "HỆ THỐNG"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "1. Nộp checklist BDC1 và cập nhật ODO hoặc giờ máy" },
      { id: "b", lane: 2, row: 0, text: "2. Tính mốc bảo dưỡng, phân tầng Xanh, Vàng, Đỏ" },
      { id: "c", lane: 1, row: 1, text: "3. Tạo phiếu BDC2 hoặc tiếp nhận phiếu sửa chữa" },
      { id: "d", lane: 1, row: 2, text: "4. Đánh giá, lập kế hoạch, thực hiện và cập nhật chi phí" },
      { id: "e", lane: 2, row: 2, type: "decision", text: "5. THIẾU PHỤ TÙNG?\nCó: WAITING_PARTS", fontSize: 13.5 },
      { id: "f", lane: 1, row: 3, text: "6. Sẵn sàng nghiệm thu, bàn giao và hoàn tất" },
      { id: "g", lane: 2, row: 3, type: "end", text: "7. Đóng mốc và cập nhật trạng thái xe. Đủ điều kiện thì CHO_PHAN_CONG" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "b", to: "c", fromSide: "left", toSide: "right" },
      { from: "c", to: "d", fromSide: "bottom", toSide: "top", kind: "straight" },
      { from: "d", to: "e", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "e", to: "f", fromSide: "left", toSide: "right", label: "Đủ phụ tùng", labelLeft: 790, labelTop: 516, labelWidth: 100 },
      { from: "f", to: "g", fromSide: "right", toSide: "left", kind: "straight" },
    ],
    note: "Khi bảo dưỡng phát hiện hư hỏng, hệ thống có thể tạo tiếp phiếu sửa chữa và giữ xe ở trạng thái không sẵn sàng.",
    sources: "Nguồn: maintenance.controller.ts; maintenance.service.ts; repairs.controller.ts; workshop workflow; schema.prisma WorkshopRequestStatus.",
  },
  {
    title: "CẤP PHÁT VÀ ĐỐI SOÁT NHIÊN LIỆU",
    lanes: ["XE VÀ LỆNH", "THỦ KHO NHIÊN LIỆU", "HỆ THỐNG VÀ BÁO CÁO"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "1. Xác định xe, công việc và định mức áp dụng" },
      { id: "b", lane: 1, row: 0, text: "2. Chọn kho hoặc bồn, quét mã và nhập số lít thực cấp" },
      { id: "c", lane: 2, row: 1, type: "decision", text: "3. TỒN KHO ĐỦ?\nKhông: dừng cấp", fontSize: 13.5 },
      { id: "d", lane: 2, row: 2, text: "4. Ghi phiếu cấp phát và trừ tồn kho trong transaction" },
      { id: "e", lane: 2, row: 3, type: "decision", text: "5. VƯỢT ĐỊNH MỨC TRÊN 5%?\nCó: tạo cảnh báo", fontSize: 13.5 },
      { id: "f", lane: 1, row: 3, text: "6. Đối soát actual, quota, variance và người cấp" },
      { id: "g", lane: 0, row: 3, type: "end", text: "7. Báo cáo tiêu hao, tồn kho và cảnh báo vượt mức" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "right", toSide: "left", kind: "straight" },
      { from: "b", to: "c", fromSide: "right", toSide: "left" },
      { from: "c", to: "d", fromSide: "bottom", toSide: "top", kind: "straight", label: "Có", labelLeft: 1110, labelTop: 379 },
      { from: "d", to: "e", fromSide: "bottom", toSide: "top", kind: "straight" },
      { from: "e", to: "f", fromSide: "left", toSide: "right", kind: "straight" },
      { from: "f", to: "g", fromSide: "left", toSide: "right", kind: "straight" },
    ],
    note: "Ngưỡng vượt 5% là hành vi đang được cài trong FuelService, cần xác nhận lại trước khi áp dụng chính thức.",
    noteColor: RED,
    sources: "Nguồn: backend/src/fuel/fuel.controller.ts; fuel.service.ts; schema.prisma FuelDispenseTicket, FuelWarehouse.",
  },
  {
    title: "GPS, CẢNH BÁO VẬN HÀNH VÀ SOS",
    lanes: ["XE VÀ TÀI XẾ", "BỘ MÁY CẢNH BÁO", "QUẢN LÝ VÀ XƯỞNG"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "Gửi vị trí, tốc độ, tuyến và thời điểm GPS" },
      { id: "b", lane: 1, row: 0, type: "decision", text: "CÓ VI PHẠM HOẶC MẤT DỮ LIỆU?" },
      { id: "c", lane: 1, row: 1, text: "Tạo cảnh báo quá tốc độ, lệch tuyến hoặc xe chạy không lệnh" },
      { id: "d", lane: 0, row: 2, text: "Tài xế bấm SOS, gửi GPS, mô tả và ảnh" },
      { id: "e", lane: 1, row: 2, text: "Transaction tạo SOS alert và yêu cầu sửa chữa" },
      { id: "f", lane: 2, row: 2, text: "Tiếp nhận, chuyển IN_PROGRESS và điều phối xử lý" },
      { id: "g", lane: 2, row: 3, type: "decision", text: "SỰ CỐ ĐÃ XỬ LÝ?" },
      { id: "h", lane: 1, row: 3, type: "end", text: "RESOLVED, bỏ dedupe key và lưu lịch sử" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "right", toSide: "left" },
      { from: "b", to: "c", fromSide: "bottom", toSide: "top", label: "Có", labelLeft: 720, labelTop: 255 },
      { from: "d", to: "e", fromSide: "right", toSide: "left" },
      { from: "c", to: "f", fromSide: "right", toSide: "left" },
      { from: "e", to: "f", fromSide: "right", toSide: "left" },
      { from: "f", to: "g", fromSide: "bottom", toSide: "top" },
      { from: "g", to: "h", fromSide: "left", toSide: "right", label: "Có", labelLeft: 809, labelTop: 557 },
    ],
    note: "Chu kỳ gửi GPS 30 giây chưa được xác nhận thống nhất. Không trình bày đây là quy tắc production đã chốt.",
    noteColor: RED,
    sources: "Nguồn: alerts.service.ts; vehicles.service.ts; mobile-driver.service.ts; .agents/context/business-rules.md.",
  },
  {
    title: "QUẢN LÝ TÀI XẾ VÀ TÍNH KPI",
    lanes: ["QUẢN LÝ NHÂN SỰ", "VẬN HÀNH", "KPI VÀ TÀI XẾ"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "Tạo tài khoản DRIVER và hồ sơ giấy phép, sức khỏe" },
      { id: "b", lane: 0, row: 1, text: "Gán đơn vị, ca và xe chính hoặc phụ" },
      { id: "c", lane: 1, row: 1, text: "Ghi sự kiện ASSIGNED, ACCEPTED, tiến độ và hoàn thành" },
      { id: "d", lane: 1, row: 2, text: "Ghi CANNOT_ACCEPT, REASSIGNED và kết quả nghiệm thu" },
      { id: "e", lane: 2, row: 2, text: "Tổng hợp số chuyến, km, giờ máy và tiết kiệm dầu" },
      { id: "f", lane: 2, row: 3, type: "decision", text: "ĐỦ DỮ LIỆU KỲ KPI?" },
      { id: "g", lane: 1, row: 3, text: "Tính điểm, xếp hạng và thưởng theo code hiện tại" },
      { id: "h", lane: 0, row: 3, type: "end", text: "Tài xế xem KPI cá nhân, quản lý xem leaderboard" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "bottom", toSide: "top" },
      { from: "b", to: "c", fromSide: "right", toSide: "left" },
      { from: "c", to: "d", fromSide: "bottom", toSide: "top" },
      { from: "d", to: "e", fromSide: "right", toSide: "left" },
      { from: "e", to: "f", fromSide: "bottom", toSide: "top" },
      { from: "f", to: "g", fromSide: "left", toSide: "right", label: "Có", labelLeft: 809, labelTop: 557 },
      { from: "g", to: "h", fromSide: "left", toSide: "right" },
    ],
    note: "Code đang chia bốn nhóm 25 điểm. Công thức quy đổi và ngưỡng thưởng chính thức vẫn cần chủ nghiệp vụ xác nhận.",
    noteColor: RED,
    sources: "Nguồn: DRIVER_FLOW.md; driver-kpi.controller.ts; driver-kpi.service.ts; schema.prisma DriverKpiEventType.",
  },
  {
    title: "DANH MỤC DÙNG CHUNG VÀ PHÂN QUYỀN",
    lanes: ["QUẢN TRỊ HỆ THỐNG", "XÁC THỰC VÀ PHẠM VI", "CÁC PHÂN HỆ NGHIỆP VỤ"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "Khai báo công ty, đơn vị, đội, loại xe, công việc, lô và tuyến" },
      { id: "b", lane: 0, row: 1, text: "Import preview, kiểm tra lỗi và commit danh mục" },
      { id: "c", lane: 0, row: 2, text: "Tạo người dùng, vai trò và phân công đơn vị quản lý" },
      { id: "d", lane: 1, row: 1, text: "Đăng nhập JWT và kiểm tra RolesGuard" },
      { id: "e", lane: 1, row: 2, type: "decision", text: "ĐƯỢC PHÉP TRUY CẬP PHẠM VI?" },
      { id: "f", lane: 2, row: 2, text: "Lọc dữ liệu và nguồn lực theo management unit" },
      { id: "g", lane: 2, row: 3, text: "Các module dùng cùng mã và quan hệ tham chiếu" },
      { id: "h", lane: 1, row: 3, type: "end", text: "Audit thao tác thay đổi dữ liệu quan trọng" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "bottom", toSide: "top" },
      { from: "b", to: "c", fromSide: "bottom", toSide: "top" },
      { from: "b", to: "d", fromSide: "right", toSide: "left" },
      { from: "c", to: "e", fromSide: "right", toSide: "left" },
      { from: "d", to: "e", fromSide: "bottom", toSide: "top" },
      { from: "e", to: "f", fromSide: "right", toSide: "left", label: "Có", labelLeft: 818, labelTop: 433 },
      { from: "f", to: "g", fromSide: "bottom", toSide: "top" },
      { from: "g", to: "h", fromSide: "left", toSide: "right" },
    ],
    note: "Khoảng trống hiện tại: quyền theo role đã có nhưng cách ly dữ liệu theo đơn vị chưa đồng nhất ở mọi service.",
    noteColor: RED,
    sources: "Nguồn: ROLE_PERMISSION.md; catalogs modules; auth and RolesGuard; common/utils/management-scope; .agents/context/business-rules.md.",
  },
  {
    title: "DASHBOARD, BÁO CÁO VÀ XỬ LÝ NGOẠI LỆ",
    lanes: ["DỮ LIỆU NGHIỆP VỤ", "TỔNG HỢP VÀ CHỈ SỐ", "NGƯỜI ĐIỀU HÀNH"],
    nodes: [
      { id: "a", lane: 0, row: 0, type: "start", text: "Lệnh, GPS, nhiên liệu, BTSC, KPI và cảnh báo phát sinh" },
      { id: "b", lane: 1, row: 0, text: "API tổng hợp theo thời gian, đơn vị và trạng thái" },
      { id: "c", lane: 1, row: 1, text: "Tạo overview, live fleet, manager view và statistics" },
      { id: "d", lane: 2, row: 1, text: "Theo dõi đội xe, tiến độ, tiêu hao, sự cố và năng suất" },
      { id: "e", lane: 2, row: 2, type: "decision", text: "CÓ CHỈ SỐ BẤT THƯỜNG?" },
      { id: "f", lane: 1, row: 2, text: "Mở chi tiết lệnh, xe, cảnh báo hoặc phiếu xưởng" },
      { id: "g", lane: 0, row: 3, text: "Bổ sung dữ liệu, xử lý ngoại lệ và cập nhật trạng thái" },
      { id: "h", lane: 2, row: 3, type: "end", text: "Xuất báo cáo và theo dõi kết quả xử lý" },
    ],
    edges: [
      { from: "a", to: "b", fromSide: "right", toSide: "left" },
      { from: "b", to: "c", fromSide: "bottom", toSide: "top" },
      { from: "c", to: "d", fromSide: "right", toSide: "left" },
      { from: "d", to: "e", fromSide: "bottom", toSide: "top" },
      { from: "e", to: "f", fromSide: "left", toSide: "right", label: "Có", labelLeft: 809, labelTop: 437 },
      { from: "f", to: "g", fromSide: "left", toSide: "right" },
      { from: "g", to: "h", fromSide: "right", toSide: "left" },
      { from: "e", to: "h", fromSide: "bottom", toSide: "top", dashed: true, label: "Không", labelLeft: 1111, labelTop: 509 },
    ],
    note: "Một số màn hình frontend vẫn có dữ liệu demo hoặc fallback. Chỉ số cần đối chiếu API trước khi dùng làm báo cáo chính thức.",
    noteColor: RED,
    sources: "Nguồn: dashboard.controller.ts; dashboard.service.ts; alerts.service.ts; frontend pages and API mappings; .agents/context/module-map.md.",
  },
];

diagramDefinitions.forEach((definition, index) => {
  renderSwimlane(diagramSlides[index], definition, 11 + index);
});

diagramSlides.forEach((slide, index) => slide.moveTo(10 + index));

await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
const candidatePath = path.join(stagingDir, "fleet-progress-candidate-final.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);

const sourceBytes = await fs.readFile(sourceTemplatePath);
const sourceSha256 = crypto.createHash("sha256").update(sourceBytes).digest("hex");
const requirements = {
  workspaceDir,
  candidatePath,
  finalPath,
  explicitTotalSlideCount: 28,
  requiredNativeTableOwnerSlides: [4, 5, 6, 7, 8, 23, 24, 25, 27],
  requiredNativeChartOwnerSlides: [],
  sourceTemplatePath,
  requiredTemplateReferenceSlides: Array.from({ length: 16 }, (_, i) => i + 1),
  minimumTemplateCoverageRatio: 0.1785,
  requireExactTemplateDimensions: true,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
    ...[4, 5, 6, 7, 8, 23, 24, 25, 27].flatMap((number) => ["--require-native-table-slide", String(number)]),
  ],
  fontPolicy: {
    basis: "design",
    families: [FONT, "Calibri"],
  },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, `${path.basename(finalPath)}.validation.json`),
};

const result = await finalizePresentation(requirements);
console.log(JSON.stringify({ finalPath, result }, null, 2));
