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
          <div className="lazy-image-loader-wrap">
            <span className="lazy-image-emoji">
              {hasError ? '⚠️' : '🌕'}
            </span>
            {!hasError && <div className="lazy-image-pulse-ring" />}
          </div>
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
