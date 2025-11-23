"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, CheckCircle, XCircle, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatUSDC } from "@/lib/utils";
import { useWalletStore } from "@/stores/useWalletStore";
import type { Invoice } from "@/types/invoice";
import { useEffect, useState } from "react";

interface InvoiceStatsProps {
  invoices: Invoice[];
  currentBalance?: bigint;
}

export function InvoiceStats({ invoices, currentBalance }: InvoiceStatsProps) {
  const { role, currentAddress } = useWalletStore();
  
  // Filter invoices based on role
  const relevantInvoices = role === "seller" 
    ? invoices.filter(inv => inv.senderAddress === currentAddress) // Seller: sent invoices
    : invoices.filter(inv => inv.senderAddress !== currentAddress); // Buyer: received invoices
  
  const totalInvoices = relevantInvoices.length;
  const paidInvoices = relevantInvoices.filter((inv) => inv.status === "paid");
  const unpaidInvoices = relevantInvoices.filter((inv) => inv.status === "pending");
  
  // Calculate amounts
  const totalAmount = relevantInvoices.reduce((sum, inv) => {
    const amount = typeof inv.amount === "bigint" ? inv.amount : BigInt(inv.amount);
    return sum + amount;
  }, BigInt(0));
  
  const paidAmount = paidInvoices.reduce((sum, inv) => {
    const amount = typeof inv.amount === "bigint" ? inv.amount : BigInt(inv.amount);
    return sum + amount;
  }, BigInt(0));
  
  const unpaidAmount = unpaidInvoices.reduce((sum, inv) => {
    const amount = typeof inv.amount === "bigint" ? inv.amount : BigInt(inv.amount);
    return sum + amount;
  }, BigInt(0));
  
  // Stats configuration based on role
  const stats = role === "seller" ? [
    {
      title: "Current Balance",
      value: currentBalance ? formatUSDC(currentBalance) : "Loading...",
      icon: Wallet,
      description: "Available USDC",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Total Invoices Sent",
      value: totalInvoices.toString(),
      icon: FileText,
      description: `${paidInvoices.length} paid, ${unpaidInvoices.length} pending`,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "Received Amount",
      value: formatUSDC(paidAmount),
      icon: ArrowDownRight,
      description: `${paidInvoices.length} paid invoices`,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Pending Amount",
      value: formatUSDC(unpaidAmount),
      icon: XCircle,
      description: `${unpaidInvoices.length} unpaid invoices`,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
  ] : [
    {
      title: "Current Balance",
      value: currentBalance ? formatUSDC(currentBalance) : "Loading...",
      icon: Wallet,
      description: "Available USDC",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Invoices to Pay",
      value: totalInvoices.toString(),
      icon: FileText,
      description: `${unpaidInvoices.length} pending, ${paidInvoices.length} paid`,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "Total Paid",
      value: formatUSDC(paidAmount),
      icon: ArrowUpRight,
      description: `${paidInvoices.length} payments made`,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
    {
      title: "Amount Due",
      value: formatUSDC(unpaidAmount),
      icon: XCircle,
      description: `${unpaidInvoices.length} unpaid invoices`,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
  ];
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

