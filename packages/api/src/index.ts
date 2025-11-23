import "dotenv/config";
import { createInvoiceHandlers } from "./handlers";
import { createBlockchainHandlers } from "./handlers/blockchainHandlers";
import { createAccessHandlers } from "./handlers/accessHandlers";
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
    handleGetAddresses,
  } = createBlockchainHandlers(database);

  const {
    handleCreateAccessRequest,
    handleGetAccessRequests,
    handleUpdateAccessRequest,
    handleCanAccess,
    handleLogAccess,
    handleGetAccessLogs,
  } = createAccessHandlers(database);
  
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

      // /invoice/paid endpoint - marks invoice as paid
      if (url.pathname === "/invoice/paid" && req.method === "POST") {
        return addCorsHeaders(await handleMarkPaid(req));
      }

      // Access Control Routes (MUST come before generic /invoice/:id to avoid conflicts)
      
      // POST /invoice/access-request - create access request
      if (url.pathname === "/invoice/access-request" && req.method === "POST") {
        return addCorsHeaders(await handleCreateAccessRequest(req));
      }

      // GET /invoice/access-requests - get access requests with filters
      if (url.pathname === "/invoice/access-requests" && req.method === "GET") {
        return addCorsHeaders(await handleGetAccessRequests(req));
      }

      // PATCH /invoice/access-request/:id - approve/deny access request
      if (url.pathname.startsWith("/invoice/access-request/") && req.method === "PATCH") {
        return addCorsHeaders(await handleUpdateAccessRequest(req));
      }

      // GET /invoice/:id/can-access - check if user can access invoice
      if (url.pathname.match(/^\/invoice\/[^/]+\/can-access$/) && req.method === "GET") {
        return addCorsHeaders(await handleCanAccess(req));
      }

      // POST /invoice/:id/log-access - log access to invoice
      if (url.pathname.match(/^\/invoice\/[^/]+\/log-access$/) && req.method === "POST") {
        return addCorsHeaders(await handleLogAccess(req));
      }

      // GET /invoice/:id/access-logs - get access logs for invoice
      if (url.pathname.match(/^\/invoice\/[^/]+\/access-logs$/) && req.method === "GET") {
        return addCorsHeaders(await handleGetAccessLogs(req));
      }

      // /invoice/:id endpoint - handles PATCH for updating invoice (MUST come after access routes)
      if (url.pathname.startsWith("/invoice/") && req.method === "PATCH") {
        return addCorsHeaders(await handleUpdateInvoice(req));
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

      // /blockchain/addresses endpoint - get real wallet addresses
      if (url.pathname === "/blockchain/addresses" && req.method === "GET") {
        return addCorsHeaders(await handleGetAddresses(req));
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
