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
      daysUntilDueDate: z.number().int().default(14).describe("Days until due date from issue date (default: 14)"),
      customerId: z.any().describe("Customer contact ID from Fiken (number)"),
      currency: z.string().default("NOK").describe("Currency code (default: NOK)"),
      orderReference: z.string().optional().describe("Order reference"),
      ourReference: z.string().optional().describe("Our reference"),
      yourReference: z.string().optional().describe("Customer's reference"),
      bankAccountCode: z.string().optional().describe("Bank account code for payment (e.g. '1920:10001')"),
      lines: z.any().describe("Invoice line items — JSON array of {description, vatType, account, netPrice, vat, unitPrice, quantity?, productId?}. unitPrice is REQUIRED by Fiken when no productId is set. All amounts in øre (cents)."),
    },
    wrapToolError(async (args: unknown) => {
      const a = args as Record<string, unknown>;
      const companySlug = String(a.companySlug);
      const customerId = Number(a.customerId);
      const lines = typeof a.lines === "string" ? JSON.parse(a.lines) : a.lines;

      const parsedLines = (lines as unknown[]).map((line: unknown) => {
        const l = line as Record<string, unknown>;
        const netPrice = Number(l.netPrice);
        const quantity = l.quantity != null ? Number(l.quantity) : 1;
        // unitPrice is required by Fiken when no productId is set
        const unitPrice = l.unitPrice != null ? Number(l.unitPrice) : (quantity > 0 ? Math.round(netPrice / quantity) : netPrice);
        return {
          description: String(l.description),
          vatType: String(l.vatType),
          account: String(l.account || "3020"),
          netPrice,
          vat: Number(l.vat),
          quantity,
          unitPrice,
          ...(l.productId != null && { productId: Number(l.productId) }),
        };
      });

      const body: Record<string, unknown> = {
        type: "invoice",
        issueDate: String(a.issueDate),
        daysUntilDueDate: Number(a.daysUntilDueDate || 14),
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
