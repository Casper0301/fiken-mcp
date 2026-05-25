import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerWriteAttachmentTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_attach_to_purchase",
    "⚠️ WRITES TO FIKEN — Attaches a file (PDF, PNG, JPG, GIF) to an existing purchase. Use this to attach receipt documentation after creating a purchase.",
    {
      ...CompanySlugSchema.shape,
      purchaseId: z.any().describe("Purchase ID to attach the file to (number)"),
      filePath: z.string().describe("Absolute path to the file on disk (e.g. /Users/.../receipt.pdf)"),
      filename: z.string().describe("Filename with extension (e.g. 'receipt.pdf')"),
      attachToSale: z.any().optional().describe("Attach as sale/purchase documentation (default: true)"),
      attachToPayment: z.any().optional().describe("Attach as payment documentation (default: false)"),
    },
    wrapToolError(async (args: unknown) => {
      const a = args as Record<string, unknown>;
      const companySlug = String(a.companySlug);
      const purchaseId = Number(a.purchaseId);
      const filePath = String(a.filePath);
      const filename = String(a.filename);
      const attachToSale = a.attachToSale === false || a.attachToSale === "false" ? false : true;
      const attachToPayment = a.attachToPayment === true || a.attachToPayment === "true" ? true : false;

      const result = await client.uploadFile(
        `/companies/${companySlug}/purchases/${purchaseId}/attachments`,
        filePath,
        filename,
        { attachToSale, attachToPayment }
      );

      return toText({
        success: true,
        message: `File '${filename}' attached to purchase ${purchaseId}`,
        location: result.location,
      });
    })
  );

  // ---------------------------------------------------------------------------
  // fiken_attach_to_invoice
  // ---------------------------------------------------------------------------
  // POST /companies/{slug}/invoices/{invoiceId}/attachments
  // Multipart upload — for attaching extra documentation to an issued invoice
  // (delivery confirmation, customer signature, work-completion photo, etc.).
  // ---------------------------------------------------------------------------
  server.tool(
    "fiken_attach_to_invoice",
    "⚠️ WRITES TO FIKEN — Attaches a file (PDF, PNG, JPG, GIF) to an existing issued invoice. Use for delivery confirmations, signed quotes, work-completion docs.",
    {
      ...CompanySlugSchema.shape,
      invoiceId: z.any().describe("Invoice ID (number)"),
      filePath: z.string().describe("Absolute path to the file on disk"),
      filename: z.string().describe("Filename with extension"),
      attachToSale: z.any().optional().describe("Attach as invoice documentation (default: true)"),
      attachToPayment: z.any().optional().describe("Attach as payment documentation instead (default: false)"),
    },
    wrapToolError(async (args: unknown) => {
      const a = args as Record<string, unknown>;
      const companySlug = String(a.companySlug);
      const invoiceId = Number(a.invoiceId);
      const filePath = String(a.filePath);
      const filename = String(a.filename);
      const attachToSale = a.attachToSale === false || a.attachToSale === "false" ? false : true;
      const attachToPayment = a.attachToPayment === true || a.attachToPayment === "true" ? true : false;

      const result = await client.uploadFile(
        `/companies/${companySlug}/invoices/${invoiceId}/attachments`,
        filePath,
        filename,
        { attachToSale, attachToPayment }
      );

      return toText({
        success: true,
        message: `File '${filename}' attached to invoice ${invoiceId}`,
        location: result.location,
      });
    })
  );
}
