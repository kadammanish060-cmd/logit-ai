# Firebase Authentication & Security Setup Guide

This guide details the Logit AI authentication flow, security configuration, Firestore schemas, Storage bucket policies, and manual setup required in the Firebase Console.

---

## 1. Authentication Flow & Context Architecture

Logit AI implements a strict, user-isolated auth hierarchy:
1. **AuthProvider (`context/AuthContext.tsx`):** Exposes AuthContext containing current User state, loading status, role, language, and actions (`loginWithEmail`, `registerWithEmail`, `loginWithGoogle`, `logout`).
2. **ProtectedRoute (`components/ProtectedRoute.tsx`):** A gate component wrapping protected app screens. Shows a loading spinner during session checks, renders login forms if unauthenticated, and opens Logit AI when authenticated.
3. **SessionManager (`services/SessionManager.ts`):** Syncs role and language configuration states inside AsyncStorage/localStorage per user session.

---

## 2. Environment Variables (.env)

Make sure the following variables are configured in your local `.env` file:
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

## 3. Scoped Firestore Database Schema

Firestore document updates are scoped by the authenticated user's `userId` property. When a batch writes to the cloud database `logit-db`, the current user's UID is automatically attached.

### A. `users`
- **Path:** `/users/{userId}`
- **Fields:**
  - `uid`: string (Firebase User UID)
  - `email`: string | null
  - `role`: `'admin' | 'normal'`
  - `language`: `'en' | 'mr'`
  - `updatedAt`: ISO String

### B. `shops`
- **Path:** `/shops/{shopId}`
- **Fields:**
  - `id`: string
  - `name`: string
  - `active`: boolean
  - `outstandingBalance`: number
  - `userId`: string (scoping key)
  - `updatedAt`: ISO String

### C. `transactions`
- **Path:** `/transactions/{txId}`
- **Fields:**
  - `id`: string
  - `type`: `'delivery' | 'payment' | 'purchase'`
  - `shopId`: string (optional)
  - `date`: string (YYYY-MM-DD, optional)
  - `itemName`: string (optional)
  - `quantity`: number (optional)
  - `unitPrice`: number (optional)
  - `lineTotal`: number (optional)
  - `amount`: number (optional)
  - `status`: `'confirmed' | 'pending_approval'`
  - `source`: `'voice' | 'manual' | 'ocr'`
  - `transcript`: string (optional)
  - `notes`: string
  - `receiptUrl`: string
  - `deliveredAt`/`paidAt`/`loggedAt`: ISO String
  - `userId`: string (scoping key)
  - `updatedAt`: ISO String

### D. `approvals`
- **Path:** `/approvals/{appId}`
- **Fields:**
  - `id`: string
  - `type`: `'delivery' | 'payment' | 'purchase'`
  - `refPath`: string
  - `data`: object
  - `submittedBy`: string
  - `submittedAt`: ISO String
  - `status`: `'pending' | 'approved' | 'rejected'`
  - `userId`: string (scoping key)
  - `updatedAt`: ISO String

### E. `voiceSessions`
- **Path:** `/voiceSessions/{sessionId}`
- **Fields:**
  - `id`: string
  - `transcript`: string
  - `audioUrl`: string
  - `timestamp`: ISO String
  - `userId`: string (scoping key)

---

## 4. Scoped Storage Layout
Uploaded media files are separated by the user's UID:
1. `receipts/{uid}/{fileName}`: Captured receipts/invoice documents.
2. `voice/{uid}/{fileName}`: Audio recordings.
3. `documents/{uid}/{fileName}`: Miscellaneous files.

---

## 5. Security Rules

### A. Firestore Rules (`firestore.rules`)
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }
    function isDataOwner() {
      return isAuthenticated() && (
        (resource == null && request.resource.data.userId == request.auth.uid) ||
        (resource != null && resource.data.userId == request.auth.uid)
      );
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }
    match /shops/{shopId} {
      allow read, write: if isDataOwner();
    }
    match /transactions/{transactionId} {
      allow read, write: if isDataOwner();
    }
    match /receipts/{receiptId} {
      allow read, write: if isDataOwner();
    }
    match /voiceSessions/{sessionId} {
      allow read, write: if isDataOwner();
    }
    match /approvals/{approvalId} {
      allow read, write: if isDataOwner();
    }
    match /settings/{settingId} {
      allow read, write: if isOwner(settingId) || isDataOwner();
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
    match /receipts/{uid}/{fileName=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /voice/{uid}/{fileName=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /documents/{uid}/{fileName=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 6. Deployment Command
Deploy database and storage rules using the Firebase CLI commands:
```bash
npx firebase deploy --only firestore,storage
```

---

## 7. Manual Firebase Console Actions Required

Because API/CLI tools do not enable authentication providers or initialize default storage buckets automatically, you **MUST** perform the following console actions:

1. **Enable Sign-in Providers:**
   - Go to [Firebase Console](https://console.firebase.google.com/) -> **Authentication** -> **Sign-in method**.
   - Enable **Email/Password**.
   - Enable **Google** provider and configure client IDs if necessary.
   - Enable **Anonymous** provider.
2. **Initialize Default Cloud Storage:**
   - Go to the **Storage** section in the Firebase Console.
   - Click **Get Started** and complete default bucket setup (choose location `nam5` / `us-central`).
