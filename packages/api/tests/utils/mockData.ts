import type { Invoice, CreateInvoiceRequest } from "../../src/types/api";
import { generateOrderId } from "../../src/utils/uuid";

/**
 * Mock data factory for tests
 */

export function createMockInvoiceRequest(overrides: Partial<CreateInvoiceRequest> = {}): CreateInvoiceRequest {
  return {
    registryAddress: "0x1234567890abcdef1234567890abcdef12345678",
    senderAddress: "0x5678901234abcdef5678901234abcdef56789012",
    partialNoteHash: "0xpartial1234567890abcdef1234567890abcdef1234567890abcdef",
    title: "Test Invoice",
    tokenAddress: "0x9abcdef123456789abcdef123456789abcdef12",
    amount: BigInt("1000000000000000000"),
    metadata: "Test metadata",
    ...overrides
  };
}

export function createMockInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const baseInvoice = createMockInvoiceRequest();
  return {
    invoiceId: generateOrderId(),
    status: 'pending',
    createdAt: Date.now(),
    ...baseInvoice,
    ...overrides
  };
}

export const MOCK_ADDRESSES = {
  registry: "0x1111111111111111111111111111111111111111",
  
  eth: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  usdc: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
  dai: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  
  sender1: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  payer1: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
};

export const MOCK_AMOUNTS = {
  small: BigInt("1000000000000000000"),     // 1 token (18 decimals)
  medium: BigInt("5000000000000000000"),    // 5 tokens
  large: BigInt("10000000000000000000"),    // 10 tokens
  huge: BigInt("100000000000000000000"),    // 100 tokens
};
