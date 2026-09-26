/**
 * Reads an uploaded image, scales it down to fit `maxDim` pixels and returns
 * it as a data URL, so pictures in questions stay small enough to store and
 * load quickly on phones. PNGs (diagrams, transparency) stay PNG, photos
 * become JPEG, and SVGs are kept as they are. In production the file goes
 * to storage and the question keeps its URL.
 */
export async function imageToDataUrl(file: File, maxDim = 1200): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  if (file.type === "image/svg+xml") return raw;
  const img = new Image();
  img.src = raw;
  await img.decode();
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 400_000) return raw;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return file.type === "image/png" || file.type === "image/gif" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
}

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
export const isImageFile = (f: File) => /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(f.type);
