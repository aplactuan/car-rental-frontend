import { convertHeicToJpeg, isHeicFile } from "@/app/dashboard/lib/convertHeicToJpeg";

const DEFAULT_MAX_EDGE = 1920;
const DEFAULT_QUALITY = 0.82;
/** Re-encode when larger than this so camera/HEIC uploads stay under proxy limits. */
const COMPRESS_THRESHOLD_BYTES = 1.5 * 1024 * 1024;

function jpegFileName(originalName) {
  const base = String(originalName || "photo")
    .replace(/\.(heic|heif|jpe?g|png|webp|gif|bmp|tiff?)$/i, "")
    .trim();
  const safeBase = base || "photo";
  return /\.jpe?g$/i.test(safeBase) ? safeBase : `${safeBase}.jpg`;
}

function isLikelyImageFile(file) {
  if (!file) return false;
  if (isHeicFile(file)) return true;

  const type = String(file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;

  return /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif)$/i.test(
    String(file.name || ""),
  );
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image for upload."));
    };
    img.src = url;
  });
}

/**
 * Decode via the browser (Safari can decode HEIC natively), resize, and
 * re-encode as JPEG. This both converts HEIC and shrinks large camera shots.
 */
async function resizeImageToJpeg(
  file,
  { maxEdge = DEFAULT_MAX_EDGE, quality = DEFAULT_QUALITY } = {},
) {
  const img = await loadImageElement(file);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) {
    throw new Error("Image has invalid dimensions.");
  }

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context.");
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Could not encode JPEG for upload.")),
      "image/jpeg",
      quality,
    );
  });

  return new File([blob], jpegFileName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * Prepare a single file for upload: convert HEIC/HEIF and compress large images.
 * Non-image files are returned unchanged.
 */
export async function prepareImageForUpload(file, options = {}) {
  if (!isLikelyImageFile(file)) return file;

  const {
    maxEdge = DEFAULT_MAX_EDGE,
    quality = DEFAULT_QUALITY,
    forceCompress = false,
  } = options;

  // Prefer native decode+canvas (works for HEIC on Safari camera captures).
  try {
    if (forceCompress || isHeicFile(file) || file.size > COMPRESS_THRESHOLD_BYTES) {
      return await resizeImageToJpeg(file, { maxEdge, quality });
    }
    return file;
  } catch (nativeError) {
    if (!isHeicFile(file)) throw nativeError;
  }

  // Fallback when the browser cannot decode HEIC (e.g. Chrome desktop).
  const converted = await convertHeicToJpeg(file);
  try {
    return await resizeImageToJpeg(converted, { maxEdge, quality });
  } catch {
    return converted;
  }
}

/**
 * Prepare any HEIC/large image entries in a File list for upload.
 */
export async function prepareFilesForUpload(files, options = {}) {
  const list = Array.isArray(files) ? files : [];
  return Promise.all(list.map((file) => prepareImageForUpload(file, options)));
}
