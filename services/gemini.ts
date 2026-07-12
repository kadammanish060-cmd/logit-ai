// Real Gemini reasoning layer with tool function-calling support & mock fallback
import { GoogleGenAI, Type, Content } from '@google/genai';
import * as db from "./db";

const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const USE_REAL_GEMINI = true && apiKey !== "" && apiKey !== "YOUR_API_KEY";

const ai = USE_REAL_GEMINI ? new GoogleGenAI({ apiKey }) : null;

// Tool declarations
const LOG_DELIVERY_TOOL = {
  name: "logDelivery",
  description: "Log a delivery of goods/vegetables to a shop.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      shopName: { 
        type: Type.STRING, 
        description: "Name of the shop. Should be normalized to one of: 'Sudamache', 'Joshi wadewale', 'Rahatani Sudamache'." 
      },
      itemName: { 
        type: Type.STRING, 
        description: "Name of the vegetable/item. Should be normalized to one of: 'onion', 'potato', 'chilli', 'lemon', 'ginger', 'garlic', 'mint', 'coriander', 'tomato', 'cucumber'." 
      },
      quantity: { 
        type: Type.NUMBER, 
        description: "Quantity of the item delivered (positive number, e.g. 20)." 
      },
      date: { 
        type: Type.STRING, 
        description: "Date of delivery in YYYY-MM-DD format. Defaults to current date if not specified." 
      }
    },
    required: ["shopName", "itemName", "quantity"]
  }
};

const LOG_PURCHASE_TOOL = {
  name: "logPurchase",
  description: "Log a purchase of items/vegetables bought from the market (Mandai).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemName: { 
        type: Type.STRING, 
        description: "Name of the item/vegetable. Should be normalized to one of: 'onion', 'potato', 'chilli', 'lemon', 'ginger', 'garlic', 'mint', 'coriander', 'tomato', 'cucumber'." 
      },
      quantity: { 
        type: Type.NUMBER, 
        description: "Quantity purchased." 
      },
      pricePaid: { 
        type: Type.NUMBER, 
        description: "Total price paid in rupees (e.g. 200)." 
      },
      date: { 
        type: Type.STRING, 
        description: "Date of purchase in YYYY-MM-DD format. Defaults to current date if not specified." 
      }
    },
    required: ["itemName", "quantity", "pricePaid"]
  }
};

const SET_PRICE_TOOL = {
  name: "setPrice",
  description: "Set the unit price (rate) for a delivered item at a shop.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      shopName: { 
        type: Type.STRING, 
        description: "Name of the shop (e.g. 'Sudamache')." 
      },
      itemName: { 
        type: Type.STRING, 
        description: "Name of the item (e.g. 'onion')." 
      },
      unitPrice: { 
        type: Type.NUMBER, 
        description: "Price per unit/rate in rupees (e.g. 15)." 
      },
      date: { 
        type: Type.STRING, 
        description: "Date of the ledger (YYYY-MM-DD)." 
      }
    },
    required: ["shopName", "itemName", "unitPrice"]
  }
};

const LOG_PAYMENT_TOOL = {
  name: "logPayment",
  description: "Log a payment received from a shop.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      shopName: { 
        type: Type.STRING, 
        description: "Name of the shop." 
      },
      amount: { 
        type: Type.NUMBER, 
        description: "Payment amount received in rupees." 
      }
    },
    required: ["shopName", "amount"]
  }
};

const LOCK_LEDGER_TOOL = {
  name: "lockLedger",
  description: "Lock and finalize the ledger sheet for a shop on a specific date.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      shopName: { 
        type: Type.STRING, 
        description: "Name of the shop." 
      },
      date: { 
        type: Type.STRING, 
        description: "Date of the ledger (YYYY-MM-DD)." 
      }
    },
    required: ["shopName"]
  }
};

const GENERATE_INVOICE_TOOL = {
  name: "generateInvoice",
  description: "Generate and share the invoice/bill for a shop on a specific date.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      shopName: { 
        type: Type.STRING, 
        description: "Name of the shop." 
      },
      date: { 
        type: Type.STRING, 
        description: "Date of the ledger (YYYY-MM-DD)." 
      }
    },
    required: ["shopName"]
  }
};

