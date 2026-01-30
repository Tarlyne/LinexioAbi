import React, { useEffect, useState } from 'react';
import { Portal } from './Portal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-md',
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const frame = requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 backdrop-blur-[2px] transition-all duration-300 ${
          isAnimating ? 'animate-backdrop-in bg-black/40' : 'animate-backdrop-out bg-black/40'
        }`}
        onClick={onClose}
      >
        <div
          className={`glass-modal p-6 w-full ${maxWidth} max-h-[90vh] overflow-y-auto relative ${
            isAnimating ? 'animate-modal-in' : 'animate-modal-out'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
};
