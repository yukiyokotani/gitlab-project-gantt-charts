import * as React from 'react';
import { cn, resolveUrl } from '@/lib/utils';

export function Avatar({ className, ...props }: React.ComponentProps<'span'>) {
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

export function AvatarImage({
  className,
  src,
  alt,
  ...props
}: React.ComponentProps<'img'>) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError || !src) return null;

  const resolvedAvaterSrc = resolveUrl(src);

  return (
    <img
      src={resolvedAvaterSrc}
      alt={alt}
      onError={() => setHasError(true)}
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }: React.ComponentProps<'span'>) {
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