const APPROVE_ENTRY_TOOL = {
  name: "approveEntry",
  description: "Approve a pending delivery or payment log by its request ID (Admin only).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      approvalId: { 
        type: Type.STRING, 
        description: "Approval request ID (e.g. 'approval_123')." 
      }
    },
    required: ["approvalId"]
  }
};

const REJECT_ENTRY_TOOL = {
  name: "rejectEntry",
  description: "Reject a pending delivery or payment log by its request ID (Admin only).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      approvalId: { 
        type: Type.STRING, 
        description: "Approval request ID (e.g. 'approval_123')." 
      }
    },
    required: ["approvalId"]
  }
};

const GET_LEDGER_TOOL = {
  name: "getLedger",
  description: "Retrieve the ledger details (status, total bill, list of items) for a shop on a specific date.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      shopName: { type: Type.STRING, description: "Name of the shop." },
      date: { type: Type.STRING, description: "Date of the ledger (YYYY-MM-DD)." }
    },
    required: ["shopName", "date"]
  }
};

const GET_DELIVERIES_TOOL = {
  name: "getDeliveries",
  description: "Retrieve a list of deliveries for a shop over a date range.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      shopName: { type: Type.STRING, description: "Name of the shop." },
      startDate: { type: Type.STRING, description: "Start date (YYYY-MM-DD)." },
      endDate: { type: Type.STRING, description: "End date (YYYY-MM-DD)." },
      itemName: { type: Type.STRING, description: "Optional name of the vegetable/item to filter by." }
    },
    required: ["shopName", "startDate", "endDate"]
  }
};

const GET_OUTSTANDING_BALANCE_TOOL = {
  name: "getOutstandingBalance",
  description: "Retrieve outstanding balance(s) for a specific shop, or all shops if shopName is not provided.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      shopName: { type: Type.STRING, description: "Optional name of the shop." }
    }
  }
};

const GET_UNPRICED_ITEMS_TOOL = {
  name: "getUnpricedItems",
  description: "Retrieve a list of shops and their unpriced delivery items for a specific date.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: "Date of interest (YYYY-MM-DD)." }
    },
    required: ["date"]
  }
};

const GET_PURCHASE_HISTORY_TOOL = {
  name: "getPurchaseHistory",
  description: "Retrieve purchase history over a date range.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      startDate: { type: Type.STRING, description: "Start date (YYYY-MM-DD)." },
      endDate: { type: Type.STRING, description: "End date (YYYY-MM-DD)." },
      itemName: { type: Type.STRING, description: "Optional name of the vegetable/item to filter by." }
    },
    required: ["startDate", "endDate"]
  }
};

const GET_PENDING_APPROVALS_TOOL = {
  name: "getPendingApprovals",
  description: "Retrieve all pending approval requests for review.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      LOG_DELIVERY_TOOL,
      LOG_PURCHASE_TOOL,
      SET_PRICE_TOOL,
      LOG_PAYMENT_TOOL,
      LOCK_LEDGER_TOOL,
      GENERATE_INVOICE_TOOL,
      APPROVE_ENTRY_TOOL,
      REJECT_ENTRY_TOOL,
      GET_LEDGER_TOOL,
      GET_DELIVERIES_TOOL,
      GET_OUTSTANDING_BALANCE_TOOL,
      GET_UNPRICED_ITEMS_TOOL,
      GET_PURCHASE_HISTORY_TOOL,
      GET_PENDING_APPROVALS_TOOL
    ]
  }
];

