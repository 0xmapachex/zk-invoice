import "dotenv/config";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import { ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";
import deploymentsData from "./data/deployments.json";
import { getInvoices, getInvoiceAccounts } from "./utils";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { getInvoiceRegistry } from "@zk-invoice/contracts/contract";
import { isTestnet } from "@zk-invoice/contracts/utils";

/**
 * Utility script to fix invoices with incorrect partial notes in the database.
 * 
 * This script:
 * 1. Fetches all invoices from the API
 * 2. For each invoice, retrieves the actual partial note from the blockchain
 * 3. Updates the database if the partial note is 0x0 or mismatched
 * 
 * Use this if invoices were created before the timing fix in create_invoice.ts
 */

const deployments = deploymentsData as typeof deploymentsData & {
  registry?: {
    address: string;
    secretKey: string;
    instance: any;
  };
};

const { L2_NODE_URL, API_URL } = process.env;
if (!L2_NODE_URL || !API_URL) {
  throw new Error("L2_NODE_URL and API_URL required");
}

const main = async () => {
  console.log("🔧 Fixing partial notes in database...\n");

  // fetch all invoices
  const invoices = await getInvoices(API_URL, {});
  console.log(`Found ${invoices.length} invoices to check\n`);

  // setup
  const node = createAztecNodeClient(L2_NODE_URL);
  let pxeConfig = {};
  if (await isTestnet(node)) pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
  const { wallet, senderAddress } = await getInvoiceAccounts(node, pxeConfig);

  // get registry
  if (!deployments.registry) {
    throw new Error("Registry not deployed");
  }

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

  // Process each invoice
  for (const invoice of invoices) {
    const invoiceId = Fr.fromString(invoice.invoiceId);
    const currentPartialNote = invoice.partialNoteHash;
    
    console.log(`\n📄 Invoice: ${invoice.invoiceId}`);
    console.log(`   Current partial note in DB: ${currentPartialNote}`);

    // Fetch from blockchain
    try {
      const paymentInfo = await registry.methods
        .get_payment_info(invoiceId)
        .simulate({ from: senderAddress });
      
      const blockchainPartialNote = paymentInfo.partial_note.toString();
      console.log(`   Blockchain partial note:   ${blockchainPartialNote}`);

      if (currentPartialNote === "0x0" || currentPartialNote === "0") {
        console.log(`   ⚠️  Needs update!`);
        
        // Update via API
        const response = await fetch(
          `${API_URL}/invoice/${invoice.invoiceId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              partialNoteHash: blockchainPartialNote,
            }),
          }
        );

        if (response.ok) {
          console.log(`   ✅ Updated successfully`);
        } else {
          const error = await response.text();
          console.log(`   ❌ Failed to update: ${error}`);
        }
      } else if (currentPartialNote === blockchainPartialNote) {
        console.log(`   ✅ Already correct`);
      } else {
        console.log(`   ⚠️  Mismatch! DB: ${currentPartialNote}, BC: ${blockchainPartialNote}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error fetching from blockchain: ${error.message}`);
    }
  }

  console.log("\n✨ Done!");
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });

