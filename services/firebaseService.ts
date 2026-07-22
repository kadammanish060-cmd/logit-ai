import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { 
  signInAnonymously as authSignInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { Platform } from 'react-native';

// Callback for UI updates when remote sync completes
let onSyncCallback: (() => void) | null = null;

export function registerSyncCallback(cb: () => void) {
  onSyncCallback = cb;
}

// Check if user is authenticated
export function getFirebaseUser(): User | null {
  return auth.currentUser;
}

// Helper to format detailed Firestore operation logs
function logOperationDetails(
  opType: 'READ' | 'WRITE' | 'DELETE',
  collectionName: string,
  docPath: string,
  authUid: string | undefined,
  docUserId: string | undefined,
  success: boolean,
  error?: any
) {
  console.log(`----------------------------------------`);
  console.log(`${opType}`);
  console.log(`Collection:\n${collectionName}`);
  console.log(`Document:\n${docPath}`);
  console.log(`auth.uid:\n${authUid || 'UNAUTHENTICATED'}`);
  console.log(`document.userId:\n${docUserId || 'MISSING'}`);
  if (success) {
    console.log(`Result:\nSUCCESS`);
  } else {
    console.log(`Result:\nPERMISSION DENIED / ERROR`);
    console.log(`Exception:`, error?.message || error);
    console.log(`Error Code:`, error?.code || 'unknown');
  }
  console.log(`----------------------------------------`);
}

// 1. Authentication helpers
export async function loginAnonymously() {
  try {
    const credential = await authSignInAnonymously(auth);
    return credential.user;
  } catch (error) {
    console.error("Anonymous sign-in failed", error);
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    console.error("Email sign-in failed", error);
    throw error;
  }
}

export async function registerWithEmail(email: string, password: string, role: 'admin' | 'normal', language: 'en' | 'mr') {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    
    // Save user profile in Firestore
    const docPath = `users/${user.uid}`;
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role,
        language,
        updatedAt: new Date().toISOString()
      });
      logOperationDetails('WRITE', 'users', docPath, user.uid, user.uid, true);
    } catch (err) {
      logOperationDetails('WRITE', 'users', docPath, user.uid, user.uid, false, err);
      throw err;
    }
    
    return user;
  } catch (error) {
    console.error("Registration failed", error);
    throw error;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed", error);
    throw error;
  }
}

// 2. Storage upload with robust local fallback if Cloud Storage is not enabled
export async function uploadFile(folder: 'receipts' | 'voice' | 'documents', fileUri: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    console.warn("Storage upload attempted without an authenticated user.");
    return fileUri;
  }
  const uid = user.uid;

  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const fileRef = ref(storage, `${folder}/${uid}/${fileName}`);
    await uploadBytes(fileRef, blob);
    const url = await getDownloadURL(fileRef);
    logOperationDetails('WRITE', folder, `${folder}/${uid}/${fileName}`, uid, uid, true);
    return url;
  } catch (e: any) {
    logOperationDetails('WRITE', folder, `${folder}/${uid}/<filename>`, uid, uid, false, e);
    console.warn("Storage upload failed. Using local URI.", e);
    return fileUri;
  }
}

// 3. Firestore synchronizer for dbState
let isSyncingFromRemote = false;

export function setupFirestoreListeners(userId: string) {
  const localDb = require('./db');

  // Query only items belonging to this user
  const qShops = query(collection(db, "shops"), where("userId", "==", userId));
  const qTransactions = query(collection(db, "transactions"), where("userId", "==", userId));
  const qApprovals = query(collection(db, "approvals"), where("userId", "==", userId));

  logOperationDetails('READ', 'shops', 'shops (query)', userId, userId, true);
  logOperationDetails('READ', 'transactions', 'transactions (query)', userId, userId, true);
  logOperationDetails('READ', 'approvals', 'approvals (query)', userId, userId, true);

  // Listen to shops
  const unsubscribeShops = onSnapshot(qShops, (snapshot) => {
    if (isSyncingFromRemote) return;
    isSyncingFromRemote = true;
    snapshot.forEach((doc) => {
      const data = doc.data();
      localDb.updateLocalShopFromSync(data.id || doc.id, data);
    });
    isSyncingFromRemote = false;
    if (onSyncCallback) onSyncCallback();
  }, (err) => {
    logOperationDetails('READ', 'shops', 'shops (query listener)', userId, userId, false, err);
  });

  // Listen to transactions
  const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
    if (isSyncingFromRemote) return;
    isSyncingFromRemote = true;
    snapshot.forEach((doc) => {
      const data = doc.data();
      localDb.updateLocalTransactionFromSync(doc.id, data);
    });
    isSyncingFromRemote = false;
    if (onSyncCallback) onSyncCallback();
  }, (err) => {
    logOperationDetails('READ', 'transactions', 'transactions (query listener)', userId, userId, false, err);
  });

  // Listen to approvals
  const unsubscribeApprovals = onSnapshot(qApprovals, (snapshot) => {
    if (isSyncingFromRemote) return;
    isSyncingFromRemote = true;
    snapshot.forEach((doc) => {
      const data = doc.data();
      localDb.updateLocalApprovalFromSync(doc.id, data);
    });
    isSyncingFromRemote = false;
    if (onSyncCallback) onSyncCallback();
  }, (err) => {
    logOperationDetails('READ', 'approvals', 'approvals (query listener)', userId, userId, false, err);
  });

  return () => {
    unsubscribeShops();
    unsubscribeTransactions();
    unsubscribeApprovals();
  };
}

