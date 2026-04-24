import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

type DialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange: onOpenChange ?? (() => {}) }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogPortal({ children }: { children: React.ReactNode }) {
  const context = React.useContext(DialogContext);
  if (!context?.open) return null;

  return <>{children}</>;
}

export function DialogOverlay({ className, ...props }: React.ComponentProps<'div'>) {
  const context = React.useContext(DialogContext);

  return (
    <div
      onClick={() => context?.onOpenChange(false)}
      className={cn(
        'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-140 max-h-[85vh] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-auto rounded-xl border bg-card p-6 shadow-2xl',
        'animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}

export function DialogClose({
  className,
  children,
  ...props
}: React.ComponentProps<'button'>) {
  const context = React.useContext(DialogContext);

  if (children) {
    return (
      <button onClick={() => context?.onOpenChange(false)} {...props}>
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={() => context?.onOpenChange(false)}
      className={cn(
        'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity',
        'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:pointer-events-none',
        className
      )}
      {...props}
    >
      <X className="size-4" />
      <span className="sr-only">Close</span>
    </button>
  );
}
