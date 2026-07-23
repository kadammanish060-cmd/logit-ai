# Logit AI — Complete Antigravity Project Context & State Handbook

> **Notice to Future Antigravity AI Instances:**  
> Read this document completely before performing any actions or modifying any code. It contains the exhaustive architectural context, completed work, bug root causes, verified solutions, and strict rules for the **Logit AI** project.

---

## 1. Project Overview

- **Product Vision:** **Logit AI** is a modern, voice-first ledger, expense, and delivery tracking application designed for Indian small businesses, suppliers, shop owners, and staff. It enables voice-driven data entry in English, Marathi, and Hindi, automatically parses spoken entries into structured ledger transactions, calculates daily bill totals, and generates preview invoices.
- **Current Objectives:** 
  - Complete stable testing release (`v0.1.0-beta`).
  - Maintain robust cross-platform Firebase integration (Auth, Firestore, Storage).
  - Ensure 100% clean compilation and native Android APK distribution readiness.
- **Tech Stack:**
  - **Core Framework:** React Native / Expo SDK 57 (TypeScript, React 19, React Native 0.86).
  - **Firebase SDK:** Firebase JS SDK v12.16.0 (Authentication, Firestore, Storage).
  - **AI & Voice Engine:** `@google/genai` (Gemini 2.5 Flash for NLP function calling) + `sarvamai` SDK (Sarvam AI for Indian language STT).
  - **OAuth & Auth Session:** `expo-auth-session`, `expo-crypto`, `expo-web-browser`.
  - **UI & Icons:** Vanilla CSS/StyleSheet design system (`styles/theme.ts`), Lucide React Native (`lucide-react-native`).
  - **Storage & State:** Local offline-first SQLite/localStorage cache (`services/db.ts`) with automatic background sync to Firestore (`services/firebaseService.ts`).

---

## 2. Completed Features

- **Generic Role Selection:** Updated onboarding role selection screen to display generic role names: **"Admin"** and **"Normal"**. Removed all family relationship references ("Mother", "Father", "Founder") from the UI while preserving internal role logic (`'admin'` / `'normal'`).
- **Complete Firebase Authentication Architecture:**
  - `AuthService.ts`: Standardized authentication methods for Email/Password, Google OAuth, Anonymous auth, and password reset.
  - `AuthContext.tsx` & `AuthProvider`: Global authentication state provider with user profile caching and automatic session handling via `SessionManager.ts`.
  - `ProtectedRoute.tsx`: Main navigation gate that presents sign-in/registration forms for unauthenticated users and mounts `MainApp` upon authentication.
- **Production Firestore Security Rules:**
  - Deployed granular security rules to the production `(default)` Firestore database instance covering all 7 app collections (`users`, `shops`, `transactions`, `approvals`, `receipts`, `voiceSessions`, `settings`).
- **User-Scoped Firestore Data Model:**
  - Multi-user isolation enforced across all collections using user-scoped document IDs (`${uid}_${shopId}`) and `userId` document fields.
- **Firebase Cloud Storage Integration:**
  - Audio recording and receipt image upload handling via `uploadFile()` with graceful local fallback if cloud storage is unreachable.
- **Voice & NLP Pipeline:**
  - Dual-engine speech processing: Sarvam AI STT for Marathi/English voice inputs + Gemini 2.5 Flash for natural language tool execution (`logDelivery`, `setPrice`, `logPayment`, `logPurchase`).
- **Standalone Android APK Build:**
  - Configured native build properties (`android/local.properties`, `app.json` scheme `logitai`, `eas.json`), executed local Gradle build (`gradlew.bat assembleRelease`), and verified installable APK: `logit-ai-v0.1.0-beta.apk`.
- **External Testing Package:**
  - Created `TESTING.md` with complete installation instructions, tester checklists, and known limitations.

---

## 3. Architectural Decisions (STRICT — DO NOT REVISIT)

1. **Firestore Database Instance Target:**
   - The application **MUST ALWAYS** connect to the default Firestore database instance `(default)`.
   - `.env`, `services/firebase.ts`, and `firebase.json` are explicitly configured for `(default)`.
   - **DO NOT** change the database ID back to `logit-db`.
