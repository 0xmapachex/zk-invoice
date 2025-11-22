# ZK Invoice Escrow Contracts

Aztec Noir smart contracts implementing the core OTC escrow functionality for private and secure token swaps.

## 🔑 Key Features

- **OTC Escrow Contract**: Secure escrow mechanism for token swaps
- **Token Contract**: Standard token implementation for testing
- **Private Transfers**: Leverages Aztec's privacy features
- **Atomic Swaps**: Ensures both parties receive their tokens or the trade fails

## 📄 Smart Contracts

- `OTCEscrowContract`: Main escrow contract that holds seller's tokens until buyer fulfills the order
- `Token`: Standard token contract compatible with Aztec's privacy features

## 🚀 Installation & Setup

```bash
bun install
bun run build
```

## 🧪 Running Tests

**Prerequisites:** Tests require a running Aztec sandbox and secondary PXE - this is provided with a docker compose script.

```bash
# Terminal 1: Start Aztec sandbox & two PXE clients
bun run sandbox

# Terminal 2
# Run PXE tests
bun test

# Run TXE tests
bun run test:nr
```

## 🏗️ Project Structure

```
contracts/
├── src/
│   ├── main.nr          # OTC Escrow Contract
│   ├── types/           # Custom types and notes
│   └── test/            # Contract tests
├── artifacts/           # Compiled contract artifacts
└── ts/                  # TypeScript bindings
```

## 🔐 Privacy Features

- **Private Balances**: Token balances remain completely private
- **Confidential Transfers**: Transfer amounts and recipients are kept confidential
- **Zero-Knowledge Proofs**: All operations are cryptographically verified
- **Trustless Escrow**: Atomic swaps provide secure, trustless asset exchanges

