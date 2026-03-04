import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerOrderConfirmationTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_order_confirmations",
    "List order confirmations for a company. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug, page, pageSize } = CompanySlugSchema.merge(PaginationSchema).parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/orderConfirmations`,
        { page, pageSize }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_order_confirmation",
    "Get a specific order confirmation by ID. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      confirmationId: z.number().int().describe("Order confirmation ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ confirmationId: z.number().int() });
      const { companySlug, confirmationId } = schema.parse(args);
      const data = await client.get(
        `/companies/${companySlug}/orderConfirmations/${confirmationId}`
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_order_confirmation_counter",
    "Get the current order confirmation counter/number sequence for a company",
    {
      ...CompanySlugSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug } = CompanySlugSchema.parse(args);
      const data = await client.get(`/companies/${companySlug}/orderConfirmations/counter`);
      return toText(data);
    })
  );
}
