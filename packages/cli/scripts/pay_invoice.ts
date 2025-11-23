import "dotenv/config";
import {
  payInvoice,
  getTokenContract,
  getInvoiceRegistry,
  isInvoicePaid,
  getPrivateTransferToCommitmentAuthwit,
} from "@zk-invoice/contracts/contract";
import { ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";
import deploymentsData from "./data/deployments.json";

const deployments = deploymentsData as typeof deploymentsData & {
  registry?: {
    address: string;
    secretKey: string;
    instance: any;
  };
};
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import {
  getInvoices,
  getInvoiceAccounts,
  getTestnetSendWaitOptions,
  markInvoicePaid,
  waitForBlockFinalization,
} from "./utils";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { isTestnet } from "@zk-invoice/contracts/utils";

// get environment variables
const { L2_NODE_URL, API_URL } = process.env;
if (!L2_NODE_URL) {
  throw new Error(
    "L2_NODE_URL is required. Please set it in .env file (see .env.example)"
  );
}
if (!API_URL) {
  throw new Error(
    "API_URL is required. Please set it in .env file (see .env.example)"
  );
}

const main = async () => {
  console.log("💳 Paying invoice...\n");

  // fetch pending invoices
  const invoices = await getInvoices(API_URL, { status: "pending" });

  if (invoices.length === 0) {
    console.log("No pending invoices found.");
    process.exit(0);
  }

  // NOTE: In a real app, user would select which invoice to pay
  // For demo, we'll pay the first pending invoice
  const invoiceToPay = invoices[0]!;

  console.log("Invoice Details:");
  console.log(`  ID: ${invoiceToPay.invoiceId}`);
  console.log(`  Title: ${invoiceToPay.title}`);
  console.log(`  Amount: ${invoiceToPay.amount}`);
  console.log(`  Token: ${invoiceToPay.tokenAddress}`);
  console.log(`  Status: ${invoiceToPay.status}\n`);

  // setup wallets
  const node = createAztecNodeClient(L2_NODE_URL);
  let pxeConfig = {};
  if (await isTestnet(node)) pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
  const { wallet, payerAddress } = await getInvoiceAccounts(node, pxeConfig);

  // Check if registry is deployed
  if (!deployments.registry) {
    console.error("❌ Registry contract not deployed!");
    console.error("\nPlease deploy the registry first:");
    console.error("  bun run deploy:registry\n");
    process.exit(1);
  }

  // get token contract (USDC)
  const tokenAddress = AztecAddress.fromString(invoiceToPay.tokenAddress);
  console.log("Setting up token contract and syncing state...");
  const token = await getTokenContract(
    wallet,
    payerAddress,
    node,
    tokenAddress
  );

  // Check payer's balance before attempting payment
  console.log("Checking payer balance...");
  const payerBalance = await token.methods
    .balance_of_private(payerAddress)
    .simulate({ from: payerAddress });
  // Amount comes from API as string, so convert it
  const requiredAmount =
    typeof invoiceToPay.amount === "string"
      ? BigInt(invoiceToPay.amount)
      : BigInt(invoiceToPay.amount.toString());
  console.log(`  Payer balance: ${payerBalance.toString()}`);
  console.log(`  Required amount: ${requiredAmount.toString()}`);

  if (payerBalance < requiredAmount) {
    throw new Error(
      `Insufficient balance. Have ${payerBalance.toString()}, need ${requiredAmount.toString()}. Run 'bun run mint' first.`
    );
  }

  // get registry contract (payer doesn't need secret key)
  const registryDeployment = {
    ...deployments.registry,
    instance: ContractInstanceWithAddressSchema.parse(
      deployments.registry.instance
    ),
  };
  const registryAddress = AztecAddress.fromString(registryDeployment.address);
  const registry = await getInvoiceRegistry(
    wallet,
    payerAddress,
    registryAddress,
    registryDeployment.instance
  );

  // if testnet, get send/wait opts optimized for waiting and high gas
  const opts = await getTestnetSendWaitOptions(node, wallet, payerAddress);

  // pay the invoice
  console.log("Processing payment...");
  const invoiceId = Fr.fromString(invoiceToPay.invoiceId);
  const partialNote = Fr.fromString(invoiceToPay.partialNoteHash);
  // Amount comes from API as string, so convert it
  const amount =
    typeof invoiceToPay.amount === "string"
      ? BigInt(invoiceToPay.amount)
      : BigInt(invoiceToPay.amount.toString());

  // Perform one more sync before payment to ensure all notes are available
  console.log("Final sync before payment...");
  await token.methods.sync_private_state().simulate({ from: payerAddress });

  let txHash;
  let retries = 3;
  let lastError;

  // Retry payment if sync issues occur
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Payment attempt ${attempt}/${retries}...`);
      txHash = await payInvoice(
        wallet,
        payerAddress,
        registry,
        invoiceId,
        partialNote,
        token,
        tokenAddress,
        amount,
        opts
      );
      console.log(`✅ Payment processed, tx hash: ${txHash}\n`);
      break;
    } catch (error: any) {
      lastError = error;
      if (
        error?.message?.includes("Nullifier witness not found") &&
        attempt < retries
      ) {
        console.log(
          `⚠️  Sync issue detected - PXE doesn't have witness data yet`
        );

        if (!L2_NODE_URL.includes("localhost")) {
          console.log(`   Waiting for more blocks to be processed...`);
          const currentBlock = await node.getBlockNumber();
          await waitForBlockFinalization(
            node,
            currentBlock,
            2,
            3000,
            30,
            wallet,
            payerAddress
          );
        }

        // Resync and retry
        console.log(`   Resyncing private state...`);
        await token.methods
          .sync_private_state()
          .simulate({ from: payerAddress });
        console.log(
          `   Retrying payment (attempt ${attempt + 1}/${retries})...\n`
        );
      } else {
        throw error;
      }
    }
  }

  if (!txHash) {
    throw lastError || new Error("Payment failed after all retries");
  }

  // Wait a bit for public execution to complete (payment status update)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // verify payment was successful
  console.log("Verifying payment...");
  const isPaid = await isInvoicePaid(wallet, payerAddress, registry, invoiceId);

  if (isPaid) {
    console.log("✅ Payment verified on-chain!\n");

    // update invoice status in API
    await markInvoicePaid(invoiceToPay.invoiceId, API_URL);
    console.log("📝 Invoice marked as paid in API");
  } else {
    console.log("⚠️  Payment verification failed");
  }

  console.log("\n🎉 Invoice paid successfully!");
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error paying invoice:", error);
    process.exit(1);
  });
