/**
 * Compresses and resizes an image on the client side using HTML5 Canvas.
 * Keeps file size small (~30KB-80KB) so:
 * 1. Uploads finish in milliseconds.
 * 2. Payload size easily satisfies serverless and reverse proxy limits (avoids 413s).
 * 3. Base64 strings stored in Postgres stay lightweight and quick to query.
 */
export async function compressImage(
  file: File,
  options: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  // If not an image or SVG (which is vector), return as is
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  const maxDim = options.maxDimension ?? 400;
  const quality = options.quality ?? 0.85;

  return new Promise((resolve) => {
    // If running server-side or in environments without DOM Image, fall back safely
    if (typeof window === "undefined" || typeof Image === "undefined") {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { naturalWidth: width, naturalHeight: height } = img;
      if (!width || !height) {
        width = img.width;
        height = img.height;
      }

      // If already within max dimensions and file size is under 120KB, preserve original
      if (width <= maxDim && height <= maxDim && file.size <= 120 * 1024) {
        resolve(file);
        return;
      }

      // Maintain aspect ratio within bounding box [maxDim x maxDim]
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Preserve PNG for transparency (essential for logos), otherwise JPEG
      const isPng = file.type === "image/png";
      const targetMime = isPng ? "image/png" : "image/jpeg";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const finalFile = new File([blob], file.name, {
            type: targetMime,
            lastModified: Date.now(),
          });
          resolve(finalFile);
        },
        targetMime,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
