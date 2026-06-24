import { useState, useEffect } from 'react';

const useBreakpoint = (breakpoint: number) => {
  const [isSmaller, setIsSmaller] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsSmaller(window.innerWidth < breakpoint);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isSmaller;
};

export default useBreakpoint;
