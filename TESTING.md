# Logit AI — External Testing Guide (v0.1.0-beta)

Welcome to the external testing release of **Logit AI**, an AI-powered voice & text ledger management system designed for businesses, suppliers, and shop owners.

---

## 📱 Installation Instructions

### Android (APK Direct Installation)

1. **Download the APK:** Transfer the `logit-ai-v0.1.0-beta.apk` file to your Android device.
2. **Enable Unknown Sources:**
   - Go to **Settings > Security (or Apps)**.
   - Enable **Install Unknown Apps** for your browser or file manager.
3. **Install:** Tap the `.apk` file and select **Install**.
4. **Launch:** Open **Logit AI** from your app drawer.

---

## 🧪 External Tester Checklist

Please test the following core flows and report any issues:

### 1. Authentication & Onboarding
- [ ] Sign up with a new email and password.
- [ ] Log out and log back in.
- [ ] Select role (Admin vs Normal user) on onboarding screen.
- [ ] Verify session persistence after closing and reopening the app.

### 2. Voice & AI Commands
- [ ] Tap the microphone button and record a voice delivery entry (e.g. *"Log delivery of 10kg onion to Sudamache"*).
- [ ] Test Marathi voice input (e.g. *"सुदामाचे ला २० किलो बटाटा दिला"*).
- [ ] Verify Sarvam AI / Gemini voice transcription and tool execution.

### 3. Ledger & Transaction Management
- [ ] View shop list and outstanding balances.
- [ ] Log manual delivery and payment entries.
- [ ] Lock daily ledgers and preview generated invoices.

### 4. Media & Storage
- [ ] Attach/upload receipt images to transaction entries.
- [ ] Verify receipt image preview.

---

## ⚠️ Known Limitations (v0.1.0-beta)

- **Offline Sync:** If internet connectivity drops while logging entries, local changes queue offline and synchronize automatically once connectivity is restored.
- **Google Sign-In:** Google Sign-In requires an active network connection and valid Google Play Services installed on the Android device.
- **Microphone Permissions:** Android requires granting runtime microphone permission when using voice recording features for the first time.

---

## 📬 Reporting Feedback

If you encounter crashes, UI visual glitches, or unexpected AI parser behavior, please share:
1. Device model & Android version.
2. Step-by-step actions leading to the issue.
3. Screenshots or error log details.
