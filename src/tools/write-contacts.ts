import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FikenClient } from "../client.js";
import { CompanySlugSchema } from "../types.js";
import { wrapToolError, toText } from "../utils.js";

function parseBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export function registerWriteContactTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_create_contact",
    "⚠️ WRITES TO FIKEN — Creates a new contact (customer or supplier) in Fiken. ALWAYS show the user a full preview and get explicit confirmation before calling this tool.",
    {
      ...CompanySlugSchema.shape,
      name: z.string().describe("Contact name (company or person name)"),
      customer: z.any().optional().describe("Set to true if this is a customer"),
      supplier: z.any().optional().describe("Set to true if this is a supplier"),
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
    wrapToolError(async (args: unknown) => {
      const a = args as Record<string, unknown>;
      const companySlug = String(a.companySlug);

      const body: Record<string, unknown> = {
        name: String(a.name),
        currency: String(a.currency || "NOK"),
        language: String(a.language || "Norwegian"),
      };

      const customer = parseBool(a.customer);
      const supplier = parseBool(a.supplier);
      if (customer !== undefined) body.customer = customer;
      if (supplier !== undefined) body.supplier = supplier;
      if (a.email) body.email = String(a.email);
      if (a.organizationNumber) body.organizationNumber = String(a.organizationNumber);
      if (a.phoneNumber) body.phoneNumber = String(a.phoneNumber);

      const streetAddress = a.streetAddress ? String(a.streetAddress) : undefined;
      const city = a.city ? String(a.city) : undefined;
      const postCode = a.postCode ? String(a.postCode) : undefined;
      const country = String(a.country || "Norge");

      if (streetAddress || city || postCode) {
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