2. **User Data Scoping Strategy:**
   - User profiles: `/users/{uid}`
   - User settings: `/settings/{uid}`
   - User default shops: `/shops/{uid}_${shopId}`
   - Transactions, approvals, receipts, and voice sessions: Tagged with `userId: uid`.
3. **Google Sign-In Implementation:**
   - Implemented exclusively using `expo-auth-session` + `Google.useIdTokenAuthRequest` + `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`.
   - **DO NOT** install `@react-native-google-signin/google-signin` or invoke web-only `signInWithPopup` on native runtimes.
4. **Deep Linking Scheme:**
   - Deep linking is configured with scheme `logitai` (`logitai://`) in `app.json`.
5. **OTA Remote Updates Disabled:**
   - Remote OTA updates are disabled in `app.json` (`"updates": { "enabled": false, "checkAutomatically": "NEVER" }`) to prevent startup download crashes on standalone native builds.
6. **Role Terminology:**
   - Visible labels are strictly **"Admin"** and **"Normal"**. Internal role values remain `'admin'` and `'normal'`. No family terms are allowed in the codebase or UI.

---

## 4. Firebase Architecture & Config

- **Project Details:**
  - **Firebase Project ID:** `synclist-ccaad`
  - **Project Number:** `541443181134`
  - **Storage Bucket:** `synclist-ccaad.firebasestorage.app`
  - **Database Instance:** `(default)`
- **Configuration File (`services/firebase.ts`):**
  ```typescript
  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {}, process.env.EXPO_PUBLIC_FIREBASE_DATABASE_ID || '(default)');
  const auth = Platform.OS === 'web' ? getAuth(app) : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  const storage = getStorage(app);
  export { app, db, auth, storage };
  ```
- **Deployed Firestore Security Rules (`firestore.rules`):**
  ```rules
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      function isAuthenticated() { return request.auth != null; }
      function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }

      match /users/{userId} { allow read, write: if isOwner(userId); }
      match /shops/{shopId} {
        allow read, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
        allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
        allow update: if isAuthenticated() && resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid;
      }
      match /transactions/{transactionId} {
        allow read, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
        allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
        allow update: if isAuthenticated() && resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid;
      }
      match /receipts/{receiptId} {
        allow read, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
        allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
        allow update: if isAuthenticated() && resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid;
      }
      match /voiceSessions/{sessionId} {
        allow read, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
        allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
        allow update: if isAuthenticated() && resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid;
      }
      match /approvals/{approvalId} {
        allow read, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
        allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
        allow update: if isAuthenticated() && resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid;
      }
      match /settings/{settingId} {
        allow read, delete: if isOwner(settingId) || (isAuthenticated() && resource.data.userId == request.auth.uid);
        allow create: if isOwner(settingId) || (isAuthenticated() && request.resource.data.userId == request.auth.uid);
        allow update: if isOwner(settingId) || (isAuthenticated() && resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid);
      }
      match /{document=**} { allow read, write: if false; }
    }
  }
  ```

---

## 5. UI / UX Architecture

- **Onboarding & Role Selection:** Clean, modal/screen selector allowing users to register/login and toggle between **Admin** and **Normal** roles.
- **Navigation:** `ProtectedRoute` guards `MainApp` (defined in `App.tsx`).
- **Main App Screens & Views:**
  - **Shop/Business Cards:** Displays active shops (e.g., *Sudamache*, *Joshi wadewale*, *Rahatani Sudamache*), outstanding balances, and quick actions.
  - **Ledger Screen:** Detailed daily itemized entries, line totals, pricing status (`open` -> `priced` -> `locked`), and invoice preview modal.
  - **Voice & Assistant Drawer:** Interactive voice recording modal powered by Sarvam STT and Gemini NLP parser with real-time feedback.
  - **Settings & Profile:** Allows toggling theme, language (`en` / `mr`), and viewing active credentials.

---

## 6. AI & Voice Pipeline

1. **Sarvam AI STT (`services/sarvam.ts`):**
   - Captures audio via `expo-audio` / web MediaRecorder.
   - Transmits audio blob to Sarvam AI API for Marathi (`mr-IN`) or English (`en-IN`) speech recognition.
   - Returns clean transcript text.
