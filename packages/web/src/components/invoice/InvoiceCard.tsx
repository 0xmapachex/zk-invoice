import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import type { Invoice } from "@/types/invoice";
import { formatUSDC, formatDate, truncateAddress } from "@/lib/utils";

interface InvoiceCardProps {
  invoice: Invoice;
  onClick?: () => void;
}

export function InvoiceCard({ invoice, onClick }: InvoiceCardProps) {
  const amount = typeof invoice.amount === "bigint" 
    ? invoice.amount 
    : BigInt(invoice.amount);
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">
            {invoice.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Invoice #{truncateAddress(invoice.invoiceId, 8, 6)}
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            {formatUSDC(amount)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(invoice.createdAt)}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          From: {truncateAddress(invoice.senderAddress)}
        </p>
      </CardContent>
    </Card>
  );
}

