/**
 * Utility to detect if the current device is an Apple mobile device.
 * Crucial for handling Safari-specific security restrictions.
 */
export const isAppleMobile = (): boolean => {
  return (
    ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
      navigator.platform
    ) ||
    // Newer iPads look like Macs in navigator.platform
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
};

/**
 * Checks if the app is running in standalone mode (installed as PWA).
 */
export const isStandalone = (): boolean => {
  return (
    (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches
  );
};