function getSystemPrompt(role: "admin" | "normal", lang: "en" | "mr", date: string): string {
  const shops = db.getShops();
  const items = db.getItems();

  const roleInstruction = role === "admin" 
    ? "You are logged in as an Admin. You have full write permissions to log deliveries, set prices, and approve/reject pending logs. When a payment or delivery is logged, it will be immediately confirmed." 
    : "You are logged in as a Normal user (Father/driver). Every delivery or payment you log will enter as 'pending_approval' until an Admin approves it. Always inform the user that their entry has been submitted for review.";

  const langInstruction = lang === "mr"
    ? "Always respond in warm, conversational Marathi (Devanagari script). Translating English words like item names to their Devanagari equivalents or using colloquial Devanagari is fine. For numbers, use standard English digits (e.g., 20, 300) in your response text to ensure clear readability."
    : "Always respond in warm, conversational English.";

  return `You are a helpful bilingual (English/Marathi) voice bookkeeping assistant for the Logit AI application.
Current Date: ${date}
${roleInstruction}
${langInstruction}

You must normalize shop names and item names exactly. Here is the canonical mapping database:

### Canonical Shops list:
${shops.map(s => `- ID: ${s.id}, Name: "${s.name}", commonly spoken as: ${s.name}, Sudama, Joshi, Rahatani`).join("\n")}

### Canonical Items list (with spoken aliases):
${items.map(i => `- Name: "${i.name}", aliases/spoken names: ${i.aliases.join(", ")}`).join("\n")}

Rules:
1. Parse the user's intent from their voice query (which may be in English, Marathi, or a mix of both).
2. If they are logging a delivery, a purchase, setting a price, logging a payment, locking a ledger, generating an invoice, or approving/rejecting a request, call the matching function tool with the normalized parameters.
3. Normalize shopName to one of the exact canonical shop names: "Sudamache", "Joshi wadewale", "Rahatani Sudamache".
4. Normalize itemName to one of the exact canonical item names: "onion", "potato", "chilli", "lemon", "ginger", "garlic", "mint", "coriander", "tomato", "cucumber".
5. If the user refers to an item by any of its spoken aliases or translation (e.g. 'Kanda', 'कांदा', 'कांदे', 'onion'), you MUST map it to the canonical name (e.g. "onion").
6. If the user refers to a shop by a shortened name or translation (e.g. 'Sudama', 'जोशी', 'सुदामा'), map it to the canonical name (e.g. "Sudamache", "Joshi wadewale").
7. If required parameters are missing (e.g., shop name, item, quantity, price), do not call any tool; instead, respond with a friendly message/question in the selected language asking the user for the missing details. You MUST NOT guess, assume, or invent quantity values (like assuming 1 or 10) when the user says something ambiguous like 'some' onions or does not mention a quantity.
8. Once a tool has been successfully executed, formulate a warm, natural reply summarizing the action in the selected language (English or Marathi).
9. Do not hallucinate or output raw JSON. Always respond conversationally.`;
}

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
  const currentDate = new Date().toISOString().split("T")[0];

  console.log(`[Gemini API] processVoiceInput. USE_REAL_GEMINI: ${USE_REAL_GEMINI}`);

  if (!USE_REAL_GEMINI || !ai) {
    console.log("[Gemini API] PATH: MOCK fallback (no API key)");
    // FALLBACK TO THE ORIGINAL MOCK CLASSIFIER
    return processVoiceInputMock(text, role, lang);
  }

  try {
    const systemPrompt = getSystemPrompt(role, lang, currentDate);

    const response = await ai.models.generateContent({
      // PRODUCTION MODEL: gemini-3.1-flash-lite is selected as the primary model.
      // It offers a generous 1,500 RPD free tier quota compared to 20 RPD for gemini-3.5-flash,
      // with verified comparable reasoning quality. Programmatic parameter guards are
      // implemented in the execution loop below to prevent parameter omissions/guessing.
      model: 'gemini-3.1-flash-lite',
      contents: text,
      config: {
        systemInstruction: systemPrompt,
        tools: GEMINI_TOOLS
      }
    });

    console.log("[Gemini API] PATH: REAL API success (first pass)");
    const calls = response.functionCalls;
    if (calls && calls.length > 0) {
      const toolResponses = [];
      const executedTools = [];
      const toolResults = [];

      for (const call of calls) {
        const toolName = call.name;
        const args = call.args as any;
        let resultStr = "";

        // Server-side validation check for missing required parameters
        let validationError = false;
        let missingParam = "";

        if (toolName === "logDelivery") {
          if (!args.shopName) { validationError = true; missingParam = "shopName"; }
          else if (!args.itemName) { validationError = true; missingParam = "itemName"; }
          else if (args.quantity === undefined || args.quantity === null || isNaN(Number(args.quantity))) { validationError = true; missingParam = "quantity"; }
        } else if (toolName === "logPurchase") {
          if (!args.itemName) { validationError = true; missingParam = "itemName"; }
          else if (args.quantity === undefined || args.quantity === null || isNaN(Number(args.quantity))) { validationError = true; missingParam = "quantity"; }
          else if (args.pricePaid === undefined || args.pricePaid === null || isNaN(Number(args.pricePaid))) { validationError = true; missingParam = "pricePaid"; }
        } else if (toolName === "setPrice") {
          if (!args.shopName) { validationError = true; missingParam = "shopName"; }
          else if (!args.itemName) { validationError = true; missingParam = "itemName"; }
          else if (args.unitPrice === undefined || args.unitPrice === null || isNaN(Number(args.unitPrice))) { validationError = true; missingParam = "unitPrice"; }
        } else if (toolName === "logPayment") {
          if (!args.shopName) { validationError = true; missingParam = "shopName"; }
          else if (args.amount === undefined || args.amount === null || isNaN(Number(args.amount))) { validationError = true; missingParam = "amount"; }
        } else if (toolName === "lockLedger" || toolName === "generateInvoice") {
          if (!args.shopName) { validationError = true; missingParam = "shopName"; }
        } else if (toolName === "approveEntry" || toolName === "rejectEntry") {
          if (!args.approvalId) { validationError = true; missingParam = "approvalId"; }
        }

        if (validationError) {
          console.log(`[Gemini API] Validation Error: Tool ${toolName} is missing required parameter ${missingParam}.`);
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

        try {
          if (toolName === "logDelivery") {
            resultStr = db.logDelivery(
              args.shopName,
              args.itemName,
              args.quantity,
              args.date || currentDate,
              role
            );
          } else if (toolName === "logPurchase") {
            resultStr = db.logPurchase(
              args.date || currentDate,
              args.itemName,
              args.quantity,
              args.pricePaid
            );
          } else if (toolName === "setPrice") {
            resultStr = db.setPrice(
              args.shopName,
              args.date || currentDate,
              args.itemName,
              args.unitPrice
            );
          } else if (toolName === "logPayment") {
            resultStr = db.logPayment(
              args.shopName,
              args.amount,
              role
            );
          } else if (toolName === "lockLedger") {
            resultStr = db.lockLedger(
              args.shopName,
              args.date || currentDate
            );
          } else if (toolName === "generateInvoice") {
            resultStr = db.generateInvoice(
              args.shopName,
              args.date || currentDate
            );
          } else if (toolName === "approveEntry") {
            resultStr = db.approveEntry(args.approvalId);
          } else if (toolName === "rejectEntry") {
            resultStr = db.rejectEntry(args.approvalId);
          } else if (toolName === "getLedger") {
            resultStr = JSON.stringify(db.getLedger(args.shopName, args.date));
          } else if (toolName === "getDeliveries") {
            resultStr = JSON.stringify(db.getDeliveries(args.shopName, args.startDate, args.endDate, args.itemName));
          } else if (toolName === "getOutstandingBalance") {
            resultStr = JSON.stringify(db.getOutstandingBalance(args.shopName));
          } else if (toolName === "getUnpricedItems") {
            resultStr = JSON.stringify(db.getUnpricedItems(args.date));
          } else if (toolName === "getPurchaseHistory") {
            resultStr = JSON.stringify(db.getPurchaseHistory(args.startDate, args.endDate, args.itemName));
          } else if (toolName === "getPendingApprovals") {
            resultStr = JSON.stringify(db.getPendingApprovals());
          } else {
            throw new Error(`Unknown tool name: ${toolName}`);
          }
        } catch (err: any) {
          resultStr = `Error: ${err.message}`;
        }

        toolResponses.push({
          functionResponse: {
            name: toolName,
            response: { result: resultStr }
          }
        });
        executedTools.push(toolName);
        toolResults.push({ tool: toolName, args, result: resultStr });
      }

      const modelContent = response.candidates?.[0]?.content || {
        role: 'model',
        parts: calls.map(c => ({ functionCall: c }))
      };

      const history: Content[] = [
        { role: 'user', parts: [{ text }] },
        modelContent,
        { 
          role: 'user', 
          parts: toolResponses
        }
      ];

      const followUp = await ai.models.generateContent({
        // PRODUCTION MODEL: gemini-3.1-flash-lite is selected as the primary model.
        // It offers a generous 1,500 RPD free tier quota compared to 20 RPD for gemini-3.5-flash,
        // with verified comparable reasoning quality. Programmatic parameter guards are
        // implemented in the execution loop below to prevent parameter omissions/guessing.
        model: 'gemini-3.1-flash-lite',
        contents: history,
        config: {
          systemInstruction: systemPrompt
        }
      });

      console.log("[Gemini API] PATH: REAL API success (second pass)");
      return {
        responseText: followUp.text || "",
        toolExecuted: executedTools.join(", "),
        toolResult: toolResults
      };
    } else {
      // Direct text response
      console.log("[Gemini API] PATH: REAL API success (direct response)");
      return {
        responseText: response.text || "",
        toolExecuted: null,
        toolResult: null
      };
    }
  } catch (error: any) {
    console.log(`[Gemini API] PATH: REAL API error: ${error.message}`);
    console.log("[Gemini API] PATH: MOCK fallback");
    return processVoiceInputMock(text, role, lang);
  }
}

