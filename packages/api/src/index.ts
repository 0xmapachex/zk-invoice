import "dotenv/config";
import { createInvoiceHandlers } from "./handlers";
import { createBlockchainHandlers } from "./handlers/blockchainHandlers";
import { SQLiteDatabase } from "./db";

/**
 * Invoice Service
 * 
 * A Bun-based HTTP server for handling invoice operations in ZK Invoice.
 */

const main = async () => {
  // Create and initialize database
  const database = new SQLiteDatabase();
  database.initialize();
  
  // Create handlers with database dependency injection
  const {
    handleCreateInvoice,
    handleGetInvoice,
    handleUpdateInvoice,
    handleMarkPaid
  } = createInvoiceHandlers(database);
  
  const {
    handleCreateInvoiceOnChain,
    handlePayInvoiceOnChain,
    handleGetBalance,
    handleMintTokens,
  } = createBlockchainHandlers(database);
  
  const server = Bun.serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);
      
      // CORS headers for browser requests
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };
      
      // Handle preflight OPTIONS requests
      if (req.method === "OPTIONS") {
        return new Response(null, { 
          status: 204,
          headers: corsHeaders 
        });
      }
      
      // Helper to add CORS headers to response
      const addCorsHeaders = (response: Response) => {
        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newHeaders.set(key, value);
        });
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      };
      
      // /invoice endpoint - handles POST, GET
      if (url.pathname === "/invoice") {
        switch (req.method) {
          case "POST":
            return addCorsHeaders(await handleCreateInvoice(req));
          case "GET":
            return addCorsHeaders(await handleGetInvoice(req));
          default:
            return addCorsHeaders(new Response("Method Not Allowed", { status: 405 }));
        }
      }

      // /invoice/:id endpoint - handles PATCH for updating invoice
      if (url.pathname.startsWith("/invoice/") && url.pathname !== "/invoice/paid" && req.method === "PATCH") {
        return addCorsHeaders(await handleUpdateInvoice(req));
      }

      // /invoice/paid endpoint - marks invoice as paid
      if (url.pathname === "/invoice/paid" && req.method === "POST") {
        return addCorsHeaders(await handleMarkPaid(req));
      }

      // /blockchain/invoice/create endpoint - create invoice on-chain
      if (url.pathname === "/blockchain/invoice/create" && req.method === "POST") {
        return addCorsHeaders(await handleCreateInvoiceOnChain(req));
      }

      // /blockchain/invoice/pay endpoint - pay invoice on-chain
      if (url.pathname === "/blockchain/invoice/pay" && req.method === "POST") {
        return addCorsHeaders(await handlePayInvoiceOnChain(req));
      }

      // /blockchain/balance/:tokenAddress/:accountAddress endpoint - get balance
      if (url.pathname.startsWith("/blockchain/balance/") && req.method === "GET") {
        return addCorsHeaders(await handleGetBalance(req));
      }

      // /blockchain/mint endpoint - mint tokens to account
      if (url.pathname === "/blockchain/mint" && req.method === "POST") {
        return addCorsHeaders(await handleMintTokens(req));
      }

      // healthcheck endpoint
      if (req.method === "GET" && url.pathname === "/health") {
        return addCorsHeaders(new Response("OK", { status: 200 }));
      }

      // Handle 404
      return addCorsHeaders(new Response("Not Found", { status: 404 }));
    },
  });

  console.log(`🚀 Invoice Service running on http://localhost:${server.port}`);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    database.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    database.close();
    process.exit(0);
  });
};

main();
