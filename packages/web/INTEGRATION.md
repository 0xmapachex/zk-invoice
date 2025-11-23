# Aztec Integration Guide

This document explains how the web application integrates with the Aztec blockchain and the backend API, following the patterns established in the CLI scripts.

## Architecture Overview

The web application follows the same flow as the CLI:

```
User Action → Aztec Blockchain → Backend API
```

### Invoice Creation Flow

1. **User fills form** (`src/app/create/page.tsx`)
2. **Generate invoice data** with metadata (client info, line items)
3. **Create on-chain** via `createInvoiceOnChain()` (`src/lib/aztec/transactions.ts`)
   - Generate random invoice ID
   - Hash title and metadata
   - Call `InvoiceRegistry.create_invoice()` contract method
   - Wait for transaction confirmation
   - Fetch partial note hash from blockchain
4. **Register in API** via `createInvoiceInAPI()` (`src/lib/api/client.ts`)
   - Send invoice ID, addresses, amounts, hashes to backend
   - Backend stores in database for querying

### Payment Flow

1. **Buyer loads invoice** (`src/app/invoice/[id]/page.tsx`)
2. **Fetch invoice from API** with all metadata
3. **Pay on-chain** via `payInvoiceOnChain()` (`src/lib/aztec/transactions.ts`)
   - Check token balance
   - Create authwit for token transfer
   - Call `InvoiceRegistry.pay_invoice()` contract method
   - Wait for confirmation
   - Verify payment status on-chain
4. **Mark as paid in API** via `markInvoicePaid()` (`src/lib/api/client.ts`)

## Code Structure

### Aztec Integration Layer (`src/lib/aztec/`)

Mirrors the CLI implementation from `packages/cli/scripts/`:

- **`client.ts`** - Aztec node connection (like CLI utils)
- **`wallet.ts`** - Wallet creation from env vars (like CLI `getInvoiceAccounts()`)
- **`contracts.ts`** - Get contract instances (like CLI contract helpers)
- **`transactions.ts`** - Create and pay invoices (like CLI `create_invoice.ts` and `pay_invoice.ts`)

### API Layer (`src/lib/api/`)

- **`client.ts`** - HTTP client for backend API (based on CLI `utils/api.ts`)

### React Hooks (`src/hooks/`)

- **`useInvoiceOnChain.ts`** - React hook wrapping Aztec transactions
  - Manages loading states
  - Handles errors
  - Integrates with wallet store

### State Management (`src/stores/`)

- **`useWalletStore.ts`** - Wallet and account management
  - Generates addresses from env secret keys
  - Switches between seller/buyer roles
  - Auto-connects on load

- **`useInvoiceStore.ts`** - Invoice data caching
  - Fetches from API
  - Filters and searches
  - Updates after transactions

## Environment Setup

The app expects these environment variables (matching CLI setup):

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Aztec Node
NEXT_PUBLIC_AZTEC_NODE_URL=http://localhost:8080

# Account Credentials (from CLI setup)
SELLER_SECRET_KEY=<your seller secret key>
SELLER_SALT=<your seller salt>
BUYER_SECRET_KEY=<your buyer secret key>
BUYER_SALT=<your buyer salt>
```

## Deployment Data

Contract addresses are loaded from `src/lib/data/deployments.json` (copied from CLI):

```json
{
  "usdc": {
    "address": "0x..."
  },
  "registry": {
    "address": "0x...",
    "instance": { ... }
  }
}
```

This file is automatically copied from `packages/cli/scripts/data/deployments.json`.

## Current Implementation Status

### ✅ Completed

- API client matching CLI utils
- Project structure and components
- Wallet address generation from env
- Form validation and UI
- Deployment data integration
- Integration hooks and state management

### ⚠️ Partial (Temporary Mock Implementation)

The Aztec SDK integration is **structurally complete** but uses temporary mocks because the SDK packages haven't been installed yet (due to workspace catalog issues during `bun install`).

Files with TODO markers for real SDK calls:

1. **`src/lib/aztec/client.ts`**
   ```typescript
   // TODO: Add after fixing workspace dependencies
   // const { createAztecNodeClient } = await import("@aztec/aztec.js/node");
   ```

2. **`src/lib/aztec/wallet.ts`**
   ```typescript
   // TODO: Add after fixing workspace dependencies
   // const { TestWallet } = await import("@aztec/test-wallet/server");
   ```

3. **`src/lib/aztec/contracts.ts`**
   ```typescript
   // TODO: Add after fixing workspace dependencies
   // const { getInvoiceRegistry } = await import("@zk-invoice/contracts/contract");
   ```

4. **`src/lib/aztec/transactions.ts`**
   ```typescript
   // TODO: Add after fixing workspace dependencies
   // const { Fr } = await import("@aztec/aztec.js/fields");
   // const { createInvoice } = await import("@zk-invoice/contracts/contract");
   ```

Currently, these functions:
- ✅ Have the correct API and structure
- ✅ Match CLI implementation patterns
- ✅ Register invoices in the API
- ⚠️ Use mock blockchain calls (log only)

### 🚀 Next Steps to Enable Full Blockchain Integration

1. **Fix Package Dependencies**
   
   Add Aztec SDK packages to `packages/web/package.json`:
   ```json
   {
     "dependencies": {
       "@aztec/aztec.js": "workspace:*",
       "@aztec/test-wallet": "workspace:*",
       "@zk-invoice/contracts": "workspace:*"
     }
   }
   ```

2. **Uncomment Real Implementation**
   
   In each `src/lib/aztec/*.ts` file:
   - Uncomment the SDK imports
   - Remove the mock implementations
   - Uncomment the real contract calls

3. **Test End-to-End**
   
   ```bash
   # Start Aztec sandbox
   cd packages/contracts
   bun run sandbox
   
   # Deploy contracts (if not already deployed)
   bun run deploy:all
   
   # Start API
   cd packages/api
   bun run dev
   
   # Start web app
   cd packages/web
   bun run dev
   ```

4. **Verify Flow**
   - Create invoice as seller → Check on-chain + API
   - Switch to buyer role
   - Pay invoice → Check on-chain + API
   - Verify invoice status updates

## Key Differences from CLI

| Aspect | CLI | Web App |
|--------|-----|---------|
| Execution | Node.js script | React client-side |
| Wallet | Direct TestWallet | Zustand store wrapper |
| State | None (one-off) | Persistent across pages |
| Errors | Console logs | Toast notifications |
| UX | Terminal output | Loading states + progress UI |

## Testing Without Aztec SDK

Even without the SDK installed, you can:

1. ✅ Test the UI and forms
2. ✅ Test API integration (invoices stored in backend)
3. ✅ Test wallet switching (seller/buyer)
4. ✅ Test invoice listing and filtering
5. ⚠️ Payment flow returns mock data

The app gracefully handles the missing SDK and logs what would be done on-chain.

## Common Issues

### Issue: `Module not found: @aztec/aztec.js`

**Cause**: Aztec SDK packages not installed
**Solution**: Add to package.json and run `bun install`

### Issue: Addresses are mock values

**Cause**: Using temporary mock implementation
**Solution**: Uncomment real wallet derivation in `src/lib/aztec/wallet.ts`

### Issue: Invoice created but payment doesn't work

**Cause**: Partial note hash is "0x0" from mock
**Solution**: Enable real on-chain creation to get valid partial note

## References

- CLI Implementation: `packages/cli/scripts/create_invoice.ts` and `pay_invoice.ts`
- Contract Helpers: `packages/contracts/ts/src/contract.ts`
- API Types: `packages/api/src/types/api.ts`
- Aztec Documentation: https://docs.aztec.network

