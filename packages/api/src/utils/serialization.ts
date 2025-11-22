import type { Invoice } from "../types/api";

/**
 * Serialize an Invoice object by converting BigInt values to strings
 */
export function serializeInvoice(invoice: Invoice): any {
  return {
    ...invoice,
    amount: invoice.amount.toString()
  };
}

/**
 * Serialize an array of Invoice objects
 */
export function serializeInvoices(invoices: Invoice[]): any[] {
  return invoices.map(invoice => serializeInvoice(invoice));
}

/**
 * Custom JSON.stringify that handles BigInt values
 */
export function stringifyWithBigInt(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}
