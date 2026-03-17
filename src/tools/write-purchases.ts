import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

const PurchaseLineSchema = z.object({
  description: z.string().describe("Line description (e.g. supplier name or what was purchased)"),
  account: z.string().describe("Account code (e.g. '6553' for IT software, '7321' for marketing, '6705' for accounting fees)"),
  vatType: z.string().describe("VAT type: 'HIGH' (25%), 'MEDIUM' (15%), 'LOW' (12%), 'NONE' (0%), 'EXEMPT'"),
  netPrice: z.number().int().describe("Net amount in cents (e.g. 100000 = 1000.00 NOK)"),
  vat: z.number().int().describe("VAT amount in cents (e.g. 25000 = 250.00 NOK for 25% on 1000 NOK)"),
});

export function registerWritePurchaseTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_create_purchase",
    "⚠️ WRITES TO FIKEN — Creates a purchase/expense in Fiken. ALWAYS show the user a full preview of all fields and get explicit confirmation before calling this tool. Amounts are in cents (100000 = 1000.00 NOK).",
    {
      ...CompanySlugSchema.shape,
      date: z.string().describe("Purchase date (YYYY-MM-DD)"),
      kind: z.string().describe("Purchase kind: 'supplier' (from a supplier) or 'cash_purchase' (direct expense)"),
      paid: z.boolean().describe("Whether the purchase has been paid"),
      currency: z.string().default("NOK").describe("Currency code (default: NOK)"),
      supplierId: z.number().int().optional().describe("Supplier contact ID from Fiken. Use fiken_list_contacts to find it."),
      paymentAccount: z.string().optional().describe("Payment account code (e.g. '1920' for bank account, '2390:10003' for credit card)"),
      paymentDate: z.string().optional().describe("Payment date (YYYY-MM-DD). Required if paid=true"),
      lines: z.array(PurchaseLineSchema).min(1).describe("Purchase line items"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({
        date: z.string(),
        kind: z.string(),
        paid: z.boolean(),
        currency: z.string().default("NOK"),
        supplierId: z.number().int().optional(),
        paymentAccount: z.string().optional(),
        paymentDate: z.string().optional(),
        lines: z.array(PurchaseLineSchema).min(1),
      });
      const { companySlug, ...purchaseData } = schema.parse(args);

      // Build the request body
      const body: Record<string, unknown> = {
        date: purchaseData.date,
        kind: purchaseData.kind,
        paid: purchaseData.paid,
        currency: purchaseData.currency,
        lines: purchaseData.lines,
      };

      if (purchaseData.supplierId) body.supplierId = purchaseData.supplierId;
      if (purchaseData.paymentAccount) body.paymentAccount = purchaseData.paymentAccount;
      if (purchaseData.paymentDate) body.paymentDate = purchaseData.paymentDate;

      const result = await client.post(
        `/companies/${companySlug}/purchases`,
        body
      );

      return toText({
        success: true,
        message: "Purchase created successfully in Fiken",
        location: result.location,
        data: result.data,
      });
    })
  );
}
