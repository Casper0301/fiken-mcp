# Fiken MCP — Talk to Your Accounting

MCP server for Fiken accounting with 67 tools covering the entire API. Book receipts, draft invoices, check balances — all in natural language through Claude.

Use when: user says "fiken", "accounting", "book receipt", "draft invoice", "fiken mcp", "fiken setup", "book this", "create invoice".

Arguments: `activate`

---

## Dispatch on Arguments

### `activate` — Get License Key via Email

This is the first thing a new user runs. It sends a license key to their email to verify ownership and activate the MCP server.

**Flow (natural conversation, no forms or questionnaires):**

1. Ask the user: "To activate Fiken MCP, I need to send you a license key. What's your email?"

2. Wait for them to type their email in the chat.

3. Call the license key endpoint:
   ```bash
   curl -s -X POST "https://wavpeucoanpboqsthujf.supabase.co/functions/v1/send-license-key" \
     -H "Content-Type: application/json" \
     -d "{\"email\": \"USER_EMAIL\", \"product_slug\": \"fiken-mcp\"}"
   ```

4. If the response contains `"sent": true`, tell the user: "Done! Check your inbox at USER_EMAIL — you should have an email with your license key. Paste it here when you have it."

5. If they say they didn't receive it, call the endpoint again with the same email (it resends the same key).

6. Wait for them to paste the key in the chat.

7. Verify the key by calling:
   ```bash
   curl -s -X POST "https://wavpeucoanpboqsthujf.supabase.co/functions/v1/verify-license" \
     -H "Content-Type: application/json" \
     -d "{\"license_key\": \"USER_KEY\", \"product_slug\": \"fiken-mcp\"}"
   ```

8. If `"valid": true`, tell them: "Activated! Fiken MCP is ready. You can now say things like 'book this receipt' or 'draft an invoice for Ola Nordmann'."

9. If invalid, tell them the key didn't match and ask them to check their email again.

**Important:** Keep this conversational — no multi-step questionnaires. Three messages max: ask email, confirm sent, accept key.

---

## What This Does

Connects Claude to Fiken's accounting API so you can manage your Norwegian business accounting through natural language. The MCP server provides 67 tools covering:

- **Purchases**: Book receipts, create purchase drafts, attach documents
- **Invoices**: Draft, send, and manage invoices and credit notes
- **Contacts**: Create and manage suppliers and customers
- **Accounts**: Check balances, list accounts, view transactions
- **Bank accounts**: View balances across all accounts
- **Products**: Manage product catalog
- **Journal entries**: Create general journal entries (fri postering)
- **Inbox**: Upload receipts for auto-detection

## Booking Purchases — The Full Workflow

### Step 1: Get the transaction list
- User uploads transaction CSVs from their credit cards (monthly or every other month)
- CSV format: `Dato,Tekst,Beløp` (date DD.MM.YY, description, amount in NOK)
- The transaction list gives the exact NOK amount for foreign currency purchases

### Step 2: Match receipt to transaction
- Read the receipt (PDF/image) to get supplier, date, amount
- Search the transaction CSV for a matching entry by date + description keyword
- Extract the exact NOK amount from the CSV

### Step 3: Check for duplicates before posting
- Before creating any purchase, check if the identifier (invoice number) already exists in Fiken
- Use `fiken_list_purchases` to verify — do NOT post if already there

### Step 4: Book the purchase
- Use `fiken_create_purchase` with all details
- **Always use `kind: supplier`** for purchases with a known supplier and invoice number
  - `kind: cash_purchase` does NOT link the supplier in Fiken's UI — only use for truly anonymous purchases
- For foreign currency: use `netPriceInCurrency`/`vatInCurrency` in lines + `paymentAmountInNok` from the CSV
- Always mark as `paid: true` when the transaction CSV confirms the charge
- Always show a preview and get user confirmation before posting

### Step 5: Attach the receipt
- Use `fiken_attach_to_purchase` to attach the PDF/image to the purchase

### Alternative: Inbox upload
- Use `fiken_upload_to_inbox` to upload a receipt and let Fiken auto-detect and suggest the booking

## VAT Types for Purchases

| Scenario | VAT Type |
|----------|----------|
| Norwegian suppliers | `HIGH` (25%), `MEDIUM` (15%), `LOW` (12%), `NONE` |
| Foreign services (US SaaS: Claude, Attio, Lovable) | `HIGH_FOREIGN_SERVICE_DEDUCTIBLE` |
| Foreign companies charging Norwegian VAT (OpenAI VOEC, Hostinger) | `HIGH` but book in NOK |

**Important**: Do NOT use just `HIGH` or `NONE` for foreign service purchases. Use `HIGH_FOREIGN_SERVICE_DEDUCTIBLE` for omvendt avgiftsplikt.

**Foreign currency exception**: Fiken does NOT support `vatInCurrency` with `HIGH` vatType on foreign currency (e.g., OpenAI VOEC invoices). Book those in NOK instead using the CSV amount, split net/VAT from total.

## Common Account Codes

| Code | Purpose |
|------|---------|
| 6553 | IT software (Google, Claude, Attio, Lovable, OpenAI, Hostinger) |
| 6840 | Newspapers, magazines, books (0% VAT) |
| 7321 | Marketing (Facebook, Snapchat, Google Ads) |
| 6705 | Accounting fees |
| 4300 | Goods purchased |
| 6901 | Telephone/mobile |
| 7140 | Travel |

## API Reference

- **Base URL**: `https://api.fiken.no/api/v2`
- **Auth**: Bearer token (Personal API Token or OAuth 2.0)
- **Amounts**: Integer in cents (100000 = 1000.00 NOK)
- **Dates**: yyyy-MM-dd format
- **Rate Limit**: Max 4 requests/second, 1 concurrent request

## Human-in-the-Loop

Every write operation (creating purchases, invoices, contacts) requires user confirmation before executing. The MCP server shows a preview of what will be created and waits for approval. It cannot accidentally modify accounting data.

## Reading PDF Receipts

Use `pdftotext` to extract text from PDF receipts:
```bash
pdftotext "/path/to/receipt.pdf" -
```
This gives supplier name, invoice number, date, amount, currency — everything needed to match to the CSV and book.

## Technical Notes

- MCP SDK validates input schema before handler runs
- Use `z.any()` for non-string params (boolean, number, array) in tool input schemas
- Cast/parse manually inside the handler with `as Record<string, unknown>`
