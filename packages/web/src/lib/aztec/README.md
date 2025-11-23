# Aztec Integration

This directory contains Aztec SDK integration for blockchain operations.

## Setup Required

To enable full Aztec integration, you need to:

1. **Fix workspace dependencies** - Add Aztec SDK packages to web package.json:
   ```json
   {
     "dependencies": {
       "@zk-invoice/contracts": "workspace:*",
       "@aztec/aztec.js": "catalog:",
       "@aztec/accounts": "catalog:",
       "@aztec/foundation": "catalog:",
       "@aztec/stdlib": "catalog:"
     }
   }
   ```

2. **Implement the integration files** in this directory:
   - `client.ts` - Aztec node client connection
   - `wallet.ts` - Wallet creation from env secret keys
   - `contracts.ts` - InvoiceRegistry and Token contract instances
   - `transactions.ts` - Create and pay invoice on-chain

3. **Reference the CLI implementation** at `packages/cli/scripts/` for patterns:
   - `create_invoice.ts` - How to create invoice on-chain
   - `pay_invoice.ts` - How to pay invoice with authwit
   - `utils/index.ts` - Helper functions

## Current Status

The web app is currently using API-only storage. To enable blockchain features:

- Update `useWalletStore` to use real Aztec wallets
- Integrate contract calls in invoice creation flow
- Implement payment with authwit signatures
- Add transaction confirmation UIs

See main README for full integration guide.

