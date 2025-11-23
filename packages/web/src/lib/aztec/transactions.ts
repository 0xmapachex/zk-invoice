// Transaction Helpers - Create and pay invoices on-chain
// Based on packages/cli/scripts/create_invoice.ts and pay_invoice.ts

import { createInvoiceInAPI as registerInvoiceInAPI } from "@/lib/api/client";

/**
 * Create invoice on-chain and register in API
 * Mirrors the flow from packages/cli/scripts/create_invoice.ts
 */
export async function createInvoiceOnChain(params: {
  wallet: any;
  senderAddress: any;
  registry: any;
  node: any;
  title: string;
  amount: bigint;
  tokenAddress: any;
  metadata: string;
}) {
  const { wallet, senderAddress, registry, node, title, amount, tokenAddress, metadata } = params;
  
  // TODO: Add after fixing workspace dependencies
  // const { Fr } = await import("@aztec/aztec.js/fields");
  // const { createInvoice } = await import("@zk-invoice/contracts/contract");
  // const { AztecAddress } = await import("@aztec/aztec.js/addresses");
  // 
  // // Generate invoice ID
  // const invoiceId = Fr.random();
  // 
  // // Hash title and metadata
  // const titleHash = Fr.random(); // TODO: Proper hash
  // const metadataField = Fr.random(); // TODO: Proper encoding
  // 
  // // Create invoice on-chain
  // const txHash = await createInvoice(
  //   wallet,
  //   senderAddress,
  //   registry,
  //   invoiceId,
  //   titleHash,
  //   tokenAddress,
  //   amount,
  //   metadataField,
  //   { send: { from: senderAddress } }
  // );
  // 
  // // Wait for transaction
  // console.log("Transaction sent:", txHash);
  // 
  // // Wait for public execution to complete
  // await new Promise(resolve => setTimeout(resolve, 2000));
  // 
  // // Fetch partial note hash from blockchain
  // let retries = 5;
  // let partialNoteHash = "0x0";
  // 
  // for (let i = 0; i < retries; i++) {
  //   const paymentInfo = await registry.methods
  //     .get_payment_info(invoiceId)
  //     .simulate({ from: senderAddress });
  //   
  //   partialNoteHash = paymentInfo.partial_note.toString();
  //   
  //   if (partialNoteHash !== "0" && partialNoteHash !== "0x0") {
  //     break;
  //   }
  //   
  //   if (i < retries - 1) {
  //     console.log(`Waiting for partial note... (attempt ${i + 1}/${retries})`);
  //     await new Promise(resolve => setTimeout(resolve, 1000));
  //   }
  // }
  // 
  // if (partialNoteHash === "0" || partialNoteHash === "0x0") {
  //   throw new Error("Failed to get partial note hash from blockchain");
  // }
  // 
  // // Register in API
  // await registerInvoiceInAPI({
  //   invoiceId: invoiceId.toString(),
  //   registryAddress: registry.address.toString(),
  //   senderAddress: senderAddress.toString(),
  //   partialNoteHash,
  //   title,
  //   tokenAddress: tokenAddress.toString(),
  //   amount: amount.toString(),
  //   metadata,
  // });
  // 
  // return {
  //   invoiceId: invoiceId.toString(),
  //   txHash,
  //   partialNoteHash,
  // };
  
  // Temporary mock implementation
  console.log("Would create invoice on-chain with:", {
    title,
    amount: amount.toString(),
    tokenAddress,
  });
  
  // For now, just register in API with mock data
  const invoiceId = `0x${Math.random().toString(16).substring(2)}`;
  await registerInvoiceInAPI({
    invoiceId,
    registryAddress: "0x0000000000000000000000000000000000000000",
    senderAddress: params.senderAddress || "0x0000000000000000000000000000000000000000",
    partialNoteHash: "0x0",
    title,
    tokenAddress: tokenAddress || "0x0000000000000000000000000000000000000000",
    amount: amount.toString(),
    metadata,
  });
  
  return {
    invoiceId,
    txHash: "0xmock",
    partialNoteHash: "0x0",
  };
}

/**
 * Pay invoice on-chain
 * Mirrors the flow from packages/cli/scripts/pay_invoice.ts
 */
export async function payInvoiceOnChain(params: {
  wallet: any;
  payerAddress: any;
  registry: any;
  token: any;
  invoiceId: string;
  partialNote: string;
  tokenAddress: any;
  amount: bigint;
}) {
  const { wallet, payerAddress, registry, token, invoiceId, partialNote, tokenAddress, amount } = params;
  
  // TODO: Add after fixing workspace dependencies
  // const { Fr } = await import("@aztec/aztec.js/fields");
  // const { AztecAddress } = await import("@aztec/aztec.js/addresses");
  // const { payInvoice, getPrivateTransferToCommitmentAuthwit } = await import("@zk-invoice/contracts/contract");
  // 
  // // Check balance
  // const balance = await token.methods
  //   .balance_of_private(payerAddress)
  //   .simulate({ from: payerAddress });
  // 
  // if (balance < amount) {
  //   throw new Error(`Insufficient balance: ${balance} < ${amount}`);
  // }
  // 
  // // Sync private state
  // await token.methods.sync_private_state().simulate({ from: payerAddress });
  // 
  // // Create authwit for token transfer
  // const { authwit, nonce } = await getPrivateTransferToCommitmentAuthwit(
  //   wallet,
  //   payerAddress,
  //   token,
  //   registry.address,
  //   Fr.fromString(partialNote),
  //   amount
  // );
  // 
  // // Pay invoice
  // const txHash = await payInvoice(
  //   wallet,
  //   payerAddress,
  //   registry,
  //   Fr.fromString(invoiceId),
  //   Fr.fromString(partialNote),
  //   token,
  //   AztecAddress.fromString(tokenAddress.toString()),
  //   amount,
  //   { send: { from: payerAddress, authWitnesses: [authwit] } }
  // );
  // 
  // // Wait for confirmation
  // await new Promise(resolve => setTimeout(resolve, 2000));
  // 
  // // Verify payment
  // const isPaid = await registry.methods
  //   .is_paid(Fr.fromString(invoiceId))
  //   .simulate({ from: payerAddress });
  // 
  // if (!isPaid) {
  //   throw new Error("Payment verification failed");
  // }
  // 
  // return { txHash };
  
  // Temporary mock implementation
  console.log("Would pay invoice on-chain:", {
    invoiceId,
    amount: amount.toString(),
  });
  
  // Simulate blockchain delays
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return { txHash: "0xmock_payment" };
}

