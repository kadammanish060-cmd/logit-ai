// Database service for Logit AI (Offline-first / local storage persistence)

export interface Shop {
  id: string;
  name: string;
  active: boolean;
  outstandingBalance: number;
}

export interface LedgerItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  deliveredAt: string; // ISO string
  status: "confirmed" | "pending_approval";
  source?: "voice" | "manual" | "ocr";
  transcript?: string;
  notes?: string;
  receiptUrl?: string;
}

export interface Ledger {
  date: string; // YYYY-MM-DD
  status: "open" | "priced" | "locked";
  totalBill: number | null;
  invoiceGeneratedAt: string | null; // ISO string or null
  createdBy: "admin" | "normal_pending_approval";
  items: { [itemId: string]: LedgerItem };
}

export interface Payment {
  id: string;
  amount: number;
  paidAt: string; // ISO string
  loggedBy: "admin" | "normal_pending_approval";
  status: "confirmed" | "pending_approval";
  source?: "voice" | "manual" | "ocr";
  notes?: string;
  receiptUrl?: string;
}

export interface PurchaseItem {
  id: string;
  itemName: string;
  quantity: number;
  pricePaid: number;
  loggedAt: string;
}

export interface CanonicalItem {
  id: string;
  name: string;
  aliases: string[];
}

export interface PendingApproval {
  id: string;
  type: "delivery" | "payment" | "purchase";
  refPath: string; // e.g. "shops/shop_1/ledgers/2026-07-10/items/item_1" or "shops/shop_1/payments/pay_1" or "purchases/2026-07-10/items/item_1"
  data: any; // Stored payload to apply upon approval
  submittedBy: "normal";
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
}

// Memory cache of DB state
let dbState: {
  shops: { [shopId: string]: Shop };
  ledgers: { [shopId: string]: { [date: string]: Ledger } };
  payments: { [shopId: string]: { [paymentId: string]: Payment } };
  purchases: { [date: string]: { [itemId: string]: PurchaseItem } };
  items: { [itemId: string]: CanonicalItem };
  pendingApprovals: { [approvalId: string]: PendingApproval };
} = {
  shops: {},
  ledgers: {},
  payments: {},
  purchases: {},
  items: {},
  pendingApprovals: {},
};

// Initial Seed Data
const DEFAULT_SHOPS: Shop[] = [
  { id: "shop_1", name: "Sudamache", active: true, outstandingBalance: 0 },
  { id: "shop_2", name: "Joshi wadewale", active: true, outstandingBalance: 0 },
  { id: "shop_3", name: "Rahatani Sudamache", active: true, outstandingBalance: 0 },
];

const DEFAULT_ITEMS: CanonicalItem[] = [
  { id: "onion", name: "onion", aliases: ["onion", "onions", "कांदा", "कांदे", "kanda"] },
  { id: "potato", name: "potato", aliases: ["potato", "potatoes", "बटाटा", "बटाटे", "batata"] },
  { id: "chilli", name: "chilli", aliases: ["chilli", "chili", "chillies", "मिरची", "मिरच्या", "mirchi"] },
  { id: "lemon", name: "lemon", aliases: ["lemon", "lemons", "लिंबू", "लिंबु", "limbu", "lemon"] },
  { id: "ginger", name: "ginger", aliases: ["ginger", "आलं", "अद्रक", "ale", "adrak"] },
  { id: "garlic", name: "garlic", aliases: ["garlic", "लसूण", "लसून", "lasun"] },
  { id: "mint", name: "mint", aliases: ["mint", "पुदिना", "फुदिना", "pudina"] },
  { id: "coriander", name: "coriander", aliases: ["coriander", "कोथिंबीर", "कोथंबीर", "kothimbir", "dhaniya"] },
  { id: "tomato", name: "tomato", aliases: ["tomato", "tomatoes", "टोमॅटो", "टोमॅटोझ", "tamatar"] },
  { id: "cucumber", name: "cucumber", aliases: ["cucumber", "काकडी", "काकड्या", "kakdi"] },
];

