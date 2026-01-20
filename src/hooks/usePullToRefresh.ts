import { useState, useEffect, useRef } from 'react';

export const usePullToRefresh = (onRefresh: () => Promise<any>) => {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const threshold = 120; // px to trigger refresh
  const maxPull = 160; // visual cap

  // Ref to the scrollable container (usually window or a div)
  // For window scroll, we check window.scrollY
  
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      if (window.scrollY === 0 && currentY > startY) {
        const pull = Math.min(currentY - startY, maxPull);
        setPullDistance(pull);
        // Prevent default only if pulling heavily to avoid native chrome refresh if possible (hard to prevent reliably)
        // e.preventDefault(); 
      }
    };

    const handleTouchEnd = async () => {
      if (window.scrollY === 0 && pullDistance > threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(threshold); // Hold it at threshold
        try {
            // Haptic feedback for trigger
            if (navigator.vibrate) navigator.vibrate(20);
            await onRefresh();
        } finally {
            setIsRefreshing(false);
            setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      setStartY(0);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, pullDistance, isRefreshing, onRefresh]);

  return { isRefreshing, pullDistance };
};
