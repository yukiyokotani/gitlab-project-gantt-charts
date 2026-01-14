import * as React from 'react';
import { cn } from '@/lib/utils';

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Popover({ open: controlledOpen, onOpenChange, children }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps extends React.ComponentProps<'button'> {
  asChild?: boolean;
}

function PopoverTrigger({ asChild, children, ...props }: PopoverTriggerProps) {
  const context = React.useContext(PopoverContext);
  if (!context) throw new Error('PopoverTrigger must be used within Popover');

  const handleClick = () => context.setOpen(!context.open);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

interface PopoverContentProps extends React.ComponentProps<'div'> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

function PopoverContent({
  className,
  align = 'center',
  children,
  ...props
}: PopoverContentProps) {
  const context = React.useContext(PopoverContext);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        // Check if click is on the trigger
        const trigger = ref.current.parentElement?.querySelector('button');
        if (trigger && trigger.contains(event.target as Node)) return;
        context?.setOpen(false);
      }
    }

    if (context?.open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [context?.open, context]);

  if (!context?.open) return null;

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'absolute top-full z-50 mt-2 w-auto rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg outline-none',
        'animate-in fade-in-0 zoom-in-95',
        alignmentClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
