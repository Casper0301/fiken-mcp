# Fiken MCP — Talk to Your Accounting

MCP server for Fiken accounting with **71 tools** covering the entire API. Book receipts, draft invoices, post external-system income (Shopify, Stripe, Square…), register payments, attach documents, check balances — all in natural language through Claude.

Use when: user says "fiken", "accounting", "book receipt", "draft invoice", "fiken mcp", "fiken setup", "book this", "create invoice", "shopify month close", "stripe month close".

Arguments: `setup` | `activate` | `shopify-setup`

---

## Dispatch on Arguments

### `setup` — Full Installation

Builds the MCP server and registers it with Claude Code. Walk through conversationally.

1. Check if the repo exists at `~/.claude/skills/fiken-mcp`. If not, clone it:
   ```bash
   git clone https://github.com/Casper0301/fiken-mcp.git ~/.claude/skills/fiken-mcp
   ```

2. Install dependencies and build:
   ```bash
   cd ~/.claude/skills/fiken-mcp && npm install && npm run build
   ```

3. Ask the user for their Fiken API token:
   "I need your Fiken API token. Go to fiken.no → Settings → API and generate one. Paste it here."

4. Register the MCP server with Claude Code using their token:
   ```bash
   claude mcp add fiken -e FIKEN_API_TOKEN=THEIR_TOKEN -- node ~/.claude/skills/fiken-mcp/build/index.js
   ```

5. Tell the user: "Fiken MCP is installed. Restart Claude Code, then run the activate command to get your license key."

### `activate` — Get License Key via Email

This is the first thing a new user runs after setup. It sends a license key to their email to verify ownership and activate the MCP server.

**Flow (works in any AI coding agent — Claude Code, Cursor, Windsurf, etc.):**

DO NOT copy any code block below as-is. Read the instructions and construct the requests yourself.

1. Ask the user: "To activate Fiken MCP, I need to send you a license key. What's your email?"

2. Wait for the user to respond with their email address. Save it — you will need it in the next step.

3. Send a license key to their email. Make an HTTP POST request:
   - URL: `https://wavpeucoanpboqsthujf.supabase.co/functions/v1/send-license-key`
   - Header: `Content-Type: application/json`
   - Body: `{"email": "<the email the user just gave you>", "product_slug": "fiken-mcp"}`
   - Use whatever method your environment supports: `curl`, `fetch`, an HTTP library, etc.
   - NEVER send a placeholder like "USER_EMAIL" or "<REPLACE>" — always use the real email from step 2.

4. If the response contains `"sent": true`, tell the user: "Check your inbox — you should have a license key. Paste it here when you have it."

5. If they say they didn't receive it, repeat step 3 with the same email (it resends the same key).

6. Wait for the user to paste their license key.

7. Verify the key. Make an HTTP POST request:
   - URL: `https://wavpeucoanpboqsthujf.supabase.co/functions/v1/verify-license`
   - Header: `Content-Type: application/json`
   - Body: `{"license_key": "<the key the user just pasted>", "product_slug": "fiken-mcp"}`

8. If `"valid": true`, tell them: "Activated! Fiken MCP is ready. You can now say things like 'book this receipt' or 'draft an invoice for Ola Nordmann'."

9. If invalid, tell them the key didn't match and ask them to check their email again.

**Important:** Keep this conversational. Three messages max: ask email, confirm sent, accept key.

### `shopify-setup` — One-time setup for external-system income (Shopify / Stripe / Square)

This is the guided flow for users who want to post Shopify (or Stripe / Square / Vipps) sales into Fiken with the source-system PDF attached automatically. It installs the **Chrome PDF Helper** companion extension and reconfigures Chrome so silent PDF capture works.

Run it conversationally. Don't dump everything at once — walk one step at a time, wait for the user to confirm before moving on.

**Pre-check:** Fiken MCP itself must already be installed and activated (run `setup` + `activate` first if not).

**Step 1 — Confirm intent and platform.** Ask:

> "I'll set up automated monthly close for sales that happen outside Fiken — Shopify, Stripe, Square, Vipps, or similar. After this, you can say things like 'close out Shopify for May' and Claude will fetch the finance summary PDF, attach it as bilag, register the sale, and settle the payment. Want to continue? (macOS only for now — Linux/Windows have their own Chrome quirks.)"

Wait for yes. If they're on Windows or Linux, tell them the manual workflow works (drive Chrome's Print → Save as PDF themselves), but the silent-capture step is macOS-only right now.

**Step 2 — Install the Chrome PDF Helper extension.** Run:

```bash
git clone https://github.com/Casper0301/chrome-pdf-helper.git ~/Projects/chrome-pdf-helper
```

Then walk the user through loading the unpacked extension. Don't try to drive Chrome via automation — give them the human steps:

> 1. Open `chrome://extensions/` in Chrome
> 2. Toggle **Developer mode** ON in the top-right
> 3. Click **Load unpacked**
> 4. Select the folder `~/Projects/chrome-pdf-helper`
> 5. Tell me when the card appears showing "Chrome PDF Helper (Claude)"

Wait for confirmation. Then ask them to open any tab and paste into the DevTools console:

