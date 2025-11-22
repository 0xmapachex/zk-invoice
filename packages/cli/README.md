# Invoice CLI

A Bun-based command-line interface demonstrating the complete invoice workflow with private payments on Aztec.

## 🎭 Demo Scenario

- **Sender** (Invoice Creator): Creates an invoice requesting payment
- **Payer** (Invoice Payer): Pays the invoice using private tokens

The invoice system uses a single shared Invoice Registry contract where all invoices are managed.

## 🚀 Available Commands

### Setup Commands
- `bun run setup:deploy`: Deploy token contract (USDC)
- `bun run setup:mint`: Mint tokens to the payer account
- `bun run setup:accounts`: Setup and configure accounts (testnet only)
- `bun run deploy:registry`: Deploy the Invoice Registry contract (one-time)
- `bun run balances`: Check token balances of sender and payer

### Invoice Commands
- `bun run invoice:create`: Create a new invoice
- `bun run invoice:pay`: Pay a pending invoice
- `bun run invoice:check-db`: Check invoices in the API database
- `bun run invoice:get-onchain`: Query invoice data from blockchain
- `bun run invoice:fix-partial-notes`: Fix invoices with invalid partial notes (migration)

## 📋 Prerequisites

### For Local Development (Sandbox)

1. **Terminal 1 - Aztec Sandbox:**
```bash
aztec start --sandbox
# Wait for "Aztec Server listening on port 8080"
```

2. **Terminal 2 - Invoice API:**
```bash
cd packages/api
bun install
bun run dev
# Starts on http://localhost:3000
```

3. **Terminal 3 - CLI Commands:**
```bash
cd packages/cli
bun install
# Now run the workflow commands below
```

### Environment Variables

Create a `.env` file in the project root:
```bash
L2_NODE_URL=http://localhost:8080
API_URL=http://localhost:3000
```

## 🔄 Complete Workflow

### First Time Setup

```bash
cd packages/cli

# 1. Deploy token contracts (run once per sandbox session)
bun run setup:deploy

# 2. Deploy Invoice Registry (run once per sandbox session)
bun run deploy:registry

# 3. Mint tokens to payer (so they can pay invoices)
bun run setup:mint

# 4. Verify balances
bun run balances
```

### Invoice Workflow

```bash
# 1. Create an invoice (sender perspective)
bun run invoice:create
# Expected: Invoice created with valid partial note hash (not 0x0)

# 2. Verify invoice in database
bun run invoice:check-db
# Expected: Shows invoice with "✅ Valid partial note hash"

# 3. Pay the invoice (payer perspective)
bun run invoice:pay
# Expected: Payment succeeds, invoice marked as paid

# 4. Check final balances
bun run balances
# Expected: Sender received payment, payer balance decreased
```

## 📝 Command Details

### `bun run setup:deploy`
- Deploys USDC token contract
- Only needs to be run once per new sandbox instantiation
- Saves deployment addresses to `scripts/data/deployments.json`

### `bun run deploy:registry`
- Deploys the Invoice Registry contract
- **REQUIRED** before creating invoices
- Run once per sandbox session
- Saves registry address and secret key to `scripts/data/deployments.json`

### `bun run setup:mint`
- Mints tokens to the **payer** account
- Mints 50,000 USDC
- **REQUIRED** before paying invoices
- On localhost: Uses 3-second delays instead of block waiting
- On testnet: Waits for block finalization

### `bun run invoice:create`
- **Sender action**: Creates a new invoice
- Creates a partial note on-chain for private payment
- Stores invoice details in the API
- Fetches the correct partial note hash from blockchain
- On localhost: Uses 3-second delay instead of block waiting

### `bun run invoice:pay`
- **Payer action**: Pays a pending invoice
- Queries API for pending invoices and pays the first one
- Completes the partial note to transfer tokens privately
- Verifies payment on-chain
- Updates invoice status in API
- Includes retry logic with automatic sync handling

### `bun run balances`
- Displays current token balances for sender and payer
- Shows USDC balances
- Useful for verifying successful payments

### `bun run invoice:check-db`
- Displays all invoices in the API database
- Shows invoice ID, partial note hash, status, and amount
- Validates partial note hashes (checks for 0x0)
- Useful for debugging invoice issues

### `bun run invoice:get-onchain <invoice_id>`
- Queries invoice data directly from the blockchain
- Shows public payment info (visible to everyone)
- Shows private invoice data (only sender can read)
- Shows payment status (paid/pending)
- Requires invoice ID as argument

### `bun run invoice:fix-partial-notes`
- Migration script for fixing old invoices with invalid partial notes
- Fetches correct partial note hashes from blockchain
- Updates invoices via API PATCH endpoint
- Only needed if you have invoices created before the fix

## 🔐 Privacy Features

This demo showcases Aztec's privacy capabilities:

- **Private Balances**: Token balances remain completely private
- **Confidential Payments**: Payment amounts and recipients are private
- **Partial Note Commitments**: Enable private payment flows
- **Zero-Knowledge Proofs**: All operations are cryptographically verified
- **Encrypted Notes**: Invoice details encrypted on-chain

## 🐛 Troubleshooting

### "Registry contract not deployed"
**Solution:** Run `bun run deploy:registry` first

### "Insufficient balance"
**Solution:** Run `bun run setup:mint` to mint tokens to the payer

### "Partial Note Hash: 0x0"
**Problem:** Old invoice with invalid partial note
**Solution:** 
1. Clear database: `rm packages/api/invoices.sqlite`
2. Restart API
3. Create fresh invoice

### "Nullifier witness not found"
**Problem:** PXE sync issue or blocks not producing (sandbox stuck)
**Solution:**
1. Restart Aztec sandbox: `docker restart aztec-start-<id>`
2. On localhost, scripts automatically use fixed delays instead of block waiting
3. Wait 30+ seconds between operations for PXE to catch up

### Sandbox Stuck (No New Blocks)
**Problem:** Local sandbox not producing blocks
**Solution:**
1. Restart sandbox: `docker ps` to find container, then `docker restart <container_id>`
2. Scripts detect localhost and use time delays instead of block waiting
3. This doesn't happen on testnet/mainnet (blocks produce automatically)

## 📚 Documentation

For detailed explanations of the fixes and architecture:

- **`PAYMENT_FIX.md`** - Complete fix documentation for payment issues
- **`PXE_SYNC_ANALYSIS.md`** - Deep dive into PXE synchronization
- **`SYNC_ISSUE_RESOLUTION.md`** - Answers "why does PXE get out of sync?"
- **`ON_DEMAND_BLOCKS.md`** - How block triggering works on local sandbox
- **`TESTING_GUIDE.md`** - Step-by-step testing instructions

## 🌐 Network Differences

### Local Sandbox (localhost:8080)
- On-demand block production (blocks only mine with transactions)
- Scripts automatically use fixed time delays (3-5 seconds)
- Faster iteration for development
- May get stuck (requires restart)

### Testnet/Mainnet
- Automatic block production (every 6-12 seconds)
- Scripts wait for actual block finalization
- More reliable but slower
- Same code works on both environments

## 💡 Best Practices

1. **Always deploy registry first** - Can't create invoices without it
2. **Mint before paying** - Payer needs tokens to pay invoices
3. **Check database** - Use `invoice:check-db` to verify partial notes
4. **Fresh invoices** - After fixes, create new invoices (old ones may have 0x0 partial notes)
5. **Restart sandbox** - If blocks get stuck, restart is the quickest fix
6. **Wait between operations** - Give PXE time to process blocks
