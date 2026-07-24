import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const parsePositiveInt = (
  value: string | null,
  fallback: number,
  max?: number
): number => {
  if (!value || !/^\d+$/.test(value.trim())) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  if (max !== undefined && parsed > max) {
    return max;
  }

  return parsed;
};

export function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}