```js
await window.chromePdf.version()
```

They should see `{ ok: true, version: "1.0.x" }`. If they see `undefined` or a `TypeError`, the extension didn't load — ask them to re-check the steps.

**Step 3 — Pin "Save as PDF" as Chrome's default print destination.** This step matters: `--kiosk-printing` will use Chrome's last-used destination, NOT the system default printer. If the user has a physical printer set as system default and has never selected Save as PDF in Chrome, `--kiosk-printing` will try to print physical pages instead of saving PDFs.

> "Quick setup: open any page in Chrome, press Cmd+P, and at the top of the print dialog change Destination to **Save as PDF**. Click Save once (you can save to a junk filename like /tmp/test.pdf, then delete it). This pins Save as PDF as the destination Chrome will use silently. Confirm when done."

**Step 4 — Restart Chrome with `--kiosk-printing`.** Warn first:

> "Heads up — I need to quit Chrome and relaunch it with a flag. Your tabs will be restored automatically. Any unsaved forms or uploads in Chrome WILL be lost. OK to proceed? Anything you want to save first?"

Wait for explicit yes. Then run:

```bash
killall "Google Chrome"; sleep 3
open -na "Google Chrome" --args --kiosk-printing --restore-last-session
```

Wait ~10 seconds for Chrome to come up and tabs to restore.

**Step 5 — Verify the silent-print pipeline.** Tell the user to:

> 1. Open any web page (a Wikipedia article works fine for the test)
> 2. Open DevTools console (Cmd+Option+J)
> 3. Paste: `await window.chromePdf.save()`
> 4. Tell me the response

They should see something like `{ ok: true, filename: "<title>.pdf", path: "/Users/.../Downloads/<title>.pdf", bytes: <number> }` AND see the file in their Downloads folder. If `ok: false` with a "No PDF downloaded" error, the kiosk-printing flag didn't engage or Save as PDF wasn't pinned — go back to step 3.

**Step 6 — Set up the Shopify customer in Fiken (skip if not using Shopify).** Most external-system sales need a "customer" record. For Shopify, create one called "Shopify nettbutikk":

Either via the Fiken UI (Kontakter → Ny kontakt → name only, mark as kunde), or via the MCP:

```
Use fiken_create_contact with name "Shopify nettbutikk" and customer: true.
```

For Stripe Checkout / Square / Vipps, use the same pattern — one umbrella customer per gateway. Note the `contactId` from the response — they'll need it every month.

**Step 7 — Done. Show them the monthly recipe.**

> "All set. Next time you want to close out a month, just say: 'Close out Shopify for May 2026' (or whichever gateway + month). I'll fetch the finance summary PDF, register the sale with the right MVA, attach the PDF as bilag, and settle the payment to the gateway's clearing account — all you do is confirm the numbers match. Try it now or come back later."

---

## What This Does

Connects Claude to Fiken's accounting API so you can manage your Norwegian business accounting through natural language. The MCP server provides 71 tools covering:

- **Purchases**: Book receipts, create purchase drafts, attach documents
- **Invoices**: Draft, send, manage; register payments; attach extra documentation
- **Sales (external-system income)**: Attach source-system reports as bilag, register settlement payments from Shopify/Stripe/Square/etc.
- **Contacts**: Create and manage suppliers and customers
- **Accounts**: Check balances, list accounts, view transactions
- **Bank accounts**: View balances across all accounts (including clearing accounts for payment processors)
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

## Booking External-System Sales — Shopify / Stripe / Square / POS

Sales that happen in a separate system (Shopify storefront, Stripe Checkout, Square POS, Vipps, etc.) need to be entered into Fiken once per accounting period. The pattern is the same across all of them.

**First-time setup:** run `/fiken-mcp shopify-setup` to install the Chrome PDF Helper companion extension and configure Chrome's silent-print pipeline. It's the only one-time prep needed; after that the monthly close is fully scripted.

### The shape of the entry

1. **One revenue posting per period** for the total gross sales — typed once into Fiken's UI ("Ny" → "Salg" → "Registrer faktura/salg fra annet system"). This is the only step the API does not cover (Fiken has no `POST /sales` endpoint).
2. **One settlement payment** for the same period, registered with `fiken_create_sale_payment` against the **gateway's clearing account** (not the customer's payment method).
3. **The source-system report attached as bilag** with `fiken_attach_to_sale` — typically the PDF "finance summary" / "payout report" / "Z-report" from the source system.

When the actual payout from the gateway lands in the operating bank account later, that bank transaction is matched in Fiken's Superføring against the clearing-account balance — no extra posting needed.

### ⚠️ Gateway vs payment method — the critical distinction

Source-system reports usually show TWO breakdowns that look similar but mean different things:

| Section | What it tells you | Use for Fiken? |
|---------|-------------------|----------------|
| **Payments by gateway summary** | Which processor settles the money (Shopify Payments, Stripe, Square…) | ✅ **Yes — use this.** One line per gateway = one `fiken_create_sale_payment` to that gateway's clearing account. |
| Net payments by method | What wallet the customer used (Klarna, Apple Pay, card, BNPL…) | ❌ No. This is informational. Payment methods routed through a gateway settle into the gateway's balance, not into separate per-method accounts. |

