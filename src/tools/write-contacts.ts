import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

export function registerWriteContactTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_create_contact",
    "⚠️ WRITES TO FIKEN — Creates a new contact (customer or supplier) in Fiken. ALWAYS show the user a full preview and get explicit confirmation before calling this tool.",
    {
      ...CompanySlugSchema.shape,
      name: z.string().describe("Contact name (company or person name)"),
      customer: z.boolean().optional().describe("Set to true if this is a customer"),
      supplier: z.boolean().optional().describe("Set to true if this is a supplier"),
      email: z.string().optional().describe("Contact email address"),
      organizationNumber: z.string().optional().describe("Organization number (org.nr.)"),
      phoneNumber: z.string().optional().describe("Phone number"),
      currency: z.string().default("NOK").describe("Default currency (default: NOK)"),
      language: z.string().default("Norwegian").describe("Language: 'Norwegian' or 'English'"),
      streetAddress: z.string().optional().describe("Street address"),
      city: z.string().optional().describe("City"),
      postCode: z.string().optional().describe("Post/zip code"),
      country: z.string().default("Norge").describe("Country (default: Norge)"),
    },
    wrapToolError(async (args) => {
      const schema = CompanySlugSchema.extend({
        name: z.string(),
        customer: z.boolean().optional(),
        supplier: z.boolean().optional(),
        email: z.string().optional(),
        organizationNumber: z.string().optional(),
        phoneNumber: z.string().optional(),
        currency: z.string().default("NOK"),
        language: z.string().default("Norwegian"),
        streetAddress: z.string().optional(),
        city: z.string().optional(),
        postCode: z.string().optional(),
        country: z.string().default("Norge"),
      });
      const { companySlug, streetAddress, city, postCode, country, ...contactData } = schema.parse(args);

      const body: Record<string, unknown> = { ...contactData };

      // Build address if any address field is provided
      if (streetAddress || city || postCode || country) {
        body.address = {
          ...(streetAddress && { streetAddress }),
          ...(city && { city }),
          ...(postCode && { postCode }),
          country,
        };
      }

      const result = await client.post(
        `/companies/${companySlug}/contacts`,
        body
      );

      return toText({
        success: true,
        message: "Contact created successfully in Fiken",
        location: result.location,
        data: result.data,
      });
    })
  );
}
