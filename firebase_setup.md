# Firebase Integration Setup Guide

This document details the configuration, schema, rules, and deployment instructions for the Logit AI Firebase integration.

---

## 1. Firebase Project Details
- **Project ID:** `synclist-ccaad`
- **Project Name:** Logit AI
- **Firestore Database ID:** `logit-db` (Native Mode, Multi-region `nam5`)
- **Cloud Storage Bucket:** `synclist-ccaad.firebasestorage.app`

---

## 2. Environment Variables (.env)
Add the following keys to your local `.env` file for Expo. These variables are automatically loaded by Expo during development and bundling:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyALJJa_NED0yda9Dzw44sBInhlPvxdNKv4
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=synclist-ccaad.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=synclist-ccaad
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=synclist-ccaad.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=541443181134
EXPO_PUBLIC_FIREBASE_APP_ID=1:541443181134:web:4628dfe6be451c00e9111f
EXPO_PUBLIC_FIREBASE_DATABASE_ID=logit-db
```

---

## 3. Firestore Database Schema

The database relies on offline-first caching via local state synchronization. When online, the local memory cache merges and synchronizes with the following Firestore collections:

### A. `users`
- **Path:** `/users/{userId}`
- **Fields:**
  - `uid`: string (Firebase User UID)
  - `email`: string
  - `role`: `'admin' | 'normal'`
  - `language`: `'en' | 'mr'`
  - `updatedAt`: ISO String

### B. `shops`
- **Path:** `/shops/{shopId}`
- **Fields:**
  - `id`: string (Shop ID)
  - `name`: string
  - `active`: boolean
  - `outstandingBalance`: number
  - `updatedAt`: ISO String

### C. `transactions`
Contains all ledger activities (deliveries, payments, purchases) flattened for query efficiency.
- **Path:** `/transactions/{transactionId}`
- **Fields:**
  - `id`: string
  - `type`: `'delivery' | 'payment' | 'purchase'`
  - `shopId`: string (optional, for deliveries/payments)
  - `date`: string (YYYY-MM-DD, optional)
  - `itemName`: string (optional)
  - `quantity`: number (optional)
  - `unitPrice`: number (optional)
  - `lineTotal`: number (optional)
  - `amount`: number (optional, for payments/purchases)
  - `status`: `'confirmed' | 'pending_approval'`
  - `source`: `'voice' | 'manual' | 'ocr'`
  - `transcript`: string (optional)
  - `notes`: string
  - `receiptUrl`: string
  - `deliveredAt`/`paidAt`/`loggedAt`: ISO String
  - `updatedAt`: ISO String

### D. `approvals`
- **Path:** `/approvals/{approvalId}`
- **Fields:**
  - `id`: string
  - `type`: `'delivery' | 'payment' | 'purchase'`
  - `refPath`: string
  - `data`: object
  - `submittedBy`: string
  - `submittedAt`: ISO String
  - `status`: `'pending' | 'approved' | 'rejected'`
  - `updatedAt`: ISO String

### E. `receipts`
- **Path:** `/receipts/{receiptId}`
- **Fields:**
  - `id`: string
  - `url`: string
  - `uploadedAt`: ISO String
  - `userId`: string

### F. `voiceSessions`
- **Path:** `/voiceSessions/{sessionId}`
- **Fields:**
  - `id`: string
  - `transcript`: string
  - `audioUrl`: string
  - `timestamp`: ISO String
  - `userId`: string

### G. `settings`
- **Path:** `/settings/{settingsId}`
- **Fields:**
  - `id`: string
  - `language`: string
  - `theme`: string
  - `updatedAt`: ISO String

---

## 4. Cloud Storage Layout
Files uploaded by authenticated users are stored under three main folders in the storage bucket:
1. `receipts/`: Captured document/invoice images.
2. `voice/`: Recorded audio files.
3. `documents/`: General bookkeeping uploads.

---

## 5. Security Rules

### A. Firestore Rules (`firestore.rules`)
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }
    function getUserData() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
    function isAdmin() { return isAuthenticated() && getUserData().role == 'admin'; }

    match /users/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
    }
    match /shops/{shopId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /transactions/{transactionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin() || (resource.data.userId == request.auth.uid);
    }
    match /receipts/{receiptId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin() || (resource.data.userId == request.auth.uid);
    }
    match /voiceSessions/{sessionId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid);
    }
    match /approvals/{approvalId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### B. Storage Rules (`storage.rules`)
```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /receipts/{allPaths=**} { allow read, write: if request.auth != null; }
    match /voice/{allPaths=**} { allow read, write: if request.auth != null; }
    match /documents/{allPaths=**} { allow read, write: if request.auth != null; }
    match /{allPaths=**} { allow read, write: if false; }
  }
}
```

---

## 6. How to Deploy Rules

Deploy database and storage rules using the Firebase CLI commands:
```bash
# Deploy all rules configured in firebase.json
npx firebase deploy --only firestore,storage
```

---

## 7. How to Add New Collections
To extend the schema with a new collection (e.g., `logs`):
1. **Define Security Rule:** Add a match block in `firestore.rules`:
   ```rules
   match /logs/{logId} {
     allow read, write: if isAuthenticated();
   }
   ```
2. **Add Sync Mapping:** Update `services/firebaseService.ts` to push/pull from the new collection and bind listeners.
3. **Register Local DB Methods:** Implement a listener callback and state merging inside `services/db.ts`.
