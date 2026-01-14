import * as React from 'react';
import { cn } from '@/lib/utils';

function Avatar({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'relative flex size-10 shrink-0 overflow-hidden rounded-full',
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  src,
  alt,
  ...props
}: React.ComponentProps<'img'>) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError || !src) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium',
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