// Helper to load from localStorage
export function loadDatabase() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem("logit_ai_db");
      if (saved) {
        dbState = JSON.parse(saved);
        return;
      }
    }
  } catch (e) {
    console.error("Failed to load db", e);
  }

  // Fallback to default seeding
  dbState.shops = {};
  DEFAULT_SHOPS.forEach((s) => (dbState.shops[s.id] = { ...s }));

  dbState.items = {};
  DEFAULT_ITEMS.forEach((i) => (dbState.items[i.id] = { ...i }));

  dbState.ledgers = {};
  dbState.payments = {};
  dbState.purchases = {};
  dbState.pendingApprovals = {};

  saveDatabase();
}

// Helper to save to localStorage
export function saveDatabase() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("logit_ai_db", JSON.stringify(dbState));
    }
  } catch (e) {
    console.error("Failed to save db", e);
  }
}

// Getters & Seed Accessors
export function getShops(): Shop[] {
  return Object.values(dbState.shops);
}

export function getItems(): CanonicalItem[] {
  return Object.values(dbState.items);
}

// Name matching / normalization helper
export function normalizeItemName(spokenName: string): string {
  const clean = spokenName.trim().toLowerCase();
  for (const item of Object.values(dbState.items)) {
    if (
      item.name.toLowerCase() === clean ||
      item.aliases.some((alias) => alias.toLowerCase() === clean)
    ) {
      return item.name;
    }
  }
  // If no match, try substring match
  for (const item of Object.values(dbState.items)) {
    if (
      item.name.toLowerCase().includes(clean) ||
      item.aliases.some((alias) => alias.toLowerCase().includes(clean))
    ) {
      return item.name;
    }
  }
  return spokenName; // fallback to original if not matched
}

export function findShopByName(name: string): Shop | undefined {
  const clean = name.trim().toLowerCase();
  return Object.values(dbState.shops).find(
    (s) => s.name.toLowerCase() === clean
  );
}

// DB Operations corresponding to Gemini function calls

// 1. logPurchase
export function logPurchase(date: string, itemName: string, quantity: number, pricePaid: number): string {
  const normName = normalizeItemName(itemName);
  if (!dbState.purchases[date]) {
    dbState.purchases[date] = {};
  }
  const itemId = normName.replace(/\s+/g, "_").toLowerCase();
  dbState.purchases[date][itemId] = {
    id: itemId,
    itemName: normName,
    quantity,
    pricePaid,
    loggedAt: new Date().toISOString(),
  };
  saveDatabase();
  return `Logged purchase of ${quantity} units of ${normName} for ₹${pricePaid} on ${date}.`;
}

// 2. logDelivery
export function logDelivery(
  shopName: string,
  itemName: string,
  quantity: number,
  date?: string,
  role: "admin" | "normal" = "admin",
  source?: "voice" | "manual" | "ocr",
  transcript?: string,
  notes?: string,
  receiptUrl?: string
): string {
  const targetDate = date || new Date().toISOString().split("T")[0];
  const normName = normalizeItemName(itemName);
  const shop = findShopByName(shopName);

  if (!shop) {
    return `Error: Shop "${shopName}" not found.`;
  }

  const itemId = normName.replace(/\s+/g, "_").toLowerCase();
  const deliveryData = {
    itemName: normName,
    quantity,
    unitPrice: null as number | null,
    lineTotal: null as number | null,
    deliveredAt: new Date().toISOString(),
    source: source || "voice",
    transcript,
    notes,
    receiptUrl,
  };

  if (role === "normal") {
    // Normal role submission -> pending approval
    const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const refPath = `shops/${shop.id}/ledgers/${targetDate}/items/${itemId}`;
    
    dbState.pendingApprovals[approvalId] = {
      id: approvalId,
      type: "delivery",
      refPath,
      data: { shopId: shop.id, date: targetDate, itemId, ...deliveryData },
      submittedBy: "normal",
      submittedAt: new Date().toISOString(),
      status: "pending",
    };
    saveDatabase();
    return `Logged delivery of ${quantity} units of ${normName} to ${shopName} on ${targetDate} (Pending Admin Approval).`;
  } else {
    // Admin role -> write directly
    if (!dbState.ledgers[shop.id]) {
      dbState.ledgers[shop.id] = {};
    }
    if (!dbState.ledgers[shop.id][targetDate]) {
      dbState.ledgers[shop.id][targetDate] = {
        date: targetDate,
        status: "open",
        totalBill: null,
        invoiceGeneratedAt: null,
        createdBy: "admin",
        items: {},
      };
    }

    const ledger = dbState.ledgers[shop.id][targetDate];
    if (ledger.status === "locked") {
      return `Error: Ledger for ${shopName} on ${targetDate} is locked. Cannot add delivery.`;
    }

    ledger.items[itemId] = {
      id: itemId,
      ...deliveryData,
      status: "confirmed",
    };
    saveDatabase();
    return `Logged delivery of ${quantity} units of ${normName} to ${shopName} on ${targetDate}.`;
  }
}

