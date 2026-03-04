import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema, LastModifiedSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerProductTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_products",
    "List products for a company. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
      ...LastModifiedSchema.shape,
      name: z.string().optional().describe("Filter by product name"),
      productNumber: z.string().optional().describe("Filter by product number"),
      active: z.boolean().optional().describe("Filter by active status"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.merge(PaginationSchema).merge(LastModifiedSchema).extend({
        name: z.string().optional(),
        productNumber: z.string().optional(),
        active: z.boolean().optional(),
      });
      const { companySlug, page, pageSize, ...filters } = schema.parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/products`,
        { page, pageSize },
        filters
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_product",
    "Get a specific product by ID. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      productId: z.number().int().describe("Product ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ productId: z.number().int() });
      const { companySlug, productId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/products/${productId}`);
      return toText(data);
    })
  );
}