// Push all local modifications to Firestore individually for precise instrumentation
export async function pushLocalStateToFirestore() {
  const user = auth.currentUser;
  if (!user) return;
  const uid = user.uid;

  const localDb = require('./db');
  const state = localDb.getLocalState();

  let hasError = false;

  // 1. Sync shops (user-scoped document IDs: ${uid}_${shopId})
  for (const shopId of Object.keys(state.shops)) {
    const shop = state.shops[shopId];
    const firestoreShopDocId = `${uid}_${shopId}`;
    const docPath = `shops/${firestoreShopDocId}`;
    const payload = {
      ...shop,
      id: shopId,
      userId: uid,
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "shops", firestoreShopDocId), payload);
      logOperationDetails('WRITE', 'shops', docPath, uid, payload.userId, true);
    } catch (err) {
      hasError = true;
      logOperationDetails('WRITE', 'shops', docPath, uid, payload.userId, false, err);
    }
  }

  // 2. Sync ledgers (flattened into transactions)
  for (const shopId of Object.keys(state.ledgers)) {
    for (const date of Object.keys(state.ledgers[shopId])) {
      const ledger = state.ledgers[shopId][date];
      for (const itemId of Object.keys(ledger.items)) {
        const item = ledger.items[itemId];
        const docPath = `transactions/${item.id}`;
        const payload = {
          id: item.id,
          type: "delivery",
          shopId,
          date,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          deliveredAt: item.deliveredAt,
          status: item.status,
          source: item.source || "manual",
          transcript: item.transcript || "",
          notes: item.notes || "",
          receiptUrl: item.receiptUrl || "",
          userId: uid,
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, "transactions", item.id), payload);
          logOperationDetails('WRITE', 'transactions', docPath, uid, payload.userId, true);
        } catch (err) {
          hasError = true;
          logOperationDetails('WRITE', 'transactions', docPath, uid, payload.userId, false, err);
        }
      }
    }
  }

  // 3. Sync payments (flattened into transactions)
  for (const shopId of Object.keys(state.payments)) {
    for (const payId of Object.keys(state.payments[shopId])) {
      const pay = state.payments[shopId][payId];
      const docPath = `transactions/${payId}`;
      const payload = {
        id: payId,
        type: "payment",
        shopId,
        amount: pay.amount,
        paidAt: pay.paidAt,
        loggedBy: pay.loggedBy,
        status: pay.status,
        source: pay.source || "manual",
        notes: pay.notes || "",
        receiptUrl: pay.receiptUrl || "",
        userId: uid,
        updatedAt: new Date().toISOString()
      };
      try {
        await setDoc(doc(db, "transactions", payId), payload);
        logOperationDetails('WRITE', 'transactions', docPath, uid, payload.userId, true);
      } catch (err) {
        hasError = true;
        logOperationDetails('WRITE', 'transactions', docPath, uid, payload.userId, false, err);
      }
    }
  }

  // 4. Sync purchases (flattened into transactions)
  for (const date of Object.keys(state.purchases)) {
    for (const itemId of Object.keys(state.purchases[date])) {
      const purchase = state.purchases[date][itemId];
      const docPath = `transactions/${purchase.id}`;
      const payload = {
        id: purchase.id,
        type: "purchase",
        date,
        itemName: purchase.itemName,
        quantity: purchase.quantity,
        amount: purchase.pricePaid,
        loggedAt: purchase.loggedAt,
        userId: uid,
        updatedAt: new Date().toISOString()
      };
      try {
        await setDoc(doc(db, "transactions", purchase.id), payload);
        logOperationDetails('WRITE', 'transactions', docPath, uid, payload.userId, true);
      } catch (err) {
        hasError = true;
        logOperationDetails('WRITE', 'transactions', docPath, uid, payload.userId, false, err);
      }
    }
  }

  // 5. Sync pending approvals
  for (const appId of Object.keys(state.pendingApprovals)) {
    const app = state.pendingApprovals[appId];
    const docPath = `approvals/${appId}`;
    const payload = {
      ...app,
      userId: uid,
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "approvals", appId), payload);
      logOperationDetails('WRITE', 'approvals', docPath, uid, payload.userId, true);
    } catch (err) {
      hasError = true;
      logOperationDetails('WRITE', 'approvals', docPath, uid, payload.userId, false, err);
    }
  }

  if (hasError) {
    throw new Error("One or more Firestore synchronization writes failed permission check.");
  } else {
    console.log("Local database synchronized to Firestore successfully.");
  }
}
