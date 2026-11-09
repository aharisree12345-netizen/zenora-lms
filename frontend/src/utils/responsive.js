/**
 * ZENORA LMS - UNIVERSAL RESPONSIVE BREAKPOINT & SCREEN UTILITY
 * Fluid adaptations across Mobile (iOS/Android), Tablet (iPad), and Desktop (Web/Windows).
 */

import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  wide: 1536
};

/**
 * React Hook for Universal Responsive UI state
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isMobile = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.laptop;
  const isLaptop = width >= BREAKPOINTS.laptop && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.laptop;
  const isWide = width >= BREAKPOINTS.wide;

  // Grid column calculation helper for dashboard & directory lists
  let columns = 1;
  if (width >= BREAKPOINTS.wide) columns = 4;
  else if (width >= BREAKPOINTS.desktop) columns = 3;
  else if (width >= BREAKPOINTS.tablet) columns = 2;

  // Adaptive spacing & layout margins
  const contentPadding = isMobile ? 12 : (isTablet ? 18 : 24);
  const maxContentWidth = isWide ? 1440 : (isDesktop ? 1200 : '100%');

  return {
    width,
    height,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isWide,
    columns,
    contentPadding,
    maxContentWidth
  };
}

/**
 * Pure helper for non-hook contexts
 */
export function getResponsiveValues(width) {
  const isMobile = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.laptop;
  const isDesktop = width >= BREAKPOINTS.laptop;

  let columns = 1;
  if (width >= BREAKPOINTS.wide) columns = 4;
  else if (width >= BREAKPOINTS.desktop) columns = 3;
  else if (width >= BREAKPOINTS.tablet) columns = 2;

  return { isMobile, isTablet, isDesktop, columns };
}

export default {
  BREAKPOINTS,
  useResponsive,
  getResponsiveValues
};

