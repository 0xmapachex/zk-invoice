import "dotenv/config";
import { deployInvoiceRegistry } from "@zk-invoice/contracts/contract";
import { getInvoiceAccounts, getTestnetSendWaitOptions } from "./utils";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { writeFileSync } from "fs";
import { join } from "path";

// get environment variables
const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is required. Please set it in .env file (see .env.example)");
}

const main = async () => {
    console.log("🚀 Deploying Invoice Registry Contract...\n");

    // get accounts
    const node = await createAztecNodeClient(L2_NODE_URL);
    const { wallet, senderAddress } = await getInvoiceAccounts(node);

    // if testnet, get send/wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(node, wallet, senderAddress);

    // Deploy the registry contract (one-time deployment)
    console.log("Deploying registry contract...");
    const { contract: registryContract, secretKey } = await deployInvoiceRegistry(
        wallet,
        senderAddress,
        opts
    );

    console.log(`\n✅ Invoice Registry deployed successfully!`);
    console.log(`   Address: ${registryContract.address}`);
    console.log(`   Secret Key: ${secretKey}`);

    // Save deployment info to deployments.json
    const deploymentInfo = {
        registry: {
            address: registryContract.address.toString(),
            secretKey: secretKey.toString(),
            instance: registryContract.instance
        }
    };

    const deploymentsPath = join(__dirname, "data", "deployments.json");
    try {
        // Read existing deployments if any
        let existingDeployments = {};
        try {
            existingDeployments = require("./data/deployments.json");
        } catch {
            // File doesn't exist, that's ok
        }

        // Merge with existing deployments
        const updatedDeployments = {
            ...existingDeployments,
            ...deploymentInfo
        };

        writeFileSync(
            deploymentsPath,
            JSON.stringify(updatedDeployments, null, 2)
        );
        console.log(`\n💾 Deployment info saved to ${deploymentsPath}`);
    } catch (error) {
        console.error("⚠️  Failed to save deployment info:", error);
        console.log("\nPlease save this information manually:");
        console.log(JSON.stringify(deploymentInfo, null, 2));
    }

    console.log("\n🎉 Registry is ready to accept invoices!");
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error deploying registry:", error);
        process.exit(1);
    });

