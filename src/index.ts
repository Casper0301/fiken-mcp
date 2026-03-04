import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const token = process.env.FIKEN_API_TOKEN;
if (!token) {
  console.error("Error: FIKEN_API_TOKEN environment variable is required");
  process.exit(1);
}

const server = createServer(token);
const transport = new StdioServerTransport();

await server.connect(transport);
