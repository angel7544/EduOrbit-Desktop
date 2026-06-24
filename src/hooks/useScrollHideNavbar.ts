import { useRef, useCallback } from 'react';

export function useScrollHideNavbar() {
    const handleScroll = useCallback((event: any) => {
        // Mock implementation for web
    }, []);

    return { handleScroll };
}
