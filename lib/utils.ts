import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLocationForDisplay(
  city: string,
  countryCode: string,
  hideLocation?: boolean
): string {
  if (hideLocation) {
    return "Nearby";
  }

  const trimmedCity = city.trim();
  const trimmedCountry = countryCode.trim().toUpperCase();

  if (!trimmedCity && !trimmedCountry) {
    return "";
  }
  if (!trimmedCity) {
    return trimmedCountry;
  }
  if (!trimmedCountry) {
    return trimmedCity;
  }
  return `${trimmedCity}, ${trimmedCountry}`;
}