// Fallback Mock Classifier
export async function processVoiceInputMock(
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

  const isWordInText = (word: string, text: string): boolean => {
    const lowerWord = word.toLowerCase();
    const lowerText = text.toLowerCase();
    
    let index = lowerText.indexOf(lowerWord);
    while (index !== -1) {
      const charBefore = index > 0 ? lowerText[index - 1] : " ";
      const charAfter = index + lowerWord.length < lowerText.length ? lowerText[index + lowerWord.length] : " ";
      
      const isBoundBefore = !/[a-zA-Z0-9]/.test(charBefore);
      const isBoundAfter = !/[a-zA-Z0-9]/.test(charAfter);
      
      if (isBoundBefore && isBoundAfter) {
        return true;
      }
      index = lowerText.indexOf(lowerWord, index + 1);
    }
    return false;
  };

  // Find shop names in text
  const shops = db.getShops();
  let matchedShop = shops.find((s) => isWordInText(s.name, query));
  
  // Marathi specific shop matching (case support)
  if (!matchedShop) {
    // Check if shop name is inflected, e.g. "सुदामाचे" for "Sudamache"
    if (isWordInText("सुदामा", query) || isWordInText("sudama", query)) {
      matchedShop = shops.find(s => s.id === "shop_1");
    } else if (isWordInText("जोशी", query) || isWordInText("joshi", query)) {
      matchedShop = shops.find(s => s.id === "shop_2");
    } else if (isWordInText("राहाटणी", query) || isWordInText("rahatani", query)) {
      matchedShop = shops.find(s => s.id === "shop_3");
    }
  }

  // Find canonical items in text
  const items = db.getItems();
  let matchedItem = items.find((i) => {
    return isWordInText(i.name, query) || 
           i.aliases.some((alias) => isWordInText(alias, query));
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

  // 8. GET OUTSTANDING BALANCE (READ TOOL)
  // Keywords: how much, balance, owe, outstanding, बाकी, देणे, येणे, किती
  if (query.includes("how much") || query.includes("balance") || query.includes("owe") || 
      query.includes("outstanding") || query.includes("बाकी") || query.includes("देणे") || 
      query.includes("येणे") || query.includes("किती")) {
    const balances = db.getOutstandingBalance(matchedShop?.name);
    let reply = "";
    if (matchedShop) {
      const bal = balances[matchedShop.name] ?? 0;
      if (lang === "mr") {
        reply = `${matchedShop.name} कडे आपले ₹${bal} बाकी आहेत.`;
      } else {
        reply = `${matchedShop.name} owes us ₹${bal}.`;
      }
      return {
        responseText: reply,
        toolExecuted: "getOutstandingBalance",
        toolResult: balances
      };
    } else {
      // List all balances
      const entries = Object.entries(balances);
      if (lang === "mr") {
        reply = "सर्व दुकानांची थकबाकी: " + entries.map(([name, bal]) => `${name}: ₹${bal}`).join(", ");
      } else {
        reply = "Outstanding balances: " + entries.map(([name, bal]) => `${name}: ₹${bal}`).join(", ");
      }
      return {
        responseText: reply,
        toolExecuted: "getOutstandingBalance",
        toolResult: balances
      };
    }
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
