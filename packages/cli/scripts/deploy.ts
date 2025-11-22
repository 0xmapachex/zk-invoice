import "dotenv/config";
import { deployTokenContract } from "@zk-invoice/contracts/contract";
import { TOKEN_METADATA } from "@zk-invoice/contracts/constants";
import { writeFileSync } from "node:fs"
import { getTestnetSendWaitOptions, getInvoiceAccounts } from "./utils";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { isTestnet } from "@zk-invoice/contracts/utils";

const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is required. Please set it in .env file (see .env.example)");
}

// Deploys USD Coin token contract
const main = async () => {
    const node = createAztecNodeClient(L2_NODE_URL);
    console.log("Connected to Aztec node at ", L2_NODE_URL);


    let pxeConfig = {};
    if (await isTestnet(node)) pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };

    // get accounts
    const { wallet, senderAddress: deployerAddress } = await getInvoiceAccounts(node, pxeConfig);

     // if testnet, get send/ wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(node, wallet, deployerAddress);
    // deploy token contract
    console.log("Deploying USD Coin token contract");
    const usdc = await deployTokenContract(
        wallet,
        deployerAddress,
        TOKEN_METADATA.usdc,
        opts
    );
    console.log("USDC token contract deployed, address: ", usdc.address);

    // write deployment to fs
    const deployments = {
        usdc: { address: usdc.address }
    };
    // todo: add deployments for chainID
    const filepath = `${__dirname}/data/deployments.json`;
    writeFileSync(filepath, JSON.stringify(deployments, null, 2));
    console.log(`Deployments written to ${filepath}`);
}

main();
