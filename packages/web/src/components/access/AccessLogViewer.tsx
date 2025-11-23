"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, FileText, Loader2, Shield } from "lucide-react";
import { getAccessLogs } from "@/lib/api/access";
import { useAccessStore, type AccessLog } from "@/stores/useAccessStore";

interface AccessLogViewerProps {
  invoiceId: string;
}

export function AccessLogViewer({ invoiceId }: AccessLogViewerProps) {
  const { accessLogs, setAccessLogs } = useAccessStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccessLogs();
  }, [invoiceId]);

  const loadAccessLogs = async () => {
    try {
      setLoading(true);
      const logs = await getAccessLogs(invoiceId);
      setAccessLogs(logs);
    } catch (error) {
      console.error("Failed to load access logs:", error);
    } finally {
      setLoading(false);
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

  const truncateAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const getActionIcon = (action: AccessLog["action"]) => {
    switch (action) {
      case "view":
        return <Eye className="h-4 w-4" />;
      case "download":
        return <Download className="h-4 w-4" />;
      case "export":
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: AccessLog["action"]) => {
    const colors = {
      view: "bg-blue-500",
      download: "bg-purple-500",
      export: "bg-orange-500",
    };

    return (
      <Badge variant="default" className={colors[action]}>
        {getActionIcon(action)}
        <span className="ml-1 capitalize">{action}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Access Audit Log
        </CardTitle>
        <CardDescription>
          All invoice access events are logged for compliance and security
        </CardDescription>
      </CardHeader>
      <CardContent>
        {accessLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No access events recorded yet</p>
            <p className="text-sm mt-1">When someone views or downloads this invoice, it will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accessLogs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.action)}
                    <span className="text-sm text-muted-foreground">by</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {truncateAddress(log.accessor_address)}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(log.accessed_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {accessLogs.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <p>
              <strong>Total Access Events:</strong> {accessLogs.length}
            </p>
            <p className="mt-1">
              This audit log provides transparency and accountability for all invoice data access.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

