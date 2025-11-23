import "dotenv/config";
import {
  createInvoice,
  getTokenContract,
  getInvoiceRegistry,
} from "@zk-invoice/contracts/contract";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import { ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";
import deploymentsData from "./data/deployments.json";

const deployments = deploymentsData as typeof deploymentsData & {
  registry?: {
    address: string;
    secretKey: string;
    instance: any;
  };
};
import {
  createInvoice as createInvoiceAPI,
  getInvoiceAccounts,
  USDC_SWAP_AMOUNT,
  getTestnetSendWaitOptions,
  waitForBlockFinalization,
} from "./utils";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { poseidon2Hash } from "@aztec/foundation/crypto";
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
  console.log("📄 Creating new invoice...\n");

  // get accounts
  const node = await createAztecNodeClient(L2_NODE_URL);
  let pxeConfig = {};
  if (await isTestnet(node)) pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
  const { wallet, senderAddress } = await getInvoiceAccounts(node, pxeConfig);

  // Check if registry is deployed
  if (!deployments.registry) {
    console.error("❌ Registry contract not deployed!");
    console.error("\nPlease deploy the registry first:");
    console.error("  bun run deploy:registry\n");
    process.exit(1);
  }

  // get token (USDC) - make sure PXE knows about it
  const usdcAddress = AztecAddress.fromString(deployments.usdc.address);
  await getTokenContract(wallet, senderAddress, node, usdcAddress);

  // get registry contract
  const registryDeployment = {
    ...deployments.registry,
    instance: ContractInstanceWithAddressSchema.parse(
      deployments.registry.instance
    ),
  };
  const registryAddress = AztecAddress.fromString(registryDeployment.address);
  const registry = await getInvoiceRegistry(
    wallet,
    senderAddress,
    registryAddress,
    registryDeployment.instance
  );

  // if testnet, get send/wait opts optimized for waiting and high gas
  const opts = await getTestnetSendWaitOptions(node, wallet, senderAddress);

  // Generate invoice ID
  const invoiceId = Fr.random();

  // Invoice details
  const invoiceTitle = "Payment for Services";
  const invoiceAmount = USDC_SWAP_AMOUNT; // Requesting 100 USDC (1000 USDC / 10)
  const tokenAddress = usdcAddress; // Payment in USDC

  // For now, use random fields for metadata and title hash
  // In production, these would be properly encoded/encrypted
  const metadata = Fr.random(); // TODO: Properly encode metadata
  const titleHash = Fr.random(); // TODO: Properly hash title

  console.log("Invoice Details:");
  console.log(`  ID: ${invoiceId}`);
  console.log(`  Title: ${invoiceTitle}`);
  console.log(`  Amount: ${invoiceAmount} USDC`);
  console.log(`  Token: ${tokenAddress}`);
  console.log(`  Sender: ${senderAddress}\n`);

  // Create invoice on-chain
  console.log("Creating invoice on-chain...");
  const txHash = await createInvoice(
    wallet,
    senderAddress,
    registry,
    invoiceId,
    titleHash,
    tokenAddress,
    invoiceAmount,
    metadata,
    opts
  );
  console.log(`✅ Invoice created on-chain, tx hash: ${txHash}\n`);

  // On testnet, wait for finalization. On sandbox, partial commitment is immediately available
  if (!L2_NODE_URL.includes('localhost')) {
    console.log("Waiting for transaction to finalize...");
    const txReceipt = await wallet.getTxReceipt(txHash);
    if (txReceipt) {
      await waitForBlockFinalization(node, txReceipt.blockNumber!, 2, 3000, 60, wallet, senderAddress);
    }
  } else {
    // On sandbox, wait a bit for public execution to complete
    console.log("Waiting for public execution to complete...");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Fetch the partial note hash from the blockchain (stored in public storage)
  // Retry a few times in case public execution hasn't completed yet
  console.log("Fetching payment info from blockchain...");
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
      console.log(`  Partial note not ready yet, waiting... (attempt ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const partialNoteHash = paymentInfo.partial_note.toString();
  console.log(`  Partial Note Hash: ${partialNoteHash}`);
  
  // Validate we got a proper partial note
  if (partialNoteHash === "0" || partialNoteHash === "0x0") {
    throw new Error("Failed to fetch partial note from blockchain - public storage not updated yet. Please try again.");
  }

  // Register invoice in API
  console.log("Registering invoice in API...");
  await createInvoiceAPI(
    invoiceId.toString(),
    registryAddress,
    senderAddress,
    partialNoteHash,
    invoiceTitle,
    tokenAddress,
    invoiceAmount,
    metadata.toString(),
    API_URL
  );

  console.log(`\n🎉 Invoice created successfully!`);
  console.log(`   Invoice ID: ${invoiceId}`);
  console.log(`   Shareable URL: ${API_URL}/invoice/${invoiceId}`);
  console.log(`\nℹ️  Share this URL with the payer to receive payment.`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error creating invoice:", error);
    process.exit(1);
  });
