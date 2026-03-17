# fiken-mcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the [Fiken](https://fiken.no) accounting API. Exposes Fiken's full read API as MCP tools, plus write tools for booking purchases, managing contacts, creating invoice drafts, attaching receipts, and uploading to the inbox — all with human-in-the-loop confirmation built in.

> **Human-in-the-loop:** All write tools are clearly marked with ⚠️ and require explicit user confirmation before execution. No data is modified without your approval.

## Features

- 67 tools covering the full Fiken v2 API (read + write)
- Multi-company support — `companySlug` is a parameter on every tool
- Paginated list endpoints with metadata
- Serial request queue (respects Fiken's 1 concurrent request per user rule)
- Structured error responses — API errors are returned as tool results rather than crashing the session
- Foreign currency support — book purchases in USD, EUR, etc. with exact NOK payment amounts
- File uploads — attach receipts (PDF, PNG, JPG, GIF) to purchases or upload directly to the Fiken inbox

## Requirements

- Node.js 18+
- A [Fiken API token](https://fiken.no/api/v2/documentation/#section/Authentication)

## Installation

```bash
git clone https://github.com/Casper0301/fiken-mcp
cd fiken-mcp
npm install
npm run build
```

## Usage

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fiken": {
      "command": "node",
      "args": ["/absolute/path/to/fiken-mcp/build/index.js"],
      "env": {
        "FIKEN_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

Config file locations:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Claude Code

Add the server to your Claude Code project with:

```bash
claude mcp add fiken -e FIKEN_API_TOKEN=your-token-here -- node /absolute/path/to/fiken-mcp/build/index.js
```

Or add it to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "fiken": {
      "command": "node",
      "args": ["/absolute/path/to/fiken-mcp/build/index.js"],
      "env": {
        "FIKEN_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

To verify the server is connected:

```bash
claude mcp list
```

### Other MCP clients

Run the server with the token in the environment:

```bash
FIKEN_API_TOKEN=your-token-here node build/index.js
```

### Development (no build step)

```bash
FIKEN_API_TOKEN=your-token-here npm run dev
```

### MCP Inspector

```bash
FIKEN_API_TOKEN=your-token-here npx @modelcontextprotocol/inspector node build/index.js
```

## Getting a Fiken API token

1. Log in to [fiken.no](https://fiken.no)
2. Go to **Settings → API** (or visit `https://fiken.no/api/v2/documentation`)
3. Generate a personal API token
4. Keep it secret — treat it like a password

## Available tools

Start with `fiken_list_companies` to get the `companySlug` values needed by all other tools.

### User

| Tool | Description |
|------|-------------|
| `fiken_get_user` | Get information about the currently authenticated Fiken user |

### Companies

| Tool | Description |
|------|-------------|
| `fiken_list_companies` | List all companies the authenticated user has access to |
| `fiken_get_company` | Get details for a specific company by slug |

### Accounts

| Tool | Description |
|------|-------------|
| `fiken_list_accounts` | List chart of accounts for a company |
| `fiken_get_account` | Get a specific account by account code |
| `fiken_list_account_balances` | List account balances for a company |
| `fiken_get_account_balance` | Get balance for a specific account |

### Bank

| Tool | Description |
|------|-------------|
| `fiken_list_bank_accounts` | List bank accounts for a company |
| `fiken_get_bank_account` | Get a specific bank account by ID |
| `fiken_list_bank_balances` | List bank balances for all bank accounts |

### Contacts

| Tool | Description |
|------|-------------|
| `fiken_list_contacts` | List contacts (customers and suppliers) |
| `fiken_get_contact` | Get a specific contact by ID |
| `fiken_list_contact_persons` | List contact persons for a contact |
| `fiken_get_contact_person` | Get a specific contact person |
| `fiken_list_contact_groups` | List contact groups |
| `fiken_create_contact` ⚠️ | Create a new customer or supplier contact |

### Invoices

| Tool | Description |
|------|-------------|
| `fiken_list_invoices` | List invoices |
| `fiken_get_invoice` | Get a specific invoice by ID |
| `fiken_list_invoice_attachments` | List attachments for an invoice |
| `fiken_get_invoice_counter` | Get the current invoice number counter |
| `fiken_list_invoice_drafts` | List invoice drafts |
| `fiken_get_invoice_draft` | Get a specific invoice draft |
| `fiken_list_invoice_draft_attachments` | List attachments for an invoice draft |
| `fiken_create_invoice_draft` ⚠️ | Create a new invoice draft for review before sending |

### Credit Notes

| Tool | Description |
|------|-------------|
| `fiken_list_credit_notes` | List credit notes |
| `fiken_get_credit_note` | Get a specific credit note |
| `fiken_get_credit_note_counter` | Get the current credit note number counter |
| `fiken_list_credit_note_drafts` | List credit note drafts |
| `fiken_get_credit_note_draft` | Get a specific credit note draft |

### Offers

| Tool | Description |
|------|-------------|
| `fiken_list_offers` | List offers/quotes |
| `fiken_get_offer` | Get a specific offer |
| `fiken_get_offer_counter` | Get the current offer number counter |
| `fiken_list_offer_drafts` | List offer drafts |
| `fiken_get_offer_draft` | Get a specific offer draft |

### Order Confirmations

| Tool | Description |
|------|-------------|
| `fiken_list_order_confirmations` | List order confirmations |
| `fiken_get_order_confirmation` | Get a specific order confirmation |
| `fiken_get_order_confirmation_counter` | Get the current order confirmation counter |

### Journal Entries

| Tool | Description |
|------|-------------|
| `fiken_list_journal_entries` | List journal entries |
| `fiken_get_journal_entry` | Get a specific journal entry |
| `fiken_list_journal_entry_attachments` | List attachments for a journal entry |

### Transactions

| Tool | Description |
|------|-------------|
| `fiken_list_transactions` | List transactions |
| `fiken_get_transaction` | Get a specific transaction |

### Sales

| Tool | Description |
|------|-------------|
| `fiken_list_sales` | List sales |
| `fiken_get_sale` | Get a specific sale |
| `fiken_list_sale_attachments` | List attachments for a sale |
| `fiken_list_sale_drafts` | List sale drafts |
| `fiken_get_sale_draft` | Get a specific sale draft |
| `fiken_list_sale_draft_attachments` | List attachments for a sale draft |

### Purchases

| Tool | Description |
|------|-------------|
| `fiken_list_purchases` | List purchases |
| `fiken_get_purchase` | Get a specific purchase |
| `fiken_list_purchase_attachments` | List attachments for a purchase |
| `fiken_list_purchase_drafts` | List purchase drafts |
| `fiken_get_purchase_draft` | Get a specific purchase draft |
| `fiken_create_purchase` ⚠️ | Book a purchase/expense. Supports NOK and foreign currencies. |
| `fiken_delete_purchase` ⚠️ | Soft-delete a purchase (creates a reverse transaction) |
| `fiken_attach_to_purchase` ⚠️ | Attach a receipt file (PDF, PNG, JPG, GIF) to a purchase |

### Products

| Tool | Description |
|------|-------------|
| `fiken_list_products` | List products |
| `fiken_get_product` | Get a specific product |

### Projects

| Tool | Description |
|------|-------------|
| `fiken_list_projects` | List projects |
| `fiken_get_project` | Get a specific project |

### Time Tracking

| Tool | Description |
|------|-------------|
| `fiken_list_time_entries` | List time entries |
| `fiken_get_time_entry` | Get a specific time entry |
| `fiken_list_activities` | List activities (used with time entries) |
| `fiken_list_time_users` | List users who can log time |

### Inbox

| Tool | Description |
|------|-------------|
| `fiken_list_inbox` | List inbox documents |
| `fiken_get_inbox_document` | Get a specific inbox document |
| `fiken_upload_to_inbox` ⚠️ | Upload a receipt or document to the Fiken inbox for auto-detection |

## Write tools & human-in-the-loop

Tools marked with ⚠️ write data to Fiken. They are designed to always show a full preview of what will be posted and require explicit user confirmation before executing.

### Booking a purchase

```
You: Book this receipt [attaches PDF]
AI:  Here's what I'll post:
     - Supplier: Anthropic
     - Date: 2026-02-14
     - Amount: USD 25.00 (NOK 245.98)
     - Account: 6553 Programvare
     - Payment: Mastercard 7972
     Confirm?
You: Yes
AI:  ✓ Purchase created and receipt attached.
```

### Foreign currency purchases

For non-NOK purchases, provide the exact NOK amount that was charged to your card (from your bank statement or transaction export). This allows Fiken to match the posting to the correct bank transaction automatically.

```json
{
  "currency": "USD",
  "lines": [{ "netPriceInCurrency": 2500, "vatInCurrency": 0, ... }],
  "paymentAmountInNok": 24598
}
```

### Uploading to inbox

Use `fiken_upload_to_inbox` to drop a receipt into the Fiken inbox and let Fiken's OCR suggest the booking — useful when you want Fiken to handle the recognition automatically.

## Notes

- **Amounts** are in **øre (cents)** as integers — e.g. `100000` = 1000.00 NOK. For foreign currency line items, use `netPriceInCurrency`/`vatInCurrency` instead of `netPrice`/`vat`.
- **Account codes** are strings — e.g. `"1920"` or `"1500:10001"`
- **Pagination** defaults to page 0, 25 results per page (max 100)
- **Date filters** use `YYYY-MM-DD` format

## Development

```bash
npm run build     # compile TypeScript
npm run dev       # run without building (uses tsx)
```

## License

MIT
