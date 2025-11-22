import "dotenv/config";
import { getInvoiceAccounts } from "./utils";
import { eth as ethDeployment, usdc as usdcDeployment } from "./data/deployments.json"
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { getTokenContract } from "@zk-invoice/contracts/contract";
import { createAztecNodeClient } from "@aztec/aztec.js/node";

const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is required. Please set it in .env file (see .env.example)");
}

const main = async () => {
    const node = createAztecNodeClient(L2_NODE_URL);
    const { wallet, senderAddress, payerAddress } = await getInvoiceAccounts(node);

    // Get token contracts
    const ethAddress = AztecAddress.fromString(ethDeployment.address);
    const eth = await getTokenContract(wallet, senderAddress, node, ethAddress);
    
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(wallet, senderAddress, node, usdcAddress);

    // Get balances
    console.log("\n📊 Account Balances:");
    console.log("\n👤 Sender (Invoice Creator):");
    console.log("   Address:", senderAddress.toString());
    const senderEthBalance = await eth.methods.balance_of_private(senderAddress).simulate({});
    const senderUsdcBalance = await usdc.methods.balance_of_private(senderAddress).simulate({});
    console.log("   ETH:  ", senderEthBalance.toString(), "wei");
    console.log("   USDC: ", senderUsdcBalance.toString(), "wei");

    console.log("\n💰 Payer (Invoice Payer):");
    console.log("   Address:", payerAddress.toString());
    const payerEthBalance = await eth.methods.balance_of_private(payerAddress).simulate({});
    const payerUsdcBalance = await usdc.methods.balance_of_private(payerAddress).simulate({});
    console.log("   ETH:  ", payerEthBalance.toString(), "wei");
    console.log("   USDC: ", payerUsdcBalance.toString(), "wei");
    
    console.log("\n");
}

main();

