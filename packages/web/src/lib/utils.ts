import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an Aztec address to a truncated form
 * @param address - Full address string
 * @param startLength - Number of characters to show at start (default 6)
 * @param endLength - Number of characters to show at end (default 4)
 */
export function truncateAddress(address: string, startLength = 6, endLength = 4): string {
  if (!address) return "";
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Format a number as currency
 * @param amount - Amount to format
 * @param currency - Currency symbol (default "$")
 */
export function formatCurrency(amount: number | bigint | string, currency = "$"): string {
  const num = typeof amount === "bigint" ? Number(amount) : typeof amount === "string" ? parseFloat(amount) : amount;
  return `${currency}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format USDC amount from smallest unit (6 decimals) to display value
 * @param amount - Amount in smallest unit (e.g., 1000000 = 1 USDC)
 * @param showSymbol - Whether to show "USDC" label (default true)
 */
export function formatUSDC(amount: number | bigint | string, showSymbol = true): string {
  // Convert to BigInt to preserve precision
  let bigIntAmount: bigint;
  
  if (typeof amount === "bigint") {
    bigIntAmount = amount;
  } else if (typeof amount === "string") {
    bigIntAmount = BigInt(amount);
  } else {
    bigIntAmount = BigInt(Math.floor(amount));
  }
  
  // Divide by 1_000_000 to convert from smallest unit
  const wholePart = bigIntAmount / BigInt(1_000_000);
  const fractionalPart = bigIntAmount % BigInt(1_000_000);
  
  // Convert to number for formatting (safe now that we've done the division)
  const wholeNum = Number(wholePart);
  const fractionalNum = Number(fractionalPart) / 1_000_000;
  const usdc = wholeNum + fractionalNum;
  
  const formatted = usdc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return showSymbol ? `${formatted} USDC` : formatted;
}

/**
 * Format a date to a readable string
 * @param date - Date to format
 */
export function formatDate(date: Date | number | string): string {
  const d = typeof date === "number" || typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

