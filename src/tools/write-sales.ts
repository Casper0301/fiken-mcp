import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerWriteSaleTools(server: McpServer, client: FikenClient): void {
  // ---------------------------------------------------------------------------
  // fiken_create_sale_payment
  // ---------------------------------------------------------------------------
  // POST /companies/{slug}/sales/{saleId}/payments
  //
  // Registers an innbetaling (payment received) on an existing sale. Use this
  // when a sale is recorded as unpaid in Fiken and the money has now landed in
  // a clearing/bank account.
  //
  // IMPORTANT — settlement gateway vs payment method:
  //   When a sale comes from an external system (Shopify, Stripe, Square,
  //   etc.), follow the SETTLEMENT GATEWAY summary in that system's report,
  //   NOT the customer payment-method breakdown. The customer may have paid
  //   with Klarna, BNPL, Apple Pay, or a card — but the money settles in
  //   ONE account (the gateway's clearing account, e.g. "Shopify Payments",
  //   "Stripe", "Square"). Register ONE payment to that single clearing
  //   account; do NOT split by payment method (Klarna does not have its
  //   own balance when it's routed through Shopify Payments).
  //
  // Account code is the Fiken `accountCode` of a bank or clearing account
  // (1920:xxxxx, 1960:xxxxx, etc.). List them via fiken_list_bank_accounts.
  //
  // DELETE is NOT supported by the Fiken API (returns 405). To remove a wrong
  // payment, click "Angre" next to it in the Fiken UI sale page.
  // ---------------------------------------------------------------------------
  server.tool(
    "fiken_create_sale_payment",
    "⚠️ WRITES TO FIKEN — Register a payment (innbetaling) on an existing sale. Amount in cents. Account is the Fiken accountCode (e.g. '1920:10001' for main bank, '1960:10005' for a Shopify Payments clearing account). For external-system sales, use the settlement-gateway clearing account — one payment per gateway, not one per payment method. Cannot be deleted via API (use Fiken UI 'Angre').",
    {
      ...CompanySlugSchema.shape,
      saleId: z.any().describe("Sale ID (number)"),
      date: z.string().describe("Payment date (YYYY-MM-DD)"),
      amount: z.any().describe("Payment amount in cents/øre (e.g. 245000 = 2,450.00 NOK)"),
      account: z.string().describe("Fiken accountCode of the receiving account, e.g. '1920:10001' or '1960:10005'. Use fiken_list_bank_accounts to find available codes."),
      fee: z.any().optional().describe("Optional gateway/processor fee in cents (e.g. Stripe processing fee). If provided, books the fee separately."),
      feeAccount: z.string().optional().describe("Account code for the fee (e.g. '7770' or '7790'). Required if fee is set."),
    },
    wrapToolError(async (args: unknown) => {
      const a = args as Record<string, unknown>;
      const companySlug = String(a.companySlug);
      const saleId = Number(a.saleId);
      const date = String(a.date);
      const amount = Number(a.amount);
      const account = String(a.account);

      const body: Record<string, unknown> = { date, amount, account };
      if (a.fee != null) {
        body.fee = Number(a.fee);
        if (a.feeAccount) body.feeAccount = String(a.feeAccount);
      }

      const result = await client.post(
        `/companies/${companySlug}/sales/${saleId}/payments`,
        body
      );

      return toText({
        success: true,
        message: `Payment of ${amount / 100} (${account}) registered on sale ${saleId}`,
        location: result.location,
        data: result.data,
      });
    })
  );

  // ---------------------------------------------------------------------------
  // fiken_attach_to_sale
  // ---------------------------------------------------------------------------
  // POST /companies/{slug}/sales/{saleId}/attachments
  // Multipart upload — same as purchase attachments but for sales.
  //
  // Use this to attach the source-system report (Shopify finance summary PDF,
  // Stripe report, POS Z-report, etc.) as bilag for an "external system" sale.
  // Bokføringsloven requires documentation for every entry; for sales coming
  // from an external system, the processor's settlement report is the bilag.
  // ---------------------------------------------------------------------------
  server.tool(
    "fiken_attach_to_sale",
    "⚠️ WRITES TO FIKEN — Attaches a file (PDF, PNG, JPG, GIF) to an existing sale. Use for sales created from external systems — the processor's report/finance summary PDF is the bilag.",
    {
      ...CompanySlugSchema.shape,
      saleId: z.any().describe("Sale ID (number)"),
      filePath: z.string().describe("Absolute path to the file on disk (e.g. /Users/.../shopify-may.pdf)"),
      filename: z.string().describe("Filename with extension (e.g. 'shopify-may.pdf')"),
      attachToSale: z.any().optional().describe("Attach as sale documentation (default: true)"),
      attachToPayment: z.any().optional().describe("Attach as payment documentation instead (default: false)"),
    },
    wrapToolError(async (args: unknown) => {
      const a = args as Record<string, unknown>;
      const companySlug = String(a.companySlug);
      const saleId = Number(a.saleId);
      const filePath = String(a.filePath);
      const filename = String(a.filename);
      const attachToSale = a.attachToSale === false || a.attachToSale === "false" ? false : true;
      const attachToPayment = a.attachToPayment === true || a.attachToPayment === "true" ? true : false;

      const result = await client.uploadFile(
        `/companies/${companySlug}/sales/${saleId}/attachments`,
        filePath,
        filename,
        { attachToSale, attachToPayment }
      );

      return toText({
        success: true,
        message: `File '${filename}' attached to sale ${saleId}`,
        location: result.location,
      });
    })
  );
}
