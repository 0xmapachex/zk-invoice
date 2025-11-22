import "dotenv/config";
import { getInvoiceAccounts } from "./utils";
import { usdc as usdcDeployment } from "./data/deployments.json"
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { getTokenContract } from "@zk-invoice/contracts/contract";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { isTestnet } from "@zk-invoice/contracts/utils";

const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is required. Please set it in .env file (see .env.example)");
}

const main = async () => {
    const node = createAztecNodeClient(L2_NODE_URL);
    let pxeConfig = {};
    if (await isTestnet(node)) pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
    const { wallet, senderAddress, payerAddress } = await getInvoiceAccounts(node, pxeConfig);

    // Get token contract
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(wallet, senderAddress, node, usdcAddress);

    // Get balances
    console.log("\n📊 Account Balances:");
    console.log("\n👤 Sender (Invoice Creator):");
    console.log("   Address:", senderAddress.toString());
    const senderUsdcBalance = await usdc.methods.balance_of_private(senderAddress).simulate({});
    console.log("   USDC: ", senderUsdcBalance.toString(), "wei");

    console.log("\n💰 Payer (Invoice Payer):");
    console.log("   Address:", payerAddress.toString());
    const payerUsdcBalance = await usdc.methods.balance_of_private(payerAddress).simulate({});
    console.log("   USDC: ", payerUsdcBalance.toString(), "wei");
    
    console.log("\n");
}

main();

