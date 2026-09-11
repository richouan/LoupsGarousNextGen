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

  // Choose transformation based on display context:
  // 'thumb': For grid card tiles (450px wide for 2x retina display, WebP/AVIF auto, intelligent compression)
  // 'medium': For modal previews & simulator (650px wide)
  // 'preview': For card editor live preview (900px wide)
  // 'full': Return the pristine original master artwork
  let transform = 'f_auto,q_auto:good,w_450,c_limit';
  if (size === 'medium') {
    transform = 'f_auto,q_auto:good,w_650,c_limit';
  } else if (size === 'preview') {
    transform = 'f_auto,q_auto:good,w_900,c_limit';
  } else if (size === 'full') {
    return url;
  }

  return url.replace('/image/upload/', `/image/upload/${transform}/`);
}
