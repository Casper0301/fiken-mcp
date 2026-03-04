import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerBankTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_bank_accounts",
    "List bank accounts for a company",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug, page, pageSize } = CompanySlugSchema.merge(PaginationSchema).parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/bankAccounts`,
        { page, pageSize }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_bank_account",
    "Get a specific bank account by ID",
    {
      ...CompanySlugSchema.shape,
      bankAccountId: z.number().int().describe("Bank account ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ bankAccountId: z.number().int() });
      const { companySlug, bankAccountId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/bankAccounts/${bankAccountId}`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_bank_balances",
    "List bank balances for all bank accounts of a company. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug } = CompanySlugSchema.parse(args);
      const data = await client.get(`/companies/${companySlug}/bankBalances`);
      return toText(data);
    })
  );
}
