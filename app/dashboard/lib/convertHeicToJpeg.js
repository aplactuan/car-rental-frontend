/**
 * Detect HEIC/HEIF from MIME type or file extension.
 * iOS often leaves type empty and relies on the .heic/.heif suffix.
 */
export function isHeicFile(file) {
  if (!file) return false;

  const type = String(file.type || "").toLowerCase();
  if (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence"
  ) {
    return true;
  }

  return /\.(heic|heif)$/i.test(String(file.name || ""));
}

function jpegFileName(originalName) {
  const base = String(originalName || "photo")
    .replace(/\.(heic|heif)$/i, "")
    .trim();
  const safeBase = base || "photo";
  return /\.jpe?g$/i.test(safeBase) ? safeBase : `${safeBase}.jpg`;
}

/**
 * Convert a single HEIC/HEIF File to a JPEG File.
 * Non-HEIC files are returned unchanged.
 */
export async function convertHeicToJpeg(file) {
  if (!isHeicFile(file)) return file;

  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;

  return new File([blob], jpegFileName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * Convert any HEIC/HEIF entries in a File list to JPEG.
 */
export async function convertFilesHeicToJpeg(files) {
  const list = Array.isArray(files) ? files : [];
  return Promise.all(list.map((file) => convertHeicToJpeg(file)));
}
