"use client";

import { useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAccessStore } from "@/stores/useAccessStore";
import { getAccessRequests } from "@/lib/api/access";
import { useWalletStore } from "@/stores/useWalletStore";

interface AccessRequestNotificationBadgeProps {
  onClick?: () => void;
}

export function AccessRequestNotificationBadge({
  onClick,
}: AccessRequestNotificationBadgeProps) {
  const { pendingRequestsCount, setAccessRequests } = useAccessStore();
  const { role } = useWalletStore();

  // Use the actual blockchain addresses from created invoices
  // In production, get from actual wallet
  const mockAddresses = {
    seller: "0x11deabd59b872d17c737b66f61d332230f341e774c6b5d3762f46a74536f947f", // Real sender address
    buyer: "0x19d4aaf4040b2577a1f1ca3b05ab3274eb2158c64d79361e40681c3877be8fed",
  };

  const ownerAddress = mockAddresses[role];

  useEffect(() => {
    loadPendingRequests();
    // Poll for new requests every 30 seconds
    const interval = setInterval(loadPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [ownerAddress]);

  const loadPendingRequests = async () => {
    try {
      const requests = await getAccessRequests({ ownerAddress });
      setAccessRequests(requests);
    } catch (error) {
      console.error("Failed to load pending requests:", error);
    }
  };

  if (pendingRequestsCount === 0) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative gap-2"
      onClick={onClick}
    >
      <Bell className="h-4 w-4" />
      {pendingRequestsCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
        </Badge>
      )}
      <span className="hidden sm:inline">Access Requests</span>
    </Button>
  );
}

