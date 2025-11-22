import { AztecAddress } from "@aztec/aztec.js/addresses";
import type {
    ContractInstanceWithAddress,
    SendInteractionOptions,
    SimulateInteractionOptions,
    WaitOpts,
} from "@aztec/aztec.js/contracts";
import { Fr } from "@aztec/aztec.js/fields";
import type { AztecNode } from "@aztec/aztec.js/node";
import { TxHash } from "@aztec/aztec.js/tx";
import { BaseWallet } from "@aztec/aztec.js/wallet";
import { AuthWitness } from "@aztec/stdlib/auth-witness";
import { deriveKeys } from "@aztec/stdlib/keys";
import {
    InvoiceRegistryContract,
    InvoiceRegistryContractArtifact,
    TokenContract,
    TokenContractArtifact
} from "./artifacts";

/**
 * Deploys a new instance of the Invoice Registry Contract (one-time deployment)
 * @dev This contract handles all invoices, unlike OTC which deployed per-order
 * 
 * @param wallet - the wallet of the deploying account
 * @param from - the account deploying the Invoice Registry
 * @param opts - Aztec function send and wait options (optional)
 * @returns
 *          contract - the deployed Invoice Registry Contract
 *          secretKey - the master key for the contract
 */
export async function deployInvoiceRegistry(
    wallet: BaseWallet,
    from: AztecAddress,
    opts: { send: SendInteractionOptions, wait?: WaitOpts } = { send: { from } }
): Promise<{ contract: InvoiceRegistryContract, secretKey: Fr }> {
    // get keys for contract
    const contractSecretKey = Fr.random();
    const contractPublicKeys = (await deriveKeys(contractSecretKey)).publicKeys;
    
    // set up contract deployment tx
    const contractDeployment = await InvoiceRegistryContract.deployWithPublicKeys(
        contractPublicKeys,
        wallet
    );
    
    // add contract decryption keys to PXE
    const instance = await contractDeployment.getInstance();
    await wallet.registerContract(instance, InvoiceRegistryContractArtifact, contractSecretKey);
    
    // deploy contract
    const contract = await contractDeployment
        .send(opts.send)
        .deployed(opts.wait);
    
    return {
        contract: contract as InvoiceRegistryContract,
        secretKey: contractSecretKey,
    };
}

/**
 * Create a new invoice in the registry
 * 
 * @param wallet - the wallet to use
 * @param from - the invoice sender (who will receive payment)
 * @param registry - the invoice registry contract
 * @param invoiceId - unique identifier for the invoice
 * @param titleHash - hash of the invoice title
 * @param tokenAddress - token to be paid
 * @param amount - amount to be paid
 * @param metadata - optional private metadata (Field)
 * @param opts - Aztec function send and wait options (optional)
 * @returns - the transaction hash of the invoice creation
 */
export async function createInvoice(
    wallet: BaseWallet,
    from: AztecAddress,
    registry: InvoiceRegistryContract,
    invoiceId: Fr,
    titleHash: Fr,
    tokenAddress: AztecAddress,
    amount: bigint,
    metadata: Fr,
    opts: { send: SendInteractionOptions, wait?: WaitOpts } = { send: { from } }
): Promise<TxHash> {
    registry = registry.withWallet(wallet);
    
    const receipt = await registry
        .methods
        .create_invoice(invoiceId, titleHash, tokenAddress, amount, metadata)
        .send(opts.send)
        .wait(opts.wait);
    
    return receipt.txHash;
}

/**
 * Pay an invoice by completing the partial note
 * 
 * @param wallet - the wallet to use
 * @param from - the payer
 * @param registry - the invoice registry contract
 * @param invoiceId - the invoice to pay
 * @param nonce - the nonce for authwit
 * @param opts - Aztec function send and wait options (optional)
 * @returns - the transaction hash of the payment
 */
export async function payInvoice(
    wallet: BaseWallet,
    from: AztecAddress,
    registry: InvoiceRegistryContract,
    invoiceId: Fr,
    partialNote: Fr,
    token: TokenContract,
    tokenAddress: AztecAddress,
    amount: bigint,
    opts: { send: SendInteractionOptions, wait?: WaitOpts } = { send: { from } }
): Promise<TxHash> {
    registry = registry.withWallet(wallet);
    
    // Create authwit for token transfer (authorize registry to spend payer's tokens)
    const { authwit, nonce } = await getPrivateTransferToCommitmentAuthwit(
        wallet,
        from,
        token,
        registry.address,
        partialNote,
        amount
    );
    
    // Call pay_invoice with authwit nonce (pass authwitness in send options)
    const receipt = await registry
        .methods
        .pay_invoice(invoiceId, partialNote, tokenAddress, amount, nonce)
        .send({ ...opts.send, authWitnesses: [authwit] })
        .wait(opts.wait);
    
    return receipt.txHash;
}

/**
 * Check if an invoice has been paid
 * 
 * @param wallet - the wallet to use
 * @param from - the account checking status
 * @param registry - the invoice registry contract
 * @param invoiceId - the invoice to check
 * @param opts - simulation options
 * @returns - true if paid, false otherwise
 */
export async function isInvoicePaid(
    wallet: BaseWallet,
    from: AztecAddress,
    registry: InvoiceRegistryContract,
    invoiceId: Fr,
    opts: SimulateInteractionOptions = { from }
): Promise<boolean> {
    return await registry
        .withWallet(wallet)
        .methods
        .is_paid(invoiceId)
        .simulate(opts);
}

