// Mock Gemini reasoning layer with tool function-calling support
import * as db from "./db";

export interface AIResponse {
  responseText: string;
  toolExecuted: string | null;
  toolResult: any | null;
}

// Warm conversational phrasing generator
export function formatConversationReply(
  action: string,
  details: any,
  lang: "en" | "mr" = "en"
): string {
  if (lang === "mr") {
    switch (action) {
      case "logDelivery":
        return `हो, नक्कीच! मी ${details.shopName} मध्ये ${details.quantity} ${details.itemName} ची नोंद केली आहे. ${details.isPending ? "(प्रशासकीय मंजुरी प्रलंबित आहे)" : ""}`;
      case "logPurchase":
        return `ठीक आहे, मी ₹${details.pricePaid} मध्ये ${details.quantity} ${details.itemName} खरेदीची नोंद केली आहे.`;
      case "setPrice":
        return `हो, ${details.shopName} मध्ये ${details.itemName} चा दर ₹${details.unitPrice} सेट केला आहे. ${details.isLocked ? "या दुकानाचे बिल लॉक झाले आहे आणि एकूण रक्कम ₹" + details.totalBill + " आहे." : ""}`;
      case "logPayment":
        return `नोंद झाली! ${details.shopName} कडून ₹${details.amount} पेमेंट मिळाले आहे. आता त्यांचे बाकीचे बिल ₹${details.balance} आहे. ${details.isPending ? "(प्रशासकीय मंजुरी प्रलंबित आहे)" : ""}`;
      case "lockLedger":
        return `${details.shopName} चे लेजर लॉक झाले आहे. एकूण बिल ₹${details.totalBill} आहे.`;
      case "generateInvoice":
        return `${details.shopName} चे बिल तयार आहे! मी ते पाठवू का?`;
      case "approveEntry":
        return `नोंद ${details.approvalId} यशस्वीरित्या मंजूर करण्यात आली आहे.`;
      case "rejectEntry":
        return `नोंद ${details.approvalId} नाकारण्यात आली आहे.`;
      case "error":
        return `माफ करा, ${details.message}`;
      default:
        return "मला खात्री नाही, कृपया पुन्हा सांगा.";
    }
  } else {
    switch (action) {
      case "logDelivery":
        return `Got it! I have recorded a delivery of ${details.quantity} units of ${details.itemName} to ${details.shopName}. ${details.isPending ? "(Pending admin approval)" : ""}`;
      case "logPurchase":
        return `Okay, I've logged a purchase of ${details.quantity} units of ${details.itemName} for ₹${details.pricePaid}.`;
      case "setPrice":
        return `Sure, price for ${details.itemName} at ${details.shopName} is now set to ₹${details.unitPrice} per unit. ${details.isLocked ? "The ledger is locked, and the total bill is ₹" + details.totalBill + "." : ""}`;
      case "logPayment":
        return `Payment logged! Received ₹${details.amount} from ${details.shopName}. Outstanding balance is now ₹${details.balance}. ${details.isPending ? "(Pending admin approval)" : ""}`;
      case "lockLedger":
        return `Ledger for ${details.shopName} is now locked. Total amount is ₹${details.totalBill}.`;
      case "generateInvoice":
        return `Invoice for ${details.shopName} is ready! Should I prepare it to send?`;
      case "approveEntry":
        return `Successfully approved the pending entry (ID: ${details.approvalId}).`;
      case "rejectEntry":
        return `Rejected the pending entry (ID: ${details.approvalId}).`;
      case "error":
        return `Sorry, I ran into an issue: ${details.message}`;
      default:
        return "I'm not sure I understood that. Could you please repeat?";
    }
  }
}

function convertMarathiNumerals(str: string): string {
  const marathiDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return str.replace(/[०-९]/g, (w) => marathiDigits.indexOf(w).toString());
}