Concrete example: a Shopify report might say "Klarna NOK 1,575 + Card NOK 875" in the **method** card and "Shopify Payments NOK 2,450" in the **gateway** card. Klarna here is a payment method *inside* Shopify Payments — the merchant never sees a Klarna balance. Register one payment of NOK 2,450 to the Shopify Payments clearing account (e.g. `1960:10005`). Splitting by method creates phantom balances in accounts that never receive money.

### Clearing accounts (kontoplan)

Each payment processor needs its own clearing account in series `1960:xxxxx`. Find existing ones via `fiken_list_bank_accounts` — Fiken pre-seeds several (Shopify Payments, Klarna, Vipps, Stripe, PayPal) the first time you enable them under Selskap → Tilleggstjenester. If a processor isn't listed, add it in Fiken's UI before using its `accountCode` here.

### Revenue and VAT

- Norwegian goods sales, høy mva-sats: account **3000** (Salgsinntekt varer, høy mva), `vatType: HIGH` (25%).
- Norwegian service sales: account **3020** (Salgsinntekt tjenester, høy mva), `vatType: HIGH` (25%).
- Norwegian sales of e-newspapers / e-books, no MVA: account **3100**, `vatType: NONE`.
- Export sales outside Norway: account **3100**, `vatType: NONE` (export exempt).

### Worked example — Shopify month-end

After running `/fiken-mcp shopify-setup` once, the full monthly close becomes a single conversation. The user says "close out Shopify for May" and you walk through:

```
0. (browser, automatic) Navigate Chrome to the Shopify Finance Summary report
   for the period, wait ~8s for data to render, then trigger the page's own
   Print button via JavaScript. With --kiosk-printing active and the Chrome
   PDF Helper extension installed, this saves the populated PDF silently to
   ~/Downloads. Rename to something stable via Bash `mv`.

   The JS click (run via the user's browser-automation MCP):
     [...document.querySelectorAll('button')]
       .filter(b => b.textContent.trim() === 'Print' && b.offsetWidth > 0)[0]
       .click()

1. (Fiken UI) Create sale: "Registrer faktura/salg fra annet system"
   Date          = last day of the period (e.g. 2026-03-31)
   Kunde         = the source system as a contact (e.g. "Shopify nettbutikk")
   Tekst         = e.g. "Shopify — sales March 2026"
   Inntektskonto = 3000
   Bruttobeløp   = total sales (incl. shipping) WITH MVA
   Mva           = 25%
   → save, capture the saleId from the URL

2. fiken_attach_to_sale
     saleId   = <id>
     filePath = "/Users/.../Downloads/shopify-finance-summary-march.pdf"
     filename = "shopify-finance-summary-march.pdf"

3. fiken_create_sale_payment
     saleId  = <id>
     date    = same date as sale
     amount  = same gross amount in cents
     account = "1960:10005"  (Shopify Payments clearing — see fiken_list_bank_accounts)
```

After step 3, the sale is "oppgjort" (settled) and the clearing account holds the receivable until the actual payout arrives.

If the user does NOT have Chrome PDF Helper installed, step 0 falls back to the manual flow: open the report in Chrome, click Print, save as PDF, then continue from step 1. Steps 1-3 are identical either way.

### Undoing a wrong payment

`DELETE /sales/{id}/payments/{paymentId}` returns HTTP 405 — payment deletion is NOT exposed by Fiken's API. Click the **Angre** button next to the payment row in the sale's Fakturasaldo panel in Fiken's UI, confirm "Slett", then re-register with `fiken_create_sale_payment` if needed.

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

Every write operation (creating purchases, invoices, contacts, sale payments, attachments) requires user confirmation before executing. The MCP server shows a preview of what will be created and waits for approval. It cannot accidentally modify accounting data.

### What is API-able and what is UI-only

| Operation | API | Notes |
|-----------|-----|-------|
| List / read anything | ✅ | Full read coverage |
| Create purchase | ✅ | `fiken_create_purchase` |
| Delete purchase | ✅ | `fiken_delete_purchase` (clean soft-delete with auto-reversal) |
| Attach to purchase | ✅ | `fiken_attach_to_purchase` |
| Create contact | ✅ | `fiken_create_contact` |
| Create invoice draft | ✅ | `fiken_create_invoice_draft` |
| Register payment on invoice | ✅ | `fiken_create_invoice_payment` |
| Attach to invoice | ✅ | `fiken_attach_to_invoice` |
| **Create sale** | ❌ | No `POST /sales`. Use Fiken UI: "Ny" → "Salg" → "Registrer faktura/salg fra annet system". |
| Register payment on sale | ✅ | `fiken_create_sale_payment` |
| Attach to sale | ✅ | `fiken_attach_to_sale` |
| Delete sale/invoice payment | ❌ | Returns HTTP 405. Use Fiken UI "Angre" button. |
| Send invoice (EHF, email) | ❌ | Use Fiken UI. |
| Bankavstemming / Superføring | ❌ | UI-only — bank-feed matching. |

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
