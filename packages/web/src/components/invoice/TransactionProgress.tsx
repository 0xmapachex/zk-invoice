"use client";

import { CheckCircle2, Clock, Loader2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/types/invoice";

interface TransactionStep {
  id: string;
  label: string;
  description: string;
  timestamp?: string;
  status: "completed" | "in-progress" | "pending" | "error";
}

interface TransactionProgressProps {
  paymentStatus: PaymentStatus;
  createdAt?: string;
  error?: string | null;
}

const getStatusIcon = (status: TransactionStep["status"]) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-5 h-5 text-primary" />;
    case "in-progress":
      return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    case "error":
      return <XCircle className="w-5 h-5 text-destructive" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
};

const getSteps = (paymentStatus: PaymentStatus, createdAt?: string, error?: string | null): TransactionStep[] => {
  const now = new Date().toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const baseSteps: TransactionStep[] = [
    {
      id: "created",
      label: "Invoice created",
      description: createdAt ? new Date(createdAt).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }) : now,
      status: "completed",
    },
    {
      id: "checking",
      label: "Checking balance",
      description: now,
      status: paymentStatus === "idle" || paymentStatus === "checking-balance"
        ? paymentStatus === "checking-balance" ? "in-progress" : "pending"
        : error ? "error" : "completed",
    },
    {
      id: "authwit",
      label: "Creating authorization",
      description: now,
      status: paymentStatus === "idle" || paymentStatus === "checking-balance"
        ? "pending"
        : paymentStatus === "creating-authwit"
        ? "in-progress"
        : error && paymentStatus === "error" ? "error" : "completed",
    },
    {
      id: "submitting",
      label: "Submitting payment",
      description: now,
      status: ["idle", "checking-balance", "creating-authwit"].includes(paymentStatus)
        ? "pending"
        : paymentStatus === "submitting"
        ? "in-progress"
        : error && paymentStatus === "error" ? "error" : "completed",
    },
    {
      id: "confirming",
      label: "Transaction confirmation",
      description: now,
      status: ["idle", "checking-balance", "creating-authwit", "submitting"].includes(paymentStatus)
        ? "pending"
        : paymentStatus === "confirming"
        ? "in-progress"
        : error && paymentStatus === "error" ? "error" : "completed",
    },
    {
      id: "verified",
      label: "Transaction successfully verified",
      description: now,
      status: paymentStatus === "success" ? "completed" : paymentStatus === "error" ? "error" : "pending",
    },
  ];

  return baseSteps;
};

export const TransactionProgress = ({ paymentStatus, createdAt, error }: TransactionProgressProps) => {
  const steps = getSteps(paymentStatus, createdAt, error);
  const hasError = paymentStatus === "error";
  const isSuccess = paymentStatus === "success";

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="space-y-1">
        {steps.map((step, index) => (
          <div key={step.id} className="flex gap-4 relative">
            {/* Icon */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  step.status === "completed" && "bg-primary/10",
                  step.status === "in-progress" && "bg-primary/20 animate-pulse-glow",
                  step.status === "pending" && "bg-muted",
                  step.status === "error" && "bg-destructive/10"
                )}
              >
                {getStatusIcon(step.status)}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-12 my-1 transition-all duration-500",
                    step.status === "completed" ? "bg-primary/30" : "bg-border"
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <div
                className={cn(
                  "font-semibold transition-colors duration-300",
                  step.status === "completed" && "text-foreground",
                  step.status === "in-progress" && "text-primary",
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "error" && "text-destructive"
                )}
              >
                {step.label}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success Message */}
      {isSuccess && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 opacity-0 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-green-700 dark:text-green-400 mb-1">
                Transfer successfully sent
              </div>
              <div className="text-sm text-green-600/80 dark:text-green-400/80">
                Your invoice has been paid and verified on-chain. Both parties have been notified.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {hasError && error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 opacity-0 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-destructive mb-1">
                Payment failed
              </div>
              <div className="text-sm text-destructive/80">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

