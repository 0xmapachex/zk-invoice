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
      {stats.map((stat, index) => (
        <Card 
          key={stat.title}
          className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:scale-105 hover:border-primary/30 transition-all duration-300 group cursor-pointer"
        >
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">{stat.title}</CardTitle>
            <div className={`p-2.5 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold mb-1 group-hover:text-primary transition-colors">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
          
          {/* Bottom glow effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Card>
      ))}
    </div>
  );
}

