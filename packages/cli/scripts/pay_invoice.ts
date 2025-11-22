import "dotenv/config";
import {
    payInvoice,
    getTokenContract,
    getInvoiceRegistry,
    isInvoicePaid,
    getPrivateTransferToCommitmentAuthwit
} from "@zk-invoice/contracts/contract";
import { ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";
import { 
    eth as ethDeployment, 
    usdc as usdcDeployment,
    registry as registryDeploymentRaw
} from "./data/deployments.json";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import {
    getInvoices,
    getInvoiceAccounts,
    getTestnetSendWaitOptions,
    markInvoicePaid
} from "./utils";
import { createAztecNodeClient } from "@aztec/aztec.js/node";

// get environment variables
const { L2_NODE_URL, API_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is required. Please set it in .env file (see .env.example)");
}
if (!API_URL) {
    throw new Error("API_URL is required. Please set it in .env file (see .env.example)");
}

const main = async () => {
    console.log("💳 Paying invoice...\n");

    // fetch pending invoices
    const invoices = await getInvoices(API_URL, { status: 'pending' });
    
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
    const node = await createAztecNodeClient(L2_NODE_URL);
    const { wallet, payerAddress } = await getInvoiceAccounts(node);

    // get token contract
    const tokenAddress = AztecAddress.fromString(invoiceToPay.tokenAddress);
    const token = await getTokenContract(wallet, payerAddress, node, tokenAddress);

    // register other token (ETH or USDC) to ensure PXE knows about it
    const ethAddress = AztecAddress.fromString(ethDeployment.address);
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    if (!tokenAddress.equals(ethAddress)) {
        await getTokenContract(wallet, payerAddress, node, ethAddress);
    }
    if (!tokenAddress.equals(usdcAddress)) {
        await getTokenContract(wallet, payerAddress, node, usdcAddress);
    }

    // get registry contract
    const registryDeployment = {
        ...registryDeploymentRaw,
        instance: ContractInstanceWithAddressSchema.parse(registryDeploymentRaw.instance)
    };
    const registryAddress = AztecAddress.fromString(registryDeployment.address);
    const registrySecretKey = Fr.fromString(registryDeployment.secretKey);
    const registry = await getInvoiceRegistry(
        wallet,
        payerAddress,
        registryAddress,
        registryDeployment.instance,
        registrySecretKey
    );

    // if testnet, get send/wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(node, wallet, payerAddress);

    // pay the invoice
    console.log("Processing payment...");
    const invoiceId = Fr.fromString(invoiceToPay.invoiceId);
    const partialNote = Fr.fromString(invoiceToPay.partialNoteHash);
    const amount = BigInt(invoiceToPay.amount);
    
    const txHash = await payInvoice(
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

    // verify payment was successful
    console.log("Verifying payment...");
    const isPaid = await isInvoicePaid(
        wallet,
        payerAddress,
        registry,
        invoiceId
    );
    
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

