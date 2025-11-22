# Invoice Service

A RESTful HTTP service that provides invoice management capabilities, facilitating the creation, retrieval, and management of private invoices on the Aztec network.

## 🔑 Key Features

- **Invoice Management**: Create, update, and manage invoices with unique IDs
- **Invoice Discovery**: Query, filter, and search for invoices by status, token, or sender
- **Payment Tracking**: Track invoice payment status on-chain
- **SQLite Database**: Persistent storage with pluggable architecture for scalability
- **RESTful API**: Standard HTTP endpoints for seamless integration

## 🚀 Quick Start

```bash
bun install
bun run start  # Production mode
bun run dev    # Development mode with hot reload
```

The service will start on `http://localhost:3000`.

## 📋 API Endpoints

### POST /invoice
Create a new invoice. The service stores invoice details for easy retrieval.

**Request Body:**
```json
{
  "invoiceId": "0x1234...",
  "registryAddress": "0x5678...",
  "senderAddress": "0x9abc...",
  "partialNoteHash": "0xdef0...",
  "title": "Payment for Services",
  "tokenAddress": "0x1111...",
  "amount": "5000000000000000000000"
}
```

**Note**: BigInt values (`amount`) should be sent as strings in JSON and will be returned as strings in responses.

**Example:**
```bash
curl -X POST http://localhost:3000/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "0x1fa45352b94d07b0cbc80c2a81bee7706fcfb079436a08ea291af50110f27dd4",
    "registryAddress": "0x5678901234abcdef5678901234abcdef56789012",
    "senderAddress": "0x9abc901234abcdef9abc901234abcdef9abc9012",
    "partialNoteHash": "0x1c2fb364755478d43e0fc6964c65b0f2255e3376a2a15aff13a649f6f12c414f",
    "title": "Payment for Services",
    "tokenAddress": "0x1111901234abcdef1111901234abcdef11119012",
    "amount": "5000000000000000000000"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice created successfully",
  "invoiceId": "0x1fa45352b94d07b0cbc80c2a81bee7706fcfb079436a08ea291af50110f27dd4",
  "shareableUrl": "/invoice/0x1fa45352b94d07b0cbc80c2a81bee7706fcfb079436a08ea291af50110f27dd4",
  "data": {
    "invoiceId": "0x1fa45352b94d07b0cbc80c2a81bee7706fcfb079436a08ea291af50110f27dd4",
    "registryAddress": "0x5678901234abcdef5678901234abcdef56789012",
    "senderAddress": "0x9abc901234abcdef9abc901234abcdef9abc9012",
    "partialNoteHash": "0x1c2fb364755478d43e0fc6964c65b0f2255e3376a2a15aff13a649f6f12c414f",
    "title": "Payment for Services",
    "tokenAddress": "0x1111901234abcdef1111901234abcdef11119012",
    "amount": "5000000000000000000000",
    "status": "pending",
    "createdAt": 1700000000000
  }
}
```

### GET /invoice
Retrieve invoices with optional filtering.

**Query Parameters:**
- `id` (optional): Get a specific invoice by ID
- `status` (optional): Filter by status (`pending` or `paid`)
- `token_address` (optional): Filter by token address
- `sender_address` (optional): Filter by sender address

**Examples:**

Get all invoices:
```bash
curl http://localhost:3000/invoice
```

Get a specific invoice:
```bash
curl http://localhost:3000/invoice?id=0x1fa45352b94d07b0cbc80c2a81bee7706fcfb079436a08ea291af50110f27dd4
```

Get pending invoices:
```bash
curl http://localhost:3000/invoice?status=pending
```

Filter by token:
```bash
curl http://localhost:3000/invoice?token_address=0x1111901234abcdef1111901234abcdef11119012
```

**Response:**
```json
{
  "success": true,
  "message": "Retrieved 1 invoice(s)",
  "data": [
    {
      "invoiceId": "0x1fa45352b94d07b0cbc80c2a81bee7706fcfb079436a08ea291af50110f27dd4",
      "registryAddress": "0x5678901234abcdef5678901234abcdef56789012",
      "senderAddress": "0x9abc901234abcdef9abc901234abcdef9abc9012",
      "partialNoteHash": "0x1c2fb364755478d43e0fc6964c65b0f2255e3376a2a15aff13a649f6f12c414f",
      "title": "Payment for Services",
      "tokenAddress": "0x1111901234abcdef1111901234abcdef11119012",
      "amount": "5000000000000000000000",
      "status": "pending",
      "createdAt": 1700000000000
    }
  ]
}
```

### PATCH /invoice/:id
Update an invoice (currently supports updating `partialNoteHash`).

