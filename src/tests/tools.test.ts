import { describe, it, expect, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MockMcpServer, createMockClient, paginatedOf } from "./helpers.js";

import { registerUserTools } from "../tools/user.js";
import { registerCompanyTools } from "../tools/companies.js";
import { registerInvoiceTools } from "../tools/invoices.js";
import { registerContactTools } from "../tools/contacts.js";
import { registerAccountTools } from "../tools/accounts.js";
import { registerBankTools } from "../tools/bank.js";
import { registerSaleTools } from "../tools/sales.js";
import { registerPurchaseTools } from "../tools/purchases.js";
import { registerInboxTools } from "../tools/inbox.js";
import { FikenApiError } from "../client.js";

// --- user ---

describe("fiken_get_user", () => {
  it("calls GET /user and returns JSON", async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue({ name: "Test User", email: "t@t.com" }),
    });
    const server = new MockMcpServer();
    registerUserTools(server as unknown as McpServer, client);

    const result = await server.call("fiken_get_user", {});
    expect(client.get).toHaveBeenCalledWith("/user");
    expect(JSON.parse(result.content[0].text)).toEqual({
      name: "Test User",
      email: "t@t.com",
    });
  });
});

// --- companies ---

describe("fiken_list_companies", () => {
  it("calls getPaginated with default pagination", async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue(paginatedOf([{ slug: "acme" }])),
    });
    const server = new MockMcpServer();
    registerCompanyTools(server as unknown as McpServer, client);

    await server.call("fiken_list_companies", {});
    expect(client.getPaginated).toHaveBeenCalledWith("/companies", {
      page: undefined,
      pageSize: undefined,
    });
  });

  it("returns company list in response", async () => {
    const companies = [{ slug: "acme", name: "Acme AS" }];
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue(paginatedOf(companies)),
    });
    const server = new MockMcpServer();
    registerCompanyTools(server as unknown as McpServer, client);

    const result = await server.call("fiken_list_companies", {});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.data).toEqual(companies);
  });
});

describe("fiken_get_company", () => {
  it("calls GET /companies/{slug}", async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue({ slug: "acme", name: "Acme AS" }),
    });
    const server = new MockMcpServer();
    registerCompanyTools(server as unknown as McpServer, client);

    await server.call("fiken_get_company", { companySlug: "acme" });
    expect(client.get).toHaveBeenCalledWith("/companies/acme");
  });
});

// --- accounts ---

describe("fiken_list_accounts", () => {
  it("passes year and account range filters", async () => {
    const client = createMockClient();
    const server = new MockMcpServer();
    registerAccountTools(server as unknown as McpServer, client);

    await server.call("fiken_list_accounts", {
      companySlug: "acme",
      year: 2024,
      fromAccount: 1000,
      toAccount: 1999,
    });

    expect(client.getPaginated).toHaveBeenCalledWith(
      "/companies/acme/accounts",
      expect.objectContaining({ page: undefined, pageSize: undefined }),
      expect.objectContaining({ year: 2024, fromAccount: 1000, toAccount: 1999 })
    );
  });
});

describe("fiken_get_account", () => {
  it("calls GET with account code in path", async () => {
    const client = createMockClient();
    const server = new MockMcpServer();
    registerAccountTools(server as unknown as McpServer, client);

    await server.call("fiken_get_account", {
      companySlug: "acme",
      accountCode: "1920",
    });
    expect(client.get).toHaveBeenCalledWith(
      "/companies/acme/accounts/1920",
      expect.objectContaining({ year: undefined })
    );
  });
});

// --- bank ---

describe("fiken_list_bank_balances", () => {
  it("calls GET /bankBalances (no pagination)", async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue([{ balance: 100000 }]),
    });
    const server = new MockMcpServer();
    registerBankTools(server as unknown as McpServer, client);

    await server.call("fiken_list_bank_balances", { companySlug: "acme" });
    expect(client.get).toHaveBeenCalledWith("/companies/acme/bankBalances");
  });
});

// --- contacts ---

describe("fiken_list_contacts", () => {
  it("passes customer/supplier filter", async () => {
    const client = createMockClient();
    const server = new MockMcpServer();
    registerContactTools(server as unknown as McpServer, client);

    await server.call("fiken_list_contacts", {
      companySlug: "acme",
      customer: true,
      supplier: false,
    });

    expect(client.getPaginated).toHaveBeenCalledWith(
      "/companies/acme/contacts",
      expect.any(Object),
      expect.objectContaining({ customer: true, supplier: false })
    );
  });
});

