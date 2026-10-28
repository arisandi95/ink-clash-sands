import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  hideClose?: boolean;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  hideClose
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--overlay)] data-[state=open]:animate-[fade-in_200ms_ease-out]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-line bg-panel-raised p-5 shadow-raised focus:outline-none data-[state=open]:animate-note-pop',
            className
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-extrabold leading-tight text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-ink-soft">{description}</Dialog.Description>
              ) : null}
            </div>
            {hideClose ? null : (
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Tutup"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line text-ink-soft hover:bg-panel hover:text-ink"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </Dialog.Close>
            )}
          </div>
          {children}
          {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
