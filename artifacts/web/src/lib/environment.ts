export function isWebView(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent.toLowerCase();

  return (
    ua.includes('wv') ||
    ((ua.includes('iphone') || ua.includes('ipad')) && !ua.includes('safari')) ||
    ua.includes('expo') ||
    ua.includes('webview') ||
    (window as any).ReactNativeWebView !== undefined
  );
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /android|iphone|ipad|ipod/i.test(window.navigator.userAgent);
}
