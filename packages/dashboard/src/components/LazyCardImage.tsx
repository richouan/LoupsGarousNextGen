import React, { useState, useEffect, useRef } from 'react';
import { isImagePreloaded, onImagePreloaded } from '../utils/cardPreloader';

interface LazyCardImageProps {
  src: string;
  alt: string;
  placeholderEmoji?: string;
  priority?: boolean;
  className?: string;
}

export const LazyCardImage: React.FC<LazyCardImageProps> = ({
  src,
  alt,
  priority = false,
  className = ''
}) => {
  const [isInView, setIsInView] = useState(() => priority || isImagePreloaded(src));
  const [isLoaded, setIsLoaded] = useState(() => isImagePreloaded(src));
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // If background preloader finishes this image while on page, mark ready
  useEffect(() => {
    if (isLoaded) return;

    if (isImagePreloaded(src)) {
      setIsInView(true);
      setIsLoaded(true);
      return;
    }

    const unsubscribe = onImagePreloaded((loadedUrl) => {
      if (loadedUrl === src) {
        setIsInView(true);
        setIsLoaded(true);
      }
    });

    return unsubscribe;
  }, [src, isLoaded]);

  // Observer if user scrolls to this card before background queue reaches it
  useEffect(() => {
    if (isInView) return;

    const element = containerRef.current;
    if (!element) return;

    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px 0px', // Start fetching right before coming into viewport
        threshold: 0.01
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isInView]);

  return (
    <div ref={containerRef} className={`lazy-image-container ${className}`}>
      {(!isLoaded || hasError) && (
        <div className="lazy-image-skeleton">
          {hasError ? (
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          ) : (
            <svg className="lazy-circular-spinner" viewBox="0 0 50 50" aria-label="Loading...">
              <circle
                className="lazy-spinner-track"
                cx="25"
                cy="25"
                r="18"
                fill="none"
                strokeWidth="3.5"
              />
              <circle
                className="lazy-spinner-path"
                cx="25"
                cy="25"
                r="18"
                fill="none"
                strokeWidth="3.5"
              />
            </svg>
          )}
        </div>
      )}

      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={isLoaded ? 'loaded' : 'loading'}
          decoding="async"
        />
      )}
    </div>
  );
};
