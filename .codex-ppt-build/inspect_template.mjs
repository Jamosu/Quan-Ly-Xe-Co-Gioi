import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const sourcePath = "D:/ThacoAgri_TaiLieu/TaiLieu/VMS_Gioi_thieu_phan_mem_v1 (1).pptx";
const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePath));
const snapshot = await presentation.inspect({
  kind: "deck,slide,textbox,shape,image,table,chart,notes,layout",
  include: "id,slide,name,title,textPreview,textChars,textLines,bbox,bboxUnit,rows,cols,alt,isPlaceholder,placeholders",
  maxChars: 50000,
});

console.log(JSON.stringify({
  slideCount: presentation.slides.length,
  slideSize: presentation.slideSize,
  masters: presentation.masters.items.map((master) => ({
    id: master.id,
    name: master.name,
    background: master.background,
  })),
  layouts: presentation.layouts.items.map((layout) => ({
    id: layout.id,
    name: layout.name,
    placeholders: layout.placeholders.summary(),
  })),
}, null, 2));
console.log(snapshot.ndjson);
