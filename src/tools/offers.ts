import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerOfferTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_offers",
    "List offers/quotes for a company. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug, page, pageSize } = CompanySlugSchema.merge(PaginationSchema).parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/offers`,
        { page, pageSize }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_offer",
    "Get a specific offer/quote by ID. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      offerId: z.number().int().describe("Offer ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ offerId: z.number().int() });
      const { companySlug, offerId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/offers/${offerId}`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_offer_counter",
    "Get the current offer counter/number sequence for a company",
    {
      ...CompanySlugSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug } = CompanySlugSchema.parse(args);
      const data = await client.get(`/companies/${companySlug}/offers/counter`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_offer_drafts",
    "List offer drafts for a company",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug, page, pageSize } = CompanySlugSchema.merge(PaginationSchema).parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/offers/drafts`,
        { page, pageSize }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_offer_draft",
    "Get a specific offer draft by ID",
    {
      ...CompanySlugSchema.shape,
      draftId: z.number().int().describe("Draft ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ draftId: z.number().int() });
      const { companySlug, draftId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/offers/drafts/${draftId}`);
      return toText(data);
    })
  );
}
