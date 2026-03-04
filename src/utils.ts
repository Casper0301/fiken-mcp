import { FikenApiError } from "./client.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export function wrapToolError(
  handler: (args: unknown) => Promise<ToolResult>
): (args: unknown) => Promise<ToolResult> {
  return async (args: unknown) => {
    try {
      return await handler(args);
    } catch (error) {
      let message: string;
      if (error instanceof FikenApiError) {
        message = `Fiken API error ${error.status} ${error.statusText}: ${error.body}`;
      } else if (error instanceof Error) {
        message = error.message;
      } else {
        message = String(error);
      }
      return {
        content: [{ type: "text", text: message }],
        isError: true,
      };
    }
  };
}

export function toText(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}
