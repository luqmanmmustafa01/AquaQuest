import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatXP(xp: number): string {
  return new Intl.NumberFormat("en-US").format(xp) + " XP";
}

export function formatDepth(depth: number): string {
  return new Intl.NumberFormat("en-US").format(depth) + "m";
}
