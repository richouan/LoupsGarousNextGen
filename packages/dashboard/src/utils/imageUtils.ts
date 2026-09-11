/**
 * Utility to optimize Cloudinary image URLs for high performance and low bandwidth,
 * while preserving crystal clear retina visual quality on the dashboard.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  size: 'thumb' | 'medium' | 'preview' | 'full' = 'thumb'
): string {
  if (!url) return '';

  // Only transform Cloudinary URLs
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) {
    return url;
  }

  // Prevent double-transforming if already transformed
  if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/w_')) {
    return url;
  }

  if (size === 'full') {
    return url;
  }

  // Unified high-DPI HD format (800px wide, WebP/AVIF auto, best visual fidelity quality).
  // Using the same URL across the grid and editor ensures the browser instantly pulls
  // the image from cache with 0ms load time when opening a role!
  const transform = 'f_auto,q_auto:best,w_800,c_limit';
  return url.replace('/image/upload/', `/image/upload/${transform}/`);
}
