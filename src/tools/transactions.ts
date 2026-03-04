import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema, DateRangeSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerTransactionTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_transactions",
    "List transactions for a company. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
      ...DateRangeSchema.shape,
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.merge(PaginationSchema).merge(DateRangeSchema);
      const { companySlug, page, pageSize, ...filters } = schema.parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/transactions`,
        { page, pageSize },
        filters
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_transaction",
    "Get a specific transaction by ID. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      transactionId: z.number().int().describe("Transaction ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ transactionId: z.number().int() });
      const { companySlug, transactionId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/transactions/${transactionId}`);
      return toText(data);
    })
  );
}
