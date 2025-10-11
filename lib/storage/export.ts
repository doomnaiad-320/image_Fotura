import JSZip from "jszip";
import { getDB, HistoryStore } from "./indexeddb";

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "bin";
}

export async function exportAllToZip(): Promise<Blob> {
  const zip = new JSZip();
  const db = await getDB();
  const history = await db.getHistory(10000, 0);
  const imagesFolder = zip.folder("images");

  const manifest: Omit<HistoryStore, "serverImageId">[] = [];

  for (const h of history) {
    const blob = await db.getImage(h.imageId);
    if (!blob) continue;
    const ext = extFromMime(blob.type || "application/octet-stream");
    const fileName = `${h.imageId}.${ext}`;
    imagesFolder?.file(fileName, blob);
    manifest.push({ ...h });
  }

  zip.file("manifest.json", JSON.stringify({ version: 1, count: manifest.length, items: manifest }, null, 2));
  return zip.generateAsync({ type: "blob" });
}

export async function importFromZip(file: File): Promise<{ imported: number }>{
  const db = await getDB();
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("manifest.json 缺失");
  const manifestText = await manifestFile.async("string");
  const manifest = JSON.parse(manifestText) as { items: HistoryStore[] };

  let imported = 0;
  for (const item of manifest.items) {
    const imgEntry = zip.file(`images/${item.imageId}.png`) || zip.file(`images/${item.imageId}.jpg`) || zip.file(`images/${item.imageId}.jpeg`) || zip.file(`images/${item.imageId}.webp`) || zip.file(`images/${item.imageId}.bin`);
    if (!imgEntry) continue;
    const blob = await imgEntry.async("blob");

    // 生成新ID，避免与现有冲突
    const newImageId = await db.saveImage(blob);

    const newHistory: HistoryStore = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      imageId: newImageId,
      timestamp: Date.now(),
      shared: false,
      favorite: Boolean(item.favorite)
    };
    await db.saveHistory(newHistory);
    imported++;
  }
  return { imported };
}
