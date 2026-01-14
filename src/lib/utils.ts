import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const GITLAB_URL = import.meta.env.VITE_GITLAB_URL || 'https://gitlab.com';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveUrl(src: string) {
  return new URL(src, GITLAB_URL).toString();
}