/**
 * Safe wrapper for the Document View Transition API
 * Falls back gracefully to immediate callback when not supported or under prefers-reduced-motion.
 */
export function safeViewTransition(callback: () => void): void {
  if (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition === 'function' &&
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(callback);
  } else {
    callback();
  }
}
