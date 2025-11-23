import "dotenv/config";
import { getInvoiceAccounts } from "./utils";
import { registry as registryDeploymentRaw } from "./data/deployments.json";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import { ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";
import { getInvoiceRegistry } from "@zk-invoice/contracts/contract";
import { createAztecNodeClient } from "@aztec/aztec.js/node";

const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is required. Please set it in .env file (see .env.example)");
}

/**
 * Query invoice data directly from the blockchain
 * 
 * Usage: bun run invoice:get-onchain <invoice_id>
 * Example: bun run invoice:get-onchain 0x0b1cf6c4598a753604d7e9f29b181b95bd1786061a30353e859d408156664318
 */
const main = async () => {
    // Get invoice ID from command line
    const invoiceIdArg = process.argv[2];
    if (!invoiceIdArg) {
        console.error("❌ Error: Invoice ID is required");
        console.log("\nUsage: bun run invoice:get-onchain <invoice_id>");
        console.log("Example: bun run invoice:get-onchain 0x0b1cf6c4598a753604d7e9f29b181b95bd1786061a30353e859d408156664318");
        process.exit(1);
    }

    const invoiceId = Fr.fromString(invoiceIdArg);
    console.log(`\n🔍 Querying blockchain for invoice: ${invoiceId}\n`);

    // Setup wallet and registry
    const node = createAztecNodeClient(L2_NODE_URL);
    const { wallet, senderAddress } = await getInvoiceAccounts(node);

    const registryDeployment = {
        ...registryDeploymentRaw,
        instance: ContractInstanceWithAddressSchema.parse(registryDeploymentRaw.instance)
    };
    const registryAddress = AztecAddress.fromString(registryDeployment.address);
    const registry = await getInvoiceRegistry(
        wallet,
        senderAddress,
        registryAddress,
        registryDeployment.instance
    );

    try {
        // 1. Get PUBLIC payment info (anyone can read this)
        console.log("📋 PUBLIC PAYMENT INFO (visible to everyone):");
        console.log("================================================");
        const paymentInfo = await registry.methods.get_payment_info(invoiceId).simulate({ from: senderAddress });
        
        console.log(`  Partial Note:    ${paymentInfo.partial_note}`);
        console.log(`  Token Address:   ${paymentInfo.token_address}`);
        console.log(`  Amount:          ${paymentInfo.amount.toString()} wei`);
        console.log(`  Title Hash:      ${paymentInfo.title_hash}`);

        // 2. Check payment status (anyone can check this)
        console.log("\n💰 PAYMENT STATUS:");
        console.log("================================================");
        const isPaid = await registry.methods.is_paid(invoiceId).simulate({ from: senderAddress });
        console.log(`  Status:          ${isPaid ? "✅ PAID" : "⏳ PENDING"}`);

        // 3. Get PRIVATE invoice data (only invoice creator can read)
        console.log("\n🔒 PRIVATE INVOICE DATA (encrypted with per-user keys):");
        console.log("================================================");
        try {
            const invoiceNote = await registry.methods.get_invoice(invoiceId).simulate({ from: senderAddress });
            console.log(`  Owner:           ${invoiceNote.owner}`);
            console.log(`  Sender:          ${invoiceNote.sender}`);
            console.log(`  Metadata:        ${invoiceNote.metadata}`);
            console.log(`  Invoice ID:      ${invoiceNote.invoice_id}`);
            console.log(`  Randomness:      ${invoiceNote.randomness}`);
        } catch (error: any) {
            console.log(`  ⚠️  Cannot read private data`);
            console.log(`  This is expected! Only the invoice creator can decrypt their private notes.`);
        }

        console.log("\n✅ Query complete!\n");

    } catch (error: any) {
        console.error("\n❌ Error querying invoice:", error.message);
        console.log("\nPossible reasons:");
        console.log("  - Invoice doesn't exist on-chain");
        console.log("  - Wrong invoice ID format");
        console.log("  - Registry contract not deployed\n");
        process.exit(1);
    }
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });

