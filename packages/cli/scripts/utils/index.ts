import { TestWallet } from "@aztec/test-wallet/server";
import { getInitialTestAccountsData } from "@aztec/accounts/testing";
import { isTestnet, wad } from "@zk-invoice/contracts/utils";
import { getPriorityFeeOptions, getSponsoredPaymentMethod } from "@zk-invoice/contracts/fees";
import readline from "readline";
import accounts from "../data/accounts.json";
import type { SendInteractionOptions, WaitOpts } from "@aztec/aztec.js/contracts";
import { AztecAddress } from "@aztec/stdlib/aztec-address";
import type { AztecNode } from "@aztec/aztec.js/node";
import { Fr } from "@aztec/aztec.js/fields";
import type { PXEConfig } from "@aztec/pxe/config"

export const USDC_MINT_AMOUNT = wad(50000n);
export const USDC_SWAP_AMOUNT = USDC_MINT_AMOUNT / 10n;
export const testnetBaseFeePadding = 100; // pad by 100%
export const testnetPriorityFee = 10n; // multiply base fee allowance by 10x
export const testnetTimeout = 3600; // seconds until timeout waiting for send
export const testnetInterval = 3; // seconds between polling for tx
/**
 * In high fee environments (testnet) get send and wait options
 * @param pxe - the PXE to execute with
 * @param withFPC - if true, use sponsored FPC
 * @returns send/ wait options optimized for testnet
 */
export const getTestnetSendWaitOptions = async (
    node: AztecNode,
    wallet: TestWallet,
    from: AztecAddress,
    withFPC: boolean = true,
): Promise<{
    send: SendInteractionOptions,
    wait: WaitOpts
}> => {
    let send: SendInteractionOptions = { from };
    let wait: WaitOpts = {};
    if (await isTestnet(node)) {
        let fee = await getPriorityFeeOptions(node, testnetPriorityFee);
        if (withFPC) {
            const paymentMethod = await getSponsoredPaymentMethod(wallet);
            fee = { ...fee, paymentMethod };
        }
        send = { ...send, fee };
        wait = { timeout: testnetTimeout, interval: testnetInterval };
    }
    return { send, wait };
}

export const getInvoiceAccounts = async (
    node: AztecNode,
    pxeConfig: Partial<PXEConfig> = {}
): Promise<{
    wallet: TestWallet,
    senderAddress: AztecAddress,
    payerAddress: AztecAddress,
}> => {
    // check if testnet
    let wallet = await TestWallet.create(node, pxeConfig);
    let senderAddress: AztecAddress;
    let payerAddress: AztecAddress;
    if (await isTestnet(node)) {
        // if testnet, get accounts from env (should run setup_accounts.ts first)
        senderAddress = await getAccountFromFs("seller", wallet);  // seller = invoice sender
        payerAddress = await getAccountFromFs("buyer", wallet);     // buyer = invoice payer
    } else {
        // if sandbox, get initialized test accounts
        const [senderAccount, payerAccount] = await getInitialTestAccountsData();
        if (!senderAccount) throw new Error("Sender account not found");
        if (!payerAccount) throw new Error("Payer account not found");
        // create accounts
        await wallet.createSchnorrAccount(senderAccount.secret, senderAccount.salt);
        senderAddress = senderAccount.address;
        await wallet.createSchnorrAccount(payerAccount.secret, payerAccount.salt);
        payerAddress = payerAccount.address;
    }
    // register accounts to each other
    await wallet.registerSender(payerAddress);
    await wallet.registerSender(senderAddress);
    return { wallet, senderAddress, payerAddress };
}

export const getAccountFromFs = async (
    accountType: "seller" | "buyer",
    wallet: TestWallet
): Promise<AztecAddress> => {
    // reinstantiate the account
    const accountSecret = accounts[accountType];
    const secretKey = Fr.fromString(accountSecret.secretKey);
    const salt = Fr.fromString(accountSecret.salt);
    const manager = await wallet.createSchnorrAccount(secretKey, salt);
    return manager.address;
}

