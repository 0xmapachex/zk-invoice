# ZK Invoice Web Application

Modern web interface for creating and managing privacy-preserving invoices on Aztec Network.

## 🚀 Integration Status

The web application is **fully integrated** with the backend API following the CLI implementation patterns. The Aztec blockchain integration is **structurally complete** but uses temporary mocks until the Aztec SDK packages are installed.

**📖 See [INTEGRATION.md](./INTEGRATION.md) for complete details on the Aztec integration.**

## Features

- 🎯 **Invoice Creation**: Beautiful, intuitive form for creating invoices
- 📊 **Dashboard**: Track invoices with stats, filters, and search
- 💰 **Payment Processing**: Pay invoices with Aztec private transactions
- 🔄 **Account Switching**: Easy toggle between seller and buyer roles
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🎨 **Modern UI**: Built with Tailwind CSS and shadcn/ui components
- 📄 **PDF Generation**: Download invoices as professional PDF documents (coming soon)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Forms**: react-hook-form + Zod validation
- **PDF**: @react-pdf/renderer
- **Blockchain**: Aztec SDK (coming soon)

## Prerequisites

- Node.js 18+ or Bun 1.1.22+
- Running Aztec sandbox (for blockchain features)
- Running Invoice API service

## Setup

### 1. Install Dependencies

```bash
cd packages/web
bun install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Aztec Network Configuration
NEXT_PUBLIC_L2_NODE_URL=http://localhost:8080

# Seller Account (for creating invoices)
SELLER_SECRET_KEY=0x0000000000000000000000000000000000000000000000000000000000000001
SELLER_SALT=0x0000000000000000000000000000000000000000000000000000000000000001

# Buyer Account (for paying invoices)
BUYER_SECRET_KEY=0x0000000000000000000000000000000000000000000000000000000000000002
BUYER_SALT=0x0000000000000000000000000000000000000000000000000000000000000002

# Data Source (api or blockchain)
NEXT_PUBLIC_DATA_SOURCE=api
```

### 3. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Available Scripts

- `bun run dev` - Start development server (port 3000)
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

### Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout with header
│   ├── page.tsx                # Dashboard page
│   ├── create/                 # Invoice creation
│   │   └── page.tsx
│   └── invoice/[id]/           # Invoice detail & payment
│       └── page.tsx
├── components/
│   ├── ui/                     # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── invoice/                # Invoice-specific components
│   │   ├── StatusBadge.tsx
│   │   ├── InvoiceCard.tsx
│   │   ├── InvoiceTable.tsx
│   │   ├── InvoiceStats.tsx
│   │   └── InvoiceFilter.tsx
│   └── layout/                 # Layout components
│       ├── Header.tsx
│       └── AccountSwitcher.tsx
├── lib/
│   ├── api/                    # API client
│   │   └── client.ts
│   ├── aztec/                  # Aztec SDK integration (coming soon)
│   └── utils.ts                # Utility functions
├── stores/                     # Zustand state management
│   ├── useWalletStore.ts       # Wallet & account state
│   └── useInvoiceStore.ts      # Invoice data state
└── types/
    └── invoice.ts              # TypeScript types
