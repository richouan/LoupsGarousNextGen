import { getOptimizedImageUrl } from './imageUtils';

// Global cache of preloaded image URLs across the dashboard session
const preloadedUrls = new Set<string>();
const listeners = new Set<(url: string) => void>();

export function isImagePreloaded(url: string | null | undefined): boolean {
  if (!url) return false;
  const optimized = getOptimizedImageUrl(url, 'thumb');
  return preloadedUrls.has(optimized) || preloadedUrls.has(url);
}

export function onImagePreloaded(listener: (url: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyImagePreloaded(url: string) {
  preloadedUrls.add(url);
  listeners.forEach((listener) => listener(url));
}

let activePreloadSessionId = 0;

/**
 * Preload all cards in order of hierarchy:
 * Priority cards load first, then background workers download row by row until the end.
 * Even if the user never scrolls, all cards download sequentially in the background.
 */
export function startSequentialCardPreload(cards: any[], initialPriorityCount: number = 8) {
  activePreloadSessionId++;
  const currentSession = activePreloadSessionId;

  if (!cards || cards.length === 0) return;

  // Extract all valid optimized URLs in hierarchy order
  const orderedUrls = cards
    .map((c) => getOptimizedImageUrl(c.imageUrl, 'thumb'))
    .filter((url): url is string => Boolean(url));

  if (orderedUrls.length === 0) return;

  // Helper to load a single image
  const preloadSingleUrl = (url: string): Promise<void> => {
    if (preloadedUrls.has(url)) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        notifyImagePreloaded(url);
        resolve();
      };
      img.onerror = () => {
        // Resolve anyway so queue continues without blocking
        resolve();
      };
      img.src = url;
    });
  };

  // 1. Immediately preload the first visible priority rows
  const priorityUrls = orderedUrls.slice(0, initialPriorityCount);
  const backgroundUrls = orderedUrls.slice(initialPriorityCount);

  priorityUrls.forEach((url) => {
    preloadSingleUrl(url);
  });

  // 2. After a brief breather (400ms), download all remaining rows sequentially in order
  setTimeout(() => {
    if (currentSession !== activePreloadSessionId) return;

    let index = 0;
    const concurrency = 2;
    const scheduleNext = (cb: () => void) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(cb, { timeout: 300 });
      } else {
        setTimeout(cb, 60);
      }
    };

    const worker = () => {
      if (currentSession !== activePreloadSessionId) return;
      if (index >= backgroundUrls.length) return;

      const nextUrl = backgroundUrls[index++];
      preloadSingleUrl(nextUrl).then(() => {
        scheduleNext(worker);
      });
    };

    for (let i = 0; i < concurrency; i++) {
      worker();
    }
  }, 400);
}
