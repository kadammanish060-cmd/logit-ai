import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query,
  where
} from 'firebase/firestore';
import { 
  signInAnonymously as authSignInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
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
    console.log("Anonymous sign-in successful:", credential.user.uid);
    return credential.user;
  } catch (error) {
    console.error("Anonymous sign-in failed", error);
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Email sign-in successful:", credential.user.uid);
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
    
    console.log("Registration and profile creation successful for:", user.uid);
    return user;
  } catch (error) {
    console.error("Registration failed", error);
    throw error;
  }
}

export async function logout() {
  try {
    await signOut(auth);
    console.log("Logout successful");
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
    console.log("Storage upload successful:", url);
    return url;
  } catch (e: any) {
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
    console.error("Firestore shops listener error", err);
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
    console.error("Firestore transactions listener error", err);
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
    console.error("Firestore approvals listener error", err);
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
    // 1. Sync shops (user-scoped document IDs: ${uid}_${shopId})
    for (const shopId of Object.keys(state.shops)) {
      const shop = state.shops[shopId];
      const firestoreShopDocId = `${uid}_${shopId}`;
      const payload = {
        ...shop,
        id: shopId,
        userId: uid,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, "shops", firestoreShopDocId), payload);
    }

    // 2. Sync ledgers (flattened into transactions)
    for (const shopId of Object.keys(state.ledgers)) {
      for (const date of Object.keys(state.ledgers[shopId])) {
        const ledger = state.ledgers[shopId][date];
        for (const itemId of Object.keys(ledger.items)) {
          const item = ledger.items[itemId];
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
          await setDoc(doc(db, "transactions", item.id), payload);
        }
      }
    }

    // 3. Sync payments (flattened into transactions)
    for (const shopId of Object.keys(state.payments)) {
      for (const payId of Object.keys(state.payments[shopId])) {
        const pay = state.payments[shopId][payId];
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
        await setDoc(doc(db, "transactions", payId), payload);
      }
    }

    // 4. Sync purchases (flattened into transactions)
    for (const date of Object.keys(state.purchases)) {
      for (const itemId of Object.keys(state.purchases[date])) {
        const purchase = state.purchases[date][itemId];
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
        await setDoc(doc(db, "transactions", purchase.id), payload);
      }
    }

    // 5. Sync pending approvals
    for (const appId of Object.keys(state.pendingApprovals)) {
      const app = state.pendingApprovals[appId];
      const payload = {
        ...app,
        userId: uid,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, "approvals", appId), payload);
    }

    console.log("Local database synchronized to Firestore successfully.");
  } catch (error) {
    console.error("Failed to sync local state to Firestore", error);
    throw error;
  }
}
