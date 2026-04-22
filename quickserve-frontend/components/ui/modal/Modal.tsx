/**
 * Modal Component
 *
 * Reusable modal dialog with backdrop
 */

'use client';

import React, { useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks';

export interface ModalProps {
  show: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  show,
  onClose,
  children,
  maxWidth = 'lg',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  contentClassName,
}) => {
  // Handle escape key
  useEscapeKey(onClose, show && closeOnEscape);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose, closeOnBackdropClick]
  );

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  // Don't render if not showing
  if (!show) return null;

  // Max width classes
  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-full mx-4',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative bg-white rounded-2xl shadow-2xl w-full',
          'transform transition-all duration-200 scale-100',
          'max-h-[85vh] overflow-hidden flex flex-col',
          maxWidthClasses[maxWidth],
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <i className="fas fa-times"></i>
          </button>
        )}

        {/* Content */}
        <div className={cn('overflow-y-auto overflow-x-hidden', contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );

  // Portal to root
  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default Modal;