2. **Gemini 2.5 Flash NLP Engine (`services/gemini.ts`):**
   - Instantiates `@google/genai` client using `EXPO_PUBLIC_GEMINI_API_KEY`.
   - Sends transcript text with structured system prompt and function declarations:
     - `logDelivery(shopName, itemName, quantity, date)`
     - `setPrice(shopName, date, itemName, unitPrice)`
     - `logPayment(shopName, amount)`
     - `logPurchase(date, itemName, quantity, pricePaid)`
   - Parses LLM tool calls and executes corresponding methods in `services/db.ts`.
3. **Offline Sync Trigger:**
   - After local `dbState` updates, `saveDatabase()` invokes `firebaseService.pushLocalStateToFirestore()` to sync changes to Cloud Firestore in the background.

---

## 7. Resolved Bugs & Fix History

| Bug Description | Root Cause | Verified Solution | Commit |
| :--- | :--- | :--- | :---: |
| **Remote OTA Update Download Crash** | `expo-updates` attempted to fetch updates from unconfigured Expo servers on startup (`java.io.IOException`). | Set `"updates": { "enabled": false, "checkAutomatically": "NEVER" }` in `app.json`. | `546d691` |
| **Google Sign-In Native Crash** | Code invoked web-only `signInWithPopup` on native runtimes. | Migrated to `expo-auth-session` + `Google.useIdTokenAuthRequest`. | `6283196` |
| **Expo Linking Warning** | Missing `"scheme"` key in `app.json`. | Added `"scheme": "logitai"` to `app.json` & updated `ProtectedRoute.tsx`. | `e1653a6` |
| **Firestore Security Rules Query Crash** | Single `isDataOwner()` helper accessed `request.resource.data` on `read` queries where it was null. | Separated `read`, `create`, `update`, `delete` rules per collection in `firestore.rules`. | `6a246ae` |
| **`ReferenceError: db is undefined` in AuthContext** | Missing static `db` import and inline `require('firebase/firestore')` scoping issues. | Added top-level `import { auth, db } from '../services/firebase'` and `import { doc, setDoc } from 'firebase/firestore'`. | `ca697e4` |
| **Multi-Account Shop Overwrite Permission Denial** | Default shop documents seeded with static path `shops/shop_1` caused User B to attempt overwriting User A's shop document. | User-scoped shop document IDs in Firestore to `${uid}_${shopId}` in `services/firebaseService.ts`. | `8f451c5` |
| **Verbose Debug Logging Noise** | Excessive per-item `READ`/`WRITE` logging in console output. | Cleaned up verbose logs while retaining essential auth/sync lifecycle logs. | `ab528b9` |
| **Local Gradle Release Build Failure** | Missing `android/local.properties` file specifying local Android SDK path. | Created `android/local.properties` pointing to `C:/Users/kadam/AppData/Local/Android/Sdk` and executed `gradlew.bat assembleRelease`. | `41db474` |

---

## 8. Remaining Issues & Known Limitations

- **None Blocking:** Zero TypeScript errors, zero build errors, zero runtime permission errors.
- **Known Tester Limitations (Documented in `TESTING.md`):**
  - Offline Sync: Entries made while offline queue locally and sync automatically when internet connectivity returns.
  - Google Sign-In: Requires active Google Play Services on Android test devices.
  - Microphone Permission: Android requires explicit runtime permission grant on first voice command attempt.

---

## 9. Key Git History & Commits

- `41db474` - `build(android): configure native build environment and generate installable release APK v0.1.0-beta`
- `2eb1d05` - `release: prepare v0.1.0-beta preview build for external testing`
- `ab528b9` - `chore(logging): clean up verbose per-operation instrumentation while retaining essential lifecycle logs`
- `8f451c5` - `fix(firestore): user-scope default shop document paths to prevent multi-account overwrite permission errors`
- `5fda2df` - `fix(firebase): target default Firestore database instance to resolve permission-denied errors on startup`
- `ca697e4` - `fix(auth): resolve db symbol reference and verify clean startup sequence`
- `a378766` - `fix(auth): import db symbol in AuthContext.tsx`
- `6a246ae` - `fix(firestore): separate read, create, update, delete rules to resolve permission-denied errors on queries`
- `e1653a6` - `fix(linking): add scheme logitai to app.json and configure expo-auth-session linking`
- `6283196` - `feat(auth): migrate Google Sign-In to expo-auth-session for cross-platform Expo support`
- `546d691` - `fix(updates): disable automatic remote OTA updates in app.json`

