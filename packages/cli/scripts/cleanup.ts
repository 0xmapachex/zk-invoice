import { existsSync, unlinkSync } from "fs";
import { join } from "path";

/**
 * Cleanup script to reset all local state
 * 
 * This script removes:
 * - API databases (invoices.sqlite, orders.sqlite)
 * - Deployment info (deployments.json)
 * 
 * After running this, you'll need to:
 * 1. Restart sandbox (aztec start --sandbox)
 * 2. Restart API (cd packages/api && bun run dev)
 * 3. Redeploy contracts (bun run setup:deploy && bun run deploy:registry)
 * 4. Mint tokens (bun run setup:mint)
 */

const main = () => {
    console.log("🧹 Cleaning up local state...\n");

    // Files to remove
    const filesToRemove = [
        // API databases
        join(__dirname, "../../api/invoices.sqlite"),
        join(__dirname, "../../api/orders.sqlite"),
        
        // Deployment info
        join(__dirname, "data/deployments.json"),
    ];

    let removedCount = 0;
    let notFoundCount = 0;

    for (const filePath of filesToRemove) {
        if (existsSync(filePath)) {
            try {
                unlinkSync(filePath);
                console.log(`✅ Removed: ${filePath}`);
                removedCount++;
            } catch (error) {
                console.error(`❌ Failed to remove ${filePath}:`, error);
            }
        } else {
            console.log(`⏭️  Not found (already clean): ${filePath}`);
            notFoundCount++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Files removed: ${removedCount}`);
    console.log(`   Files not found: ${notFoundCount}`);

    console.log("\n✨ Cleanup complete!\n");
    console.log("📝 Next steps:");
    console.log("   1. Restart Aztec sandbox: aztec start --sandbox");
    console.log("   2. Restart API: cd packages/api && bun run dev");
    console.log("   3. Recompile contracts: cd packages/contracts && aztec-nargo compile");
    console.log("   4. Deploy all contracts: bun run deploy");
    console.log("   5. Mint tokens: bun run setup:mint");
    console.log("   6. Ready to test!\n");
};

main();

