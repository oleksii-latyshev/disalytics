import { useCallback, useEffect, useRef, useState } from 'react';

export function useLineupImageViewer(
  imageUrls: readonly string[],
  imageCaptions: readonly string[],
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
  } | null>(null);
  const swipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    isHorizontal: boolean;
  } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const activeUrl = imageUrls[activeIndex];
  const activeCaption = imageCaptions[activeIndex]?.trim() ?? '';

  const selectImage = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= imageUrls.length || nextIndex === activeIndex) return;
      setActiveIndex(nextIndex);
      zoomRef.current = 1;
      panRef.current = { x: 0, y: 0 };
      setZoom(1);
      setIsDragging(false);
      dragRef.current = null;
      swipeRef.current = null;
    },
    [activeIndex, imageUrls.length],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (imageUrls.length < 2 || zoomRef.current > 1) return;
    if (e.key === 'ArrowLeft' && activeIndex > 0) {
      e.preventDefault();
      selectImage(activeIndex - 1);
    } else if (e.key === 'ArrowRight' && activeIndex < imageUrls.length - 1) {
      e.preventDefault();
      selectImage(activeIndex + 1);
    }
  };

  const getBounds = useCallback((currentZoom: number) => {
    if (currentZoom <= 1 || !containerRef.current || !imageRef.current) {
      return { maxPanX: 0, maxPanY: 0 };
    }
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    if (cw <= 0 || ch <= 0) return { maxPanX: 0, maxPanY: 0 };

    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;
    if (naturalWidth <= 0 || naturalHeight <= 0) return { maxPanX: 0, maxPanY: 0 };
    const fit = Math.min(cw / naturalWidth, ch / naturalHeight);
    const iw = naturalWidth * fit;
    const ih = naturalHeight * fit;
    const enlargedWidth = iw * currentZoom;
    const enlargedHeight = ih * currentZoom;

    return {
      maxPanX: Math.max(0, (enlargedWidth - cw) / 2),
      maxPanY: Math.max(0, (enlargedHeight - ch) / 2),
    };
  }, []);

  const clampPan = useCallback(
    (x: number, y: number, currentZoom: number) => {
      const { maxPanX, maxPanY } = getBounds(currentZoom);
      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, y)),
      };
    },
    [getBounds],
  );

  const applyTransform = useCallback((x: number, y: number, currentZoom: number) => {
    if (imageRef.current) {
      imageRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${currentZoom})`;
    }
  }, []);

  const handleZoom = useCallback(
    (nextZoom: number) => {
      const clampedZoom = Math.max(1, Math.min(5, Math.round(nextZoom * 100) / 100));
      setZoom(clampedZoom);
      zoomRef.current = clampedZoom;
      const clamped = clampPan(panRef.current.x, panRef.current.y, clampedZoom);
      panRef.current = clamped;
      applyTransform(clamped.x, clamped.y, clampedZoom);
    },
    [applyTransform, clampPan],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(zoomRef.current + (e.deltaY < 0 ? 0.25 : -0.25));
    };

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            const clamped = clampPan(panRef.current.x, panRef.current.y, zoomRef.current);
            panRef.current = clamped;
            applyTransform(clamped.x, clamped.y, zoomRef.current);
          })
        : null;

    container.addEventListener('wheel', onWheel, { passive: false });
    observer?.observe(container);

    return () => {
      container.removeEventListener('wheel', onWheel);
      observer?.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [applyTransform, clampPan, handleZoom]);

  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    const { maxPanX, maxPanY } = getBounds(zoomRef.current);
    if (maxPanX <= 0 && maxPanY <= 0) return;

    e.preventDefault();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: panRef.current.x,
      initialPanY: panRef.current.y,
    };
    setIsDragging(true);
    if (imageRef.current) {
      imageRef.current.style.transition = 'none';
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const startSwipe = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' || imageUrls.length < 2) return;
    swipeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      isHorizontal: false,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (e.detail === 2) {
      handleZoom(zoomRef.current > 1 ? 1 : 2.5);
      return;
    }
    if (zoomRef.current <= 1) {
      startSwipe(e);
      return;
    }
    startPan(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (swipe?.pointerId === e.pointerId && zoomRef.current <= 1) {
      const dx = e.clientX - swipe.startX;
      const dy = e.clientY - swipe.startY;
      if (!swipe.isHorizontal && Math.abs(dx) >= 12 && Math.abs(dx) > Math.abs(dy)) {
        swipe.isHorizontal = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (swipe.isHorizontal) e.preventDefault();
      return;
    }
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const targetX = dragRef.current.initialPanX + dx;
    const targetY = dragRef.current.initialPanY + dy;
    const clamped = clampPan(targetX, targetY, zoomRef.current);
    panRef.current = clamped;

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        applyTransform(panRef.current.x, panRef.current.y, zoomRef.current);
      });
    }
  };

  const finishSwipe = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== e.pointerId) return false;
    const dx = e.clientX - swipe.startX;
    const dy = e.clientY - swipe.startY;
    if (swipe.isHorizontal && Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy)) {
      selectImage(activeIndex + (dx < 0 ? 1 : -1));
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    swipeRef.current = null;
    return true;
  };

  const finishPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && e.currentTarget.hasPointerCapture(dragRef.current.pointerId)) {
      e.currentTarget.releasePointerCapture(dragRef.current.pointerId);
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    applyTransform(panRef.current.x, panRef.current.y, zoomRef.current);
    if (imageRef.current) {
      imageRef.current.style.transition = '';
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (finishSwipe(e)) return;
    finishPan(e);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    swipeRef.current = null;
    finishPan(e);
  };

  const onImageLoad = () => {
    const clamped = clampPan(panRef.current.x, panRef.current.y, zoomRef.current);
    panRef.current = clamped;
    applyTransform(clamped.x, clamped.y, zoomRef.current);
  };

  const { maxPanX, maxPanY } = getBounds(zoom);
  const canPan = zoom > 1 && (maxPanX > 0 || maxPanY > 0);

  return {
    activeIndex,
    activeUrl,
    activeCaption,
    zoom,
    isDragging,
    canPan,
    containerRef,
    imageRef,
    selectImage,
    handleZoom,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    onImageLoad,
  };
}
