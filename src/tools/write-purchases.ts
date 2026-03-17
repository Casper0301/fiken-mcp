import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

function parseBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  throw new Error(`Invalid boolean: ${v}`);
}

function parseLines(v: unknown): unknown[] {
  if (typeof v === "string") return JSON.parse(v);
  if (Array.isArray(v)) return v;
  throw new Error("lines must be a JSON array");
}

export function registerWritePurchaseTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_create_purchase",
    "⚠️ WRITES TO FIKEN — Creates a purchase/expense in Fiken. ALWAYS show the user a full preview of all fields and get explicit confirmation before calling this tool. Amounts are in cents (100000 = 1000.00 NOK). For foreign currency, use netPriceInCurrency/vatInCurrency in lines.",
    {
      ...CompanySlugSchema.shape,
      date: z.string().describe("Purchase date (YYYY-MM-DD)"),
      kind: z.string().describe("Purchase kind: 'supplier' or 'cash_purchase'"),
      paid: z.any().describe("Whether the purchase has been paid (true/false)"),
      currency: z.string().default("NOK").describe("Currency code (default: NOK)"),
      supplierId: z.any().optional().describe("Supplier contact ID from Fiken (number)"),
      paymentAccount: z.string().optional().describe("Payment account code (e.g. '1920', '2390:10004')"),
      paymentDate: z.string().optional().describe("Payment date (YYYY-MM-DD). Required if paid=true"),
      paymentAmountInNok: z.any().optional().describe("Payment amount in NOK cents (number). Required for foreign currency paid purchases."),
      lines: z.any().describe("Purchase line items — JSON array of {description, account, vatType, netPrice?, vat?, netPriceInCurrency?, vatInCurrency?}"),
    },
    wrapToolError(async (args: unknown) => {
      const a = args as Record<string, unknown>;
      const companySlug = String(a.companySlug);
      const paid = parseBool(a.paid);
      const lines = parseLines(a.lines);
      const supplierId = a.supplierId ? Number(a.supplierId) : undefined;
      const paymentAmountInNok = a.paymentAmountInNok ? Number(a.paymentAmountInNok) : undefined;

      // Parse line items
      const parsedLines = lines.map((line: unknown) => {
        const l = line as Record<string, unknown>;
        return {
          description: String(l.description),
          account: String(l.account),
          vatType: String(l.vatType),
          ...(l.netPrice != null && { netPrice: Number(l.netPrice) }),
          ...(l.vat != null && { vat: Number(l.vat) }),
          ...(l.netPriceInCurrency != null && { netPriceInCurrency: Number(l.netPriceInCurrency) }),
          ...(l.vatInCurrency != null && { vatInCurrency: Number(l.vatInCurrency) }),
        };
      });

      const body: Record<string, unknown> = {
        date: String(a.date),
        kind: String(a.kind),
        paid,
        currency: String(a.currency || "NOK"),
        lines: parsedLines,
      };

      if (supplierId) body.supplierId = supplierId;
      if (a.paymentAccount) body.paymentAccount = String(a.paymentAccount);
      if (a.paymentDate) body.paymentDate = String(a.paymentDate);
      if (paymentAmountInNok) body.paymentAmountInNok = paymentAmountInNok;

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
      purchaseId: z.any().describe("Purchase ID to delete (number)"),
      description: z.string().describe("Reason for deleting the purchase"),
    },
    wrapToolError(async (args: unknown) => {
      const a = args as Record<string, unknown>;
      const companySlug = String(a.companySlug);
      const purchaseId = Number(a.purchaseId);
      const description = String(a.description);

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