/**
 * Get private invoice data (only sender with viewing keys can access)
 * 
 * @param wallet - the wallet to use (must have viewing keys)
 * @param from - the account querying
 * @param registry - the invoice registry contract
 * @param invoiceId - the invoice to retrieve
 * @param opts - simulation options
 * @returns - the private invoice note
 */
export async function getInvoice(
    wallet: BaseWallet,
    from: AztecAddress,
    registry: InvoiceRegistryContract,
    invoiceId: Fr,
    opts: SimulateInteractionOptions = { from }
): Promise<any> {
    return await registry
        .withWallet(wallet)
        .methods
        .get_invoice(invoiceId)
        .simulate(opts);
}

/**
 * Get public payment info (anyone can access)
 * 
 * @param wallet - the wallet to use
 * @param from - the account querying
 * @param registry - the invoice registry contract
 * @param invoiceId - the invoice to retrieve
 * @param opts - simulation options
 * @returns - the public payment information
 */
export async function getPaymentInfo(
    wallet: BaseWallet,
    from: AztecAddress,
    registry: InvoiceRegistryContract,
    invoiceId: Fr,
    opts: SimulateInteractionOptions = { from }
): Promise<any> {
    return await registry
        .withWallet(wallet)
        .methods
        .get_payment_info(invoiceId)
        .simulate(opts);
}

/**
 * Deploys a new instance of Defi-Wonderland's Fungible Token Contract
 * @param tokenMetadata - the name, symbol, and decimals of the token
 * @param deployer - the account deploying the token contract (gets minter rights)
 * @param opts - Aztec function send and wait options (optional)
 * @returns - the deployed Token Contract
 */
export async function deployTokenContract(
    wallet: BaseWallet,
    from: AztecAddress,
    tokenMetadata: { name: string; symbol: string; decimals: number },
    opts: { send: SendInteractionOptions, wait?: WaitOpts } = { send: { from } }
): Promise<TokenContract> {
    // deploy contract
    const contract = await TokenContract.deployWithOpts(
        { wallet, method: "constructor_with_minter" },
        tokenMetadata.name,
        tokenMetadata.symbol,
        tokenMetadata.decimals,
        from,
        AztecAddress.ZERO,
    )
        .send(opts.send)
        .deployed(opts.wait);
    return contract as TokenContract;
}

/**
 * Helper function to create private transfer authwit
 */
export async function getPrivateTransferAuthwit(
    wallet: BaseWallet,
    from: AztecAddress,
    token: TokenContract,
    caller: AztecAddress,
    to: AztecAddress,
    amount: bigint,
): Promise<{ authwit: AuthWitness, nonce: Fr }> {
    // construct call data
    const nonce = Fr.random();
    const call = await token.withWallet(wallet).methods.transfer_private_to_private(
        from,
        to,
        amount,
        nonce,
    ).getFunctionCall();
    // construct private authwit
    const authwit = await wallet.createAuthWit(from, { caller, call });
    return { authwit, nonce }
}

/**
 * Helper function to create authwit for transfer_private_to_commitment (for invoice payments)
 */
export async function getPrivateTransferToCommitmentAuthwit(
    wallet: BaseWallet,
    from: AztecAddress,
    token: TokenContract,
    caller: AztecAddress,
    commitment: Fr,
    amount: bigint,
): Promise<{ authwit: AuthWitness, nonce: Fr }> {
    // construct call data
    const nonce = Fr.random();
    const call = await token.withWallet(wallet).methods.transfer_private_to_commitment(
        from,
        commitment,
        amount,
        nonce,
    ).getFunctionCall();
    // construct private authwit
    const authwit = await wallet.createAuthWit(from, { caller, call });
    return { authwit, nonce }
}

/**
 * Checks that a private balance of a token for a specific address matches expectations
 * @param token - the token balance to query
 * @param address - the address of the token holder
 * @param expectedBalance - the balance expected to be returned
 * @returns - true if balance matches expectations, and false otherwise
 */
export async function expectBalancePrivate(
    wallet: BaseWallet,
    from: AztecAddress,
    token: TokenContract,
    expectedBalance: bigint,
    opts: SimulateInteractionOptions = { from }
): Promise<boolean> {
    const empiricalBalance = await token
        .withWallet(wallet)
        .methods
        .balance_of_private(from)
        .simulate(opts);
    return empiricalBalance === expectedBalance;
}

/**
 * Get a token contract instance
 */
export const getTokenContract = async (
    wallet: BaseWallet,
    from: AztecAddress,
    node: AztecNode,
    tokenAddress: AztecAddress,
): Promise<TokenContract> => {
    
    // get public contract instance
    const contractInstance = await node.getContract(tokenAddress);
    if (!contractInstance) {
        throw new Error(`No instance for token contract at ${tokenAddress.toString()} found!`);
    }
    // register contract
    await wallet.registerContract({
        instance: contractInstance,
        artifact: TokenContractArtifact
    });
    // return synced token contract
    const token = await TokenContract.at(tokenAddress, wallet);
    await token.methods.sync_private_state().simulate({ from });
    return token;
};

/**
 * Get an invoice registry contract instance
 */
export const getInvoiceRegistry = async (
    wallet: BaseWallet,
    from: AztecAddress,
    registryAddress: AztecAddress,
    contractInstance: ContractInstanceWithAddress,
    registrySecretKey: Fr,
): Promise<InvoiceRegistryContract> => {
    // register contract with secret key
    await wallet.registerContract(
        contractInstance,
        InvoiceRegistryContractArtifact,
        registrySecretKey
    );
    await wallet.registerSender(registryAddress);
    // return synced registry contract
    const registry = await InvoiceRegistryContract.at(registryAddress, wallet);
    await registry.methods.sync_private_state().simulate({ from });
    return registry;
};
