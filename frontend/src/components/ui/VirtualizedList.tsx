import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { VariableSizeList as List, type ListChildComponentProps } from 'react-window';
import './VirtualizedList.css';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  estimatedItemSize?: number;
  bufferSize?: number;
  onItemRender: (item: T, index: number) => React.ReactNode;
  getItemKey?: (index: number, item: T) => string | number;
  className?: string;
  overscanCount?: number;
  onScrollPositionChange?: (scrollOffset: number) => void;
  initialScrollOffset?: number;
  optimizeForMobile?: boolean;
  throttleScrollEvents?: boolean;
}

// Cache für Item-Höhen
const itemHeightCache = new Map<string, number>();

export function VirtualizedList<T>({
  items,
  height,
  estimatedItemSize = 120,
  bufferSize: _bufferSize = 5,
  onItemRender,
  getItemKey,
  className = '',
  overscanCount = 2,
  onScrollPositionChange,
  initialScrollOffset = 0,
  optimizeForMobile = true,
  throttleScrollEvents = true,
}: VirtualizedListProps<T>) {
  const listRef = useRef<List>(null);
  const itemHeights = useRef<Map<number, number>>(new Map());
  const cacheKey = useMemo(() => `virtualized-list-${Date.now()}`, []);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Detect mobile device for optimizations
  const isMobile = useMemo(() => {
    if (!optimizeForMobile) return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, [optimizeForMobile]);

  // Adjust overscan and other parameters for mobile
  const mobileOptimizedOverscanCount = useMemo(() => {
    if (!isMobile) return overscanCount;
    // Reduce overscan on mobile to save memory
    return Math.max(1, Math.floor(overscanCount / 2));
  }, [isMobile, overscanCount]);

  // Berechne die Höhe eines Elements
  const getItemSize = useCallback((index: number) => {
    const cachedHeight = itemHeights.current.get(index);
    if (cachedHeight !== undefined) {
      return cachedHeight;
    }
    
    // Verwende gecachte Höhe oder geschätzte Höhe
    const globalCacheKey = `${cacheKey}-${index}`;
    const globalCachedHeight = itemHeightCache.get(globalCacheKey);
    if (globalCachedHeight !== undefined) {
      itemHeights.current.set(index, globalCachedHeight);
      return globalCachedHeight;
    }
    
    return estimatedItemSize;
  }, [estimatedItemSize, cacheKey]);

  // Setze die Höhe eines Elements
  const setItemSize = useCallback((index: number, size: number) => {
    const globalCacheKey = `${cacheKey}-${index}`;
    
    // Nur aktualisieren wenn sich die Höhe geändert hat
    if (itemHeights.current.get(index) !== size) {
      itemHeights.current.set(index, size);
      itemHeightCache.set(globalCacheKey, size);
      
      // Virtualized List über Änderung informieren
      if (listRef.current) {
        listRef.current.resetAfterIndex(index, false);
      }
    }
  }, [cacheKey]);

  // Scroll-Position tracken mit optionalem Throttling
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    if (!throttleScrollEvents || !isMobile) {
      onScrollPositionChange?.(scrollOffset);
      return;
    }

    // Throttle scroll events on mobile for better performance
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      onScrollPositionChange?.(scrollOffset);
    }, 16); // ~60fps throttling
  }, [onScrollPositionChange, throttleScrollEvents, isMobile]);

  // Initiale Scroll-Position setzen
  useEffect(() => {
    if (initialScrollOffset > 0 && listRef.current) {
      listRef.current.scrollTo(initialScrollOffset);
    }
  }, [initialScrollOffset]);

  // Reset Cache wenn sich Items ändern
  useEffect(() => {
    itemHeights.current.clear();
    if (listRef.current) {
      listRef.current.resetAfterIndex(0, true);
    }
  }, [items.length]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Item-Renderer Komponente
  const ItemRenderer = useCallback(({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    if (!item) return null;

    return (
      <div
        style={style}
        ref={(element) => {
          if (element) {
            const height = element.getBoundingClientRect().height;
            if (height > 0) {
              setItemSize(index, height);
            }
          }
        }}
      >
        {onItemRender(item, index)}
      </div>
    );
  }, [items, onItemRender, setItemSize]);

  // Key-Generator
  const itemKey = useCallback((index: number) => {
    const item = items[index];
    return getItemKey ? getItemKey(index, item) : index;
  }, [items, getItemKey]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`virtualized-list ${className}`}>
      <List
        ref={listRef}
        height={height}
        itemCount={items.length}
        itemSize={getItemSize}
        itemKey={itemKey}
        onScroll={handleScroll}
        overscanCount={mobileOptimizedOverscanCount}
        className="virtualized-list-inner"
      >
        {ItemRenderer}
      </List>
    </div>
  );
}

// Hook für Scroll-Position Management
export function useScrollPosition() {
  const scrollPositions = useRef<Map<string, number>>(new Map());

  const saveScrollPosition = useCallback((key: string, position: number) => {
    scrollPositions.current.set(key, position);
    // Auch in sessionStorage speichern für Persistenz
    try {
      sessionStorage.setItem(`scroll-position-${key}`, position.toString());
    } catch (error) {
      console.warn('Failed to save scroll position to sessionStorage:', error);
    }
  }, []);

  const getScrollPosition = useCallback((key: string): number => {
    // Zuerst aus Memory-Cache versuchen
    const memoryPosition = scrollPositions.current.get(key);
    if (memoryPosition !== undefined) {
      return memoryPosition;
    }

    // Dann aus sessionStorage versuchen
    try {
      const sessionPosition = sessionStorage.getItem(`scroll-position-${key}`);
      if (sessionPosition !== null) {
        const position = parseFloat(sessionPosition);
        scrollPositions.current.set(key, position);
        return position;
      }
    } catch (error) {
      console.warn('Failed to load scroll position from sessionStorage:', error);
    }

    return 0;
  }, []);

  const clearScrollPosition = useCallback((key: string) => {
    scrollPositions.current.delete(key);
    try {
      sessionStorage.removeItem(`scroll-position-${key}`);
    } catch (error) {
      console.warn('Failed to clear scroll position from sessionStorage:', error);
    }
  }, []);

  return {
    saveScrollPosition,
    getScrollPosition,
    clearScrollPosition,
  };
}