import {
  createInvoice as createInvoiceContract,
  payInvoice as payInvoiceContract,
  isInvoicePaid,
} from "@zk-invoice/contracts/contract";
import { getPriorityFeeOptions, getSponsoredPaymentMethod } from "@zk-invoice/contracts/fees";
import { isTestnet, wad } from "@zk-invoice/contracts/utils";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import type { AztecNode } from "@aztec/aztec.js/node";
import type { TestWallet } from "@aztec/test-wallet/server";
import type { InvoiceRegistryContract, TokenContract } from "@zk-invoice/contracts/artifacts";
import type { SendInteractionOptions, WaitOpts } from "@aztec/aztec.js/contracts";
import { getTokenContract, getRegistryFromDeployments, loadDeployments } from "./contracts";
import { waitForBlockFinalization } from "./wallets";

const testnetBaseFeePadding = 100;
const testnetPriorityFee = 10n;
const testnetTimeout = 3600;
const testnetInterval = 3;

// USDC uses 6 decimals - mint 1000 USDC
const USDC_MINT_AMOUNT = wad(1000n, 6n);

/**
 * Get send and wait options optimized for testnet
 */
const getTestnetSendWaitOptions = async (
  node: AztecNode,
  wallet: TestWallet,
  from: AztecAddress,
  withFPC: boolean = true
): Promise<{
  send: SendInteractionOptions;
  wait: WaitOpts;
}> => {
  let send: SendInteractionOptions = { from };
  let wait: WaitOpts = {};

  if (await isTestnet(node)) {
    let fee = await getPriorityFeeOptions(node, testnetPriorityFee);
    if (withFPC) {
      const paymentMethod = await getSponsoredPaymentMethod(wallet);
      fee = { ...fee, paymentMethod };
    }
    send = { ...send, fee };
    wait = { timeout: testnetTimeout, interval: testnetInterval };
  }

  return { send, wait };
};

/**
 * Create an invoice on-chain
 */
