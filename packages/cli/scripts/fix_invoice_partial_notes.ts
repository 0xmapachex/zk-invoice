import "dotenv/config";
import { getInvoices, getInvoiceAccounts } from "./utils";
import { registry as registryDeploymentRaw } from "./data/deployments.json";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import { ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";
import { getInvoiceRegistry } from "@zk-invoice/contracts/contract";
import { createAztecNodeClient } from "@aztec/aztec.js/node";

const { L2_NODE_URL, API_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is required. Please set it in .env file (see .env.example)");
}
if (!API_URL) {
    throw new Error("API_URL is required. Please set it in .env file (see .env.example)");
}

/**
 * Fixes invoices that have invalid partial note hashes (0x0)
 * by fetching the correct value from the blockchain
 */
const main = async () => {
    console.log("🔧 Fixing invoice partial note hashes...\n");

    // Fetch all invoices from API
    const invoices = await getInvoices(API_URL);
    console.log(`Found ${invoices.length} invoices in database\n`);

    // Filter invoices with invalid partial notes
    const invalidInvoices = invoices.filter(
        inv => inv.partialNoteHash === "0x0" || inv.partialNoteHash === "0"
    );

    if (invalidInvoices.length === 0) {
        console.log("✅ All invoices have valid partial note hashes!");
        return;
    }

    console.log(`Found ${invalidInvoices.length} invoices with invalid partial notes:\n`);
    invalidInvoices.forEach(inv => {
        console.log(`  - Invoice ID: ${inv.invoiceId}`);
        console.log(`    Title: ${inv.title}`);
        console.log(`    Current partial note: ${inv.partialNoteHash}\n`);
    });

    // Setup wallet and registry
    const node = await createAztecNodeClient(L2_NODE_URL);
    const { wallet, senderAddress } = await getInvoiceAccounts(node);

    const registryDeployment = {
        ...registryDeploymentRaw,
        instance: ContractInstanceWithAddressSchema.parse(registryDeploymentRaw.instance)
    };
    const registryAddress = AztecAddress.fromString(registryDeployment.address);
    const registrySecretKey = Fr.fromString(registryDeployment.secretKey);
    const registry = await getInvoiceRegistry(
        wallet,
        senderAddress,
        registryAddress,
        registryDeployment.instance,
        registrySecretKey
    );

    // Fix each invalid invoice
    let fixed = 0;
    let errors = 0;

    for (const invoice of invalidInvoices) {
        try {
            console.log(`Processing invoice ${invoice.invoiceId}...`);
            
            // Fetch payment info from blockchain
            const invoiceId = Fr.fromString(invoice.invoiceId);
            const paymentInfo = await registry.methods
                .get_payment_info(invoiceId)
                .simulate({ from: senderAddress });
            
            const correctPartialNote = paymentInfo.partial_note.toString();
            
            // Update via API
            const response = await fetch(`${API_URL}/invoice/${invoice.invoiceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partialNoteHash: correctPartialNote
                })
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            console.log(`  ✅ Updated to: ${correctPartialNote}\n`);
            fixed++;
        } catch (error: any) {
            console.error(`  ❌ Error: ${error.message}\n`);
            errors++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`Summary:`);
    console.log(`  Fixed: ${fixed}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Total: ${invalidInvoices.length}`);
    console.log("=".repeat(50) + "\n");

    if (errors > 0) {
        console.log("⚠️  Some invoices could not be fixed.");
        console.log("Possible reasons:");
        console.log("  - Invoice doesn't exist on-chain");
        console.log("  - API update endpoint doesn't exist");
        console.log("  - Registry contract not properly synced\n");
    } else {
        console.log("🎉 All invoices fixed successfully!\n");
    }
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });

