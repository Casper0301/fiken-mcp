import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FikenClient } from "../client.js";
import { wrapToolError, toText } from "../utils.js";

export function registerUserTools(server: McpServer, client: FikenClient): void {
  server.tool(
    "fiken_get_user",
    "Get information about the currently authenticated Fiken user",
    {},
    wrapToolError(async () => {
      const data = await client.get("/user");
      return toText(data);
    })
  );
}