export const createInvoiceOnChain = async (params: {
  node: AztecNode;
  wallet: TestWallet;
  senderAddress: AztecAddress;
  title: string;
  amount: bigint;
  tokenAddress: string;
  metadata: string;
}): Promise<{
  invoiceId: string;
  partialNoteHash: string;
  txHash: string;
  registryAddress: string;
}> => {
  const { node, wallet, senderAddress, title, amount, tokenAddress, metadata } = params;

  console.log("Creating invoice on-chain...");
  console.log(`  Title: ${title}`);
  console.log(`  Amount: ${amount}`);
  console.log(`  Token: ${tokenAddress}`);

  // Get contracts
  const usdcAddress = AztecAddress.fromString(tokenAddress);
  await getTokenContract(wallet, senderAddress, node, usdcAddress);

  const { registry, registryAddress } = await getRegistryFromDeployments(wallet, senderAddress);

  // Get send/wait options
  const opts = await getTestnetSendWaitOptions(node, wallet, senderAddress);

  // Generate invoice data
  const invoiceId = Fr.random();
  const metadataFr = Fr.random(); // TODO: Properly encode metadata
  const titleHash = Fr.random(); // TODO: Properly hash title

  // Create invoice on-chain
  const txHash = await createInvoiceContract(
    wallet,
    senderAddress,
    registry,
    invoiceId,
    titleHash,
    usdcAddress,
    amount,
    metadataFr,
    opts
  );

  console.log(`  Transaction sent: ${txHash}`);

  // Wait for finalization
  const L2_NODE_URL = process.env.L2_NODE_URL || "";
  if (!L2_NODE_URL.includes("localhost")) {
    console.log("  Waiting for transaction to finalize...");
    const txReceipt = await wallet.getTxReceipt(txHash);
    if (txReceipt) {
      await waitForBlockFinalization(
        node,
        txReceipt.blockNumber!,
        2,
        3000,
        60,
        wallet,
        senderAddress
      );
    }
  } else {
    console.log("  Waiting for public execution to complete...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Fetch partial note hash
  console.log("  Fetching payment info from blockchain...");
  let paymentInfo;
  let retries = 5;

  for (let i = 0; i < retries; i++) {
    paymentInfo = await registry.methods
      .get_payment_info(invoiceId)
      .simulate({ from: senderAddress });

    if (paymentInfo.partial_note.toString() !== "0") {
      break;
    }

    if (i < retries - 1) {
      console.log(`  Partial note not ready, waiting... (${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const partialNoteHash = paymentInfo!.partial_note.toString();

  if (partialNoteHash === "0" || partialNoteHash === "0x0") {
    throw new Error("Failed to fetch partial note from blockchain");
  }

  console.log(`  Invoice created successfully!`);

  return {
    invoiceId: invoiceId.toString(),
    partialNoteHash,
    txHash: txHash.toString(),
    registryAddress: registryAddress.toString(),
  };
};

/**
 * Pay an invoice on-chain
 */
export const payInvoiceOnChain = async (params: {
  node: AztecNode;
  wallet: TestWallet;
  payerAddress: AztecAddress;
  invoiceId: string;
  partialNoteHash: string;
  tokenAddress: string;
  amount: bigint;
}): Promise<{
  txHash: string;
  success: boolean;
}> => {
  const { node, wallet, payerAddress, invoiceId, partialNoteHash, tokenAddress, amount } =
    params;

  console.log("Paying invoice on-chain...");
  console.log(`  Invoice ID: ${invoiceId}`);
  console.log(`  Amount: ${amount}`);

  // Get contracts
  const usdcAddress = AztecAddress.fromString(tokenAddress);
  const token = await getTokenContract(wallet, payerAddress, node, usdcAddress);

  const { registry } = await getRegistryFromDeployments(wallet, payerAddress);

  // Check balance
  console.log("  Checking payer balance...");
  const payerBalance = await token.methods
    .balance_of_private(payerAddress)
    .simulate({ from: payerAddress });

  console.log(`    Payer balance: ${payerBalance.toString()}`);
  console.log(`    Required amount: ${amount.toString()}`);

  if (payerBalance < amount) {
    throw new Error(
      `Insufficient balance. Have ${payerBalance.toString()}, need ${amount.toString()}`
    );
  }

  // Get send/wait options
  const opts = await getTestnetSendWaitOptions(node, wallet, payerAddress);

  // Convert IDs
  const invoiceIdFr = Fr.fromString(invoiceId);
  const partialNote = Fr.fromString(partialNoteHash);

  // Sync before payment
  console.log("  Syncing private state...");
  await token.methods.sync_private_state().simulate({ from: payerAddress });

  // Pay invoice with retry logic
  let txHash;
  let retries = 3;
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  Payment attempt ${attempt}/${retries}...`);
      txHash = await payInvoiceContract(
        wallet,
        payerAddress,
        registry,
        invoiceIdFr,
        partialNote,
        token,
        usdcAddress,
        amount,
        opts
      );
      console.log(`  Payment processed: ${txHash}`);
      break;
    } catch (error: any) {
      lastError = error;
      if (error?.message?.includes("Nullifier witness not found") && attempt < retries) {
        console.log(`  Sync issue detected, retrying...`);
        
        const L2_NODE_URL = process.env.L2_NODE_URL || "";
        if (!L2_NODE_URL.includes("localhost")) {
          const currentBlock = await node.getBlockNumber();
          await waitForBlockFinalization(node, currentBlock, 2, 3000, 30, wallet, payerAddress);
        }

        await token.methods.sync_private_state().simulate({ from: payerAddress });
      } else {
        throw error;
      }
    }
  }

  if (!txHash) {
    throw lastError || new Error("Payment failed after all retries");
  }

  // Wait for public execution
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify payment
  console.log("  Verifying payment...");
  const isPaid = await isInvoicePaid(wallet, payerAddress, registry, invoiceIdFr);

  if (!isPaid) {
    console.log("  Warning: Payment verification failed");
  } else {
    console.log("  Payment verified on-chain!");
  }

  return {
    txHash: txHash.toString(),
    success: isPaid,
  };
};

/**
 * Mint tokens to an account
 */
export const mintTokensToAccount = async (params: {
  node: AztecNode;
  wallet: TestWallet;
  minterAddress: AztecAddress;
  recipientAddress: AztecAddress;
  tokenAddress: string;
  amount?: bigint;
}): Promise<{
  txHash: string;
  amount: string;
}> => {
  const { node, wallet, minterAddress, recipientAddress, tokenAddress, amount } = params;

  console.log("Minting tokens...");
  console.log(`  Token: ${tokenAddress}`);
  console.log(`  Recipient: ${recipientAddress.toString()}`);
  console.log(`  Amount: ${(amount || USDC_MINT_AMOUNT).toString()}`);

  // Get token contract
  const usdcAddress = AztecAddress.fromString(tokenAddress);
  const token = await getTokenContract(wallet, minterAddress, node, usdcAddress);

  // Get send/wait options
  const opts = await getTestnetSendWaitOptions(node, wallet, minterAddress);

  // Mint tokens
  const mintAmount = amount || USDC_MINT_AMOUNT;
  console.log("  Sending mint transaction...");
  
  const receipt = await token
    .withWallet(wallet)
    .methods.mint_to_private(recipientAddress, mintAmount)
    .send(opts.send)
    .wait(opts.wait);

  console.log(`  ✅ Tokens minted successfully!`);
  console.log(`  Transaction hash: ${receipt.txHash}`);

  // Wait for finalization on testnet
  const L2_NODE_URL = process.env.L2_NODE_URL || "";
  if (!L2_NODE_URL.includes("localhost")) {
    console.log("  Waiting for finalization...");
    await waitForBlockFinalization(
      node,
      receipt.blockNumber!,
      2,
      3000,
      60,
      wallet,
      minterAddress
    );
  }

  return {
    txHash: receipt.txHash.toString(),
    amount: mintAmount.toString(),
  };
};

