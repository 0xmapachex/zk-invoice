# ZK Invoice

A privacy-preserving invoice platform built on Aztec Network, enabling users to send and receive payments without exposing sensitive information. Create invoices, share a link, and receive payments—all while keeping your receiving address and personal details encrypted on-chain.

## 🏗️ Architecture Overview

ZK Invoice is a monorepo containing three main packages that work together to provide a complete private invoicing solution:

- **📄 Contracts**: Aztec Noir smart contracts with single InvoiceRegistry contract using hybrid storage (private + public)
- **🖥️ CLI Demo**: Bun-based command-line interface demonstrating invoice creation and payment workflow
- **🌐 Invoice API**: RESTful HTTP service for invoice management and status tracking

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ZK Invoice System                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Terminal 1 │         │   Terminal 2 │         │   Terminal 3 │
│              │         │              │         │              │
│    Aztec     │         │  Invoice API │         │  CLI Scripts │
│   Sandbox    │         │   (Bun)      │         │   (Bun)      │
│              │         │              │         │              │
│  Port 8080   │         │  Port 3000   │         │              │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │ PXE + Sequencer        │ REST API               │ Scripts
       │                        │                        │
       ├────────────────────────┼────────────────────────┤
       │                        │                        │
       ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Flow                                 │
│                                                                   │
│  1. CREATE INVOICE (Sender)                                      │
│     CLI → InvoiceRegistry.create_invoice()                       │
│         → Generates partial note commitment (on-chain)           │
│         → CLI fetches partial note hash                          │
│         → CLI → API (stores invoice + partial note hash)         │
│                                                                   │
│  2. PAY INVOICE (Payer)                                          │
│     CLI → API (fetch pending invoice)                            │
│         → Gets partial note hash from API                        │
│         → CLI → Token.transfer_private_to_commitment()           │
│         → Completes partial note (funds to sender)               │
│         → CLI → InvoiceRegistry.pay_invoice()                    │
│         → Marks invoice as paid (on-chain)                       │
│         → CLI → API (update status to "paid")                    │
│                                                                   │
│  3. VERIFY PAYMENT                                               │
│     CLI → InvoiceRegistry.is_paid()                              │
│         → Checks public storage (is_paid_status)                 │
│         → Returns true/false                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Storage Architecture                         │
└─────────────────────────────────────────────────────────────────┘

BLOCKCHAIN (Aztec)
├── InvoiceRegistry Contract
│   ├── Private Storage (Encrypted)
│   │   └── invoice_details_map: Map<Field, PrivateImmutable<InvoiceDetails>>
│   │       ├── sender_address (hidden)
│   │       ├── title_hash (hidden)
│   │       └── metadata (hidden)
│   │
│   └── Public Storage (Visible to All)
│       ├── partial_notes: Map<Field, PublicMutable<Field>>
│       ├── token_addresses: Map<Field, PublicMutable<AztecAddress>>
│       ├── amounts: Map<Field, PublicMutable<u128>>
│       ├── title_hashes: Map<Field, PublicMutable<Field>>
│       └── is_paid_status: Map<Field, PublicMutable<bool>>
│
└── Token Contract (USDC)
    ├── Private Balances (Encrypted per user)
    └── Partial Note Commitments (for incomplete transfers)

OFF-CHAIN (SQLite)
└── Invoice API Database
    └── invoices table
        ├── invoiceId
        ├── registryAddress
        ├── senderAddress
        ├── partialNoteHash (critical for payment!)
        ├── title
        ├── tokenAddress
        ├── amount
        ├── status (pending/paid)
        ├── metadata
        └── createdAt
```

### Key Components

1. **Aztec Sandbox** (Terminal 1)
   - Local Aztec blockchain
   - PXE (Private Execution Environment) for managing private state
   - Sequencer for block production
   - JSON-RPC endpoint at http://localhost:8080

2. **Invoice API** (Terminal 2)
   - Bun HTTP server
   - SQLite database for invoice storage
   - REST endpoints for CRUD operations
   - Tracks invoice status and metadata
   - Serves at http://localhost:3000

3. **CLI Scripts** (Terminal 3)
   - TypeScript scripts for interacting with contracts
   - Uses generated contract bindings
   - Manages wallets and accounts
   - Demonstrates full invoice workflow

## 📦 Packages

### 1. 📄 Contracts (`packages/contracts`)

Aztec Noir smart contracts implementing the invoice registry with privacy-preserving features.

**Key Features:**
- **InvoiceRegistry Contract**: Single contract managing all invoices
- **Hybrid Storage**: Private sender data (encrypted) + Public payment info (visible to payer)
- **Partial Notes**: Payer completes note, funds go directly to sender (address hidden)
- **Nullifier-Based**: Double-payment prevention using nullifier tree
- **Event Emission**: Payment tracking via unencrypted logs

**Smart Contracts:**
- `InvoiceRegistry`: Main registry contract with `create_invoice` and `pay_invoice` methods
- `Token`: Standard token contract (from aztec-standards) for testing payments

**Usage:**
```bash
# Terminal 1: Start Aztec Sandbox
aztec start --sandbox