**Request Body:**
```json
{
  "partialNoteHash": "0x1c2fb364755478d43e0fc6964c65b0f2255e3376a2a15aff13a649f6f12c414f"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/invoice/0x1fa45352b94d07b0cbc80c2a81bee7706fcfb079436a08ea291af50110f27dd4 \
  -H "Content-Type: application/json" \
  -d '{
    "partialNoteHash": "0x1c2fb364755478d43e0fc6964c65b0f2255e3376a2a15aff13a649f6f12c414f"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice #0x1fa4... updated successfully",
  "data": {
    "invoiceId": "0x1fa45352b94d07b0cbc80c2a81bee7706fcfb079436a08ea291af50110f27dd4",
    "partialNoteHash": "0x1c2fb364755478d43e0fc6964c65b0f2255e3376a2a15aff13a649f6f12c414f",
    "status": "pending",
    "amount": "5000000000000000000000"
  }
}
```

### POST /invoice/paid
Mark an invoice as paid (called after payment is verified on-chain).

**Request Body:**
```json
{
  "invoiceId": "0x1fa45352b94d07b0cbc80c2a81bee7706fcfb079436a08ea291af50110f27dd4"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/invoice/paid \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "0x1fa45352b94d07b0cbc80c2a81bee7706fcfb079436a08ea291af50110f27dd4"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice #0x1fa4... marked as paid"
}
```

### GET /health
Health check endpoint.

```bash
curl http://localhost:3000/health
```

**Response:**
```
OK
```

## 🗂️ Project Structure

```
packages/api/
├── src/
│   ├── db/
│   │   ├── index.ts           # Database exports
│   │   ├── interface.ts       # Database interface definition
│   │   └── sqlite.ts          # SQLite implementation
│   ├── handlers/
│   │   ├── index.ts           # Handler exports
│   │   └── invoiceHandlers.ts # Invoice request handlers
│   ├── types/
│   │   └── api.ts             # TypeScript type definitions
│   ├── utils/
│   │   ├── serialization.ts   # BigInt serialization utilities
│   │   └── uuid.ts            # UUID generation
│   └── index.ts               # Main server entry point
├── tests/
│   ├── db/                    # Database tests
│   ├── handlers/              # Handler tests
│   └── utils/                 # Utility function tests
├── invoices.sqlite            # SQLite database file (auto-generated)
├── package.json
└── README.md
```

## 🛠️ Development

### Running Tests

```bash
bun test
```

### Database

The service uses SQLite for local development. The database file (`invoices.sqlite`) is automatically created on first run.

To reset the database:
```bash
rm invoices.sqlite
bun run dev  # Database will be recreated
```

### Database Schema

**invoices table:**
| Column | Type | Description |
|--------|------|-------------|
| invoiceId | TEXT | Primary key, unique identifier |
| registryAddress | TEXT | Address of registry contract |
| senderAddress | TEXT | Invoice creator's address |
| partialNoteHash | TEXT | Partial note for payment |
| title | TEXT | Invoice title |
| tokenAddress | TEXT | Token to be paid |
| amount | TEXT | Amount (as string) |
| status | TEXT | 'pending' or 'paid' |
| metadata | TEXT | Optional metadata |
| createdAt | INTEGER | Unix timestamp |

## 🔧 Configuration

### Environment Variables

Create a `.env` file:
```bash
PORT=3000
```

### Scaling

The database interface is abstracted to allow easy swapping:

```typescript
// Switch from SQLite to another database:
import { PostgreSQLDatabase } from "./db/postgresql";
const database = new PostgreSQLDatabase();
```

## 🐛 Troubleshooting

### "Database locked" error
**Solution**: Only one process can write to SQLite at a time. Make sure you're not running multiple instances.

### BigInt serialization errors
**Solution**: Use the provided `serializeInvoice()` utility when sending responses.

### CORS issues
**Solution**: Add CORS headers to responses if accessing from a browser:
```typescript
headers: { 
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
}
```

## 🔐 Security Considerations

### Current Implementation (Development)
- No authentication required
- All invoices publicly queryable
- Suitable for development and testing

### Production Recommendations
1. **Authentication**: Add API keys or JWT tokens
2. **Authorization**: Restrict invoice queries to authorized parties
3. **Rate Limiting**: Prevent API abuse
4. **HTTPS**: Use TLS in production
5. **Database Encryption**: Encrypt sensitive fields
6. **Input Validation**: Validate all addresses and amounts

## 📊 Performance

- **SQLite Performance**: Handles 1000+ invoices easily
- **Query Indexes**: Created on `invoiceId`, `status`, and `tokenAddress`
- **Concurrent Requests**: Handled by Bun's async runtime

For production with high volume, consider:
- PostgreSQL for concurrent writes
- Redis for caching
- Load balancing for horizontal scaling

## 🧪 Testing

Run the test suite:
```bash
bun test
```

Test coverage:
- Database operations
- Handler functions
- Serialization utilities
- Error handling

## 📚 Related Documentation

- **CLI Documentation**: `../cli/README.md` - Command-line tools for invoice management
- **Contract Documentation**: `../contracts/README.md` - Smart contract details
- **Main README**: `../../README.md` - Complete project overview

## 🤝 Contributing

1. Add new handlers in `src/handlers/`
2. Update types in `src/types/api.ts`
3. Add tests in `tests/`
4. Update this README with new endpoints

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ using Bun for the Aztec Invoice System
