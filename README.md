# ZK Invoice

A privacy-preserving invoice platform built on Aztec Network, enabling users to send and receive payments without exposing sensitive information. Create invoices, share a link, and receive payments—all while keeping your receiving address and personal details encrypted on-chain.

## 🏗️ Architecture Overview

ZK Invoice is a monorepo containing three main packages that work together to provide a complete private invoicing solution:

- **📄 Contracts**: Aztec Noir smart contracts with single InvoiceRegistry contract using hybrid storage (private + public)
- **🖥️ CLI Demo**: Bun-based command-line interface demonstrating invoice creation and payment workflow
- **🌐 Invoice API**: RESTful HTTP service for invoice management and status tracking

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
bun run sandbox

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
- `bun run setup:deploy`: Deploy token contracts and mint initial balances
- `bun run setup:mint`: Mint additional tokens to participants
- `bun run setup:accounts`: Setup and configure accounts
- `bun run deploy:registry`: Deploy InvoiceRegistry contract (one-time)
- `bun run invoice:create`: Create a new invoice (sender)
- `bun run invoice:pay`: Pay an existing invoice (payer)
- `bun run balances`: Check token balances of all participants

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

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zk-invoice

# Install dependencies for all packages
bun install
```

### Development Setup

**⚠️ Important: You MUST run the orderflow service for the demo to work properly!**

#### Step-by-Step Setup (2 Terminals Required)

**⚠️ Prerequisites: Build contracts first!**
```bash
bun install
cd packages/contracts
bun run build      # REQUIRED: Build contracts before starting services
cd -
```

1. **Terminal 1 - Start Aztec Sandbox:**
```bash
bun run sandbox
```

4. **Terminal 2 - Deploy Contracts & Run Demo:**
```bash
cd packages/cli
bun run setup:deploy    # Deploy token contracts
bun run setup:mint      # Mint tokens to payer account ⭐ REQUIRED
bun run balances        # Check balances after minting
bun run invoice:create  # Create invoice (sender)
bun run invoice:pay     # Pay invoice (payer)
bun run balances        # Check final balances
```

## 🔧 Development

### Building Contracts

```bash
cd packages/contracts
bun run build
```

### Running Tests

```bash
# Contract tests (requires running sandbox)
cd packages/contracts
bun test                # Run JS (PXE) tests
bun run test:nr         # Run Noir (TXE) tests
bun run test            # Run all contract tests

# Orderflow service tests
cd packages/api
bun test

# All tests can be run independently
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

## 🔐 Privacy Features

This Invoice desk leverages Aztec's advanced privacy features to ensure confidential trading:

- **Private Balances**: Token balances remain completely private and hidden from public view
- **Confidential Transfers**: Transfer amounts, recipients, and transaction details are kept confidential
- **Selective Disclosure**: Traders maintain full control over what information to reveal and when
- **Zero-Knowledge Proofs**: All operations are cryptographically verified without revealing sensitive trading data
- **Trustless Escrow**: Atomic swaps provide secure, trustless asset exchanges without intermediaries
- **Private Order Books**: Order details remain confidential until parties choose to execute trades

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
