import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerAccountTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_accounts",
    "List chart of accounts for a company. Account codes are strings (e.g. '1920').",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
      fromAccount: z.number().optional().describe("Filter accounts from this account number"),
      toAccount: z.number().optional().describe("Filter accounts to this account number"),
      year: z.number().int().optional().describe("Fiscal year"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.merge(PaginationSchema).extend({
        fromAccount: z.number().optional(),
        toAccount: z.number().optional(),
        year: z.number().int().optional(),
      });
      const { companySlug, page, pageSize, fromAccount, toAccount, year } = schema.parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/accounts`,
        { page, pageSize },
        { fromAccount, toAccount, year }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_account",
    "Get a specific account by account code for a company",
    {
      ...CompanySlugSchema.shape,
      accountCode: z.string().describe("Account code (e.g. '1920' or '1500:10001')"),
      year: z.number().int().optional().describe("Fiscal year"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({
        accountCode: z.string(),
        year: z.number().int().optional(),
      });
      const { companySlug, accountCode, year } = schema.parse(args);
      const data = await client.get(
        `/companies/${companySlug}/accounts/${accountCode}`,
        { year }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_account_balances",
    "List account balances for a company. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
      fromAccount: z.number().optional().describe("Filter from this account number"),
      toAccount: z.number().optional().describe("Filter to this account number"),
      year: z.number().int().optional().describe("Fiscal year"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.merge(PaginationSchema).extend({
        fromAccount: z.number().optional(),
        toAccount: z.number().optional(),
        year: z.number().int().optional(),
      });
      const { companySlug, page, pageSize, fromAccount, toAccount, year } = schema.parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/accountBalances`,
        { page, pageSize },
        { fromAccount, toAccount, year }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_account_balance",
    "Get balance for a specific account. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      accountCode: z.string().describe("Account code (e.g. '1920')"),
      year: z.number().int().optional().describe("Fiscal year"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({
        accountCode: z.string(),
        year: z.number().int().optional(),
      });
      const { companySlug, accountCode, year } = schema.parse(args);
      const data = await client.get(
        `/companies/${companySlug}/accountBalances/${accountCode}`,
        { year }
      );
      return toText(data);
    })
  );
}
