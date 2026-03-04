import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema, DateRangeSchema, LastModifiedSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerPurchaseTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_purchases",
    "List purchases for a company. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
      ...DateRangeSchema.shape,
      ...LastModifiedSchema.shape,
      settled: z.boolean().optional().describe("Filter by settled status"),
      projectId: z.number().int().optional().describe("Filter by project ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.merge(PaginationSchema).merge(DateRangeSchema).merge(LastModifiedSchema).extend({
        settled: z.boolean().optional(),
        projectId: z.number().int().optional(),
      });
      const { companySlug, page, pageSize, ...filters } = schema.parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/purchases`,
        { page, pageSize },
        filters
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_purchase",
    "Get a specific purchase by ID. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      purchaseId: z.number().int().describe("Purchase ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ purchaseId: z.number().int() });
      const { companySlug, purchaseId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/purchases/${purchaseId}`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_purchase_attachments",
    "List attachments for a specific purchase",
    {
      ...CompanySlugSchema.shape,
      purchaseId: z.number().int().describe("Purchase ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ purchaseId: z.number().int() });
      const { companySlug, purchaseId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/purchases/${purchaseId}/attachments`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_purchase_drafts",
    "List purchase drafts for a company",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug, page, pageSize } = CompanySlugSchema.merge(PaginationSchema).parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/purchases/drafts`,
        { page, pageSize }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_purchase_draft",
    "Get a specific purchase draft by ID",
    {
      ...CompanySlugSchema.shape,
      draftId: z.number().int().describe("Draft ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ draftId: z.number().int() });
      const { companySlug, draftId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/purchases/drafts/${draftId}`);
      return toText(data);
    })
  );
}
