import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  highContrastMode?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  highContrastMode = false,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl border shadow-2xl p-4 sm:p-5 space-y-3.5 max-h-[92vh] overflow-y-auto relative ${
          highContrastMode
            ? 'bg-zinc-950 border-amber-400 text-white'
            : 'bg-white border-zinc-300 text-zinc-950'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="border-b border-[#D4A017] pb-2.5 pr-8">
          <h3 className="font-black text-base sm:text-lg">{title}</h3>
          {subtitle && (
            <p className="text-xs text-zinc-500 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