# Terminal 2: Build and run tests
cd packages/contracts
bun install
bun run build

## Run the TXE tests
bun run test:nr
## Run the PXE tests
bun test
## Run both tests
bun run test
```

**Privacy Architecture:**
```
┌─────────────────────┐
│ Private Storage     │ ← Encrypted on-chain (sender address, metadata)
│ (PrivateImmutable)  │   Only readable with viewing keys
└─────────────────────┘

┌─────────────────────┐
│ Public Storage      │ ← Visible to all (partial note, token, amount)
│ (PublicImmutable)   │   What payer needs to complete payment
└─────────────────────┘
```

### 2. 🖥️ CLI Demo (`packages/cli`)

A command-line interface demonstrating the complete invoice workflow with two parties: a sender and a payer.

**Demo Scenario:**
- **Sender** (Wallet #0): Creates invoice requesting 1000 USDC for services
- **Payer** (Wallet #1): Receives invoice link and pays 1000 USDC

**Available Commands:**

**Setup Commands:**
- `bun run deploy`: Deploy USDC token contract
- `bun run setup:mint`: Mint 50,000 USDC to payer account
- `bun run setup:accounts`: Setup and configure accounts (testnet only)

**Invoice Commands:**
- `bun run invoice:create`: Create a new invoice (sender perspective)
- `bun run invoice:pay`: Pay a pending invoice (payer perspective)
- `bun run invoice:check-db`: View all invoices in API database
- `bun run invoice:get-onchain <id>`: Query invoice data from blockchain
- `bun run invoice:fix-partial-notes`: Fix invoices with invalid partial notes (migration tool)

**Utility Commands:**
- `bun run balances`: Check USDC balances of sender and payer
- `bun run cleanup`: Clean up deployment files and reset state

**Complete Workflow:**

**⚠️ Prerequisites: Build contracts and make sure Aztec Sandbox & Invoice API are running!**

```bash
# Terminal 1: Run Aztec Sandbox
aztec start --sandbox

# Terminal 2: Run Invoice API
bun run api
```

```bash
# Build contracts
bun install
cd packages/contracts
bun run build
cd -
```

```bash
cd packages/cli

# 0. Setup .env
cp .env.example .env  # Edit if using testnet

# 1. Setup environment (run once per sandbox session)
bun run setup:deploy   # Deploy and mint tokens
bun run setup:mint     # Mint additional tokens if needed
bun run balances       # Check initial balances

# 2. Deploy InvoiceRegistry (one-time per environment)
bun run deploy:registry

# 3. Create an invoice (sender perspective)
bun run invoice:create
# Output: Invoice ID and shareable URL

# 4. Pay the invoice (payer perspective)
bun run invoice:pay
# Completes partial note, sender receives funds privately

# 5. Check final balances
bun run balances
```

### 3. 🌐 Invoice API (`packages/api`)

A RESTful HTTP service for invoice management, tracking, and status updates.

**Key Features:**
- **Invoice Management**: Create, retrieve, and track invoices
- **Status Tracking**: Monitor payment status (pending/paid)
- **Filtering**: Query invoices by token, status, or sender
- **SQLite Database**: Persistent storage with pluggable architecture
- **RESTful API**: Standard HTTP endpoints for integration

**API Endpoints:**

#### Create Invoice
```bash
POST /invoice
Content-Type: application/json

{
  "senderAddress": "0x1234...",
  "title": "Payment for Services",
  "tokenAddress": "0x5678...",
  "amount": "1000000000000000000",
  "metadata": "Optional notes"
}
```

#### Get Invoices
```bash
# Get all invoices
GET /invoice

# Get specific invoice by ID
GET /invoice?id=invoice-id-here

# Filter by status
GET /invoice?status=pending
GET /invoice?status=paid

