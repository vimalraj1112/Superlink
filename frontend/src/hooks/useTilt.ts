import type { MouseEvent } from 'react';

/** True only on devices with a real hover pointer that haven't asked for reduced motion. */
export function tiltEnabled() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches;
}

/**
 * Subtle 3D cursor tilt for interactive cards. Spread the returned handlers onto
 * a card element. It writes directly to `el.style.transform` (no re-render per
 * move) and is a no-op on touch devices or when reduced motion is preferred.
 */
export function useTilt(max = 6) {
  const onMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!tiltEnabled()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    const rx = (-py * max).toFixed(2);
    const ry = (px * max).toFixed(2);
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
  };

  const onMouseLeave = (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = '';
  };

  return { onMouseMove, onMouseLeave };
}
