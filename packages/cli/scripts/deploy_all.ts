import "dotenv/config";
import { deployTokenContract, deployInvoiceRegistry } from "@zk-invoice/contracts/contract";
import { TOKEN_METADATA } from "@zk-invoice/contracts/constants";
import { writeFileSync } from "node:fs";
import { join } from "path";
import { getTestnetSendWaitOptions, getInvoiceAccounts, waitForBlockFinalization } from "./utils";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { isTestnet } from "@zk-invoice/contracts/utils";

const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is required. Please set it in .env file (see .env.example)");
}

/**
 * Unified deployment script
 * Deploys both Token (USDC) and Invoice Registry contracts
 */
const main = async () => {
    console.log("🚀 Deploying ZK-Invoice System...\n");
    
    const node = createAztecNodeClient(L2_NODE_URL);
    console.log("Connected to Aztec node at ", L2_NODE_URL);

    let pxeConfig = {};
    if (await isTestnet(node)) pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };

    // Get accounts
    const { wallet, senderAddress: deployerAddress } = await getInvoiceAccounts(node, pxeConfig);

    // Get send/wait options (optimized for testnet if needed)
    const opts = await getTestnetSendWaitOptions(node, wallet, deployerAddress);

    // ========================================
    // 1. Deploy USDC Token
    // ========================================
    console.log("\n📝 Step 1: Deploying USDC Token Contract...");
    const usdc = await deployTokenContract(
        wallet,
        deployerAddress,
        TOKEN_METADATA.usdc,
        opts
    );
    console.log("✅ USDC token deployed at:", usdc.address.toString());

    // Wait for token deployment on testnet
    if (!L2_NODE_URL.includes('localhost')) {
        console.log("Waiting for token deployment to finalize...");
        const tokenBlock = await node.getBlockNumber();
        await waitForBlockFinalization(node, tokenBlock, 2, 3000, 60, wallet, deployerAddress);
    }

    // ========================================
    // 2. Deploy Invoice Registry
    // ========================================
    console.log("\n📝 Step 2: Deploying Invoice Registry Contract...");
    const { contract: registryContract, secretKey } = await deployInvoiceRegistry(
        wallet,
        deployerAddress,
        opts
    );
    console.log("✅ Invoice Registry deployed at:", registryContract.address.toString());

    // Wait for registry deployment on testnet
    if (!L2_NODE_URL.includes('localhost')) {
        console.log("Waiting for registry deployment to finalize...");
        const registryBlock = await node.getBlockNumber();
        await waitForBlockFinalization(node, registryBlock, 2, 3000, 60, wallet, deployerAddress);
    }

    // ========================================
    // 3. Save Deployment Info
    // ========================================
    console.log("\n💾 Saving deployment info...");
    
    const deployments = {
        usdc: { address: usdc.address.toString() },
        registry: {
            address: registryContract.address.toString(),
            instance: registryContract.instance
        }
    };

    const deploymentsPath = join(__dirname, "data", "deployments.json");
    try {
        writeFileSync(
            deploymentsPath,
            JSON.stringify(deployments, null, 2)
        );
        console.log(`✅ Deployment info saved to ${deploymentsPath}`);
    } catch (error) {
        console.error("⚠️  Failed to save deployment info:", error);
        console.log("\nPlease save this information manually:");
        console.log(JSON.stringify(deployments, null, 2));
    }

    console.log("\n🎉 ZK-Invoice System Deployed Successfully!\n");
    console.log("📋 Deployment Summary:");
    console.log(`   USDC Token:       ${usdc.address.toString()}`);
    console.log(`   Invoice Registry: ${registryContract.address.toString()}`);
    console.log("\n📝 Next steps:");
    console.log("   1. Mint tokens: bun run setup:mint");
    console.log("   2. Create invoice: bun run invoice:create");
    console.log("   3. Pay invoice: bun run invoice:pay\n");
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error deploying system:", error);
        process.exit(1);
    });