export const waitForBlock = async (node: AztecNode, targetBlock: number) => {
    return new Promise((resolve) => {
        let currentBlock = 0;
        let seconds = 0;

        const interval = setInterval(async () => {
            if (seconds % 5 === 0) {
                (async () => {
                    currentBlock = await node.getBlockNumber();
                })();
            }
            seconds++;
            const dots = '.'.repeat((seconds - 1) % 4);

            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Current block: ${currentBlock} (waiting until ${targetBlock})${dots}`);

            if (currentBlock >= targetBlock) {
                clearInterval(interval);
                process.stdout.write('\n');
                resolve(currentBlock);
            }
        }, 1000);
    });
};

/**
 * Wait for block finalization and PXE synchronization
 * This ensures the PXE has processed the block and can generate witnesses
 * 
 * @param node - Aztec node client
 * @param transactionBlock - The block number where the transaction was included
 * @param extraBlocks - Number of additional blocks to wait (default 2 for finalization)
 * @param pxeProcessingDelay - Extra milliseconds to wait for PXE processing (default 3000)
 */
/**
 * Trigger block production on on-demand sandboxes by submitting a dummy transaction
 * Many local Aztec sandboxes only produce blocks when there are pending transactions
 * 
 * @param wallet - The wallet to use for the dummy transaction
 * @param from - The address to use as sender
 * @returns true if a block was likely triggered, false otherwise
 */
export const triggerBlockProduction = async (
    wallet: TestWallet,
    from: AztecAddress
): Promise<boolean> => {
    try {
        // Register sender to itself (idempotent, safe, triggers block production)
        await wallet.registerSender(from);
        return true;
    } catch (error) {
        // If this fails, sandbox might not support on-demand blocks
        return false;
    }
};

export const waitForBlockFinalization = async (
    node: AztecNode,
    transactionBlock: number,
    extraBlocks: number = 2,
    pxeProcessingDelay: number = 3000,
    timeoutSeconds: number = 60,
    wallet?: TestWallet,
    from?: AztecAddress
): Promise<void> => {
    const targetBlock = transactionBlock + extraBlocks;
    console.log(`⏳ Waiting for block finalization...`);
    console.log(`   Transaction block: ${transactionBlock}`);
    console.log(`   Target block: ${targetBlock} (+${extraBlocks} for finalization)`);

    let currentBlock = await node.getBlockNumber();
    let startTime = Date.now();
    const maxWaitMs = timeoutSeconds * 1000;
    let lastBlock = currentBlock;
    let stuckSeconds = 0;

    while (currentBlock < targetBlock) {
        const elapsed = Date.now() - startTime;
        
        // Timeout check - if blocks aren't being produced, give up and proceed
        if (elapsed > maxWaitMs) {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            console.log(`   ⚠️  Timeout: Blocks stopped at ${currentBlock} (waited ${Math.floor(elapsed/1000)}s)`);
            console.log(`   ⚠️  Network might be stalled. Proceeding anyway...`);
            console.log(`   💡 Tip: Restart your Aztec sandbox if this persists\n`);
            break;
        }
        
        // Check if blocks are stuck (no progress for 5+ seconds)
        if (currentBlock === lastBlock) {
            stuckSeconds++;
            
            // If stuck for 5+ seconds and we have wallet access, try to trigger block production
            if (stuckSeconds >= 5 && wallet && from) {
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0);
                console.log(`   ⚡ Blocks stuck at ${currentBlock}, triggering production...`);
                
                // Trigger block production by submitting a dummy operation
                await triggerBlockProduction(wallet, from);
                
                stuckSeconds = 0; // Reset counter after trigger attempt
            }
        } else {
            stuckSeconds = 0; // Reset if block progressed
            lastBlock = currentBlock;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentBlock = await node.getBlockNumber();
        
        // Progress indicator
        const elapsedSec = Math.floor(elapsed / 1000);
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`   Block: ${currentBlock}/${targetBlock} (${elapsedSec}s/${timeoutSeconds}s)`);
    }
    
    if (currentBlock >= targetBlock) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        console.log(`   ✅ Block ${targetBlock} reached`);
    }
    
    // Give PXE extra time to process the block and build witness data
    console.log(`   ⏳ Waiting ${pxeProcessingDelay}ms for PXE to process...`);
    await new Promise(resolve => setTimeout(resolve, pxeProcessingDelay));
    console.log(`   ✅ Finalization complete\n`);
};


export * from "./api.js";
export * from "./types.js";