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
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      role,
      language,
      updatedAt: new Date().toISOString()
    });
    
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

  if (Platform.OS === 'web') {
    // Web environment: fileUri is already a blob/dataUrl or objectURL
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      // Upload inside user's folder folder/{uid}/{fileName}
      const fileRef = ref(storage, `${folder}/${uid}/${fileName}`);
      await uploadBytes(fileRef, blob);
      return await getDownloadURL(fileRef);
    } catch (e) {
      console.warn("Storage upload failed or Storage not enabled in Console. Using local URI.", e);
      return fileUri;
    }
  } else {
    // Mobile environment
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      // Upload inside user's folder folder/{uid}/{fileName}
      const fileRef = ref(storage, `${folder}/${uid}/${fileName}`);
      await uploadBytes(fileRef, blob);
      return await getDownloadURL(fileRef);
    } catch (e) {
      console.warn("Storage upload failed. Using local URI.", e);
      return fileUri;
    }
  }
}

// 3. Firestore synchronizer for dbState
// We dynamically import localState functions to resolve circular dependencies
let isSyncingFromRemote = false;

export function setupFirestoreListeners(userId: string) {
  const localDb = require('./db');

  // Query only items belonging to this user
  const qShops = query(collection(db, "shops"), where("userId", "==", userId));
  const qTransactions = query(collection(db, "transactions"), where("userId", "==", userId));
  const qApprovals = query(collection(db, "approvals"), where("userId", "==", userId));

  // Listen to shops
  const unsubscribeShops = onSnapshot(qShops, (snapshot) => {
    if (isSyncingFromRemote) return;
    isSyncingFromRemote = true;
    snapshot.forEach((doc) => {
      const data = doc.data();
      localDb.updateLocalShopFromSync(doc.id, data);
    });
    isSyncingFromRemote = false;
    if (onSyncCallback) onSyncCallback();
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
  });

  return () => {
    unsubscribeShops();
    unsubscribeTransactions();
    unsubscribeApprovals();
  };
}

// Push all local modifications to Firestore
export async function pushLocalStateToFirestore() {
  const user = auth.currentUser;
  if (!user) return;
  const uid = user.uid;

  const localDb = require('./db');
  const state = localDb.getLocalState();

  try {
    const batch = writeBatch(db);

    // Sync shops
    for (const shopId of Object.keys(state.shops)) {
      const shop = state.shops[shopId];
      const shopRef = doc(db, "shops", shopId);
      batch.set(shopRef, {
        ...shop,
        userId: uid,
        updatedAt: new Date().toISOString()
      });
    }

    // Sync ledgers (flattened into transactions)
    for (const shopId of Object.keys(state.ledgers)) {
      for (const date of Object.keys(state.ledgers[shopId])) {
        const ledger = state.ledgers[shopId][date];
        for (const itemId of Object.keys(ledger.items)) {
          const item = ledger.items[itemId];
          const txRef = doc(db, "transactions", item.id);
          batch.set(txRef, {
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
          });
        }
      }
    }

    // Sync payments (flattened into transactions)
    for (const shopId of Object.keys(state.payments)) {
      for (const payId of Object.keys(state.payments[shopId])) {
        const pay = state.payments[shopId][payId];
        const txRef = doc(db, "transactions", payId);
        batch.set(txRef, {
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
        });
      }
    }

    // Sync purchases (flattened into transactions)
    for (const date of Object.keys(state.purchases)) {
      for (const itemId of Object.keys(state.purchases[date])) {
        const purchase = state.purchases[date][itemId];
        const txRef = doc(db, "transactions", purchase.id);
        batch.set(txRef, {
          id: purchase.id,
          type: "purchase",
          date,
          itemName: purchase.itemName,
          quantity: purchase.quantity,
          amount: purchase.pricePaid,
          loggedAt: purchase.loggedAt,
          userId: uid,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Sync pending approvals
    for (const appId of Object.keys(state.pendingApprovals)) {
      const app = state.pendingApprovals[appId];
      const appRef = doc(db, "approvals", appId);
      batch.set(appRef, {
        ...app,
        userId: uid,
        updatedAt: new Date().toISOString()
      });
    }

    await batch.commit();
    console.log("Local database synchronized to Firestore successfully.");
  } catch (error) {
    console.error("Failed to sync local state to Firestore", error);
  }
}
