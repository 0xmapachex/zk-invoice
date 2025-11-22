import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { TestDatabase } from "../utils/testDatabase";
import { createMockInvoiceRequest, MOCK_ADDRESSES, MOCK_AMOUNTS } from "../utils/mockData";
import { createInvoiceHandlers } from "../../src/handlers/invoiceHandlers";
import type { SQLiteDatabase } from "../../src/db/sqlite";

describe("Invoice Handlers", () => {
  let testDb: TestDatabase;
  let database: SQLiteDatabase;
  let handlers: ReturnType<typeof createInvoiceHandlers>;

  beforeEach(() => {
    testDb = new TestDatabase("handlers");
    database = testDb.setup();
    handlers = createInvoiceHandlers(database);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe("POST /invoice (handleCreateInvoice)", () => {
    test("should create invoice successfully", async () => {
      const mockInvoiceRequest = createMockInvoiceRequest();
      const requestBody = {
        ...mockInvoiceRequest,
        amount: mockInvoiceRequest.amount.toString(),
      };
      
      const request = new Request("http://localhost:3000/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await handlers.handleCreateInvoice(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe("Invoice created successfully");
      expect(responseData.data).toMatchObject({
        senderAddress: mockInvoiceRequest.senderAddress,
        title: mockInvoiceRequest.title,
        tokenAddress: mockInvoiceRequest.tokenAddress,
        amount: mockInvoiceRequest.amount.toString(),
        status: 'pending',
      });
      expect(responseData.invoiceId).toBeDefined();
      expect(responseData.shareableUrl).toBeDefined();
    });

    test("should handle missing required fields", async () => {
      const request = new Request("http://localhost:3000/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await handlers.handleCreateInvoice(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
    });

    test("should create invoice with metadata", async () => {
      const mockInvoiceRequest = createMockInvoiceRequest();
      const requestBody = {
        ...mockInvoiceRequest,
        amount: mockInvoiceRequest.amount.toString(),
        metadata: "Test invoice metadata"
      };
      
      const request = new Request("http://localhost:3000/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await handlers.handleCreateInvoice(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.metadata).toBe("Test invoice metadata");
    });
  });

  describe("GET /invoice (handleGetInvoice)", () => {
    test("should get all invoices", async () => {
      // Create some test invoices
      const invoice1 = createMockInvoiceRequest();
      const invoice2 = createMockInvoiceRequest();
      
      await handlers.handleCreateInvoice(new Request("http://localhost:3000/invoice", {
        method: "POST",
        body: JSON.stringify({ ...invoice1, amount: invoice1.amount.toString() }),
      }));
      
      await handlers.handleCreateInvoice(new Request("http://localhost:3000/invoice", {
        method: "POST",
        body: JSON.stringify({ ...invoice2, amount: invoice2.amount.toString() }),
      }));

      const request = new Request("http://localhost:3000/invoice", {
        method: "GET",
      });

      const response = await handlers.handleGetInvoice(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeArrayOfSize(2);
    });

    test("should get invoice by ID", async () => {
      const mockInvoice = createMockInvoiceRequest();
      const createResponse = await handlers.handleCreateInvoice(new Request("http://localhost:3000/invoice", {
        method: "POST",
        body: JSON.stringify({ ...mockInvoice, amount: mockInvoice.amount.toString() }),
      }));
      
      const createData = await createResponse.json();
      const invoiceId = createData.invoiceId;

      const request = new Request(`http://localhost:3000/invoice?id=${invoiceId}`, {
        method: "GET",
      });

      const response = await handlers.handleGetInvoice(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeArrayOfSize(1);
      expect(responseData.data[0].invoiceId).toBe(invoiceId);
    });

    test("should return 404 for non-existent invoice", async () => {
      const request = new Request("http://localhost:3000/invoice?id=non-existent-id", {
        method: "GET",
      });

      const response = await handlers.handleGetInvoice(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
    });

    test("should filter invoices by status", async () => {
      const mockInvoice = createMockInvoiceRequest();
      const createResponse = await handlers.handleCreateInvoice(new Request("http://localhost:3000/invoice", {
        method: "POST",
        body: JSON.stringify({ ...mockInvoice, amount: mockInvoice.amount.toString() }),
      }));
      
      const createData = await createResponse.json();
      const invoiceId = createData.invoiceId;

      // Mark one as paid
      await database.markInvoicePaid(invoiceId);

      const requestPending = new Request("http://localhost:3000/invoice?status=pending", {
        method: "GET",
      });

      const responsePending = await handlers.handleGetInvoice(requestPending);
      const dataPending = await responsePending.json();

      expect(dataPending.data).toBeArrayOfSize(0);

      const requestPaid = new Request("http://localhost:3000/invoice?status=paid", {
        method: "GET",
      });

      const responsePaid = await handlers.handleGetInvoice(requestPaid);
      const dataPaid = await responsePaid.json();

      expect(dataPaid.data).toBeArrayOfSize(1);
    });

    test("should filter invoices by token address", async () => {
      const mockInvoice1 = createMockInvoiceRequest();
      const mockInvoice2 = createMockInvoiceRequest();
      mockInvoice2.tokenAddress = MOCK_ADDRESSES.usdc;

      await handlers.handleCreateInvoice(new Request("http://localhost:3000/invoice", {
        method: "POST",
        body: JSON.stringify({ ...mockInvoice1, amount: mockInvoice1.amount.toString() }),
      }));

      await handlers.handleCreateInvoice(new Request("http://localhost:3000/invoice", {
        method: "POST",
        body: JSON.stringify({ ...mockInvoice2, amount: mockInvoice2.amount.toString() }),
      }));

      const request = new Request(`http://localhost:3000/invoice?token_address=${MOCK_ADDRESSES.usdc}`, {
        method: "GET",
      });

      const response = await handlers.handleGetInvoice(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data).toBeArrayOfSize(1);
      expect(responseData.data[0].tokenAddress).toBe(MOCK_ADDRESSES.usdc);
    });
  });

  describe("POST /invoice/paid (handleMarkPaid)", () => {
    test("should mark invoice as paid", async () => {
      const mockInvoice = createMockInvoiceRequest();
      const createResponse = await handlers.handleCreateInvoice(new Request("http://localhost:3000/invoice", {
        method: "POST",
        body: JSON.stringify({ ...mockInvoice, amount: mockInvoice.amount.toString() }),
      }));
      
      const createData = await createResponse.json();
      const invoiceId = createData.invoiceId;

      const request = new Request("http://localhost:3000/invoice/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const response = await handlers.handleMarkPaid(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);

      // Verify it's marked as paid in database
      const invoice = database.getInvoiceById(invoiceId);
      expect(invoice?.status).toBe('paid');
    });

    test("should return 404 for non-existent invoice", async () => {
      const request = new Request("http://localhost:3000/invoice/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: "non-existent-id" }),
      });

      const response = await handlers.handleMarkPaid(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
    });

    test("should return 400 when invoiceId is missing", async () => {
      const request = new Request("http://localhost:3000/invoice/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await handlers.handleMarkPaid(request);

      expect(response.status).toBe(400);
    });
  });
});

