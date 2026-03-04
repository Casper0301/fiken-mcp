import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema, DateRangeSchema, LastModifiedSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerSaleTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_sales",
    "List sales for a company. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
      ...DateRangeSchema.shape,
      ...LastModifiedSchema.shape,
      saleNumber: z.string().optional().describe("Filter by sale number"),
      settled: z.boolean().optional().describe("Filter by settled status"),
      projectId: z.number().int().optional().describe("Filter by project ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.merge(PaginationSchema).merge(DateRangeSchema).merge(LastModifiedSchema).extend({
        saleNumber: z.string().optional(),
        settled: z.boolean().optional(),
        projectId: z.number().int().optional(),
      });
      const { companySlug, page, pageSize, ...filters } = schema.parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/sales`,
        { page, pageSize },
        filters
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_sale",
    "Get a specific sale by ID. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      saleId: z.number().int().describe("Sale ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ saleId: z.number().int() });
      const { companySlug, saleId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/sales/${saleId}`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_sale_attachments",
    "List attachments for a specific sale",
    {
      ...CompanySlugSchema.shape,
      saleId: z.number().int().describe("Sale ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ saleId: z.number().int() });
      const { companySlug, saleId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/sales/${saleId}/attachments`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_sale_drafts",
    "List sale drafts for a company",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug, page, pageSize } = CompanySlugSchema.merge(PaginationSchema).parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/sales/drafts`,
        { page, pageSize }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_sale_draft",
    "Get a specific sale draft by ID",
    {
      ...CompanySlugSchema.shape,
      draftId: z.number().int().describe("Draft ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ draftId: z.number().int() });
      const { companySlug, draftId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/sales/drafts/${draftId}`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_sale_draft_attachments",
    "List attachments for a specific sale draft",
    {
      ...CompanySlugSchema.shape,
      draftId: z.number().int().describe("Draft ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ draftId: z.number().int() });
      const { companySlug, draftId } = schema.parse(args);
      const data = await client.get(
        `/companies/${companySlug}/sales/drafts/${draftId}/attachments`
      );
      return toText(data);
    })
  );
}