// 3. setPrice
export function setPrice(shopName: string, date: string, itemName: string, unitPrice: number): string {
  const normName = normalizeItemName(itemName);
  const shop = findShopByName(shopName);
  if (!shop) {
    return `Error: Shop "${shopName}" not found.`;
  }

  const ledgers = dbState.ledgers[shop.id];
  if (!ledgers || !ledgers[date]) {
    return `Error: No ledger found for ${shopName} on ${date}. Please log deliveries first.`;
  }

  const ledger = ledgers[date];
  if (ledger.status === "locked") {
    return `Error: Ledger for ${shopName} on ${date} is locked and cannot be updated.`;
  }

  const itemId = normName.replace(/\s+/g, "_").toLowerCase();
  const item = ledger.items[itemId];
  if (!item) {
    return `Error: Item "${normName}" was not delivered to ${shopName} on ${date}.`;
  }

  item.unitPrice = unitPrice;
  item.lineTotal = item.quantity * unitPrice;
  
  // Re-evaluate ledger status
  ledger.status = "priced";

  // Check if all items in the ledger are priced
  const allPriced = Object.values(ledger.items).every((i) => i.unitPrice !== null);
  if (allPriced) {
    // Auto-lock ledger and calculate total
    ledger.status = "locked";
    ledger.totalBill = Object.values(ledger.items).reduce((sum, i) => sum + (i.lineTotal || 0), 0);
    
    // Add total bill to shop's outstanding balance
    dbState.shops[shop.id].outstandingBalance += ledger.totalBill;
  }

  saveDatabase();

  let msg = `Set unit price for ${normName} at ${shopName} to ₹${unitPrice} (Total: ₹${item.lineTotal}).`;
  if (ledger.status === "locked") {
    msg += ` Ledger is now LOCKED. Total bill is ₹${ledger.totalBill}. Outstanding balance: ₹${dbState.shops[shop.id].outstandingBalance}.`;
  }
  return msg;
}

// 4. lockLedger
export function lockLedger(shopName: string, date: string): string {
  const shop = findShopByName(shopName);
  if (!shop) return `Error: Shop "${shopName}" not found.`;

  const ledgers = dbState.ledgers[shop.id];
  if (!ledgers || !ledgers[date]) {
    return `Error: No ledger found for ${shopName} on ${date}.`;
  }

  const ledger = ledgers[date];
  const unpriced = Object.values(ledger.items).filter((i) => i.unitPrice === null);
  if (unpriced.length > 0) {
    const list = unpriced.map((i) => i.itemName).join(", ");
    return `Error: Cannot lock ledger. Unpriced items: ${list}.`;
  }

  ledger.status = "locked";
  ledger.totalBill = Object.values(ledger.items).reduce((sum, i) => sum + (i.lineTotal || 0), 0);
  
  // Make sure to add to outstanding balance if not already added
  dbState.shops[shop.id].outstandingBalance += ledger.totalBill;
  
  saveDatabase();
  return `Ledger for ${shopName} on ${date} locked. Total Bill: ₹${ledger.totalBill}.`;
}

// 5. generateInvoice
export function generateInvoice(shopName: string, date: string): string {
  const shop = findShopByName(shopName);
  if (!shop) return `Error: Shop "${shopName}" not found.`;

  const ledgers = dbState.ledgers[shop.id];
  if (!ledgers || !ledgers[date]) return `Error: Ledger for ${shopName} on ${date} not found.`;

  const ledger = ledgers[date];
  if (ledger.status !== "locked") {
    return `Error: Cannot generate invoice. Ledger is not locked. Please set all prices first.`;
  }

  ledger.invoiceGeneratedAt = new Date().toISOString();
  saveDatabase();
  return `Generated invoice for ${shopName} on ${date}. Total: ₹${ledger.totalBill}. ready to share.`;
}

