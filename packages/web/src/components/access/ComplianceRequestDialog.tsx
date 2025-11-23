"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Loader2, CheckCircle } from "lucide-react";
import { createAccessRequest } from "@/lib/api/access";
import { useToast } from "@/hooks/useToast";

interface ComplianceRequestDialogProps {
  invoiceId: string;
  requesterAddress: string;
  onRequestSubmitted?: () => void;
}

type RequestStatus = "idle" | "submitting" | "success";

export function ComplianceRequestDialog({
  invoiceId,
  requesterAddress,
  onRequestSubmitted,
}: ComplianceRequestDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      toast.error("Validation Error", "Please provide a reason for access");
      return;
    }

    console.log("Submitting access request:", { invoiceId, requesterAddress });

    setStatus("submitting");

    try {
      await createAccessRequest({
        invoiceId,
        requesterAddress,
        requesterName: formData.name || undefined,
        requesterRole: formData.role || undefined,
        reason: formData.reason,
      });

      setStatus("success");
      toast.success(
        "Access Request Submitted",
        "The invoice owner will review your request"
      );

      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
    } catch (error) {
      setStatus("idle");
      toast.error(
        "Request Failed",
        error instanceof Error ? error.message : "Failed to submit access request"
      );
    }
  };

  if (status === "success") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Request Submitted</CardTitle>
          <CardDescription>
            Your access request has been sent to the invoice owner for approval
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            You will be notified once your request is reviewed. This typically takes 1-2 business days.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>Access Restricted</CardTitle>
        <CardDescription>
          This invoice contains private information. Request access to view details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name (Optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={status === "submitting"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Your Role (Optional)</Label>
            <Input
              id="role"
              type="text"
              placeholder="e.g., Auditor, Compliance Officer, Tax Authority"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              disabled={status === "submitting"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Access <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="reason"
              className="w-full min-h-[6rem] px-3 py-2 border border-input bg-background rounded-md text-sm"
              placeholder="Please explain why you need access to this invoice..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              disabled={status === "submitting"}
              required
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground">
              <strong>Privacy Notice:</strong> Your request will be sent to the invoice owner. 
              They can approve or deny access. All access requests and subsequent views are logged 
              for audit purposes.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={status === "submitting"}
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Request...
              </>
            ) : (
              "Submit Access Request"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

