import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const deck = await PresentationFile.importPptx(await FileBlob.load("D:/ThacoAgri_TaiLieu/TaiLieu/VMS_Gioi_thieu_phan_mem_v1 (1).pptx"));
const first = deck.slides.getItem(0);
console.log("COLLECTION PROTOTYPES", {
  shapes: Object.getOwnPropertyNames(Object.getPrototypeOf(first.shapes)),
  images: Object.getOwnPropertyNames(Object.getPrototypeOf(first.images)),
  tables: Object.getOwnPropertyNames(Object.getPrototypeOf(first.tables)),
  charts: Object.getOwnPropertyNames(Object.getPrototypeOf(first.charts)),
});
for (let i = 0; i < deck.slides.items.length; i += 1) {
  const slide = deck.slides.getItem(i);
  console.log(i + 1, {
    slideKeys: Object.keys(slide),
    shapes: slide.shapes?.items?.length,
    images: slide.images?.items?.length,
    tables: slide.tables?.items?.length,
    charts: slide.charts?.items?.length,
    shapeNames: slide.shapes?.items?.map((x) => x.name),
    imageNames: slide.images?.items?.map((x) => x.name),
    tableNames: slide.tables?.items?.map((x) => x.name),
  });
}
