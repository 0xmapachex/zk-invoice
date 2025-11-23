"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, ChevronRight, X } from "lucide-react";
import { getAccessRequests } from "@/lib/api/access";
import { useRouter } from "next/navigation";
import type { AccessRequest } from "@/stores/useAccessStore";

interface AccessRequestBannerProps {
  ownerAddress: string;
}

export function AccessRequestBanner({ ownerAddress }: AccessRequestBannerProps) {
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    loadPendingRequests();
    // Poll for new requests every 30 seconds
    const interval = setInterval(loadPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [ownerAddress]);

  const loadPendingRequests = async () => {
    try {
      setIsLoading(true);
      console.log("Loading access requests for owner:", ownerAddress);
      const requests = await getAccessRequests({ ownerAddress });
      console.log("Received access requests:", requests);
      const pending = requests.filter(r => r.status === "pending");
      console.log("Pending requests:", pending);
      setPendingRequests(pending);
    } catch (error) {
      console.error("Failed to load pending requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || pendingRequests.length === 0 || isDismissed) {
    return null;
  }

  return (
    <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
      <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
      <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold mb-2">
        Pending Access Requests
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-1">
              You have <strong>{pendingRequests.length}</strong> pending compliance access{" "}
              {pendingRequests.length === 1 ? "request" : "requests"} waiting for your review.
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              {pendingRequests[0].requester_name || "Someone"} is requesting access to view private invoice details.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={() => router.push("/access-requests")}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Review Requests
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              onClick={() => setIsDismissed(true)}
              size="icon"
              variant="ghost"
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

