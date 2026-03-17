import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerInboxTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_inbox",
    "List inbox documents for a company",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
      name: z.string().optional().describe("Filter by document name"),
      description: z.string().optional().describe("Filter by document description"),
      status: z.string().optional().describe("Filter by document status"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.merge(PaginationSchema).extend({
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
      });
      const { companySlug, page, pageSize, ...filters } = schema.parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/inbox`,
        { page, pageSize },
        filters
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_upload_to_inbox",
    "⚠️ WRITES TO FIKEN — Uploads a file (PDF, PNG, JPG, etc.) to the Fiken inbox. Fiken will auto-detect the document and suggest bookkeeping actions.",
    {
      ...CompanySlugSchema.shape,
      filePath: z.string().describe("Absolute path to the file on disk"),
      filename: z.string().describe("Filename with extension (e.g. 'receipt.pdf')"),
      description: z.string().optional().describe("Optional description for the inbox document"),
    },
    wrapToolError(async (args: unknown) => {
      const a = args as Record<string, unknown>;
      const companySlug = String(a.companySlug);
      const filePath = String(a.filePath);
      const filename = String(a.filename);
      const description = a.description ? String(a.description) : undefined;

      const result = await client.uploadFile(
        `/companies/${companySlug}/inbox`,
        filePath,
        filename,
        false,
        false,
        description
      );

      return toText({
        success: true,
        message: `File '${filename}' uploaded to Fiken inbox`,
        location: result.location,
      });
    })
  );

  server.tool(
    "fiken_get_inbox_document",
    "Get a specific inbox document by ID",
    {
      ...CompanySlugSchema.shape,
      inboxDocumentId: z.number().int().describe("Inbox document ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ inboxDocumentId: z.number().int() });
      const { companySlug, inboxDocumentId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/inbox/${inboxDocumentId}`);
      return toText(data);
    })
  );
}