describe("fiken_get_contact_person", () => {
  it("builds nested path correctly", async () => {
    const client = createMockClient();
    const server = new MockMcpServer();
    registerContactTools(server as unknown as McpServer, client);

    await server.call("fiken_get_contact_person", {
      companySlug: "acme",
      contactId: 42,
      contactPersonId: 7,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/companies/acme/contacts/42/contactPerson/7"
    );
  });
});

// --- invoices ---

describe("fiken_list_invoices", () => {
  it("passes date and settled filters", async () => {
    const client = createMockClient();
    const server = new MockMcpServer();
    registerInvoiceTools(server as unknown as McpServer, client);

    await server.call("fiken_list_invoices", {
      companySlug: "acme",
      settled: false,
      dateGe: "2024-01-01",
      dateLe: "2024-12-31",
    });

    expect(client.getPaginated).toHaveBeenCalledWith(
      "/companies/acme/invoices",
      expect.any(Object),
      expect.objectContaining({
        settled: false,
        dateGe: "2024-01-01",
        dateLe: "2024-12-31",
      })
    );
  });
});

describe("fiken_get_invoice_counter", () => {
  it("calls GET /invoices/counter", async () => {
    const client = createMockClient();
    const server = new MockMcpServer();
    registerInvoiceTools(server as unknown as McpServer, client);

    await server.call("fiken_get_invoice_counter", { companySlug: "acme" });
    expect(client.get).toHaveBeenCalledWith("/companies/acme/invoices/counter");
  });
});

describe("fiken_list_invoice_attachments", () => {
  it("builds attachment path with invoice ID", async () => {
    const client = createMockClient();
    const server = new MockMcpServer();
    registerInvoiceTools(server as unknown as McpServer, client);

    await server.call("fiken_list_invoice_attachments", {
      companySlug: "acme",
      invoiceId: 99,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/companies/acme/invoices/99/attachments"
    );
  });
});

// --- sales ---

describe("fiken_list_sale_draft_attachments", () => {
  it("builds correct nested draft attachment path", async () => {
    const client = createMockClient();
    const server = new MockMcpServer();
    registerSaleTools(server as unknown as McpServer, client);

    await server.call("fiken_list_sale_draft_attachments", {
      companySlug: "acme",
      draftId: 5,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/companies/acme/sales/drafts/5/attachments"
    );
  });
});

// --- purchases ---

describe("fiken_list_purchases", () => {
  it("passes settled filter", async () => {
    const client = createMockClient();
    const server = new MockMcpServer();
    registerPurchaseTools(server as unknown as McpServer, client);

    await server.call("fiken_list_purchases", {
      companySlug: "acme",
      settled: true,
    });

    expect(client.getPaginated).toHaveBeenCalledWith(
      "/companies/acme/purchases",
      expect.any(Object),
      expect.objectContaining({ settled: true })
    );
  });
});

// --- inbox ---

describe("fiken_list_inbox", () => {
  it("passes status filter", async () => {
    const client = createMockClient();
    const server = new MockMcpServer();
    registerInboxTools(server as unknown as McpServer, client);

    await server.call("fiken_list_inbox", {
      companySlug: "acme",
      status: "inbox",
    });

    expect(client.getPaginated).toHaveBeenCalledWith(
      "/companies/acme/inbox",
      expect.any(Object),
      expect.objectContaining({ status: "inbox" })
    );
  });
});

// --- error propagation ---

describe("error handling", () => {
  it("returns isError=true when API call fails", async () => {
    const client = createMockClient({
      get: vi.fn().mockRejectedValue(new FikenApiError(500, "Internal Server Error", "oops")),
    });
    const server = new MockMcpServer();
    registerUserTools(server as unknown as McpServer, client);

    const result = await server.call("fiken_get_user", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("500");
    expect(result.content[0].text).toContain("oops");
  });

  it("returns isError=true on network error", async () => {
    const client = createMockClient({
      get: vi.fn().mockRejectedValue(new Error("fetch failed")),
    });
    const server = new MockMcpServer();
    registerUserTools(server as unknown as McpServer, client);

    const result = await server.call("fiken_get_user", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("fetch failed");
  });
});
