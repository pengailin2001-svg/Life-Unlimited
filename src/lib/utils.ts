import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Color utility to darken/lighten hex colors
export function adjustColor(color: string, amount: number) {
  if (!color.startsWith('#')) return color;
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).slice(-2));
}

export function getGlassyClass() {
  return "backdrop-blur-xl bg-white/40 border border-white/20 shadow-xl";
}