# Filter by token address
GET /invoice?token_address=0x5678...
```

#### Mark Invoice as Paid
```bash
POST /invoice/paid
Content-Type: application/json

{
  "invoiceId": "invoice-id-here"
}
```

**Usage:**

Run the Invoice API locally:
```bash
cd packages/api

# Install and start
bun install
bun run start  # Production mode
bun run dev    # Development mode with hot reload

# Run tests
bun test                 # All tests
bun run test:db          # Database tests only
bun run test:handlers    # API handler tests only
bun run test:integration # Integration tests only
```

Or from root directory:
```bash
bun run api      # Production mode
bun run api:dev  # Development mode with auto-reload
```

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.1.22+)
- [Aztec CLI](https://docs.aztec.network/guides/developer_guides/getting_started/quickstart) for sandbox and PXE
- [Docker](https://www.docker.com/) (for Aztec Sandbox)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zk-invoice

# Install dependencies for all packages
bun install
```

### Complete Setup Guide

Follow these steps to get the entire system running. You'll need **3 terminals**.

#### Step 1: Build Contracts (Required First!)

```bash
# In the project root
cd packages/contracts
bun install
bun run build      # Compiles Noir contracts and generates TypeScript bindings
cd ../..
```

**What this does:**
- Compiles Aztec Noir smart contracts (`InvoiceRegistry`)
- Generates TypeScript artifacts and bindings
- Must be done before starting any services

#### Step 2: Start Aztec Sandbox (Terminal 1)

```bash
# Terminal 1 - Keep this running
aztec start --sandbox
```

**Wait for:** `Aztec Server listening on port 8080`

**What this does:**
- Starts local Aztec blockchain (Sandbox)
- Runs PXE (Private Execution Environment)
- Provides JSON-RPC endpoint at `http://localhost:8080`

**Troubleshooting:**
- If sandbox gets stuck (no new blocks), restart it: `docker ps` then `docker restart <container_id>`

#### Step 3: Start Invoice API (Terminal 2)

```bash
# Terminal 2 - Keep this running
cd packages/api
bun install
bun run dev        # Development mode with hot reload
```

**Wait for:** `🚀 Invoice API listening on port 3000`

**What this does:**
- Starts RESTful HTTP server on `http://localhost:3000`
- Manages invoice data in SQLite database
- Provides endpoints for invoice creation, payment tracking, and queries

**Troubleshooting:**
- If you see "disk I/O error", restart the API
- Database file: `packages/api/invoices.sqlite`

#### Step 4: Deploy Contracts & Run Demo (Terminal 3)

Now that both services are running, deploy contracts and create/pay invoices:

```bash
# Terminal 3 - Run commands here
cd packages/cli
bun install

# 1. Deploy Token Contract (USDC) - Run once per sandbox session
bun run setup:deploy
# This creates USDC token and saves address to scripts/data/deployments.json

# 2. Deploy Invoice Registry - Run once per sandbox session
bun run deploy:registry
# This creates the InvoiceRegistry contract and saves address to scripts/data/deployments.json

# 3. Mint tokens to payer - Required before paying invoices
bun run setup:mint
# This gives the payer 50,000 USDC to pay invoices

# 4. Check initial balances
bun run balances
# Should show: Payer = 50,000 USDC, Sender = 0 USDC

# 5. Create an invoice (as sender)
bun run invoice:create
# This creates an invoice requesting 1,000 USDC
# Stores invoice in API with valid partial note hash

# 6. Verify invoice in database
bun run invoice:check-db
# Should show invoice with "✅ Valid partial note hash"

# 7. Pay the invoice (as payer)
bun run invoice:pay
# Completes the partial note and transfers 1,000 USDC to sender
# Marks invoice as paid in API

# 8. Check final balances
bun run balances
# Should show: Payer = 49,000 USDC, Sender = 1,000 USDC
```

### 🔄 Quick Restart (After Stopping Sandbox)

If you stop and restart the Aztec Sandbox, you'll need to redeploy:

```bash
# Terminal 1: Restart Aztec Sandbox
aztec start --sandbox

# Terminal 2: Restart Invoice API
cd packages/api
bun run dev

# Terminal 3: Redeploy everything
cd packages/cli
bun run setup:deploy      # Redeploy token
bun run deploy:registry   # Redeploy registry
bun run setup:mint        # Mint tokens again
bun run balances          # Verify balances

# Now you can create and pay invoices again
bun run invoice:create
bun run invoice:pay
```

