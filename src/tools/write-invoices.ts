import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

const InvoiceLineSchema = z.object({
  description: z.string().describe("Line item description"),
  vatType: z.string().describe("VAT type: 'HIGH' (25%), 'MEDIUM' (15%), 'LOW' (12%), 'NONE' (0%), 'EXEMPT'"),
  account: z.string().default("3020").describe("Income account code (default: 3020)"),
  netPrice: z.number().int().describe("Net amount in cents (e.g. 100000 = 1000.00 NOK)"),
  vat: z.number().int().describe("VAT amount in cents"),
  quantity: z.number().optional().describe("Quantity (default: 1)"),
  unitPrice: z.number().int().optional().describe("Unit price in cents (if using quantity)"),
  productId: z.number().int().optional().describe("Product ID from Fiken product catalog"),
});

export function registerWriteInvoiceTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_create_invoice_draft",
    "⚠️ WRITES TO FIKEN — Creates an invoice DRAFT in Fiken. This does NOT send the invoice — it only creates a draft for review. ALWAYS show the user a full preview and get explicit confirmation before calling this tool. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      issueDate: z.string().describe("Invoice date (YYYY-MM-DD)"),
      dueDate: z.string().describe("Due date (YYYY-MM-DD)"),
      customerId: z.number().int().describe("Customer contact ID from Fiken. Use fiken_list_contacts to find it."),
      currency: z.string().default("NOK").describe("Currency code (default: NOK)"),
      orderReference: z.string().optional().describe("Order reference"),
      ourReference: z.string().optional().describe("Our reference"),
      yourReference: z.string().optional().describe("Customer's reference"),
      bankAccountCode: z.string().optional().describe("Bank account code for payment (e.g. '1920:10001')"),
      lines: z.array(InvoiceLineSchema).min(1).describe("Invoice line items"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({
        issueDate: z.string(),
        dueDate: z.string(),
        customerId: z.number().int(),
        currency: z.string().default("NOK"),
        orderReference: z.string().optional(),
        ourReference: z.string().optional(),
        yourReference: z.string().optional(),
        bankAccountCode: z.string().optional(),
        lines: z.array(InvoiceLineSchema).min(1),
      });
      const { companySlug, ...invoiceData } = schema.parse(args);

      const result = await client.post(
        `/companies/${companySlug}/invoices/drafts`,
        invoiceData
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
