import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const deck = await PresentationFile.importPptx(await FileBlob.load(
  "D:/ThacoAgri_TaiLieu/TaiLieu/VMS_Gioi_thieu_phan_mem_v1 (1).pptx",
));
for (const query of [
  "shape.delete|image.delete|table.delete|chart.delete|slide.delete|slides.delete|collection items",
  "textFrame paragraphs runs paragraph formatting bullets",
  "table cells text fontSize anchor margins",
  "slide.tables deleteAll table.delete slide.images deleteAll slide.charts deleteAll",
]) {
  const result = deck.help("*", {
    search: query,
    include: ["index", "examples", "notes"],
    maxChars: 14000,
  });
  console.log(`\n=== ${query} ===\n${result.ndjson}`);
}
