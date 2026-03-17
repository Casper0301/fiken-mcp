import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerWriteInvoiceTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_create_invoice_draft",
    "⚠️ WRITES TO FIKEN — Creates an invoice DRAFT in Fiken. This does NOT send the invoice — it only creates a draft for review. ALWAYS show the user a full preview and get explicit confirmation before calling this tool. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      issueDate: z.string().describe("Invoice date (YYYY-MM-DD)"),
      dueDate: z.string().describe("Due date (YYYY-MM-DD)"),
      customerId: z.any().describe("Customer contact ID from Fiken (number)"),
      currency: z.string().default("NOK").describe("Currency code (default: NOK)"),
      orderReference: z.string().optional().describe("Order reference"),
      ourReference: z.string().optional().describe("Our reference"),
      yourReference: z.string().optional().describe("Customer's reference"),
      bankAccountCode: z.string().optional().describe("Bank account code for payment (e.g. '1920:10001')"),
      lines: z.any().describe("Invoice line items — JSON array of {description, vatType, account, netPrice, vat, quantity?, unitPrice?, productId?}"),
    },
    wrapToolError(async (args: unknown) => {
      const a = args as Record<string, unknown>;
      const companySlug = String(a.companySlug);
      const customerId = Number(a.customerId);
      const lines = typeof a.lines === "string" ? JSON.parse(a.lines) : a.lines;

      const parsedLines = (lines as unknown[]).map((line: unknown) => {
        const l = line as Record<string, unknown>;
        return {
          description: String(l.description),
          vatType: String(l.vatType),
          account: String(l.account || "3020"),
          netPrice: Number(l.netPrice),
          vat: Number(l.vat),
          ...(l.quantity != null && { quantity: Number(l.quantity) }),
          ...(l.unitPrice != null && { unitPrice: Number(l.unitPrice) }),
          ...(l.productId != null && { productId: Number(l.productId) }),
        };
      });

      const body: Record<string, unknown> = {
        issueDate: String(a.issueDate),
        dueDate: String(a.dueDate),
        customerId,
        currency: String(a.currency || "NOK"),
        lines: parsedLines,
      };

      if (a.orderReference) body.orderReference = String(a.orderReference);
      if (a.ourReference) body.ourReference = String(a.ourReference);
      if (a.yourReference) body.yourReference = String(a.yourReference);
      if (a.bankAccountCode) body.bankAccountCode = String(a.bankAccountCode);

      const result = await client.post(
        `/companies/${companySlug}/invoices/drafts`,
        body
      );

      return toText({
        success: true,
        message: "Invoice draft created successfully in Fiken. Review it in Fiken before sending.",
        location: result.location,
        data: result.data,
      });
    })
  );
}
