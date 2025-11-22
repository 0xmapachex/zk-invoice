import {
    ContractInstanceWithAddressSchema,
    type ContractInstanceWithAddress
} from "@aztec/stdlib/contract";
import { InvoiceRegistryContract } from "@zk-invoice/contracts/artifacts";
import { getInvoiceRegistry } from "@zk-invoice/contracts/contract";
import type { Invoice } from "../../../api/src/types/api";
import type { InvoiceAPIResponse } from "./types";
import { AztecAddress } from "@aztec/stdlib/aztec-address";
import { Fr } from "@aztec/aztec.js/fields";
import type { BaseWallet } from "@aztec/aztec.js/wallet";

/**
 * Fetch invoices from the API
 * @param apiUrl The base URL of the invoice API
 * @param filters Optional filters (status, tokenAddress, etc.)
 * @returns Invoices fetched from the API
 */
export const getInvoices = async (
    apiUrl: string,
    filters?: { status?: 'pending' | 'paid', tokenAddress?: string }
): Promise<Invoice[]> => {
    try {
        let fullURL = `${apiUrl}/invoice`;
        const params = new URLSearchParams();
        
        if (filters?.status) {
            params.append('status', filters.status);
        }
        if (filters?.tokenAddress) {
            params.append('token_address', filters.tokenAddress);
        }
        
        if (params.toString()) {
            fullURL += `?${params.toString()}`;
        }

        const res = await fetch(fullURL, { method: "GET" });
        if (!res.ok) {
            throw new Error("Failed to fetch invoices");
        }
        
        const data: InvoiceAPIResponse = await res.json() as InvoiceAPIResponse;
        return data.data;
        } catch (err) {
        throw new Error("Error fetching invoices: " + (err as Error).message);
    }
}

/**
 * Get a specific invoice by ID
 * @param invoiceId The ID of the invoice
 * @param apiUrl The base URL of the invoice API
 * @returns The invoice if found
 */
export const getInvoiceById = async (
    invoiceId: string,
    apiUrl: string
): Promise<Invoice | null> => {
    try {
        const fullURL = `${apiUrl}/invoice?id=${invoiceId}`;
        const res = await fetch(fullURL, { method: "GET" });
        if (!res.ok) {
            return null;
        }
        
        const data: InvoiceAPIResponse = await res.json() as InvoiceAPIResponse;
        return data.data && data.data.length > 0 ? data.data[0] : null;
    } catch (err) {
        throw new Error("Error fetching invoice: " + (err as Error).message);
    }
}

/**
 * Create a new invoice
 * @param invoiceId The ID of the invoice
 * @param registryAddress The address of the registry contract
 * @param senderAddress The address of the invoice sender
 * @param partialNoteHash The partial note hash
 * @param title The invoice title
 * @param tokenAddress The address of the token
 * @param amount The invoice amount
 * @param metadata Optional metadata
 * @param apiUrl The base URL of the invoice API
 */
export const createInvoice = async (
    invoiceId: string,
    registryAddress: AztecAddress | string,
    senderAddress: AztecAddress | string,
    partialNoteHash: string,
    title: string,
    tokenAddress: AztecAddress | string,
    amount: bigint,
    metadata: string | undefined,
    apiUrl: string
) => {
    // parse inputs
    if (typeof registryAddress !== "string") {
        registryAddress = registryAddress.toString();
    }
    if (typeof senderAddress !== "string") {
        senderAddress = senderAddress.toString();
    }
    if (typeof tokenAddress !== "string") {
        tokenAddress = tokenAddress.toString();
    }
    
    // build the request body
    const payload = {
        invoiceId,
        registryAddress,
        senderAddress,
        partialNoteHash,
        title,
        tokenAddress,
        amount: amount.toString(),
        metadata: metadata || undefined
    };

    // post request to add invoice to API
    try {
        const fullURL = `${apiUrl}/invoice`;
        const res = await fetch(fullURL,
            { 
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload) 
            }
        );
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to create invoice: ${errorText}`);
        }
        console.log("Invoice registered in API");
    } catch (err) {
        throw new Error("Error creating invoice: " + (err as Error).message);
    }
}

/**
 * Mark an invoice as paid
 * @param invoiceId The ID of the invoice to mark as paid
 * @param apiUrl The base URL of the invoice API
 */
export const markInvoicePaid = async (invoiceId: string, apiUrl: string) => {
    try {
        const fullURL = `${apiUrl}/invoice/paid`;
        const res = await fetch(fullURL, { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoiceId })
        });
        if (!res.ok) {
            throw new Error("Unknown error marking invoice as paid");
        }
        console.log("Invoice marked as paid in API");
    } catch (err) {
        throw new Error("Error marking invoice as paid: " + (err as Error).message);
}
}
