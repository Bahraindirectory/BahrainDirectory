import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  collection, 
  getDocs, 
  onSnapshot,
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if all required config values are present
const isConfigValid = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

let app;
let db: any = null;
let auth: any = null;

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    try {
      // Initialize Firestore with robust multi-tab persistent offline cache
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (cacheError) {
      console.warn('⚠️ Could not initialize persistent local cache, falling back to standard Firestore:', cacheError);
      db = getFirestore(app);
    }
    auth = getAuth(app);
    console.log('🔥 Firebase initialized successfully with offline support!');
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
  }
} else {
  console.log('ℹ️ Firebase credentials not provided. Falling back to local storage.');
}

export { db, auth };

export const isFirebaseEnabled = (): boolean => {
  return !!db;
};

// Helper to execute a promise with a timeout
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Firebase operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Helper to fetch all documents in a collection with a timeout fallback
export const fetchCollection = async <T>(collectionName: string, defaultValue: T[]): Promise<T[]> => {
  if (!db) return defaultValue;
  try {
    const colRef = collection(db, collectionName);
    // Wrap the getDocs call with a 3.5-second timeout to prevent stalling on bad or unreachable connections
    const querySnapshot = await withTimeout(getDocs(colRef), 3500);
    if (querySnapshot.empty) {
      return [];
    }
    const items: T[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() } as T);
    });
    return items;
  } catch (error) {
    console.warn(`⚠️ Error fetching collection ${collectionName} (falling back to cache/defaults):`, error);
    return defaultValue;
  }
};

// Helper to save a single document (add or update) with timeout
export const saveDocument = async (collectionName: string, docId: string, data: any): Promise<boolean> => {
  if (!db) return false;
  try {
    const docRef = doc(db, collectionName, docId);
    // Remove undefined properties before saving to Firestore
    const cleanData = JSON.parse(JSON.stringify(data));
    await withTimeout(setDoc(docRef, cleanData, { merge: true }), 4000);
    return true;
  } catch (error) {
    console.warn(`⚠️ Error saving document ${docId} to ${collectionName}:`, error);
    return false;
  }
};

// Helper to delete a single document with timeout
export const deleteDocument = async (collectionName: string, docId: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const docRef = doc(db, collectionName, docId);
    await withTimeout(deleteDoc(docRef), 4000);
    return true;
  } catch (error) {
    console.warn(`⚠️ Error deleting document ${docId} from ${collectionName}:`, error);
    return false;
  }
};

// Helper to seed or save entire collection with timeout
export const saveCollection = async (collectionName: string, items: any[]): Promise<boolean> => {
  if (!db) return false;
  try {
    const colRef = collection(db, collectionName);
    const existingSnap = await withTimeout(getDocs(colRef), 4000);
    const existingIds = new Set(existingSnap.docs.map(d => d.id));
    const newIds = new Set(items.map(item => item.id).filter(Boolean));

    // Chunking helper to respect Firestore 500 ops per batch limit
    const ops: Array<{ type: 'delete' | 'set'; id: string; data?: any }> = [];

    // Delete documents from Firestore that are no longer in items array
    existingIds.forEach((existingId) => {
      if (!newIds.has(existingId)) {
        ops.push({ type: 'delete', id: existingId });
      }
    });

    // Add or update items
    items.forEach((item) => {
      if (!item.id) return;
      ops.push({ type: 'set', id: item.id, data: JSON.parse(JSON.stringify(item)) });
    });

    if (ops.length === 0) return true;

    // Process in batches of 350
    const CHUNK_SIZE = 350;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        const docRef = doc(db, collectionName, op.id);
        if (op.type === 'delete') {
          batch.delete(docRef);
        } else if (op.type === 'set' && op.data) {
          batch.set(docRef, op.data, { merge: true });
        }
      }
      await withTimeout(batch.commit(), 6000);
    }

    return true;
  } catch (error) {
    console.warn(`⚠️ Error batch saving collection ${collectionName}:`, error);
    return false;
  }
};

// Helper to subscribe to real-time changes of a collection
export const subscribeToCollection = <T>(
  collectionName: string,
  callback: (items: T[]) => void
): (() => void) => {
  if (!db) {
    return () => {};
  }
  try {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as T);
        });
        callback(items);
      },
      (error) => {
        console.warn(`⚠️ Error in real-time subscription for ${collectionName}:`, error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn(`⚠️ Failed to set up real-time listener for ${collectionName}:`, error);
    return () => {};
  }
};
