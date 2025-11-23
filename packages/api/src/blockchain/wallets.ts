import { TestWallet } from "@aztec/test-wallet/server";
import { getInitialTestAccountsData } from "@aztec/accounts/testing";
import { isTestnet } from "@zk-invoice/contracts/utils";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import type { AztecNode } from "@aztec/aztec.js/node";
import { Fr } from "@aztec/aztec.js/fields";
import type { PXEConfig } from "@aztec/pxe/config";

/**
 * Get invoice accounts with a fresh PXE
 * Adapted from CLI utils for API usage
 */
export const getInvoiceAccounts = async (
  node: AztecNode,
  pxeConfig: Partial<PXEConfig> = {}
): Promise<{
  wallet: TestWallet;
  senderAddress: AztecAddress;
  payerAddress: AztecAddress;
}> => {
  const wallet = await TestWallet.create(node, pxeConfig);
  let senderAddress: AztecAddress;
  let payerAddress: AztecAddress;

  if (await isTestnet(node)) {
    // On testnet, read from environment variables
    const sellerSecretKey = process.env.SELLER_SECRET_KEY;
    const sellerSalt = process.env.SELLER_SALT;
    const buyerSecretKey = process.env.BUYER_SECRET_KEY;
    const buyerSalt = process.env.BUYER_SALT;

    if (!sellerSecretKey || !sellerSalt || !buyerSecretKey || !buyerSalt) {
      throw new Error(
        "Missing account credentials in environment variables. Required: SELLER_SECRET_KEY, SELLER_SALT, BUYER_SECRET_KEY, BUYER_SALT"
      );
    }

    // Recreate seller account
    const sellerManager = await wallet.createSchnorrAccount(
      Fr.fromString(sellerSecretKey),
      Fr.fromString(sellerSalt)
    );
    senderAddress = sellerManager.address;

    // Recreate buyer account
    const buyerManager = await wallet.createSchnorrAccount(
      Fr.fromString(buyerSecretKey),
      Fr.fromString(buyerSalt)
    );
    payerAddress = buyerManager.address;
  } else {
    // On sandbox, use initialized test accounts
    const [senderAccount, payerAccount] = await getInitialTestAccountsData();
    if (!senderAccount) throw new Error("Sender account not found");
    if (!payerAccount) throw new Error("Payer account not found");

    await wallet.createSchnorrAccount(senderAccount.secret, senderAccount.salt);
    senderAddress = senderAccount.address;
    await wallet.createSchnorrAccount(payerAccount.secret, payerAccount.salt);
    payerAddress = payerAccount.address;
  }

  // Register accounts to each other
  await wallet.registerSender(payerAddress);
  await wallet.registerSender(senderAddress);

  return { wallet, senderAddress, payerAddress };
};

/**
 * Trigger block production on on-demand sandboxes by submitting a dummy transaction
 */
export const triggerBlockProduction = async (
  wallet: TestWallet,
  from: AztecAddress
): Promise<boolean> => {
  try {
    await wallet.registerSender(from);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Wait for block finalization and PXE synchronization
 */
export const waitForBlockFinalization = async (
  node: AztecNode,
  transactionBlock: number,
  extraBlocks: number = 2,
  pxeProcessingDelay: number = 3000,
  timeoutSeconds: number = 60,
  wallet?: TestWallet,
  from?: AztecAddress
): Promise<void> => {
  const targetBlock = transactionBlock + extraBlocks;
  console.log(`Waiting for block finalization...`);
  console.log(`  Transaction block: ${transactionBlock}`);
  console.log(`  Target block: ${targetBlock} (+${extraBlocks})`);

  let currentBlock = await node.getBlockNumber();
  const startTime = Date.now();
  const maxWaitMs = timeoutSeconds * 1000;
  let lastBlock = currentBlock;
  let stuckSeconds = 0;

  while (currentBlock < targetBlock) {
    const elapsed = Date.now() - startTime;

    if (elapsed > maxWaitMs) {
      console.log(`  Timeout: Blocks stopped at ${currentBlock}`);
      console.log(`  Network might be stalled. Proceeding anyway...`);
      break;
    }

    if (currentBlock === lastBlock) {
      stuckSeconds++;

      if (stuckSeconds >= 5 && wallet && from) {
        console.log(`  Blocks stuck at ${currentBlock}, triggering production...`);
        await triggerBlockProduction(wallet, from);
        stuckSeconds = 0;
      }
    } else {
      stuckSeconds = 0;
      lastBlock = currentBlock;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    currentBlock = await node.getBlockNumber();
  }

  if (currentBlock >= targetBlock) {
    console.log(`  Block ${targetBlock} reached`);
  }

  console.log(`  Waiting ${pxeProcessingDelay}ms for PXE to process...`);
  await new Promise((resolve) => setTimeout(resolve, pxeProcessingDelay));
  console.log(`  Finalization complete`);
};

