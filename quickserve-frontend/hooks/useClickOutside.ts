/**
 * useClickOutside Hook
 *
 * Detect clicks outside a component
 */

import { useEffect, RefObject } from 'react';

export function useClickOutside(
  ref: RefObject<HTMLElement>,
  callback: () => void,
  isActive: boolean = true
): void {
  useEffect(() => {
    if (!isActive) return;

    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [ref, callback, isActive]);
}

/**
 * useEscapeKey Hook
 *
 * Detect Escape key press
 */
export function useEscapeKey(callback: () => void, isActive: boolean = true): void {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [callback, isActive]);
}