### 📝 Environment Variables

Create a `.env` file in the project root:

```bash
# Local Sandbox (default)
L2_NODE_URL=http://localhost:8080
API_URL=http://localhost:3000

# Optional: For testnet deployment
# L2_NODE_URL=https://api.aztec.network
# API_URL=https://your-api-url.com
```

## 🔧 Development

### Building Contracts

After making changes to Noir contracts in `packages/contracts/src/`, you must rebuild:

```bash
cd packages/contracts
bun run build          # Compiles and generates TypeScript bindings
```

**What happens during build:**
1. `aztec-nargo compile` - Compiles Noir contracts
2. `aztec-cli generate-bindings` - Generates TypeScript artifacts
3. Updates `target/` folder with JSON artifacts
4. Updates `ts/src/artifacts/` with TypeScript bindings

### Running Tests

```bash
# Contract tests (requires running sandbox in Terminal 1)
cd packages/contracts
bun test                # Run JS/TS (PXE) tests
bun run test:nr         # Run Noir (TXE) tests
bun run test            # Run all contract tests

# API service tests (standalone, no sandbox needed)
cd packages/api
bun test                    # All tests
bun run test:db             # Database tests only
bun run test:handlers       # Handler tests only
bun run test:integration    # Integration tests

# CLI scripts (requires sandbox + API running)
cd packages/cli
bun run balances        # Check balances
bun run invoice:check-db # Check database state
```

### Common Development Tasks

#### Recompile After Contract Changes
```bash
cd packages/contracts
bun run build
# Then restart any CLI scripts using the updated contract
```

#### Reset Local Database
```bash
# If invoices get corrupted or you want to start fresh
rm packages/api/invoices.sqlite
# Restart the API in Terminal 2
```

#### View Sandbox Logs
```bash
# Check Docker logs for Aztec Sandbox
docker ps                          # Find container ID
docker logs -f <container_id>      # Follow logs
```

#### Restart Sandbox (If Stuck)
```bash
# Find and restart the sandbox container
docker ps
docker restart <container_id>

# Then redeploy contracts in Terminal 3
cd packages/cli
bun run setup:deploy
bun run deploy:registry
```

### Project Structure

```
zk-invoice/
├── packages/
│   ├── contracts/           # Aztec Noir smart contracts
│   │   ├── src/
│   │   │   ├── main.nr     # Invoice Registry Contract
│   │   │   └── types/      # Custom types and notes
│   │   └── ts/             # Contract artifacts and TS libraries for calling the invoice contracts
│   ├── cli/                # CLI demonstration
│   │   ├── scripts/        # Demo scripts
│   │   └── data/           # Test data and deployments
│   └── api/                # HTTP orderflow service
│       ├── src/            # API implementation
│       └── tests/          # Comprehensive test suite
├── deps/
│   └── aztec-standards/    # Aztec standard contracts
└── scripts/                # Root-level utility scripts
```

## 🐛 Troubleshooting

### "Aztec Server listening on port 8080" never appears
**Problem:** Sandbox failed to start or port is already in use

**Solution:**
```bash
# Check if port 8080 is already in use
lsof -i :8080

# Kill any process using port 8080
kill -9 <PID>

# Or restart Docker
docker ps
docker stop <container_id>
aztec start --sandbox
```

### "Registry contract not deployed"
**Problem:** Trying to create invoice before deploying registry

**Solution:**
```bash
cd packages/cli
bun run deploy:registry
```

### "Insufficient balance" when paying invoice
**Problem:** Payer doesn't have enough tokens

**Solution:**
```bash
cd packages/cli
bun run setup:mint      # Mint 50,000 USDC to payer
bun run balances        # Verify balance
```

### "Partial Note Hash: 0x0" in database
**Problem:** Invoice created with invalid partial note (old bug)

**Solution:**
```bash
# Option 1: Clear database and create fresh invoices
rm packages/api/invoices.sqlite
# Restart API in Terminal 2
cd packages/api
bun run dev

# Option 2: Fix existing invoices
cd packages/cli
bun run invoice:fix-partial-notes
```

### "Nullifier witness not found"
**Problem:** PXE out of sync or trying to spend note it doesn't know about

**Solution:**
```bash
# 1. Wait longer (PXE needs time to sync)
# Scripts already include delays, but if issue persists:

# 2. Restart sandbox
docker ps
docker restart <container_id>

# 3. Redeploy and try again
cd packages/cli
bun run setup:deploy
bun run deploy:registry
bun run setup:mint
```

