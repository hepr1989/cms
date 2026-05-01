import { useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';

export function useResponsive() {
  const isMobile = useUIStore(s => s.isMobile);
  const setIsMobile = useUIStore(s => s.setIsMobile);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [setIsMobile]);

  return {
    isMobile,
    isTablet: !isMobile && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
  };
}
