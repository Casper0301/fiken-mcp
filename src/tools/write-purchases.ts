import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

const PurchaseLineSchema = z.object({
  description: z.string(),
  account: z.string(),
  vatType: z.string(),
  netPrice: z.coerce.number().int().optional(),
  vat: z.coerce.number().int().optional(),
  netPriceInCurrency: z.coerce.number().int().optional(),
  vatInCurrency: z.coerce.number().int().optional(),
});

// Schema for tool input (accepts strings from MCP transport)
const CreatePurchaseInputSchema = {
  ...CompanySlugSchema.shape,
  date: z.string().describe("Purchase date (YYYY-MM-DD)"),
  kind: z.string().describe("Purchase kind: 'supplier' or 'cash_purchase'"),
  paid: z.preprocess((v) => v === "true" || v === true, z.boolean()).describe("Whether the purchase has been paid"),
  currency: z.string().default("NOK").describe("Currency code (default: NOK)"),
  supplierId: z.coerce.number().int().optional().describe("Supplier contact ID from Fiken"),
  paymentAccount: z.string().optional().describe("Payment account code (e.g. '1920', '2390:10004')"),
  paymentDate: z.string().optional().describe("Payment date (YYYY-MM-DD). Required if paid=true"),
  paymentAmountInNok: z.coerce.number().int().optional().describe("Payment amount in NOK cents. Required for foreign currency paid purchases."),
  lines: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(PurchaseLineSchema).min(1)
  ).describe("Purchase line items as JSON array"),
};

export function registerWritePurchaseTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_create_purchase",
    "⚠️ WRITES TO FIKEN — Creates a purchase/expense in Fiken. ALWAYS show the user a full preview of all fields and get explicit confirmation before calling this tool. Amounts are in cents (100000 = 1000.00 NOK). For foreign currency, use netPriceInCurrency/vatInCurrency in lines.",
    CreatePurchaseInputSchema,
    wrapToolError(async (args) => {
      const schema = z.object({
        ...CompanySlugSchema.shape,
        date: z.string(),
        kind: z.string(),
        paid: z.preprocess((v) => v === "true" || v === true, z.boolean()),
        currency: z.string().default("NOK"),
        supplierId: z.coerce.number().int().optional(),
        paymentAccount: z.string().optional(),
        paymentDate: z.string().optional(),
        paymentAmountInNok: z.coerce.number().int().optional(),
        lines: z.preprocess(
          (v) => (typeof v === "string" ? JSON.parse(v) : v),
          z.array(PurchaseLineSchema).min(1)
        ),
      });
      const { companySlug, ...purchaseData } = schema.parse(args);

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
      if (purchaseData.paymentAmountInNok) body.paymentAmountInNok = purchaseData.paymentAmountInNok;

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

  server.tool(
    "fiken_delete_purchase",
    "⚠️ WRITES TO FIKEN — Soft-deletes a purchase by creating a reverse transaction. ALWAYS confirm with the user before calling.",
    {
      ...CompanySlugSchema.shape,
      purchaseId: z.coerce.number().int().describe("Purchase ID to delete"),
      description: z.string().describe("Reason for deleting the purchase"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({
        purchaseId: z.coerce.number().int(),
        description: z.string(),
      });
      const { companySlug, purchaseId, description } = schema.parse(args);

      const data = await client.patch(
        `/companies/${companySlug}/purchases/${purchaseId}/delete`,
        { description }
      );

      return toText({
        success: true,
        message: "Purchase deleted successfully in Fiken (reverse transaction created)",
        data,
      });
    })
  );
}
