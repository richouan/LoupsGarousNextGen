import React, { useState, useEffect, useRef } from 'react';

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
  placeholderEmoji = '🐺',
  priority = false,
  className = ''
}) => {
  const [isInView, setIsInView] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

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
        rootMargin: '180px 0px', // Start fetching right before coming into viewport
        threshold: 0.01
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [priority, src]);

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
