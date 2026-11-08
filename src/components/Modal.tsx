import { t } from '../i18n';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({
  title,
  onClose,
  children,
  className = '',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      restoreFocus.current?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <span className="eyebrow">MILKY WAY EXPLORER</span>
        <button className="icon-button" aria-label={t('Modal.dongHopThoai')} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
