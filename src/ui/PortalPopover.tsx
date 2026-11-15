import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

export interface PortalPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

export function PortalPopover({
  isOpen,
  onClose,
  anchorRef,
  children,
  align = 'end',
  className = ''
}: PortalPopoverProps): React.JSX.Element | null {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Measure anchor and position popover with collision detection
  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      const anchorEl = anchorRef.current;
      const popoverEl = popoverRef.current;
      if (!anchorEl) return;

      const rect = anchorEl.getBoundingClientRect();
      const popWidth = popoverEl ? popoverEl.offsetWidth : 200;
      const popHeight = popoverEl ? popoverEl.offsetHeight : 240;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 12;

      // Vertical placement: prefer below, flip above if overflowing bottom
      let top = rect.bottom + 6;
      if (top + popHeight > viewportHeight - margin && rect.top - popHeight - 6 > margin) {
        top = rect.top - popHeight - 6;
      }

      // Horizontal placement
      let left = align === 'end' ? rect.right - popWidth : rect.left;

      // Clamp within viewport
      if (left + popWidth > viewportWidth - margin) {
        left = viewportWidth - popWidth - margin;
      }
      if (left < margin) {
        left = margin;
      }

      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, anchorRef, align]);

  // Outside click and Escape listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        anchorRef.current?.focus();
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: coords ? `${coords.top}px` : '-9999px',
        left: coords ? `${coords.left}px` : '-9999px',
        opacity: coords ? 1 : 0
      }}
      className={`z-popover transition-opacity duration-150 ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}
