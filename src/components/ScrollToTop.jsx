import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Automatically resets window and all active scrollable containers to the top on route change.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Reset main window scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // 2. Reset any scrollable elements in DOM (e.g. overflow-y-auto containers)
    const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, [data-scroll-container]');
    scrollContainers.forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname]);

  return null;
}
