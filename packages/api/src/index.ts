
import { createInvoiceHandlers } from "./handlers";
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
    handleMarkPaid
  } = createInvoiceHandlers(database);
  
  const server = Bun.serve({
    port: 3000,
    fetch(req) {
      const url = new URL(req.url);
      
      // /invoice endpoint - handles POST, GET
      if (url.pathname === "/invoice") {
        switch (req.method) {
          case "POST":
            return handleCreateInvoice(req);
          case "GET":
            return handleGetInvoice(req);
          default:
            return new Response("Method Not Allowed", { status: 405 });
        }
      }

      // /invoice/paid endpoint - marks invoice as paid
      if (url.pathname === "/invoice/paid" && req.method === "POST") {
        return handleMarkPaid(req);
      }

      // healthcheck endpoint
      if (req.method === "GET" && url.pathname === "/health") {
        return new Response("OK", { status: 200 });
      }

      // Handle 404
      return new Response("Not Found", { status: 404 });
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