// Main AI Natural Language Query Parser
export async function processVoiceInput(
  text: string,
  role: "admin" | "normal" = "admin",
  lang: "en" | "mr" = "en"
): Promise<AIResponse> {
  const query = convertMarathiNumerals(text.toLowerCase().trim());

  // Helper to extract numbers
  const extractNumber = (str: string): number | null => {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  // Find shop names in text
  const shops = db.getShops();
  let matchedShop = shops.find((s) => query.includes(s.name.toLowerCase()));
  
  // Marathi specific shop matching (case support)
  if (!matchedShop && lang === "mr") {
    // Check if shop name is inflected, e.g. "सुदामाचे" for "Sudamache"
    if (query.includes("सुदामा") || query.includes("sudama")) {
      matchedShop = shops.find(s => s.id === "shop_1");
    } else if (query.includes("जोशी") || query.includes("joshi")) {
      matchedShop = shops.find(s => s.id === "shop_2");
    } else if (query.includes("राहाटणी") || query.includes("rahatani")) {
      matchedShop = shops.find(s => s.id === "shop_3");
    }
  }

  // Find canonical items in text
  const items = db.getItems();
  let matchedItem = items.find((i) => {
    return query.includes(i.name.toLowerCase()) || 
           i.aliases.some((alias) => query.includes(alias.toLowerCase()));
  });

  // Extract amount/quantity
  const numbers = query.match(/\d+/g)?.map(n => parseInt(n, 10)) || [];

  // 1. PAYMENT LOGGING
  // Keywords: payment, paid, pay, जमा, दिले, पेमेंट
  if (query.includes("payment") || query.includes("paid") || query.includes("pay") || 
      query.includes("जमा") || query.includes("दिले") || query.includes("पेमेंट")) {
    if (!matchedShop) {
      return {
        responseText: lang === "mr" ? "कृपया कोणत्या दुकानाचे पेमेंट आहे ते सांगा." : "Please specify the shop name for this payment.",
        toolExecuted: null,
        toolResult: null
      };
    }
    const amount = numbers[0];
    if (!amount) {
      return {
        responseText: lang === "mr" ? "कृपया पेमेंटची रक्कम सांगा." : "Please specify the payment amount.",
        toolExecuted: null,
        toolResult: null
      };
    }

    const res = db.logPayment(matchedShop.name, amount, role);
    if (res.startsWith("Error")) {
      return { responseText: formatConversationReply("error", { message: res }, lang), toolExecuted: "logPayment", toolResult: { error: res } };
    }

    const updatedShop = db.findShopByName(matchedShop.name);
    return {
      responseText: formatConversationReply("logPayment", {
        shopName: matchedShop.name,
        amount,
        balance: updatedShop?.outstandingBalance ?? 0,
        isPending: role === "normal"
      }, lang),
      toolExecuted: "logPayment",
      toolResult: { shopName: matchedShop.name, amount, role }
    };
  }

  // 2. SET PRICE
  // Keywords: price, set price, rate, दर, भाव, किंमत
  if (query.includes("price") || query.includes("rate") || query.includes("दर") || 
      query.includes("भाव") || query.includes("किंमत")) {
    if (!matchedShop) {
      return {
        responseText: lang === "mr" ? "कृपया कोणत्या दुकानाची किंमत सेट करायची आहे ते सांगा." : "Please specify the shop name.",
        toolExecuted: null,
        toolResult: null
      };
    }
    if (!matchedItem) {
      return {
        responseText: lang === "mr" ? "कृपया कोणत्या भाजीची किंमत सेट करायची आहे ते सांगा." : "Please specify the item name.",
        toolExecuted: null,
        toolResult: null
      };
    }
    const price = numbers[0];
    if (!price) {
      return {
        responseText: lang === "mr" ? "कृपया दर (रुपये) सांगा." : "Please specify the price amount.",
        toolExecuted: null,
        toolResult: null
      };
    }

    const targetDate = new Date().toISOString().split("T")[0];
    const res = db.setPrice(matchedShop.name, targetDate, matchedItem.name, price);
    if (res.startsWith("Error")) {
      return { responseText: formatConversationReply("error", { message: res }, lang), toolExecuted: "setPrice", toolResult: { error: res } };
    }

    const ledger = db.getLedger(matchedShop.name, targetDate);
    return {
      responseText: formatConversationReply("setPrice", {
        shopName: matchedShop.name,
        itemName: matchedItem.name,
        unitPrice: price,
        isLocked: ledger?.status === "locked",
        totalBill: ledger?.totalBill
      }, lang),
      toolExecuted: "setPrice",
      toolResult: { shopName: matchedShop.name, itemName: matchedItem.name, price, date: targetDate }
    };
  }

  // 3. LOCK LEDGER
  // Keywords: lock, close, बंद, लॉक
  if (query.includes("lock") || query.includes("close") || query.includes("लॉक") || query.includes("बंद")) {
    if (!matchedShop) {
      return {
        responseText: lang === "mr" ? "कृपया कोणत्या दुकानाचे लेजर लॉक करायचे आहे ते सांगा." : "Please specify which shop's ledger to lock.",
        toolExecuted: null,
        toolResult: null
      };
    }
    const targetDate = new Date().toISOString().split("T")[0];
    const res = db.lockLedger(matchedShop.name, targetDate);
    if (res.startsWith("Error")) {
      return { responseText: formatConversationReply("error", { message: res }, lang), toolExecuted: "lockLedger", toolResult: { error: res } };
    }
    const ledger = db.getLedger(matchedShop.name, targetDate);
    return {
      responseText: formatConversationReply("lockLedger", {
        shopName: matchedShop.name,
        totalBill: ledger?.totalBill ?? 0
      }, lang),
      toolExecuted: "lockLedger",
      toolResult: { shopName: matchedShop.name, date: targetDate }
    };
  }

  // 4. GENERATE INVOICE
  // Keywords: bill, invoice, बिल, इनव्हॉइस, पाठवा, शेअर
  if (query.includes("bill") || query.includes("invoice") || query.includes("बिल") || 
      query.includes("इनव्हॉइस") || query.includes("share") || query.includes("शेअर")) {
    if (!matchedShop) {
      return {
        responseText: lang === "mr" ? "कृपया कोणत्या दुकानाचे बिल हवे आहे ते सांगा." : "Please specify the shop name for the invoice.",
        toolExecuted: null,
        toolResult: null
      };
    }
    const targetDate = new Date().toISOString().split("T")[0];
    const res = db.generateInvoice(matchedShop.name, targetDate);
    if (res.startsWith("Error")) {
      return { responseText: formatConversationReply("error", { message: res }, lang), toolExecuted: "generateInvoice", toolResult: { error: res } };
    }
    return {
      responseText: formatConversationReply("generateInvoice", { shopName: matchedShop.name }, lang),
      toolExecuted: "generateInvoice",
      toolResult: { shopName: matchedShop.name, date: targetDate }
    };
  }

  // 5. PURCHASE LOGGING
  // Keywords: purchase, bought, खरेदी, विकत घेतले
  if (query.includes("purchase") || query.includes("bought") || query.includes("kharedi") || query.includes("खरेदी")) {
    if (!matchedItem) {
      return {
        responseText: lang === "mr" ? "कृपया कोणत्या भाजीची खरेदी नोंदवायची आहे ते सांगा." : "Please specify the item name.",
        toolExecuted: null,
        toolResult: null
      };
    }
    if (numbers.length < 2) {
      return {
        responseText: lang === "mr" ? "कृपया खरेदीचे प्रमाण आणि एकूण रक्कम दोन्ही सांगा." : "Please specify both quantity and total price paid.",
        toolExecuted: null,
        toolResult: null
      };
    }
    // Assume numbers[0] is quantity, numbers[1] is price (standard conversational flow)
    const qty = numbers[0];
    const pricePaid = numbers[1];
    const targetDate = new Date().toISOString().split("T")[0];

    const res = db.logPurchase(targetDate, matchedItem.name, qty, pricePaid);
    return {
      responseText: formatConversationReply("logPurchase", {
        itemName: matchedItem.name,
        quantity: qty,
        pricePaid
      }, lang),
      toolExecuted: "logPurchase",
      toolResult: { date: targetDate, itemName: matchedItem.name, quantity: qty, pricePaid }
    };
  }

  // 6. APPROVALS (ADMIN ONLY)
  // Keywords: approve, reject, मंजूर, नाकारा, अस्वीकार
  if ((query.includes("approve") || query.includes("मंजूर") || query.includes("मंजुर")) && role === "admin") {
    const approvalId = text.match(/approval_\w+/)?.[0];
    if (!approvalId) {
      return {
        responseText: lang === "mr" ? "मंजूर करण्यासाठी कृपया योग्य आयडी (ID) सांगा." : "Please provide a valid approval ID to approve.",
        toolExecuted: null,
        toolResult: null
      };
    }
    const res = db.approveEntry(approvalId);
    if (res.startsWith("Error")) {
      return { responseText: formatConversationReply("error", { message: res }, lang), toolExecuted: "approveEntry", toolResult: { error: res } };
    }
    return {
      responseText: formatConversationReply("approveEntry", { approvalId }, lang),
      toolExecuted: "approveEntry",
      toolResult: { approvalId }
    };
  }
  if ((query.includes("reject") || query.includes("नाकारा") || query.includes("अस्वीकार")) && role === "admin") {
    const approvalId = text.match(/approval_\w+/)?.[0];
    if (!approvalId) {
      return {
        responseText: lang === "mr" ? "नाकारण्यासाठी कृपया योग्य आयडी (ID) सांगा." : "Please provide a valid approval ID to reject.",
        toolExecuted: null,
        toolResult: null
      };
    }
    const res = db.rejectEntry(approvalId);
    if (res.startsWith("Error")) {
      return { responseText: formatConversationReply("error", { message: res }, lang), toolExecuted: "rejectEntry", toolResult: { error: res } };
    }
    return {
      responseText: formatConversationReply("rejectEntry", { approvalId }, lang),
      toolExecuted: "rejectEntry",
      toolResult: { approvalId }
    };
  }

  // 7. DELIVERY LOGGING (DEFAULT FALLBACK IF QTY, ITEM, SHOP DETECTED)
  if (matchedShop && matchedItem && numbers.length > 0) {
    const qty = numbers[0];
    const targetDate = new Date().toISOString().split("T")[0];
    const res = db.logDelivery(matchedShop.name, matchedItem.name, qty, targetDate, role);

    if (res.startsWith("Error")) {
      return { responseText: formatConversationReply("error", { message: res }, lang), toolExecuted: "logDelivery", toolResult: { error: res } };
    }

    return {
      responseText: formatConversationReply("logDelivery", {
        shopName: matchedShop.name,
        itemName: matchedItem.name,
        quantity: qty,
        isPending: role === "normal"
      }, lang),
      toolExecuted: "logDelivery",
      toolResult: { shopName: matchedShop.name, itemName: matchedItem.name, quantity: qty, date: targetDate, role }
    };
  }

  // Clarifying Prompt / Question
  if (lang === "mr") {
    return {
      responseText: "माफ करा, मला समजले नाही. तुम्ही कृपया माहिती (दुकान, भाजी, वजन किंवा दर) स्पष्टपणे सांगू शकाल का?",
      toolExecuted: null,
      toolResult: null
    };
  } else {
    return {
      responseText: "I didn't quite catch that. Could you please specify the shop, item, quantity, or price more clearly?",
      toolExecuted: null,
      toolResult: null
    };
  }
}
