import "dotenv/config";
import {
    getInvoiceAccounts,
    USDC_MINT_AMOUNT,
    getTestnetSendWaitOptions,
    waitForBlockFinalization
} from "./utils";
import { usdc as usdcDeployment } from "./data/deployments.json"
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { getTokenContract } from "@zk-invoice/contracts/contract";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { isTestnet } from "@zk-invoice/contracts/utils";

const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is required. Please set it in .env file (see .env.example)");
}

// Mints tokens to PAYER account for testing invoice payments
// In a real invoice system, the payer needs tokens to pay invoices
const main = async () => {
    const node = createAztecNodeClient(L2_NODE_URL);

    // get accounts
    let pxeConfig = {};
    if (await isTestnet(node)) pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
    const { wallet, senderAddress, payerAddress } = await getInvoiceAccounts(node, pxeConfig);

    // if testnet, get send/ wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(node, wallet, senderAddress);

    // Mint USDC to payer (for paying invoices)
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(wallet, senderAddress, node, usdcAddress);

    console.log("Minting USDC to payer account (for paying invoices)...");
    const usdcReceipt = await usdc
        .withWallet(wallet)
        .methods
        .mint_to_private(payerAddress, USDC_MINT_AMOUNT)
        .send(opts.send)
        .wait(opts.wait);
    console.log("✅ 50,000 USDC minted to payer");
    
    // Wait for USDC mint to finalize
    if (L2_NODE_URL.includes('localhost')) {
        console.log("⚠️  Local sandbox - skipping block wait, using fixed delay");
        await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
        await waitForBlockFinalization(node, usdcReceipt.blockNumber!, 2, 3000, 60, wallet, senderAddress);
    }
    
    console.log("\n✨ Payer now has funds to pay invoices in USDC!");
    console.log("   Sender will receive payments when invoices are paid.");
    console.log("   ✅ All transactions finalized and ready for use");
}

main();
