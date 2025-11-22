import { beforeAll, describe, test, expect } from '@jest/globals';
import { getInitialTestAccountsData } from '@aztec/accounts/testing';
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { Fr } from '@aztec/aztec.js/fields';
import { createAztecNodeClient, type AztecNode } from "@aztec/aztec.js/node";
import { TestWallet } from '@aztec/test-wallet/server';
import { InvoiceRegistryContract, TokenContract } from "@zk-invoice/contracts/artifacts";
import { TOKEN_METADATA } from "@zk-invoice/contracts/constants";
import {
    deployInvoiceRegistry,
    deployTokenContract,
    createInvoice,
    payInvoice,
    isInvoicePaid,
    expectBalancePrivate,
    getInvoice,
    getPaymentInfo
} from "@zk-invoice/contracts/contract";
import { wad } from "@zk-invoice/contracts/utils";

const { AZTEC_NODE_URL = "http://localhost:8080" } = process.env;

describe("ZK Invoice E2E Tests", () => {

    let node: AztecNode;

    let minterWallet: TestWallet;
    let senderWallet: TestWallet;
    let payerWallet: TestWallet;

    let minterAddress: AztecAddress;
    let senderAddress: AztecAddress;
    let payerAddress: AztecAddress;

    let invoiceRegistry: InvoiceRegistryContract;
    let usdc: TokenContract;
    let eth: TokenContract;

    const invoiceAmount = wad(1n); // 1 ETH
    const senderETHInitialBalance = wad(0n); // Sender starts with 0 ETH (will receive payment)
    const payerETHInitialBalance = wad(4n);  // Payer starts with 4 ETH

    beforeAll(async () => {
        // setup aztec node client
        node = createAztecNodeClient(AZTEC_NODE_URL);
        console.log(`Connected to Aztec node at "${AZTEC_NODE_URL}"`);

        // setup wallets
        minterWallet = await TestWallet.create(node);
        senderWallet = await TestWallet.create(node);
        payerWallet = await TestWallet.create(node);
        const [minterAccount, payerAccount, senderAccount] = await getInitialTestAccountsData();

        await minterWallet.createSchnorrAccount(minterAccount.secret, minterAccount.salt);
        minterAddress = await minterWallet.getAccounts().then(accounts => accounts[0].item);
        await senderWallet.createSchnorrAccount(senderAccount.secret, senderAccount.salt);
        senderAddress = await senderWallet.getAccounts().then(accounts => accounts[0].item);
        await payerWallet.createSchnorrAccount(payerAccount.secret, payerAccount.salt);
        payerAddress = await payerWallet.getAccounts().then(accounts => accounts[0].item);

        // connect accounts to each other
        await minterWallet.registerSender(senderAddress);
        await minterWallet.registerSender(payerAddress);
        await senderWallet.registerSender(minterAddress);
        await senderWallet.registerSender(payerAddress);
        await payerWallet.registerSender(minterAddress);
        await payerWallet.registerSender(senderAddress);

        // deploy token contracts
        usdc = await deployTokenContract(minterWallet, minterAddress, TOKEN_METADATA.usdc);
        eth = await deployTokenContract(minterWallet, minterAddress, TOKEN_METADATA.eth);

        // deploy InvoiceRegistry contract (single instance for all invoices)
        ({ contract: invoiceRegistry } = await deployInvoiceRegistry(
            minterWallet,
            minterAddress
        ));

        // register token contracts in other wallets
        await senderWallet.registerContract(usdc);
        await senderWallet.registerContract(eth);
        await senderWallet.registerContract(invoiceRegistry);
        await payerWallet.registerContract(usdc);
        await payerWallet.registerContract(eth);
        await payerWallet.registerContract(invoiceRegistry);

        // mint tokens to payer
        await eth
            .withWallet(minterWallet)
            .methods.mint_to_private(
                payerAddress,
                wad(4n, 18n)
            )
            .send({ from: minterAddress })
            .wait();
        await usdc
            .withWallet(minterWallet)
            .methods.mint_to_private(
                payerAddress,
                wad(10000n, 6n)
            )
            .send({ from: minterAddress })
            .wait();
    });

    test("invoice privacy - only sender can read private details", async () => {
        const invoiceId = Fr.random();
        const titleHash = Fr.random(); // In production, would be hash of "Consulting Services"
        const metadata = Fr.random(); // In production, would be encrypted

        // Sender creates invoice
        await createInvoice(
            senderWallet,
            senderAddress,
            invoiceRegistry,
            invoiceId,
            titleHash,
            eth.address,
            invoiceAmount,
            metadata
        );

        // Sender can read private invoice details
        const senderInvoice = await getInvoice(
            senderWallet,
            senderAddress,
            invoiceRegistry,
            invoiceId
        );
        expect(senderInvoice.sender).toEqual(senderAddress);
        expect(senderInvoice.metadata).toEqual(metadata);
        expect(senderInvoice.invoice_id).toEqual(invoiceId);

        // Payer CANNOT read private details (will fail without encryption key)
        await expect(async () => {
            await getInvoice(
                payerWallet,
                payerAddress,
                invoiceRegistry,
                invoiceId
            );
        }).rejects.toThrow();

        // But payer CAN read public payment info (what they need to pay)
        const paymentInfo = await getPaymentInfo(
            payerWallet,
            payerAddress,
            invoiceRegistry,
            invoiceId
        );
        expect(paymentInfo.token_address).toEqual(eth.address);
        expect(paymentInfo.amount).toEqual(invoiceAmount);
        expect(paymentInfo.title_hash).toEqual(titleHash);
        expect(paymentInfo.partial_note).not.toEqual(Fr.ZERO);
    });

    test("complete invoice flow - create, pay, verify", async () => {
        const invoiceId = Fr.random();
        const titleHash = Fr.random(); // In production, would be hash of "Web Development Services"
        const metadata = Fr.random(); // In production, would be encrypted

        // Check balances before invoice creation
        expect(
            await expectBalancePrivate(senderWallet, senderAddress, eth, senderETHInitialBalance)
        ).toBeTruthy();
        expect(
            await expectBalancePrivate(payerWallet, payerAddress, eth, payerETHInitialBalance)
        ).toBeTruthy();

        // Step 1: Sender creates invoice
        console.log("Creating invoice...");
        await createInvoice(
            senderWallet,
            senderAddress,
            invoiceRegistry,
            invoiceId,
            titleHash,
            eth.address,
            invoiceAmount,
            metadata
        );

        // Verify invoice is not paid yet
        const isPaidBefore = await isInvoicePaid(
            payerWallet,
            payerAddress,
            invoiceRegistry,
            invoiceId
        );
        expect(isPaidBefore).toBe(false);

        // Step 2: Payer pays invoice
        console.log("Paying invoice...");
        const nonce = Fr.random();
        await payInvoice(
            payerWallet,
            payerAddress,
            invoiceRegistry,
            invoiceId,
            nonce
        );

        // Step 3: Verify payment status
        const isPaidAfter = await isInvoicePaid(
            payerWallet,
            payerAddress,
            invoiceRegistry,
            invoiceId
        );
        expect(isPaidAfter).toBe(true);

        // Step 4: Check final balances
        const expectedPayerETHAfterPayment = payerETHInitialBalance - invoiceAmount;
        const expectedSenderETHAfterPayment = senderETHInitialBalance + invoiceAmount;

        expect(
            await expectBalancePrivate(payerWallet, payerAddress, eth, expectedPayerETHAfterPayment)
        ).toBeTruthy();
        expect(
            await expectBalancePrivate(senderWallet, senderAddress, eth, expectedSenderETHAfterPayment)
        ).toBeTruthy();

        console.log("Invoice flow completed successfully!");
    });

    test("double payment prevention", async () => {
        const invoiceId = Fr.random();
        const titleHash = Fr.random(); // In production, would be hash of "Double Payment Test"
        const metadata = Fr.random(); // In production, would be encrypted

        // Create invoice
        await createInvoice(
            senderWallet,
            senderAddress,
            invoiceRegistry,
            invoiceId,
            titleHash,
            eth.address,
            invoiceAmount,
            metadata
        );

        // Pay invoice once
        const nonce = Fr.random();
        await payInvoice(
            payerWallet,
            payerAddress,
            invoiceRegistry,
            invoiceId,
            nonce
        );

        // Verify it's paid
        const isPaid = await isInvoicePaid(
            payerWallet,
            payerAddress,
            invoiceRegistry,
            invoiceId
        );
        expect(isPaid).toBe(true);

        // Attempt to pay again (should fail due to nullifier)
        const nonce2 = Fr.random();
        await expect(async () => {
            await payInvoice(
                payerWallet,
                payerAddress,
                invoiceRegistry,
                invoiceId,
                nonce2
            );
        }).rejects.toThrow(); // Should throw due to duplicate nullifier
    });
});
