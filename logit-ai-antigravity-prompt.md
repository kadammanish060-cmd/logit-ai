# MISSION BRIEF: Logit AI

You are building **Logit AI** — a voice-first bookkeeping and delivery-logging mobile app for a small family-run vegetable supply business. This will be used daily by non-technical, first-time smartphone users. Before writing any code, produce a full implementation plan (data layer → core logic → UI) and confirm it with me before executing. Work in phases, verify each phase actually runs before moving to the next, and use your browser/emulator verification to confirm UI flows work rather than assuming.

---

## Tech Stack (explicit — do not substitute)

- **Frontend:** React Native (cross-platform mobile), targeting Android first
- **Backend/Database:** Firebase Firestore + Firebase offline persistence
- **AI reasoning layer:** Google Gemini API with function calling
- **Voice layer:** Sarvam AI Samvaad (speech-to-text + text-to-speech) — **you likely don't have live knowledge of this API's exact request/response format.** Build this as a clearly isolated `voiceProvider` module with stub functions (`transcribeAudio()`, `synthesizeSpeech()`) that return mock data, so the rest of the app is fully functional and testable. I will wire in the real Sarvam API afterward.
- **No login/auth system** — device-based role assignment only (set once during setup)

---

## Core Design Principle (critical — read before building any UI or conversation logic)

This app is for **non-technical, first-time users** (the founder's parents). Every decision must respect this:
- Gemini's responses must sound like a helpful person taking notes — never robotic ("Request processed," "Data saved successfully"). Natural, warm, conversational phrasing only.
- No logins, minimal reading, voice-first everywhere.
- If speech is unclear, Gemini must ask a clarifying question rather than guess.
- Full bilingual support: **Marathi and English**, switchable per-device in Settings — this controls all UI text AND the language Gemini/voice layer communicate in.

---

## User Roles (no login — set once per device at setup)

- **Admin** (2 devices: Mother + Founder): full access, approves/rejects entries from Normal users.
- **Normal** (1 device: Father): full access to all input methods, but every submission enters as `pending_approval` until an Admin approves it.

---

## Interaction Modes (both always accessible)

1. **Call Mode** — full-screen UI styled like a live phone call (ringing animation, Accept/Reject, live timer, end-call). Used for:
   - Scheduled morning purchase call (~10:00 AM) — retry logic: Rejected → retry in 30 min; No answer → retry in 15 min; repeats until answered.
   - Scheduled night pricing call — same retry logic.
   - On-demand, user-initiated calls anytime.
   - Continuous multi-item conversation until user says "done" or ends the call.
2. **Quick Voice Note** — simple mic-button, single tap, for logging one thing quickly without a full call session (e.g., a mid-day delivery).

---

## Full Workflow

**Phase 1 — Morning Purchase Call (~10 AM):** Logs what was bought (item, qty, price paid) as a write-only record. Not used in calculations yet — reserved for future cost analysis after 3–6 months of data. Assistant reads back the full list for confirmation before saving.

**Phase 2 — Daytime Delivery Logging:** Item, quantity, shop — can span multiple shops in one session. No price captured. Assistant confirms the full summary at the end of the session (not after every item) before saving. Normal-role submissions go to `pending_approval`.

**Phase 3 — Night Pricing Call:** Admin manually states negotiated price per item per shop (fully manual, varies shop-to-shop, no fixed rule). As each shop's items are fully priced, that shop's bill **auto-locks** and totals calculate. If any item is unpriced, the bill cannot be generated — assistant clearly flags this. Once locked, assistant asks in the same call: "Should I prepare the bill to send?"

**Phase 4 — Invoice Generation:** Renders a **shareable PNG image** (not PDF) — itemized breakdown (item, qty, unit price, line total) AND a grand total + payment status summary. Uses the native OS share sheet so it goes straight to WhatsApp in one tap. Image is **not stored** — regenerated on demand from Firestore each time.

**Phase 5 — Payments:** Partial, irregular payments — no fixed schedule or pattern. Track a **running total balance per shop** (not per-day flags). Logging a payment reduces that shop's `outstandingBalance`. Historical day-level queries (deliveries, quantities) must still work independent of payment tracking.

---

## Firestore Schema

```
shops/{shopId}
  - name: string
  - active: boolean
  - outstandingBalance: number

  shops/{shopId}/ledgers/{date}         // YYYY-MM-DD
    - status: "open" | "priced" | "locked"
    - totalBill: number | null
    - invoiceGeneratedAt: timestamp | null
    - createdBy: "admin" | "normal_pending_approval"

    shops/{shopId}/ledgers/{date}/items/{itemId}
      - itemName: string                 // normalized to canonical list
      - quantity: number
      - unitPrice: number | null
      - lineTotal: number | null
      - deliveredAt: timestamp
      - status: "confirmed" | "pending_approval"

shops/{shopId}/payments/{paymentId}
  - amount: number
  - paidAt: timestamp
  - loggedBy: "admin" | "normal_pending_approval"

purchases/{date}
  purchases/{date}/items/{itemId}
    - itemName: string
    - quantity: number
    - pricePaid: number
    - loggedAt: timestamp

items/{itemId}                          // canonical item list
  - name: string
  - aliases: array<string>

pendingApprovals/{approvalId}
  - type: "delivery" | "payment" | "purchase"
  - refPath: string
  - submittedBy: "normal"
  - submittedAt: timestamp
  - status: "pending" | "approved" | "rejected"
```

---

## Gemini Function-Calling Tools

**Write:** `logPurchase(date, itemName, quantity, pricePaid)` · `logDelivery(shopName, itemName, quantity, date?, role)` · `setPrice(shopName, date, itemName, unitPrice)` · `lockLedger(shopName, date)` · `generateInvoice(shopName, date)` · `logPayment(shopName, amount, role)` · `approveEntry(approvalId)` · `rejectEntry(approvalId)`

**Read:** `getLedger(shopName, date)` · `getDeliveries(shopName, startDate, endDate, itemName?)` · `getOutstandingBalance(shopName?)` · `getUnpricedItems(date)` · `getPurchaseHistory(startDate, endDate, itemName?)` · `getPendingApprovals()`

Gemini must always normalize spoken item names against the canonical `items` list before writing.

---

## UI Requirements

- Two always-visible primary actions: **Call** button, **Voice Note (mic)** button.
- Simple text is fine (names, numbers) — the goal is simplicity, not zero text.
- Manual edit screen: plain readable table (date, shop, item, quantity, price), tap to correct directly — in addition to correcting via spoken conversation.
- Settings: Language toggle (Marathi/English), role indicator, shop list, item list.
- Offline behavior: if network is weak, show "Saved — will sync when online," never a silent failure or hang.

---

## Explicit Non-Goals — do NOT build these

- No login/auth of any kind
- No demand/availability matching automation between shop requests and stock
- No Kanban board, no graph/network view
- No PDF invoices — image only
- No per-day payment flags — running balance only
- No use of purchase data in calculations yet (future phase)

---

## Execution Instructions

1. Propose your implementation plan first (data layer → Gemini tools → core logging flow → Call Mode UI → night pricing → invoice generation → bilingual settings). Wait for my confirmation before executing each major phase.
2. Build and verify the Firestore schema and Gemini function-calling tools first — this is the foundation everything else depends on.
3. Use stub functions for Sarvam voice I/O so the app is fully testable without the real API.
4. After each phase, use your browser/emulator verification to confirm the flow actually works, and report back with a screenshot or walkthrough before moving on.
5. Ask clarifying questions if anything in this brief is ambiguous — do not guess on business logic.