// 6. logPayment
export function logPayment(
  shopName: string,
  amount: number,
  role: "admin" | "normal" = "admin",
  source?: "voice" | "manual" | "ocr",
  notes?: string,
  receiptUrl?: string
): string {
  const shop = findShopByName(shopName);
  if (!shop) return `Error: Shop "${shopName}" not found.`;

  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const payment: Payment = {
    id: paymentId,
    amount,
    paidAt: new Date().toISOString(),
    loggedBy: role === "normal" ? "normal_pending_approval" : "admin",
    status: role === "normal" ? "pending_approval" : "confirmed",
    source: source || "voice",
    notes,
    receiptUrl,
  };

  if (role === "normal") {
    const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    dbState.pendingApprovals[approvalId] = {
      id: approvalId,
      type: "payment",
      refPath: `shops/${shop.id}/payments/${paymentId}`,
      data: { shopId: shop.id, payment },
      submittedBy: "normal",
      submittedAt: new Date().toISOString(),
      status: "pending",
    };
    saveDatabase();
    return `Logged payment of ₹${amount} from ${shopName} (Pending Admin Approval).`;
  } else {
    if (!dbState.payments[shop.id]) {
      dbState.payments[shop.id] = {};
    }
    dbState.payments[shop.id][paymentId] = payment;
    dbState.shops[shop.id].outstandingBalance -= amount;
    saveDatabase();
    return `Logged payment of ₹${amount} from ${shopName}. Remaining outstanding balance: ₹${dbState.shops[shop.id].outstandingBalance}.`;
  }
}

// 7. approveEntry
export function approveEntry(approvalId: string): string {
  const request = dbState.pendingApprovals[approvalId];
  if (!request) return `Error: Approval request "${approvalId}" not found.`;
  if (request.status !== "pending") return `Error: Request already ${request.status}.`;

  request.status = "approved";
  const { type, data } = request;

  if (type === "delivery") {
    const { shopId, date, itemId, itemName, quantity, unitPrice, lineTotal, deliveredAt } = data;
    if (!dbState.ledgers[shopId]) {
      dbState.ledgers[shopId] = {};
    }
    if (!dbState.ledgers[shopId][date]) {
      dbState.ledgers[shopId][date] = {
        date,
        status: "open",
        totalBill: null,
        invoiceGeneratedAt: null,
        createdBy: "normal_pending_approval",
        items: {},
      };
    }
    dbState.ledgers[shopId][date].items[itemId] = {
      id: itemId,
      itemName,
      quantity,
      unitPrice,
      lineTotal,
      deliveredAt,
      status: "confirmed",
    };
  } else if (type === "payment") {
    const { shopId, payment } = data;
    if (!dbState.payments[shopId]) {
      dbState.payments[shopId] = {};
    }
    payment.status = "confirmed";
    dbState.payments[shopId][payment.id] = payment;
    dbState.shops[shopId].outstandingBalance -= payment.amount;
  }

  saveDatabase();
  return `Approved ${type} request ${approvalId} successfully.`;
}

// 8. rejectEntry
export function rejectEntry(approvalId: string): string {
  const request = dbState.pendingApprovals[approvalId];
  if (!request) return `Error: Approval request "${approvalId}" not found.`;
  if (request.status !== "pending") return `Error: Request already ${request.status}.`;

  request.status = "rejected";
  saveDatabase();
  return `Rejected ${request.type} request ${approvalId} successfully.`;
}

// Read operations

export function getLedger(shopName: string, date: string): Ledger | null {
  const shop = findShopByName(shopName);
  if (!shop) return null;
  return dbState.ledgers[shop.id]?.[date] || null;
}

export function getDeliveries(shopName: string, startDate: string, endDate: string, itemName?: string): LedgerItem[] {
  const shop = findShopByName(shopName);
  if (!shop) return [];

  const results: LedgerItem[] = [];
  const ledgers = dbState.ledgers[shop.id] || {};
  
  for (const date of Object.keys(ledgers)) {
    if (date >= startDate && date <= endDate) {
      const ledger = ledgers[date];
      for (const item of Object.values(ledger.items)) {
        if (!itemName || item.itemName.toLowerCase() === itemName.toLowerCase()) {
          results.push(item);
        }
      }
    }
  }
  return results;
}

