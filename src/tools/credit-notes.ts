import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerCreditNoteTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_credit_notes",
    "List credit notes for a company. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
      issueDate: z.string().optional().describe("Filter by issue date (YYYY-MM-DD)"),
      issueDateLe: z.string().optional().describe("Issue date less than or equal (YYYY-MM-DD)"),
      issueDateLt: z.string().optional().describe("Issue date less than (YYYY-MM-DD)"),
      issueDateGe: z.string().optional().describe("Issue date greater than or equal (YYYY-MM-DD)"),
      issueDateGt: z.string().optional().describe("Issue date greater than (YYYY-MM-DD)"),
      customerId: z.number().int().optional().describe("Filter by customer contact ID"),
      settled: z.boolean().optional().describe("Filter by settled status"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.merge(PaginationSchema).extend({
        issueDate: z.string().optional(),
        issueDateLe: z.string().optional(),
        issueDateLt: z.string().optional(),
        issueDateGe: z.string().optional(),
        issueDateGt: z.string().optional(),
        customerId: z.number().int().optional(),
        settled: z.boolean().optional(),
      });
      const { companySlug, page, pageSize, ...filters } = schema.parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/creditNotes`,
        { page, pageSize },
        filters
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_credit_note",
    "Get a specific credit note by ID. Amounts are in cents.",
    {
      ...CompanySlugSchema.shape,
      creditNoteId: z.number().int().describe("Credit note ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ creditNoteId: z.number().int() });
      const { companySlug, creditNoteId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/creditNotes/${creditNoteId}`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_credit_note_counter",
    "Get the current credit note counter/number sequence for a company",
    {
      ...CompanySlugSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug } = CompanySlugSchema.parse(args);
      const data = await client.get(`/companies/${companySlug}/creditNotes/counter`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_credit_note_drafts",
    "List credit note drafts for a company",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug, page, pageSize } = CompanySlugSchema.merge(PaginationSchema).parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/creditNotes/drafts`,
        { page, pageSize }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_credit_note_draft",
    "Get a specific credit note draft by ID",
    {
      ...CompanySlugSchema.shape,
      draftId: z.number().int().describe("Draft ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ draftId: z.number().int() });
      const { companySlug, draftId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/creditNotes/drafts/${draftId}`);
      return toText(data);
    })
  );
}
