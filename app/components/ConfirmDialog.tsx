'use client';

import { useEffect, type FC } from 'react';

interface ConfirmDialogProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible modal confirmation dialog.
 * Replaces the native window.confirm() for a consistent, keyboard-navigable UX.
 */
export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  title = 'Bestätigung',
  message,
  confirmLabel = 'Löschen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  onCancel,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-sm w-full shadow-xl space-y-4">
        <h3
          id="confirm-dialog-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {title}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