export function getOutstandingBalance(shopName?: string): { [shopName: string]: number } {
  if (shopName) {
    const shop = findShopByName(shopName);
    if (!shop) return {};
    return { [shop.name]: shop.outstandingBalance };
  }
  
  const balances: { [shopName: string]: number } = {};
  Object.values(dbState.shops).forEach((s) => {
    balances[s.name] = s.outstandingBalance;
  });
  return balances;
}

export function getUnpricedItems(date: string): { [shopName: string]: string[] } {
  const unpriced: { [shopName: string]: string[] } = {};
  
  for (const shop of Object.values(dbState.shops)) {
    const ledger = dbState.ledgers[shop.id]?.[date];
    if (ledger) {
      const list = Object.values(ledger.items)
        .filter((i) => i.unitPrice === null)
        .map((i) => i.itemName);
      if (list.length > 0) {
        unpriced[shop.name] = list;
      }
    }
  }
  return unpriced;
}

export function getPurchaseHistory(startDate: string, endDate: string, itemName?: string): PurchaseItem[] {
  const results: PurchaseItem[] = [];
  for (const date of Object.keys(dbState.purchases)) {
    if (date >= startDate && date <= endDate) {
      for (const item of Object.values(dbState.purchases[date])) {
        if (!itemName || item.itemName.toLowerCase() === itemName.toLowerCase()) {
          results.push(item);
        }
      }
    }
  }
  return results;
}

export function getPendingApprovals(): PendingApproval[] {
  return Object.values(dbState.pendingApprovals).filter((p) => p.status === "pending");
}

export function getLedgersForShop(shopId: string): { [date: string]: Ledger } {
  return dbState.ledgers[shopId] || {};
}

export function getPaymentsForShop(shopId: string): { [paymentId: string]: Payment } {
  return dbState.payments[shopId] || {};
}

export function updateLedgerItem(
  shopId: string,
  date: string,
  itemId: string,
  updates: Partial<LedgerItem>
): boolean {
  if (!dbState.ledgers[shopId]) return false;
  const ledger = dbState.ledgers[shopId][date];
  if (!ledger) return false;
  const item = ledger.items[itemId];
  if (!item) return false;
  
  const oldLineTotal = item.lineTotal || 0;
  
  // Apply updates
  if (updates.itemName !== undefined) item.itemName = updates.itemName;
  if (updates.quantity !== undefined) item.quantity = updates.quantity;
  if (updates.unitPrice !== undefined) item.unitPrice = updates.unitPrice;
  if (updates.notes !== undefined) item.notes = updates.notes;
  if (updates.source !== undefined) item.source = updates.source;
  if (updates.receiptUrl !== undefined) item.receiptUrl = updates.receiptUrl;

  if (item.unitPrice !== null) {
    item.lineTotal = item.quantity * item.unitPrice;
  } else {
    item.lineTotal = null;
  }
  
  // Re-calculate ledger total
  const hasUnpriced = Object.values(ledger.items).some((i) => i.unitPrice === null);
  if (!hasUnpriced) {
    const newTotalBill = Object.values(ledger.items).reduce((sum, i) => sum + (i.lineTotal || 0), 0);
    ledger.totalBill = newTotalBill;
    
    // Adjust outstanding balance
    dbState.shops[shopId].outstandingBalance = dbState.shops[shopId].outstandingBalance - oldLineTotal + (item.lineTotal || 0);
  }
  
  saveDatabase();
  return true;
}

export function updatePayment(
  shopId: string,
  paymentId: string,
  updates: Partial<Payment>
): boolean {
  if (!dbState.payments[shopId]) return false;
  const payment = dbState.payments[shopId][paymentId];
  if (!payment) return false;
  
  const oldAmount = payment.amount;
  if (updates.amount !== undefined) payment.amount = updates.amount;
  if (updates.notes !== undefined) payment.notes = updates.notes;
  if (updates.source !== undefined) payment.source = updates.source;
  if (updates.receiptUrl !== undefined) payment.receiptUrl = updates.receiptUrl;
  
  // Adjust outstanding balance
  if (updates.amount !== undefined) {
    dbState.shops[shopId].outstandingBalance = dbState.shops[shopId].outstandingBalance + oldAmount - updates.amount;
  }
  
  saveDatabase();
  return true;
}

// Initial DB load
loadDatabase();
