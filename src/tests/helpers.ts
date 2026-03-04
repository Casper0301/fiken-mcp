import { vi } from "vitest";
import type { FikenClient, PaginatedResult } from "../client.js";

/**
 * Creates a mock FikenClient with spy methods.
 */
export function createMockClient(
  overrides: Partial<{
    get: FikenClient["get"];
    getPaginated: FikenClient["getPaginated"];
  }> = {}
): FikenClient {
  return {
    get: overrides.get ?? vi.fn().mockResolvedValue({}),
    getPaginated:
      overrides.getPaginated ??
      vi.fn().mockResolvedValue({
        data: [],
        pagination: { page: 0, pageCount: 1, resultCount: 0, pageSize: 25 },
      }),
  } as unknown as FikenClient;
}

/** Minimal mock McpServer that captures tool registrations. */
export type ToolHandler = (args: unknown) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

export class MockMcpServer {
  tools: Map<string, ToolHandler> = new Map();

  tool(
    name: string,
    _description: string,
    _schema: unknown,
    handler: ToolHandler
  ) {
    this.tools.set(name, handler);
  }

  async call(name: string, args: unknown) {
    const handler = this.tools.get(name);
    if (!handler) throw new Error(`Tool not registered: ${name}`);
    return handler(args);
  }
}

export function paginatedOf<T>(data: T[]): PaginatedResult<T> {
  return {
    data,
    pagination: { page: 0, pageCount: 1, resultCount: data.length, pageSize: 25 },
  };
}
