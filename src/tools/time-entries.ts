import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema, DateRangeSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerTimeEntryTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_time_entries",
    "List time entries for a company",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
      ...DateRangeSchema.shape,
      projectId: z.number().int().optional().describe("Filter by project ID"),
      userId: z.number().int().optional().describe("Filter by user ID"),
      activityId: z.number().int().optional().describe("Filter by activity ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.merge(PaginationSchema).merge(DateRangeSchema).extend({
        projectId: z.number().int().optional(),
        userId: z.number().int().optional(),
        activityId: z.number().int().optional(),
      });
      const { companySlug, page, pageSize, ...filters } = schema.parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/timeEntries`,
        { page, pageSize },
        filters
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_time_entry",
    "Get a specific time entry by ID",
    {
      ...CompanySlugSchema.shape,
      timeEntryId: z.number().int().describe("Time entry ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ timeEntryId: z.number().int() });
      const { companySlug, timeEntryId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/timeEntries/${timeEntryId}`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_activities",
    "List activities for a company (used with time entries)",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug, page, pageSize } = CompanySlugSchema.merge(PaginationSchema).parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/activities`,
        { page, pageSize }
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_time_users",
    "List users who can log time for a company",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug, page, pageSize } = CompanySlugSchema.merge(PaginationSchema).parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/timeUsers`,
        { page, pageSize }
      );
      return toText(data);
    })
  );
}
