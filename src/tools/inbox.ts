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
