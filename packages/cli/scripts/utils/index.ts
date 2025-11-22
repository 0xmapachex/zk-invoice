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

export const ETH_MINT_AMOUNT = wad(10n);
export const ETH_SWAP_AMOUNT = ETH_MINT_AMOUNT / 10n;
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


export * from "./api.js";
export * from "./types.js";