```

## Usage

### As a Seller (Invoice Creator)

1. **Switch to Seller Role**
   - Click the account switcher in the header
   - Select "Seller"

2. **Create an Invoice**
   - Click "Create Invoice" button or navigate to `/create`
   - Fill in client details (name, company, email)
   - Add invoice title and optional memo
   - Add line items (description, quantity, unit price)
   - Review total amount
   - Click "Create Invoice"

3. **View Your Invoices**
   - Dashboard shows all sent invoices
   - Filter by status: All, Paid, Unpaid
   - Search by invoice number or client name
   - View stats: Total earnings, paid amount, unpaid amount

4. **Share Invoice**
   - Click on an invoice to view details
   - Click "Share" to copy invoice link
   - Send link to buyer/client

### As a Buyer (Invoice Payer)

1. **Switch to Buyer Role**
   - Click the account switcher in the header
   - Select "Buyer"

2. **View Received Invoices**
   - Dashboard shows invoices you need to pay
   - Filter by status to see pending invoices
   - View invoice details and amounts

3. **Pay an Invoice**
   - Click on a pending invoice
   - Review invoice details and line items
   - Click "Pay Invoice" button
   - Wait for blockchain confirmation
   - Invoice status updates to "Paid"

## Key Features

### Account Switching

Toggle between seller and buyer roles:
- **Seller**: Create and manage sent invoices
- **Buyer**: View and pay received invoices

The UI automatically adapts based on your current role.

### Invoice Dashboard

- **Stats Cards**: Visual overview of total earnings, invoice count, paid/unpaid amounts
- **Filtering**: Quick filters for All, Paid, Unpaid invoices
- **Search**: Find invoices by number, title, or sender address
- **Table View**: Sortable table with key invoice information
- **Actions**: View, download PDF, pay (buyer), delete (seller)

### Invoice Creation

- **Dynamic Line Items**: Add/remove items as needed
- **Auto-calculation**: Totals automatically calculated
- **Form Validation**: Real-time validation with error messages
- **Client Information**: Store client details in invoice metadata
- **Memos**: Add optional notes or instructions

### Invoice Detail & Payment

- **Professional Layout**: Clean, invoice-style layout
- **Payment Flow**: Multi-step payment process with status updates
- **Blockchain Integration**: Direct integration with Aztec (coming soon)
- **PDF Export**: Download invoices as PDF (coming soon)
- **Share Functionality**: Copy shareable invoice links

## API Integration

The web app connects to the Invoice API service:

### Endpoints Used

- `GET /invoice` - Fetch invoices (with optional filters)
- `GET /invoice?id={id}` - Get specific invoice
- `POST /invoice` - Create new invoice
- `POST /invoice/paid` - Mark invoice as paid
- `PATCH /invoice/{id}` - Update invoice

### Example API Call

```typescript
import { getInvoices } from "@/lib/api/client";

// Fetch all invoices
const invoices = await getInvoices();

// Fetch seller's invoices
const sellerInvoices = await getInvoices({ 
  sender: sellerAddress 
});

// Fetch pending invoices
const pendingInvoices = await getInvoices({ 
  status: "pending" 
});
```

## Blockchain Integration (Coming Soon)

The Aztec SDK integration will enable:
- Real wallet connection with Aztec accounts
- On-chain invoice creation with privacy
- Private token transfers for payments
- Proof generation and verification
- Transaction tracking and confirmation

### Placeholder Implementation

Current implementation uses mock data and API-only storage. To enable full blockchain features:

1. Add Aztec SDK dependencies (workspace packages)
2. Implement `lib/aztec/` modules:
   - `client.ts` - Connect to Aztec node
   - `wallet.ts` - Create wallets from secret keys
   - `contracts.ts` - Load InvoiceRegistry and Token contracts
   - `transactions.ts` - Execute on-chain operations

3. Update wallet store to use real Aztec addresses
4. Integrate contract calls in invoice creation and payment flows

## Deployment

### Build for Production

```bash
bun run build
```

### Deploy to Vercel

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

### Deploy to Other Platforms

The app is a standard Next.js application and can be deployed to:
- Netlify
- AWS Amplify
- Docker
- Any Node.js hosting platform

## Troubleshooting

### Development Server Won't Start

- Check if port 3000 is available
- Ensure dependencies are installed: `bun install`
- Clear `.next` folder: `rm -rf .next`

### API Connection Errors

- Verify Invoice API is running at `NEXT_PUBLIC_API_URL`
- Check API is accessible: `curl http://localhost:3001/invoice`
- Review CORS settings if API is on different domain

### Wallet Connection Issues

- Ensure `SELLER_SECRET_KEY` and `BUYER_SECRET_KEY` are set
- Check Aztec sandbox is running (for blockchain features)
- Verify `NEXT_PUBLIC_L2_NODE_URL` is correct

### Build Errors

- Clear node_modules and reinstall: `rm -rf node_modules && bun install`
- Check TypeScript errors: `bun run lint`
- Ensure all environment variables are set

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Check the main project README
- Review the API documentation
- Check Aztec Network docs: https://docs.aztec.network

## Roadmap

- [x] Dashboard with invoice list and stats
- [x] Invoice creation form with validation
- [x] Invoice detail view with payment UI
- [x] Account switching (seller/buyer roles)
- [x] Responsive design for mobile
- [ ] Full Aztec SDK integration
- [ ] PDF generation and download
- [ ] Invoice editing
- [ ] Recurring invoices
- [ ] Multi-currency support
- [ ] Email notifications
- [ ] Invoice templates

---

Built with ❤️ for privacy-preserving invoice management on Aztec Network.

