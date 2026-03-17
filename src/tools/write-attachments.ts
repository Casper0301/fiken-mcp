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
      purchaseId: z.number().int().describe("Purchase ID to attach the file to"),
      filePath: z.string().describe("Absolute path to the file on disk (e.g. /Users/.../receipt.pdf)"),
      filename: z.string().describe("Filename with extension (e.g. 'receipt.pdf'). Must end with .pdf, .png, .jpg, .jpeg, or .gif"),
      attachToSale: z.boolean().default(true).describe("Attach as sale/purchase documentation (default: true)"),
      attachToPayment: z.boolean().default(false).describe("Attach as payment documentation (default: false)"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({
        purchaseId: z.number().int(),
        filePath: z.string(),
        filename: z.string(),
        attachToSale: z.boolean().default(true),
        attachToPayment: z.boolean().default(false),
      });
      const { companySlug, purchaseId, filePath, filename, attachToSale, attachToPayment } = schema.parse(args);

      const result = await client.uploadFile(
        `/companies/${companySlug}/purchases/${purchaseId}/attachments`,
        filePath,
        filename,
        attachToSale,
        attachToPayment
      );

      return toText({
        success: true,
        message: `File '${filename}' attached to purchase ${purchaseId}`,
        location: result.location,
      });
    })
  );
}
