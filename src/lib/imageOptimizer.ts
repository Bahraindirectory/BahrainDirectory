/**
 * Utility functions for client-side modern image conversion (WebP) and lazy loading optimization.
 */

/**
 * Converts any uploaded image File (PNG, JPG, JPEG, GIF, BMP, HEIC, etc.) 
 * into modern, high-performance WebP format data URL with optimal compression.
 *
 * @param file The uploaded File object
 * @param maxWidth Maximum allowed width in pixels (default 1600)
 * @param maxHeight Maximum allowed height in pixels (default 1600)
 * @param quality Compression quality from 0.0 to 1.0 (default 0.82)
 */
export async function convertFileToWebP(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image (e.g. video or other binary), fallback to raw FileReader
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Calculate proportional constrained dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Fallback if canvas context fails
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      // High-quality canvas sampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        if (webpDataUrl && webpDataUrl.startsWith('data:image/webp')) {
          resolve(webpDataUrl);
        } else {
          // Fallback to JPEG if browser does not support WebP canvas encoding
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      } catch {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Ensures external CDN URLs (like Unsplash) request the modern WebP format by appending fm=webp.
 */
export function optimizeImageUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('images.unsplash.com')) {
    if (!url.includes('fm=webp') && !url.includes('fm=avif')) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}fm=webp&auto=format&fit=crop`;
    }
  }
  return url;
}
