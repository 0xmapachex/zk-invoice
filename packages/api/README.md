# Invoice API

A Bun-based HTTP server for handling invoice operations and blockchain transactions in ZK Invoice.

## Features

- **Database Operations**: Store and retrieve invoice data via SQLite
- **Blockchain Integration**: Create and pay invoices on Aztec L2
- **REST API**: Simple JSON API for frontend integration

## Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Aztec L2 Node URL
L2_NODE_URL=http://localhost:8080

# Account credentials (for testnet only, leave empty for sandbox)
SELLER_SECRET_KEY=
SELLER_SALT=
BUYER_SECRET_KEY=
BUYER_SALT=
```

## Installation

```bash
bun install
```

## Running the Server

```bash
# Development mode (auto-reload)
bun run dev

# Production mode
bun run start
```

Server runs on `http://localhost:3000`

## API Endpoints

### Database Endpoints

#### `GET /invoice`
Fetch invoices with optional filters

Query params:
- `id`: Invoice ID
- `status`: Filter by status (`pending`, `paid`)
- `sender_address`: Filter by sender
- `token_address`: Filter by token

#### `POST /invoice`
Create a new invoice in database

Body:
```json
{
  "invoiceId": "string",
  "registryAddress": "string",
  "senderAddress": "string",
  "partialNoteHash": "string",
  "title": "string",
  "tokenAddress": "string",
  "amount": "string",
  "metadata": "string" (optional)
}
```

#### `POST /invoice/paid`
Mark invoice as paid

Body:
```json
{
  "invoiceId": "string"
}
```

### Blockchain Endpoints

#### `POST /blockchain/invoice/create`
Create invoice on Aztec L2 blockchain

Body:
```json
{
  "title": "string",
  "amount": "string",
  "tokenAddress": "string",
  "metadata": "string" (optional)
}
```

Response:
```json
{
  "success": true,
  "data": {
    "invoiceId": "string",
    "partialNoteHash": "string",
    "txHash": "string",
    "registryAddress": "string"
  }
}
```

#### `POST /blockchain/invoice/pay`
Pay invoice on Aztec L2 blockchain

Body:
```json
{
  "invoiceId": "string",
  "partialNoteHash": "string",
  "tokenAddress": "string",
  "amount": "string"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "txHash": "string",
    "success": boolean
  }
}
```

#### `GET /blockchain/balance/:tokenAddress/:accountAddress`
Get token balance for an account

Response:
```json
{
  "success": true,
  "data": {
    "balance": "string"
  }
}
```

## Typical Flow

1. **Create Invoice On-Chain**: Frontend calls `POST /blockchain/invoice/create`
2. **Store in Database**: Use the returned data to call `POST /invoice`
3. **Buyer Pays**: Frontend calls `POST /blockchain/invoice/pay`
4. **Mark as Paid**: After successful payment, call `POST /invoice/paid`

## Development Notes

- The API requires Aztec contracts to be deployed first
- Deployment data is read from `../cli/scripts/data/deployments.json`
- For local sandbox: Use pre-funded test accounts (no env vars needed)
- For testnet: Run `setup_accounts.ts` first and set env vars

## Architecture

```
src/
├── blockchain/         # Aztec blockchain integration
│   ├── wallets.ts     # Wallet management
│   ├── contracts.ts   # Contract loading
│   └── transactions.ts # Invoice creation/payment
├── handlers/          # HTTP request handlers
│   ├── invoiceHandlers.ts      # Database operations
│   └── blockchainHandlers.ts   # Blockchain operations
├── db/                # Database layer
└── index.ts          # Main server
```

## Testing

```bash
# Run tests
bun test

# Test specific handlers
bun test:handlers
```
