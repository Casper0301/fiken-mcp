import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema, PaginationSchema, LastModifiedSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerContactTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_list_contacts",
    "List contacts (customers and suppliers) for a company",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
      ...LastModifiedSchema.shape,
      name: z.string().optional().describe("Filter by contact name"),
      email: z.string().optional().describe("Filter by email address"),
      organizationNumber: z.string().optional().describe("Filter by organization number"),
      customerNumber: z.number().int().optional().describe("Filter by customer number"),
      memberNumber: z.number().int().optional().describe("Filter by member number"),
      supplierNumber: z.number().int().optional().describe("Filter by supplier number"),
      customer: z.boolean().optional().describe("Filter to only customers"),
      supplier: z.boolean().optional().describe("Filter to only suppliers"),
      inactive: z.boolean().optional().describe("Include inactive contacts"),
      group: z.string().optional().describe("Filter by group name"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.merge(PaginationSchema).merge(LastModifiedSchema).extend({
        name: z.string().optional(),
        email: z.string().optional(),
        organizationNumber: z.string().optional(),
        customerNumber: z.number().int().optional(),
        memberNumber: z.number().int().optional(),
        supplierNumber: z.number().int().optional(),
        customer: z.boolean().optional(),
        supplier: z.boolean().optional(),
        inactive: z.boolean().optional(),
        group: z.string().optional(),
      });
      const { companySlug, page, pageSize, ...filters } = schema.parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/contacts`,
        { page, pageSize },
        filters
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_contact",
    "Get a specific contact by ID",
    {
      ...CompanySlugSchema.shape,
      contactId: z.number().int().describe("Contact ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ contactId: z.number().int() });
      const { companySlug, contactId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/contacts/${contactId}`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_contact_persons",
    "List contact persons for a specific contact",
    {
      ...CompanySlugSchema.shape,
      contactId: z.number().int().describe("Contact ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({ contactId: z.number().int() });
      const { companySlug, contactId } = schema.parse(args);
      const data = await client.get(`/companies/${companySlug}/contacts/${contactId}/contactPerson`);
      return toText(data);
    })
  );

  server.tool(
    "fiken_get_contact_person",
    "Get a specific contact person by ID",
    {
      ...CompanySlugSchema.shape,
      contactId: z.number().int().describe("Contact ID"),
      contactPersonId: z.number().int().describe("Contact person ID"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({
        contactId: z.number().int(),
        contactPersonId: z.number().int(),
      });
      const { companySlug, contactId, contactPersonId } = schema.parse(args);
      const data = await client.get(
        `/companies/${companySlug}/contacts/${contactId}/contactPerson/${contactPersonId}`
      );
      return toText(data);
    })
  );

  server.tool(
    "fiken_list_contact_groups",
    "List contact groups for a company",
    {
      ...CompanySlugSchema.shape,
      ...PaginationSchema.shape,
    },
    wrapToolError(async (args) => {
      const { companySlug, page, pageSize } = CompanySlugSchema.merge(PaginationSchema).parse(args);
      const data = await client.getPaginated(
        `/companies/${companySlug}/groups`,
        { page, pageSize }
      );
      return toText(data);
    })
  );
}
