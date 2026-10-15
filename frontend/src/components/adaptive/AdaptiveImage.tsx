/**
 * Adaptive Image Component
 * 
 * Intelligent image component that adapts to network conditions and device capabilities
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAdaptiveImages } from '../../hooks/useAdaptiveLoading';
import { useIntersectionObserver } from '../../hooks';

interface AdaptiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  quality?: number;
  placeholder?: string | React.ReactNode;
  fallback?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  style?: React.CSSProperties;
}

export const AdaptiveImage: React.FC<AdaptiveImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  quality,
  placeholder,
  fallback,
  sizes,
  priority = false,
  onLoad,
  onError,
  style
}) => {
  const {
    getImageUrl,
    shouldLazyLoad,
    lazyLoadThreshold,
    shouldPrefetchImages,
    imageConfig
  } = useAdaptiveImages();

  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  
  const imgRef = useRef<HTMLImageElement>(null);
  const [setIntersectionRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: `${lazyLoadThreshold}px`
  });

  // Determine if image should be loaded
  const shouldLoad = priority || !shouldLazyLoad || isIntersecting;

  // Generate optimized image URL
  useEffect(() => {
    if (shouldLoad && src && !isError) {
      const optimizedUrl = getImageUrl(src, {
        width,
        height,
        quality: quality || imageConfig.quality
      });
      setCurrentSrc(optimizedUrl);
    }
  }, [shouldLoad, src, width, height, quality, getImageUrl, imageConfig.quality, isError]);

  // Preload image if prefetching is enabled
  useEffect(() => {
    if (shouldPrefetchImages && currentSrc && !isLoaded) {
      const img = new Image();
      img.src = currentSrc;
    }
  }, [shouldPrefetchImages, currentSrc, isLoaded]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setIsError(false);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setIsError(true);
    setIsLoaded(false);
    
    const error = new Error(`Failed to load image: ${currentSrc}`);
    onError?.(error);
    
    // Try fallback image
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback);
      setIsError(false);
    }
  };

  // Set intersection observer ref
  const setRefs = (element: HTMLImageElement | null) => {
    imgRef.current = element;
    if (shouldLazyLoad) {
      setIntersectionRef(element);
    }
  };

  // Generate srcSet for responsive images
  const generateSrcSet = () => {
    if (!width || !shouldLoad) return undefined;
    
    const densities = [1, 1.5, 2, 3];
    const srcSetEntries = densities.map(density => {
      const scaledWidth = Math.round(width * density);
      const scaledHeight = height ? Math.round(height * density) : undefined;
      
      const scaledUrl = getImageUrl(src, {
        width: scaledWidth,
        height: scaledHeight,
        quality: quality || imageConfig.quality
      });
      
      return `${scaledUrl} ${density}x`;
    });
    
    return srcSetEntries.join(', ');
  };

  // Placeholder component
  const PlaceholderComponent = () => {
    if (typeof placeholder === 'string') {
      return (
        <img
          src={placeholder}
          alt=""
          className={`${className} blur-sm`}
          style={style}
          width={width}
          height={height}
        />
      );
    }
    
    if (placeholder) {
      return <>{placeholder}</>;
    }
    
    // Default skeleton placeholder
    return (
      <div 
        className={`${className} bg-gray-200 animate-pulse flex items-center justify-center`}
        style={{ width, height, ...style }}
      >
        <svg 
          className="w-8 h-8 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    );
  };

  // Error component
  const ErrorComponent = () => (
    <div 
      className={`${className} bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center`}
      style={{ width, height, ...style }}
    >
      <div className="text-center text-gray-500">
        <svg 
          className="w-8 h-8 mx-auto mb-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
        <span className="text-sm">Failed to load</span>
      </div>
    </div>
  );

  // Show placeholder while loading or if lazy loading is waiting
  if (!shouldLoad || (!isLoaded && !isError && currentSrc)) {
    return <PlaceholderComponent />;
  }

  // Show error state
  if (isError && !fallback) {
    return <ErrorComponent />;
  }

  // Show actual image
  return (
    <>
      {!isLoaded && <PlaceholderComponent />}
      <img
        ref={setRefs}
        src={currentSrc}
        srcSet={generateSrcSet()}
        sizes={sizes}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        style={{
          ...style,
          ...(isLoaded ? {} : { position: 'absolute', top: 0, left: 0 })
        }}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        loading={shouldLazyLoad && !priority ? 'lazy' : 'eager'}
        decoding="async"
      />
    </>
  );
};

// Utility component for image grids/lists
interface AdaptiveImageGridProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  className?: string;
  itemClassName?: string;
  columns?: number;
  gap?: number;
  priority?: number; // Number of images to load with priority
}

export const AdaptiveImageGrid: React.FC<AdaptiveImageGridProps> = ({
  images,
  className = '',
  itemClassName = '',
  columns = 3,
  gap = 16,
  priority = 3
}) => {
  const { shouldLazyLoad } = useAdaptiveImages();

  return (
    <div 
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`
      }}
    >
      {images.map((image, index) => (
        <div key={index} className={itemClassName}>
          <AdaptiveImage
            {...image}
            priority={!shouldLazyLoad || index < priority}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
};

export default AdaptiveImage;