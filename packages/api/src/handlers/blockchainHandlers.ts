import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { isTestnet } from "@zk-invoice/contracts/utils";
import type { PXEConfig } from "@aztec/pxe/config";
import { getInvoiceAccounts } from "../blockchain/wallets";
import { createInvoiceOnChain, payInvoiceOnChain, mintTokensToAccount } from "../blockchain/transactions";
import { loadDeployments } from "../blockchain/contracts";
import type { IDatabase } from "../db/interface";

/**
 * Create blockchain handlers with database dependency injection
 */
export const createBlockchainHandlers = (database: IDatabase) => {
  /**
   * Handle blockchain invoice creation
   * POST /blockchain/invoice/create
   */
  const handleCreateInvoiceOnChain = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const { title, amount, tokenAddress, metadata } = body;

      // Validate required fields
      if (!title || !amount || !tokenAddress) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing required fields: title, amount, tokenAddress",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Get environment variables
      const L2_NODE_URL = process.env.L2_NODE_URL;
      if (!L2_NODE_URL) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "L2_NODE_URL not configured in environment",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create node and wallet
      const node = await createAztecNodeClient(L2_NODE_URL);
      let pxeConfig: Partial<PXEConfig> = {};
      if (await isTestnet(node)) {
        pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
      }

      const { wallet, senderAddress } = await getInvoiceAccounts(node, pxeConfig);

      // Create invoice on-chain
      const result = await createInvoiceOnChain({
        node,
        wallet,
        senderAddress,
        title,
        amount: BigInt(amount),
        tokenAddress,
        metadata: metadata || "",
      });

      // Store invoice in database
      try {
        console.log("Storing invoice in database:", {
          invoiceId: result.invoiceId,
          registryAddress: result.registryAddress,
          senderAddress: senderAddress.toString(),
          title,
        });
        
        await database.insertInvoice({
          invoiceId: result.invoiceId,
          registryAddress: result.registryAddress,
          senderAddress: senderAddress.toString(),
          partialNoteHash: result.partialNoteHash,
          title,
          tokenAddress,
          amount: BigInt(amount),
          status: "pending",
          metadata: metadata || undefined,
          createdAt: Date.now(),
        });
        
        console.log("✅ Invoice stored in database successfully");
      } catch (dbError: any) {
        console.error("❌ Failed to store invoice in database:", {
          error: dbError.message,
          stack: dbError.stack,
          invoiceId: result.invoiceId,
        });
        // Don't fail the request if database storage fails
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error creating invoice on-chain:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to create invoice on-chain",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  /**
   * Handle blockchain invoice payment
   * POST /blockchain/invoice/pay
   */
  const handlePayInvoiceOnChain = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const { invoiceId, partialNoteHash, tokenAddress, amount } = body;

      // Validate required fields
      if (!invoiceId || !partialNoteHash || !tokenAddress || !amount) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Missing required fields: invoiceId, partialNoteHash, tokenAddress, amount",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Get environment variables
      const L2_NODE_URL = process.env.L2_NODE_URL;
      if (!L2_NODE_URL) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "L2_NODE_URL not configured in environment",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create node and wallet
      const node = await createAztecNodeClient(L2_NODE_URL);
      let pxeConfig: Partial<PXEConfig> = {};
      if (await isTestnet(node)) {
        pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
      }

      const { wallet, payerAddress } = await getInvoiceAccounts(node, pxeConfig);

      // Pay invoice on-chain
      const result = await payInvoiceOnChain({
        node,
        wallet,
        payerAddress,
        invoiceId,
        partialNoteHash,
        tokenAddress,
        amount: BigInt(amount),
      });

      // Update invoice status in database if payment was successful
      if (result.success) {
        try {
          await database.markInvoicePaid(invoiceId);
          console.log("Invoice marked as paid in database");
        } catch (dbError: any) {
          console.warn("Failed to update invoice status in database:", dbError.message);
          // Don't fail the request if database update fails
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error paying invoice on-chain:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to pay invoice on-chain",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  /**
   * Handle blockchain balance check
   * GET /blockchain/balance/:tokenAddress/:accountAddress
   */
  const handleGetBalance = async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/").filter(Boolean);
      
      // Expected: blockchain/balance/:tokenAddress/:accountAddress
      if (pathParts.length !== 4) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid path format. Expected: /blockchain/balance/:tokenAddress/:accountAddress",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const tokenAddress = pathParts[2];
      const accountAddress = pathParts[3];

      // Get environment variables
      const L2_NODE_URL = process.env.L2_NODE_URL;
      if (!L2_NODE_URL) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "L2_NODE_URL not configured in environment",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.log(`\n=== BALANCE REQUEST ===`);
      console.log(`Requested address: ${accountAddress}`);
      console.log(`Token address: ${tokenAddress}`);

      // Create node and wallet
      const node = await createAztecNodeClient(L2_NODE_URL);
      let pxeConfig: Partial<PXEConfig> = {};
      if (await isTestnet(node)) {
        pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
      }

      const { wallet, senderAddress, payerAddress } = await getInvoiceAccounts(node, pxeConfig);

      console.log(`Seller address: ${senderAddress.toString()}`);
      console.log(`Buyer address: ${payerAddress.toString()}`);

      // Determine which address to check based on the accountAddress param
      // Normalize comparison by converting to lowercase
      const requestedAddr = accountAddress.toLowerCase();
      const sellerAddr = senderAddress.toString().toLowerCase();
      const buyerAddr = payerAddress.toString().toLowerCase();
      
      let addressToCheck: AztecAddress;
      let role: string;
      
      if (requestedAddr === sellerAddr) {
        addressToCheck = senderAddress;
        role = "SELLER";
      } else if (requestedAddr === buyerAddr) {
        addressToCheck = payerAddress;
        role = "BUYER";
      } else {
        console.log(`⚠️  Address mismatch! Using seller as fallback.`);
        addressToCheck = senderAddress;
        role = "SELLER (fallback)";
      }

      console.log(`Checking balance for: ${role}`);
      console.log(`Using address: ${addressToCheck.toString()}`);

      // Get token contract
      const usdcAddress = AztecAddress.fromString(tokenAddress);
      const { getTokenContract } = await import("../blockchain/contracts");
      const token = await getTokenContract(wallet, addressToCheck, node, usdcAddress);

      // Fetch actual private balance from blockchain
      const balance = await token.methods
        .balance_of_private(addressToCheck)
        .simulate({ from: addressToCheck });

      console.log(`✅ Balance for ${role}: ${balance.toString()}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            balance: balance.toString(),
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error getting balance:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to get balance",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  /**
   * Handle token minting
   * POST /blockchain/mint
   */
  const handleMintTokens = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const { tokenAddress, recipientRole } = body;

      // Validate required fields
      if (!tokenAddress || !recipientRole) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing required fields: tokenAddress, recipientRole (seller or buyer)",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Get environment variables
      const L2_NODE_URL = process.env.L2_NODE_URL;
      if (!L2_NODE_URL) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "L2_NODE_URL not configured in environment",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create node and wallet
      const node = await createAztecNodeClient(L2_NODE_URL);
      let pxeConfig: Partial<PXEConfig> = {};
      if (await isTestnet(node)) {
        pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
      }

      const { wallet, senderAddress, payerAddress } = await getInvoiceAccounts(node, pxeConfig);

      // Determine recipient based on role
      const recipientAddress = recipientRole === "buyer" ? payerAddress : senderAddress;

      // Mint tokens
      const result = await mintTokensToAccount({
        node,
        wallet,
        minterAddress: senderAddress, // Seller/admin mints tokens
        recipientAddress,
        tokenAddress,
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error minting tokens:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to mint tokens",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  /**
   * Get wallet addresses
   * GET /blockchain/addresses
   */
  const handleGetAddresses = async (req: Request): Promise<Response> => {
    try {
      // Get environment variables
      const L2_NODE_URL = process.env.L2_NODE_URL;
      if (!L2_NODE_URL) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "L2_NODE_URL not configured in environment",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create node and wallet
      const node = await createAztecNodeClient(L2_NODE_URL);
      let pxeConfig: Partial<PXEConfig> = {};
      if (await isTestnet(node)) {
        pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
      }

      const { senderAddress, payerAddress } = await getInvoiceAccounts(node, pxeConfig);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            sellerAddress: senderAddress.toString(),
            buyerAddress: payerAddress.toString(),
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error getting addresses:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to get addresses",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  return {
    handleCreateInvoiceOnChain,
    handlePayInvoiceOnChain,
    handleGetBalance,
    handleMintTokens,
    handleGetAddresses,
  };
};
