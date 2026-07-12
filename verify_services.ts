// Script to verify database operations and Gemini parser logic
import * as db from "./services/db";
import { processVoiceInput } from "./services/gemini";

async function runTests() {
  console.log("--- 1. Testing Database Initialization & Seed Data ---");
  db.loadDatabase();
  console.log("Shops:", db.getShops().map(s => s.name));
  console.log("Items:", db.getItems().map(i => i.name));

  console.log("\n--- 2. Testing Direct DB Writes (Admin) ---");
  const delRes1 = db.logDelivery("Sudamache", "onion", 15, "2026-07-10", "admin");
  console.log("Delivery 1:", delRes1);
  const delRes2 = db.logDelivery("Sudamache", "potato", 25, "2026-07-10", "admin");
  console.log("Delivery 2:", delRes2);

  console.log("\n--- 3. Testing Price Setting & Auto-locking ---");
  const priceRes1 = db.setPrice("Sudamache", "2026-07-10", "onion", 20); // 15 * 20 = 300
  console.log("Price 1:", priceRes1);
  const priceRes2 = db.setPrice("Sudamache", "2026-07-10", "potato", 30); // 25 * 30 = 750 (Total: 1050, outstanding: 1050)
  console.log("Price 2:", priceRes2);

  console.log("\n--- 4. Testing Payment ---");
  const payRes = db.logPayment("Sudamache", 500, "admin"); // Outstanding: 550
  console.log("Payment:", payRes);

  console.log("\n--- 5. Testing Gemini NLP Voice Input (English) ---");
  const voiceRes1 = await processVoiceInput("Log delivery of 20 tomato to Joshi wadewale", "admin", "en");
  console.log("Query: 'Log delivery of 20 tomato to Joshi wadewale'");
  console.log("AI Response:", voiceRes1.responseText);
  console.log("Tool Executed:", voiceRes1.toolExecuted);

  console.log("\n--- 5b. Testing Gemini NLP Voice Input (Sudama 3 kgs of Kanda) ---");
  const voiceRes1b = await processVoiceInput("Sudama 3 kgs of Kanda", "admin", "en");
  console.log("Query: 'Sudama 3 kgs of Kanda'");
  console.log("AI Response:", voiceRes1b.responseText);
  console.log("Tool Executed:", voiceRes1b.toolExecuted);

  console.log("\n--- 6. Testing Gemini NLP Voice Input (Marathi) ---");
  const voiceRes2 = await processVoiceInput("सुदामाचे कडून ३०० रुपयांचे पेमेंट नोंदवा", "admin", "mr");
  console.log("Query: 'सुदामाचे कडून ३०० रुपयांचे पेमेंट नोंदवा'");
  console.log("AI Response:", voiceRes2.responseText);
  console.log("Tool Executed:", voiceRes2.toolExecuted);

  console.log("\n--- 7. Verification Finished successfully! ---");
}

runTests().catch(err => {
  console.error("Test failed", err);
});
