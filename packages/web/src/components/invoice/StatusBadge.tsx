import { Badge } from "@/components/ui/badge";
import type { Invoice } from "@/types/invoice";

interface StatusBadgeProps {
  status: Invoice["status"];
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = {
    pending: "warning" as const,
    paid: "success" as const,
    overdue: "destructive" as const,
  }[status] || "default" as const;
  
  const label = {
    pending: "Pending",
    paid: "Paid",
    overdue: "Overdue",
  }[status] || status;
  
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