### "fatal: not a git repository" during bun install
**Problem:** Broken git submodule reference in `deps/aztec-standards`

**Solution:**
```bash
# The postinstall script is already configured to skip submodules
# If you see this error, the fix has already been applied
# Just run bun install again:
bun install

# Alternative: Manually fix the submodule
git submodule deinit -f deps/aztec-standards
git submodule update --init --recursive
```

### "disk I/O error" from API
**Problem:** SQLite database locked or corrupted

**Solution:**
```bash
# Stop API (Ctrl+C in Terminal 2)
# Remove database
rm packages/api/invoices.sqlite
# Restart API
cd packages/api
bun run dev
```

### Sandbox stuck (no new blocks)
**Problem:** Local sandbox not producing blocks

**Solution:**
```bash
# Find container
docker ps | grep aztec

# Restart container
docker restart <container_id>

# Wait for "Aztec Server listening on port 8080"
# Then redeploy contracts
cd packages/cli
bun run setup:deploy
bun run deploy:registry
```

### "Payment verification failed"
**Problem:** Payment succeeded but verification shows as failed (timing issue)

**Solution:**
- This is a known issue with public state propagation
- The payment actually succeeded (check with `bun run balances`)
- The verification step may need more time
- **Workaround:** Check balance manually, ignore verification warning

### Contract changes not reflected
**Problem:** Modified Noir contract but CLI scripts still use old version

**Solution:**
```bash
# Rebuild contracts
cd packages/contracts
bun run build

# Then redeploy
cd ../cli
bun run deploy:registry
```

## 🔐 Privacy Features

This Invoice platform leverages Aztec's advanced privacy features:

- **Private Balances**: Token balances remain completely private and hidden from public view
- **Confidential Payments**: Payment amounts and sender addresses are encrypted on-chain
- **Partial Note Commitments**: Enable private payment flows where payer completes note without knowing recipient
- **Zero-Knowledge Proofs**: All operations are cryptographically verified without revealing sensitive data
- **Encrypted Notes**: Invoice details stored as encrypted notes, only readable with viewing keys
- **Nullifier-Based**: Prevents double-payment using nullifier tree
- **Hybrid Storage**: Public payment info (for payer) + Private sender details (encrypted)

## 🛠️ Technology Stack

- **Smart Contracts**: Aztec Noir
- **Runtime**: Bun
- **Orderflow Service**: Native Bun HTTP server
- **Database**: SQLite (with pluggable architecture)
- **Testing**: Jest with Bun test runner
- **TypeScript**: Full type safety across all packages

## 📚 Usage Examples

### Creating an Invoice

```typescript
// 1. Create invoice in registry contract
const txHash = await registry.methods.create_invoice(
  invoiceId,
  titleHash,
  tokenAddress,
  amount,
  metadata
).send().wait();

// 2. Fetch partial note hash from blockchain
const paymentInfo = await registry.methods.get_payment_info(invoiceId).simulate();
const partialNoteHash = paymentInfo.partial_note.toString();

// 3. Register invoice in API
const response = await fetch('http://localhost:3000/invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invoiceId: invoiceId.toString(),
    registryAddress: registry.address.toString(),
    senderAddress: sender.toString(),
    partialNoteHash,
    title: "Payment for Services",
    tokenAddress: tokenAddress.toString(),
    amount: amount.toString()
  })
});
```

### Paying an Invoice

```typescript
// 1. Query pending invoices
const invoices = await fetch('http://localhost:3000/invoice?status=pending').then(r => r.json());
const invoice = invoices.data[0];

// 2. Create authwit for payment
const { authwit, nonce } = await getPrivateTransferToCommitmentAuthwit(
  wallet, 
  payer, 
  token, 
  registry.address, 
  Fr.fromString(invoice.partialNoteHash), 
  BigInt(invoice.amount)
);

// 3. Pay the invoice
await registry.methods.pay_invoice(
  Fr.fromString(invoice.invoiceId),
  Fr.fromString(invoice.partialNoteHash),
  AztecAddress.fromString(invoice.tokenAddress),
  BigInt(invoice.amount),
  nonce
).send({ authWitnesses: [authwit] }).wait();
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Aztec Network](https://aztec.network)
- [Aztec Documentation](https://docs.aztec.network)
- [Bun Runtime](https://bun.sh)

---

Built with ❤️ on Aztec Network for private, secure invoice payments.
