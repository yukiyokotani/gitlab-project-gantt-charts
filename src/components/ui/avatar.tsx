import * as React from 'react';
import { cn } from '@/lib/utils';

const GITLAB_URL = import.meta.env.VITE_GITLAB_URL || 'https://gitlab.com';

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

function resolveUrl(src: string, base: string) {
  return new URL(src, base).toString();
}

function AvatarImage({
  className,
  src,
  alt,
  ...props
}: React.ComponentProps<'img'>) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError || !src) return null;

  const avaterSrc = resolveUrl(src, GITLAB_URL);

  return (
    <img
      src={avaterSrc}
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
