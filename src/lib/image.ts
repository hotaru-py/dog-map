/**
 * Shrinks a picked image to a JPEG data URL so it fits in localStorage / a JSON
 * request. Swap this for a real upload (S3, Supabase Storage, ...) when you
 * have one; the rest of the app only needs a URL back.
 */
export async function fileToResizedDataUrl(
  file: File,
  maxSize = 900,
  quality = 0.78
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
