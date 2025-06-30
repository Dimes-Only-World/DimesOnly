import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useMobileLayout() {
  const isMobile = useIsMobile();

  const getContainerClasses = (
    desktopClasses: string = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
  ) => {
    return isMobile ? "px-0" : desktopClasses;
  };

  const getContentClasses = (
    desktopClasses: string = "px-4 sm:px-6 lg:px-8"
  ) => {
    return isMobile ? "px-4" : desktopClasses;
  };

  const getCardClasses = (desktopClasses: string = "shadow-lg") => {
    return isMobile ? "shadow-none mx-0 rounded-none" : desktopClasses;
  };

  const getPaddingClasses = (desktopClasses: string = "p-6") => {
    return isMobile ? "p-4" : desktopClasses;
  };

  return {
    isMobile,
    getContainerClasses,
    getContentClasses,
    getCardClasses,
    getPaddingClasses,
  };
}
