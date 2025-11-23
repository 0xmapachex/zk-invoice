"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, User, Briefcase, FileText, Loader2 } from "lucide-react";
import { getAccessRequests, updateAccessRequest } from "@/lib/api/access";
import { useAccessStore, type AccessRequest } from "@/stores/useAccessStore";
import { useToast } from "@/hooks/useToast";

interface AccessRequestsPanelProps {
  ownerAddress: string;
  invoiceId?: string;
}

const EXPIRY_OPTIONS = [
  { label: "7 Days", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 Days", value: 30 * 24 * 60 * 60 * 1000 },
  { label: "90 Days", value: 90 * 24 * 60 * 60 * 1000 },
  { label: "No Expiry", value: 0 },
];

export function AccessRequestsPanel({ ownerAddress, invoiceId }: AccessRequestsPanelProps) {
  const { toast } = useToast();
  const { accessRequests, setAccessRequests } = useAccessStore();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<Record<string, number>>({});

  useEffect(() => {
    loadRequests();
  }, [ownerAddress, invoiceId]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const requests = await getAccessRequests(
        invoiceId ? { invoiceId } : { ownerAddress }
      );
      setAccessRequests(requests);
    } catch (error) {
      toast.error(
        "Failed to Load Requests",
        error instanceof Error ? error.message : "Failed to load access requests"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const expiryMs = selectedExpiry[requestId] || 0;
      const expiresAt = expiryMs > 0 ? Date.now() + expiryMs : undefined;

      await updateAccessRequest(requestId, {
        status: "approved",
        expiresAt,
      });

      toast.success("Access Approved", "The requester can now view the invoice");
      await loadRequests();
    } catch (error) {
      toast.error(
        "Approval Failed",
        error instanceof Error ? error.message : "Failed to approve access"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (requestId: string, reason?: string) => {
    setProcessingId(requestId);
    try {
      await updateAccessRequest(requestId, {
        status: "denied",
        responseReason: reason || "Access denied by owner",
      });

      toast.info("Access Denied", "The request has been denied");
      await loadRequests();
    } catch (error) {
      toast.error(
        "Denial Failed",
        error instanceof Error ? error.message : "Failed to deny access"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: AccessRequest["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="default" className="bg-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Denied
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Requests</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (accessRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Requests</CardTitle>
          <CardDescription>No access requests found</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>You have no pending or past access requests</p>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = accessRequests.filter((r) => r.status === "pending");
  const respondedRequests = accessRequests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests ({pendingRequests.length})</CardTitle>
            <CardDescription>Review and approve or deny access requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {request.requester_name && (
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <User className="h-4 w-4" />
                          {request.requester_name}
                        </div>
                      )}
                      {request.requester_role && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {request.requester_role}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {request.requester_address}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                <div className="bg-muted/50 rounded p-3">
                  <p className="text-sm font-medium mb-1">Reason:</p>
                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                </div>

                <div className="text-xs text-muted-foreground">
                  Requested on {formatDate(request.requested_at)}
                </div>

                {request.status === "pending" && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Access Duration:</label>
                      <select
                        className="text-sm border rounded px-2 py-1"
                        value={selectedExpiry[request.id] || 0}
                        onChange={(e) =>
                          setSelectedExpiry({
                            ...selectedExpiry,
                            [request.id]: Number(e.target.value),
                          })
                        }
                        disabled={processingId === request.id}
                      >
                        {EXPIRY_OPTIONS.map((option) => (
                          <option key={option.label} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1"
                      >
                        {processingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeny(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {respondedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request History ({respondedRequests.length})</CardTitle>
            <CardDescription>Previously reviewed requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {respondedRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 space-y-2 opacity-75"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {request.requester_name && (
                        <span className="text-sm font-medium">{request.requester_name}</span>
                      )}
                      {request.requester_role && (
                        <span className="text-sm text-muted-foreground">
                          ({request.requester_role})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {request.requester_address}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                <p className="text-sm text-muted-foreground">{request.reason}</p>

                <div className="text-xs text-muted-foreground">
                  {request.status === "approved" ? "Approved" : "Denied"} on{" "}
                  {request.responded_at && formatDate(request.responded_at)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

