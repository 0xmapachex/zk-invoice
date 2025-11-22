# ZK Invoice Contracts

Aztec Noir smart contracts implementing the core invoice functionality for private and secure payments.

## 🔑 Key Features

- **Invoice Registry Contract**: Single registry managing all invoices
- **Partial Note Commitments**: Enable private payment flows
- **Token Contract**: Standard token implementation for testing
- **Private Transfers**: Leverages Aztec's privacy features
- **Payment Tracking**: On-chain verification of invoice payments

## 📄 Smart Contracts

- `InvoiceRegistry`: Main contract that manages invoice creation and payment
- `Token`: Standard token contract compatible with Aztec's privacy features

## 🚀 Installation & Setup

```bash
bun install
bun run build
```

## 🧪 Running Tests

**Prerequisites:** Tests require a running Aztec sandbox.

```bash
# Terminal 1: Start Aztec sandbox
aztec start --sandbox

# Terminal 2: Run tests
bun test

# Run TXE tests (Aztec test execution environment)
bun run test:nr
```

## 🏗️ Project Structure

```
contracts/
├── src/
│   ├── main.nr          # Invoice Registry Contract
│   ├── types/           # Custom types and notes
│   │   ├── invoice_note.nr      # Private invoice note
│   │   └── config_note.nr       # Configuration note
│   └── test/            # Contract tests
│       ├── invoice.nr           # Invoice creation/payment tests
│       └── utils/               # Test utilities
└── ts/                  # TypeScript bindings & libraries
    ├── src/
    │   ├── artifacts/           # Contract artifacts
    │   │   ├── escrow/
    │   │   │   ├── InvoiceRegistry.ts
    │   │   │   └── InvoiceRegistry.json
    │   │   └── token/
    │   │       ├── Token.ts
    │   │       └── Token.json
    │   ├── contract.ts          # Helper functions for contract interaction
    │   ├── utils.ts             # Utility functions
    │   ├── fees.ts              # Fee handling utilities
    │   └── constants.ts         # Constants
    └── test/
        └── e2e.test.ts          # End-to-end integration tests
```

## 📝 Invoice Registry Contract

The `InvoiceRegistry` contract (`src/main.nr`) provides the core invoice functionality:

### Storage
- **Private Storage**: Encrypted invoice notes (only sender can read)
- **Public Storage**: Payment info (partial note hash, token, amount, title hash)

### Functions

#### `create_invoice`
Creates a new invoice by:
1. Generating a partial note commitment for private payment
2. Storing private invoice data (encrypted)
3. Storing public payment info (visible to payer)

**Parameters:**
- `invoice_id`: Unique identifier
- `title_hash`: Hash of invoice title
- `token_address`: Token to be paid
- `amount`: Amount to be paid
- `metadata`: Private metadata (encrypted)

#### `pay_invoice`
Pays an invoice by:
1. Completing the partial note commitment
2. Transferring tokens from payer to sender
3. Emitting a nullifier to prevent double-payment

**Parameters:**
- `invoice_id`: Invoice to pay
- `partial_note`: Partial note from invoice creation
- `token_address`: Token address
- `amount`: Amount to pay
- `_nonce`: Authwit nonce

#### `is_paid`
Checks if an invoice has been paid.

#### `get_invoice`
Retrieves private invoice data (only sender can access).

#### `get_payment_info`
Retrieves public payment info (anyone can access).

## 🔐 Privacy Features

- **Private Balances**: Token balances remain completely private
- **Confidential Payments**: Payment amounts and recipients are private until payment
- **Partial Note Commitments**: Enable private payment flows without revealing details upfront
- **Zero-Knowledge Proofs**: All operations are cryptographically verified
- **Encrypted Notes**: Invoice details encrypted on-chain, only readable by sender

## 🛠️ TypeScript Library

The `ts/` directory contains TypeScript helpers for interacting with contracts:

### Key Functions

```typescript
// Deploy registry contract
const { contract, secretKey } = await deployInvoiceRegistry(wallet, from);

// Create an invoice
const txHash = await createInvoice(
  wallet, from, registry,
  invoiceId, titleHash, tokenAddress, amount, metadata
);

// Pay an invoice
const txHash = await payInvoice(
  wallet, from, registry,
  invoiceId, partialNote, token, tokenAddress, amount
);

// Check if paid
const isPaid = await isInvoicePaid(wallet, from, registry, invoiceId);

// Get payment info
const paymentInfo = await getPaymentInfo(wallet, from, registry, invoiceId);
```

## 🧪 Testing

### Unit Tests (Noir)
Tests written in Noir using Aztec's TXE:

```bash
bun run test:nr
```

### Integration Tests (TypeScript)
End-to-end tests using the Aztec sandbox:

```bash
# Make sure sandbox is running
aztec start --sandbox

# Run tests
bun test
```

## 📦 Building & Deployment

### Compile Contracts
```bash
bun run build
```

This generates:
- Contract artifacts in `target/`
- TypeScript bindings in `ts/src/artifacts/`

### Deploy Registry
```bash
cd ../cli
bun run deploy:registry
```

The registry address and secret key will be saved to `scripts/data/deployments.json`.

## 🔧 Development

### Adding New Functions

1. **Add function to contract** (`src/main.nr`):
```noir
#[external("private")]
fn my_function(param: Field) {
    // Implementation
}
```

2. **Rebuild contracts**:
```bash
bun run build
```

3. **TypeScript bindings auto-generated** in `ts/src/artifacts/`

4. **Add helper function** (optional) in `ts/src/contract.ts`:
```typescript
export async function myFunction(
    wallet: BaseWallet,
    from: AztecAddress,
    registry: InvoiceRegistryContract,
    param: Fr
): Promise<TxHash> {
    const receipt = await registry
        .methods.my_function(param)
        .send({ from })
        .wait();
    return receipt.txHash;
}
```

### Custom Types

Define custom types in `src/types/`:
- `invoice_note.nr`: Private invoice note structure
- `config_note.nr`: Configuration note (if needed)

## 🐛 Troubleshooting

### Build Failures
**Solution**: Make sure you have the latest Aztec CLI:
```bash
aztec --version
# Update if needed
npm install -g @aztec/cli@latest
```

### Test Failures
**Solution**: Ensure sandbox is running and fully synced:
```bash
# Check sandbox health
curl http://localhost:8080/status
```

### Contract Not Found
**Solution**: Rebuild contracts after changes:
```bash
bun run build
```

## 📚 Resources

- [Aztec Documentation](https://docs.aztec.network)
- [Noir Language](https://noir-lang.org)
- [Aztec Standards (Token Contract)](https://github.com/defi-wonderland/aztec-standards)

## 🤝 Contributing

1. Make changes to contracts in `src/`
2. Update tests in `src/test/` and `ts/test/`
3. Run test suite: `bun test`
4. Rebuild: `bun run build`
5. Update this README with new functionality

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ using Aztec Noir for private invoice payments