---

## 10. Key Files Created / Configured

- `logit-ai-v0.1.0-beta.apk` — Full standalone Android release APK (93.88 MB).
- `TESTING.md` — Complete tester guide, installation instructions, and test checklist.
- `eas.json` — EAS build profiles (including preview APK config).
- `android/local.properties` — Android SDK configuration for Gradle builds.
- `firestore.rules` — Deployed Firestore security rules.
- `storage.rules` — Deployed Storage security rules.
- `services/firebase.ts` — Main Firebase initialization targeting `(default)` DB instance.
- `services/firebaseService.ts` — User-scoped Firestore sync & Storage upload handler.
- `services/AuthService.ts` — Authentication service methods.
- `context/AuthContext.tsx` — Global auth state & profile provider.
- `scratch/verify_registration_flow.js` — 6-step E2E registration verification script.
- `scratch/verify_all_collections.js` — 7-collection Firestore CRUD audit script.

---

## 11. Testing Status & Verification

1. **Static Analysis (`npx tsc --noEmit`):** PASSED with **0 errors**.
2. **Production Bundle Build (`npx expo export`):** PASSED with **0 errors** (Web: 5MB, iOS: 7.2MB, Android: 7.2MB).
3. **End-to-End Registration & Auth Flow:** PASSED all 6 test steps.
4. **Firestore 7-Collection CRUD Audit:** PASSED 100% across `users`, `shops`, `transactions`, `approvals`, `receipts`, `voiceSessions`, and `settings`.
5. **Native Release Build (`gradlew.bat assembleRelease`):** PASSED (**`BUILD SUCCESSFUL in 22m 1s`**). Generated `logit-ai-v0.1.0-beta.apk`.

---

## 12. Next Priorities for Future Conversations

1. **Beta Tester Distribution:** Share `logit-ai-v0.1.0-beta.apk` with external testers and collect real-world feedback.
2. **Voice NLP Parsing Enhancements:** Gather edge-case voice inputs (regional Marathi/Hindi dialects) and refine system prompts in `services/gemini.ts`.
3. **Production EAS / Play Store Release:** When ready for Google Play Store, generate an Android App Bundle (`.aab`) using `eas build --platform android --profile production`.

---

## 13. Things Never To Change (CRITICAL RULES)

- **NEVER** change the Firestore database ID in `services/firebase.ts` or `.env` from `(default)` to `logit-db`.
- **NEVER** re-introduce family relationship terms ("Mother", "Father", "Founder") into the UI. Always keep generic role titles ("Admin" and "Normal").
- **NEVER** use web-only `signInWithPopup` for native Google Authentication. Always use `expo-auth-session`.
- **NEVER** use static, unscoped document IDs (e.g. `shops/shop_1`) for collections written by multiple users. Always scope with `${uid}_${shopId}`.
- **NEVER** modify `firestore.rules` without testing query filtering compatibility against `resource.data.userId == request.auth.uid`.

---

## 14. Context For Next Conversation (Instructions for Future Antigravity)

> **Hello Future Antigravity Instance!**  
> You are picking up the **Logit AI** project in a fully working, production-ready state for testing.  
> 
> - **Build Status:** The native Android APK (`logit-ai-v0.1.0-beta.apk`) is built and tested. TypeScript compilation is 100% clean.
> - **Firebase Status:** Auth, Firestore, and Storage are completely connected to the default project `synclist-ccaad` database `(default)`. All security rules are live.
> - **How to proceed:** When the user gives you a request, inspect this document first. Do NOT attempt to re-architect authentication, re-create database IDs, or change security rules. Build directly upon the established patterns documented above.
