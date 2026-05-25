import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FikenClient } from "./client.js";
import {
  registerUserTools,
  registerCompanyTools,
  registerAccountTools,
  registerBankTools,
  registerContactTools,
  registerInvoiceTools,
  registerCreditNoteTools,
  registerOfferTools,
  registerOrderConfirmationTools,
  registerJournalEntryTools,
  registerTransactionTools,
  registerSaleTools,
  registerPurchaseTools,
  registerProductTools,
  registerProjectTools,
  registerTimeEntryTools,
  registerInboxTools,
  registerWritePurchaseTools,
  registerWriteContactTools,
  registerWriteInvoiceTools,
  registerWriteSaleTools,
  registerWriteAttachmentTools,
} from "./tools/index.js";

export function createServer(token: string): McpServer {
  const server = new McpServer({
    name: "fiken-mcp",
    version: "1.0.0",
  });

  const client = new FikenClient(token);

  registerUserTools(server, client);
  registerCompanyTools(server, client);
  registerAccountTools(server, client);
  registerBankTools(server, client);
  registerContactTools(server, client);
  registerInvoiceTools(server, client);
  registerCreditNoteTools(server, client);
  registerOfferTools(server, client);
  registerOrderConfirmationTools(server, client);
  registerJournalEntryTools(server, client);
  registerTransactionTools(server, client);
  registerSaleTools(server, client);
  registerPurchaseTools(server, client);
  registerProductTools(server, client);
  registerProjectTools(server, client);
  registerTimeEntryTools(server, client);
  registerInboxTools(server, client);

  // Write tools (human-in-the-loop — always confirm before calling)
  registerWritePurchaseTools(server, client);
  registerWriteContactTools(server, client);
  registerWriteInvoiceTools(server, client);
  registerWriteSaleTools(server, client);
  registerWriteAttachmentTools(server, client);

  return server;
}
