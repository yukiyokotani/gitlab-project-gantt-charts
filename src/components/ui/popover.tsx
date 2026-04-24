import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

type PopoverProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Popover({ open: controlledOpen, onOpenChange, children }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </PopoverContext.Provider>
  );
}

type PopoverTriggerProps = React.ComponentProps<'button'> & {
  asChild?: boolean;
};

export function PopoverTrigger({ asChild, children, ...props }: PopoverTriggerProps) {
  const context = React.useContext(PopoverContext);
  if (!context) throw new Error('PopoverTrigger must be used within Popover');

  const handleClick = () => context.setOpen(!context.open);

  // Wrap with an inline-flex span so we can measure the trigger position
  // without requiring the child to forward refs.
  if (asChild && React.isValidElement(children)) {
    return (
      <span
        ref={(node) => {
          context.triggerRef.current = node;
        }}
        style={{ display: 'inline-flex' }}
      >
        {React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
          onClick: handleClick,
        })}
      </span>
    );
  }

  return (
    <button
      ref={(node) => {
        context.triggerRef.current = node;
      }}
      type="button"
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

type PopoverContentProps = React.ComponentProps<'div'> & {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
};

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 8,
  children,
  ...props
}: PopoverContentProps) {
  const context = React.useContext(PopoverContext);
  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);

  // Recalculate position whenever the popover opens or the viewport scrolls/resizes.
  React.useLayoutEffect(() => {
    if (!context?.open || !context.triggerRef.current) {
      setPosition(null);
      return;
    }

    const update = () => {
      const trigger = context.triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      let left = rect.left;
      if (align === 'center') left = rect.left + rect.width / 2;
      else if (align === 'end') left = rect.right;
      setPosition({ top: rect.bottom + sideOffset, left });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [context?.open, context?.triggerRef, align, sideOffset]);

  React.useEffect(() => {
    if (!context?.open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      if (context?.triggerRef.current?.contains(target)) return;
      context?.setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [context?.open, context]);

  if (!context?.open || !position) return null;

  const transform =
    align === 'center'
      ? 'translateX(-50%)'
      : align === 'end'
        ? 'translateX(-100%)'
        : undefined;

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform,
      }}
      className={cn(
        'z-60 w-auto rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg outline-none',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
}
